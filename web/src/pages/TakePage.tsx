import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { currentUser } from "../auth";
import { track } from "../analytics";
import { bumpAttemptCount, clientId, saveLocalResult } from "../guest";
import { getConfig } from "../config";
import { store, useAsync } from "../hooks";
import { renderMarkup, splitSpeaker } from "../components/PassageText";
import { FigureView } from "../components/FigureView";
import { allQuestions, choiceIndexFromNumber, choiceNumber, questionLabel, usesTwoDigitMarks } from "../../../shared/scoring";
import type { Answers, Exam, Passage, Question, QuestionGroup } from "../../../shared/types";

interface Draft {
  answers: Answers;
  startedAt: number;
  section: number;
}

export function TakePage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const mode = params.get("mode") === "paper" ? "paper" : "web";
  const exam = useAsync(() => api.exam(id), [id]);
  if (exam.error) return <div className="container"><p className="error">{exam.error}</p></div>;
  if (!exam.data) return <div className="container"><p className="muted">読み込み中…</p></div>;
  return mode === "paper" ? <PaperEntry exam={exam.data} /> : <WebExam exam={exam.data} />;
}

/* ---------------- 共通: 提出処理 ---------------- */
function useSubmit(exam: Exam, mode: "web" | "paper", draftKey: string) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const submit = async (answers: Answers, durationSec: number) => {
    setBusy(true);
    setError(undefined);
    try {
      const req = { examId: exam.id, answers, durationSec, mode };
      let to: string;
      let rate: number | undefined;
      if (currentUser()) {
        const r = await api.submit(req);
        to = `/results/${r.attemptId}`;
      } else {
        // 登録なし: 採点結果を端末に保存して表示する
        const review = await api.guestSubmit({ ...req, clientId: clientId() });
        rate = review.attempt.score / review.attempt.maxScore;
        to = `/results/local/${saveLocalResult(review)}`;
      }
      track("exam_submit", { exam_id: exam.id, kind: exam.kind ?? "mock", mode, attempt_number: bumpAttemptCount(), ...(rate !== undefined ? { score_rate: Math.round(rate * 100) } : {}) });
      store.del(draftKey);
      store.del(`moshi.photo.low.${exam.id}`);
      store.del(`moshi.photo.filled.${exam.id}`);
      nav(to, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return { submit, busy, error };
}

/* ---------------- Web受験 ---------------- */
function WebExam({ exam }: { exam: Exam }) {
  const draftKey = `moshi.draft.${exam.id}.web`;
  const [draft, setDraft] = useState<Draft>(
    () => store.get<Draft>(draftKey) ?? { answers: {}, startedAt: 0, section: 0 },
  );
  const started = draft.startedAt > 0;
  const [now, setNow] = useState(Date.now());
  const [pane, setPane] = useState<"passage" | "questions">("passage");
  const [confirm, setConfirm] = useState(false);
  const qRef = useRef<HTMLDivElement>(null);
  const { submit, busy, error } = useSubmit(exam, "web", draftKey);

  useEffect(() => store.set(draftKey, draft), [draft, draftKey]);
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [started]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (started) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [started]);

  const qs = useMemo(() => allQuestions(exam), [exam]);
  const answeredCount = qs.filter((q) => draft.answers[q.id] !== undefined && draft.answers[q.id] !== "").length;
  const elapsed = started ? Math.floor((now - draft.startedAt) / 1000) : 0;
  const remain = exam.durationMin * 60 - elapsed;
  const timeUp = started && remain <= 0;

  const setAnswer = useCallback(
    (qid: string, v: number | string) =>
      setDraft((d) => ({ ...d, answers: { ...d.answers, [qid]: d.answers[qid] === v ? null : v } })),
    [],
  );
  const setText = useCallback(
    (qid: string, v: string) => setDraft((d) => ({ ...d, answers: { ...d.answers, [qid]: v } })),
    [],
  );
  const goSection = (i: number) => {
    setDraft((d) => ({ ...d, section: i }));
    setPane("passage");
    window.scrollTo({ top: 0 });
    document.querySelectorAll(".take-body > .pane").forEach((p) => (p.scrollTop = 0));
  };
  const jumpTo = (q: Question) => {
    setPane("questions");
    requestAnimationFrame(() => {
      const el = document.getElementById(`q-${q.kind}-${q.no}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.classList.remove("flash");
      void el?.offsetWidth;
      el?.classList.add("flash");
    });
  };

  if (!started) {
    return (
      <div className="container" style={{ maxWidth: 640 }}>
        <p className="muted small" style={{ margin: 0 }}>{exam.edition}</p>
        <h1>{exam.title}</h1>
        <div className="card">
          <ol style={{ paddingLeft: "1.2em", margin: 0, fontSize: 14 }}>
            <li>試験時間は <b>{exam.durationMin}分</b> です。開始するとタイマーが動き出します。</li>
            <li>解答は自動で端末に一時保存されます。途中でページを閉じても、同じ端末なら続きから再開できます。</li>
            <li>本文中の空所をタップすると、その設問に移動します。</li>
            {usesTwoDigitMarks(exam) ? (
              <>
                <li>空欄は、各大問の語群から語句を選びます（本番では語群の2桁の番号をマーク）。問2以降は語句を入力してください。</li>
                <li>字数指定のある論述は自動採点されません。提出後に模範解答と採点の観点を見て、自分で点を付けます。</li>
              </>
            ) : (
              <li>大問 VII・VIII は記述式です（本番では記述解答用紙に記入）。綴りまで正確に入力してください。</li>
            )}
            <li>スマホでは画面上部の「本文 / 設問」で表示を切り替えます。</li>
          </ol>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => { track("exam_start", { exam_id: exam.id, kind: exam.kind ?? "mock", mode: "web" }); setDraft((d) => ({ ...d, startedAt: Date.now() })); }}>試験を開始する</button>
            <Link className="btn" to={`/exams/${exam.id}`}>戻る</Link>
          </div>
        </div>
      </div>
    );
  }

  const section = exam.sections[draft.section];
  const hasPassage = !!section.passage;
  const mm = Math.max(0, Math.floor(remain / 60));
  const ss = Math.max(0, remain % 60);

  return (
    <div>
      <div className="take-bar">
        <span className={`timer ${remain < 600 ? "low" : ""}`} aria-label="残り時間">
          {timeUp ? "終了" : `${mm}:${ss.toString().padStart(2, "0")}`}
        </span>
        <span className="progress">解答 {answeredCount}/{qs.length}</span>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={() => setConfirm(true)} disabled={busy}>提出</button>
      </div>
      <div className="section-tabs" role="tablist">
        {exam.sections.map((s, i) => {
          const sq = s.groups.flatMap((g) => g.questions);
          const done = sq.filter((q) => draft.answers[q.id] != null && draft.answers[q.id] !== "").length;
          return (
            <button key={s.label} className={i === draft.section ? "active" : ""} onClick={() => goSection(i)} role="tab" aria-selected={i === draft.section}>
              {s.label}<span className="dot">{done}/{sq.length}</span>
            </button>
          );
        })}
      </div>
      {hasPassage && (
        <div className="pane-switch">
          <button className={pane === "passage" ? "active" : ""} onClick={() => setPane("passage")}>本文</button>
          <button className={pane === "questions" ? "active" : ""} onClick={() => setPane("questions")}>設問</button>
        </div>
      )}
      <div className={`take-body ${hasPassage ? "" : "no-passage"}`}>
        {hasPassage && (
          <div className={`pane ${pane === "passage" ? "" : "hidden-mobile"}`}>
            <SectionHead section={section} />
            <PassageView passage={section.passage!} answers={draft.answers} onBlank={jumpTo} qs={section.groups.flatMap((g) => g.questions)} groups={section.groups} />
            <p className="small muted no-print" style={{ marginTop: 24 }}>
              <button className="btn" onClick={() => setPane("questions")} style={{ minHeight: 40 }}>設問へ →</button>
            </p>
          </div>
        )}
        <div className={`pane ${pane === "questions" || !hasPassage ? "" : "hidden-mobile"}`} ref={qRef}>
          {!hasPassage && (
            <SectionHead section={section} />
          )}
          {section.groups.map((g, gi) => (
            <GroupView key={gi} group={g} answers={draft.answers} onPick={setAnswer} onText={setText} onBlank={jumpTo} disabled={timeUp} />
          ))}
          <div className="row submit-area">
            {draft.section > 0 && <button className="btn" onClick={() => goSection(draft.section - 1)}>← 大問{exam.sections[draft.section - 1].label}</button>}
            {draft.section < exam.sections.length - 1 ? (
              <button className="btn btn-primary" onClick={() => goSection(draft.section + 1)}>大問{exam.sections[draft.section + 1].label} へ →</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setConfirm(true)}>解答を提出する</button>
            )}
          </div>
        </div>
      </div>

      {(confirm || timeUp) && (
        <div className="modal-bg" role="dialog" aria-modal="true">
          <div className="modal">
            <h3 style={{ marginTop: 0 }}>{timeUp ? "試験時間が終了しました" : "解答を提出しますか？"}</h3>
            <p className="small">
              解答済み {answeredCount}/{qs.length}問
              {qs.length - answeredCount > 0 && <>（未解答 <b>{qs.length - answeredCount}問</b>）</>}
              <br />経過時間 {Math.min(elapsed, exam.durationMin * 60) / 60 | 0}分
            </p>
            {error && <p className="error small">{error}</p>}
            <div className="row">
              <button className="btn btn-primary" disabled={busy} onClick={() => submit(draft.answers, Math.min(elapsed, exam.durationMin * 60))}>
                {busy ? "採点中…" : "提出して採点する"}
              </button>
              {!timeUp && <button className="btn" onClick={() => setConfirm(false)}>見直す</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHead({ section }: { section: Exam["sections"][number] }) {
  return (
    <>
      {section.sheetNotice && <p className="notice small">{section.sheetNotice}（Web受験では下の入力欄に記入）</p>}
      <p className="instruction"><b style={{ fontFamily: "var(--font-en)" }}>{section.label}.</b>　{section.instruction}</p>
      {section.example && <p className="instruction" style={{ fontFamily: "var(--font-en)" }}>{section.example}</p>}
      {section.passage &&
        section.groups.map((g, gi) => g.wordBox && (
          <div key={gi} className="word-box" aria-label="語群">{g.wordBox.map((w) => <span key={w}>{w}</span>)}</div>
        ))}
    </>
  );
}

function PassageView({ passage: p, answers, onBlank, qs, groups }: { passage: Passage; answers: Answers; onBlank: (q: Question) => void; qs: Question[]; groups?: QuestionGroup[] }) {
  // 語群の番号が 11 から始まる形式（世界史）では、空欄に選んだ語群の番号を表示する
  const groupOf = new Map((groups ?? []).flatMap((g) => g.questions.map((q) => [q.id, g] as const)));
  const shown = (q: Question, v: Answers[string]) => (q.kind === "mark" && groupOf.get(q.id)?.choiceStart ? String(choiceNumber(groupOf.get(q.id), Number(v))) : v);
  const byNo = new Map(qs.filter((q) => q.kind === "mark").map((q) => [q.no, q]));
  const byLabel = new Map(qs.filter((q) => q.kind === "write").map((q) => [q.label, q]));
  const blankBtn = (q: Question | undefined, text: string) => {
    const v = q ? answers[q.id] : undefined;
    return (
      <button type="button" className={`blank ${v ? "filled" : ""} ${q?.kind === "write" ? "w" : ""}`} onClick={() => q && onBlank(q)} aria-label={`空所${text}の設問へ`}>
        <span className="n">({text})</span>
        {v && q ? <span className="v">{shown(q, v)}</span> : null}
      </button>
    );
  };
  const opts = {
    blank: (no: number) => {
      const q = byNo.get(no);
      return blankBtn(q, q ? questionLabel(q) : String(no));
    },
    write: (label: string) => blankBtn(byLabel.get(label), label),
  };
  return (
    <div className={`passage ${p.dialogue ? "dialogue" : ""}`}>
      {p.title && <div className="passage-title">{p.title}</div>}
      {p.paragraphs.map((para, i) => {
        const sp = p.dialogue ? splitSpeaker(para) : null;
        return (
          <p key={i}>
            {i === 0 && p.label && <b style={{ fontFamily: "var(--font-en)", marginRight: 6 }}>{p.label}</b>}
            {sp ? (
              <>
                <b>{sp[0]}:</b>{" "}
                {renderMarkup(sp[1], opts)}
              </>
            ) : (
              renderMarkup(para, opts)
            )}
          </p>
        );
      })}
      {p.source && <p className="small muted" style={{ textAlign: "right", textIndent: 0 }}>{p.source}</p>}
      {p.notes && (
        <div className="notes">
          {p.notes.map((n) => <span key={n}>（注）{n}</span>)}
        </div>
      )}
    </div>
  );
}

function GroupView({
  group, answers, onPick, onText, onBlank, disabled,
}: {
  group: QuestionGroup;
  answers: Answers;
  onPick: (id: string, v: number) => void;
  onText: (id: string, v: string) => void;
  onBlank: (q: Question) => void;
  disabled: boolean;
}) {
  return (
    <div className="q-group">
      {group.instruction && <p className="instruction">{group.instruction}</p>}
      {group.passage && <PassageView passage={group.passage} answers={answers} onBlank={onBlank} qs={group.questions} />}
      {group.wordBox && (
        <div className="word-box" aria-label="語群">
          {group.wordBox.map((w) => <span key={w}>{w}</span>)}
        </div>
      )}
      {group.choices && (
        <div className="shared-choices">
          <ol start={group.choiceStart ?? 1}>{group.choices.map((c, i) => <li key={i}>{c}</li>)}</ol>
        </div>
      )}
      {group.questions.map((q) => (
        <div key={q.id} className="question" id={`q-${q.kind}-${q.no}`}>
          <div className="q-head">
            <span className="q-no">({questionLabel(q)})</span>
            {q.prompt && <span className="q-prompt">{q.prompt}</span>}
          </div>
          {q.figure && <FigureView figure={q.figure} />}
          {q.kind === "write" ? (
            <input
              type="text"
              className="write-input"
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => onText(q.id, e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={q.maxChars ? `${q.maxChars}字以内で記述（自己採点）` : /[぀-ヿ一-龯]/.test(q.prompt ?? "") ? "語句を記入" : "1語で記入"}
              disabled={disabled}
              aria-label={`記述(${questionLabel(q)})`}
            />
          ) : q.choices ? (
            <div className="choices" style={q.choices.every((c) => c.length < 22) ? { gridTemplateColumns: "1fr 1fr" } : undefined}>
              {q.choices.map((c, i) => (
                <button key={i} type="button" disabled={disabled} className={`choice ${answers[q.id] === i + 1 ? "selected" : ""}`} onClick={() => onPick(q.id, i + 1)}>
                  <span className="num">{i + 1}</span>
                  <span>{c}</span>
                </button>
              ))}
            </div>
          ) : group.choiceStart ? (
            // 語群が多い（50語以上）ので、番号のボタンではなく一覧から選ぶ
            <select
              value={(answers[q.id] as number | null) ?? ""}
              onChange={(e) => (e.target.value ? onPick(q.id, Number(e.target.value)) : onText(q.id, ""))}
              disabled={disabled}
              aria-label={`空欄(${questionLabel(q)})の語句`}
            >
              <option value="">未選択</option>
              {group.choices!.map((c, i) => <option key={i} value={i + 1}>{choiceNumber(group, i + 1)}　{c}</option>)}
            </select>
          ) : (
            <div className="num-row" style={{ ["--n" as string]: group.choices!.length }}>
              {group.choices!.map((_, i) => (
                <button key={i} type="button" disabled={disabled} className={`num-btn ${answers[q.id] === i + 1 ? "selected" : ""}`} onClick={() => onPick(q.id, i + 1)} aria-label={`(${q.no}) に ${i + 1} を選ぶ`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- 紙で解いた解答の入力 ---------------- */
function PaperEntry({ exam }: { exam: Exam }) {
  const draftKey = `moshi.draft.${exam.id}.paper`;
  const [answers, setAnswers] = useState<Answers>(() => store.get<Draft>(draftKey)?.answers ?? {});
  const [minutes, setMinutes] = useState<string>(String(exam.durationMin));
  const { submit, busy, error } = useSubmit(exam, "paper", draftKey);
  // 撮影採点で読み取った答えのうち、AI が自信のないもの（確認を促すため色を付ける）
  const [low] = useState<string[]>(() => store.get<string[]>(`moshi.photo.low.${exam.id}`) ?? []);
  const fromPhoto = store.get<boolean>(`moshi.photo.filled.${exam.id}`);
  const canPhoto = !!getConfig().photoGrading && !usesTwoDigitMarks(exam);
  useEffect(() => store.set(draftKey, { answers, startedAt: 0, section: 0 }), [answers, draftKey]);

  const rows = exam.sections.flatMap((s) =>
    s.groups.flatMap((g) => g.questions.map((q) => ({ q, g, s: s.label, n: (q.choices ?? g.choices ?? []).length }))),
  );
  const marks = rows.filter((r) => r.q.kind === "mark");
  const writes = rows.filter((r) => r.q.kind === "write");
  const pick = (id: string, v: number) => setAnswers((a) => ({ ...a, [id]: a[id] === v ? null : v }));

  return (
    <>
      <div className="take-bar">
        <Link to={`/exams/${exam.id}`} className="btn" style={{ minHeight: 36 }}>←</Link>
        <b>紙の解答を入力</b>
        <span className="spacer" />
        <button className="btn btn-primary" disabled={busy} onClick={() => submit(answers, Math.round(Number(minutes) * 60) || 0)}>
          {busy ? "採点中…" : "採点する"}
        </button>
      </div>
      <div className="container">
        {fromPhoto ? (
          <p className="notice small">
            撮影した解答用紙から読み取った答えを入れました。<b>用紙と見比べて確認し、違っていれば直してから</b>採点してください。
            {low.length > 0 && <> 読み取りに自信のない {low.length} 問に<span className="low-mark">色</span>を付けています。</>}
          </p>
        ) : (
          <p className="small muted">
            解答用紙に書いた答えをそのまま入力してください。
            {canPhoto && <> 解答用紙を<Link to={`/exams/${exam.id}/photo`}>撮影して読み取る</Link>こともできます（ログインが必要）。</>}
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <label className="row small" style={{ marginBottom: 16 }}>
          かかった時間
          <input type="number" min={1} max={300} value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ width: 90 }} />分
        </label>
        <h2>マーク（1〜{marks.length}）</h2>
        <div className="sheet-grid">
          {marks.map(({ q, g, n }) => (
            <div className={`sheet-row ${low.includes(q.id) ? "low" : ""}`} key={q.id}>
              <span className="no" style={g.choiceStart ? { width: "auto", minWidth: 64 } : undefined}>{g.choiceStart ? `(${questionLabel(q)})` : q.no}</span>
              {g.choiceStart ? (
                <CodeInput
                  value={(answers[q.id] as number | null) ?? null}
                  toNumber={(i) => choiceNumber(g, i)}
                  toIndex={(n) => choiceIndexFromNumber(g, n)}
                  onChange={(i) => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  label={`空欄(${questionLabel(q)})の語群の番号`}
                />
              ) : Array.from({ length: n }, (_, i) => (
                <button key={i} className={`num-btn ${answers[q.id] === i + 1 ? "selected" : ""}`} onClick={() => pick(q.id, i + 1)} aria-label={`${q.no}番に${i + 1}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          ))}
        </div>
        <h2>記述（{writes.length}問）</h2>
        <div className="sheet-grid">
          {writes.map(({ q, s }) => (
            <label className={`sheet-row ${low.includes(q.id) ? "low" : ""}`} key={q.id}>
              <span className="no" style={{ width: "auto", minWidth: 48 }}>{s} ({questionLabel(q)})</span>
              <input
                type="text"
                className="write-input"
                value={(answers[q.id] as string) ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
          ))}
        </div>
        <div className="submit-area">
          <button className="btn btn-primary" disabled={busy} onClick={() => submit(answers, Math.round(Number(minutes) * 60) || 0)}>採点する</button>
        </div>
      </div>
    </>
  );
}

/** 語群の番号（2桁）を入力する欄。番号として正しいときだけ解答（選択肢の位置）を更新する */
function CodeInput({ value, toNumber, toIndex, onChange, label }: {
  value: number | null;
  toNumber: (index: number) => number;
  toIndex: (num: number) => number | null;
  onChange: (index: number | null) => void;
  label: string;
}) {
  const [text, setText] = useState(value ? String(toNumber(value)) : "");
  const valid = text === "" || (/^\d{2}$/.test(text) && toIndex(Number(text)) !== null);
  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={2}
      className="write-input"
      style={{ width: 72, textAlign: "center" }}
      value={text}
      aria-label={label}
      aria-invalid={!valid}
      placeholder="番号"
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9０-９]/g, "").normalize("NFKC").slice(0, 2);
        setText(t);
        onChange(/^\d{2}$/.test(t) ? toIndex(Number(t)) : null);
      }}
    />
  );
}
