import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { store, useAsync } from "../hooks";
import { renderMarkup, splitSpeaker } from "../components/PassageText";
import { allQuestions } from "../../../shared/scoring";
import type { Answers, Exam, Question, QuestionGroup, Section } from "../../../shared/types";

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
      const r = await api.submit({ examId: exam.id, answers, durationSec, mode });
      store.del(draftKey);
      nav(`/results/${r.attemptId}`, { replace: true });
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
  const jumpTo = (no: number) => {
    setPane("questions");
    requestAnimationFrame(() => {
      const el = document.getElementById(`q-mark-${no}`);
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
            <li>スマホでは画面上部の「本文 / 設問」で表示を切り替えます。</li>
          </ol>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => setDraft((d) => ({ ...d, startedAt: Date.now() }))}>試験を開始する</button>
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
            <p className="instruction"><b style={{ fontFamily: "var(--font-en)" }}>{section.label}.</b>　{section.instruction}</p>
            <PassageView section={section} answers={draft.answers} onBlank={jumpTo} qs={qs} />
            <p className="small muted no-print" style={{ marginTop: 24 }}>
              <button className="btn" onClick={() => setPane("questions")} style={{ minHeight: 40 }}>設問へ →</button>
            </p>
          </div>
        )}
        <div className={`pane ${pane === "questions" || !hasPassage ? "" : "hidden-mobile"}`} ref={qRef}>
          {!hasPassage && (
            <p className="instruction"><b style={{ fontFamily: "var(--font-en)" }}>{section.label}.</b>　{section.instruction}</p>
          )}
          {section.groups.map((g, gi) => (
            <GroupView key={gi} group={g} answers={draft.answers} onPick={setAnswer} onText={setText} disabled={timeUp} />
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

function PassageView({ section, answers, onBlank, qs }: { section: Section; answers: Answers; onBlank: (no: number) => void; qs: Question[] }) {
  const p = section.passage!;
  const byNo = new Map(qs.filter((q) => q.kind === "mark").map((q) => [q.no, q]));
  const blank = (no: number) => {
    const q = byNo.get(no);
    const v = q ? answers[q.id] : undefined;
    return (
      <button type="button" className={`blank ${v ? "filled" : ""}`} onClick={() => onBlank(no)} aria-label={`空所${no}の設問へ`}>
        <span className="n">({no})</span>
        {v ? <span className="v">{v}</span> : null}
      </button>
    );
  };
  return (
    <div className={`passage ${p.dialogue ? "dialogue" : ""}`}>
      {p.title && <div className="passage-title">{p.title}</div>}
      {p.paragraphs.map((para, i) => {
        const sp = p.dialogue ? splitSpeaker(para) : null;
        return (
          <p key={i}>
            {sp ? (
              <>
                <b>{sp[0]}:</b>{" "}
                {renderMarkup(sp[1], { blank })}
              </>
            ) : (
              renderMarkup(para, { blank })
            )}
          </p>
        );
      })}
      {p.notes && (
        <div className="notes">
          {p.notes.map((n) => <span key={n}>（注）{n}</span>)}
        </div>
      )}
    </div>
  );
}

function GroupView({
  group, answers, onPick, onText, disabled,
}: {
  group: QuestionGroup;
  answers: Answers;
  onPick: (id: string, v: number) => void;
  onText: (id: string, v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="q-group">
      {group.instruction && <p className="instruction">{group.instruction}</p>}
      {group.choices && (
        <div className="shared-choices">
          <ol>{group.choices.map((c, i) => <li key={i}>{c}</li>)}</ol>
        </div>
      )}
      {group.questions.map((q) => (
        <div key={q.id} className="question" id={`q-${q.kind}-${q.no}`}>
          <div className="q-head">
            <span className="q-no">({q.no})</span>
            {q.prompt && <span className="q-prompt">{q.prompt}</span>}
          </div>
          {q.kind === "write" ? (
            <input
              type="text"
              className="write-input"
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => onText(q.id, e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="1語で記入"
              disabled={disabled}
              aria-label={`記述(${q.no})`}
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
  useEffect(() => store.set(draftKey, { answers, startedAt: 0, section: 0 }), [answers, draftKey]);

  const rows = exam.sections.flatMap((s) =>
    s.groups.flatMap((g) => g.questions.map((q) => ({ q, n: (q.choices ?? g.choices ?? []).length }))),
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
        <p className="small muted">マーク解答用紙・記述解答用紙に書いた答えをそのまま入力してください。</p>
        {error && <p className="error">{error}</p>}
        <label className="row small" style={{ marginBottom: 16 }}>
          かかった時間
          <input type="number" min={1} max={300} value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ width: 90 }} />分
        </label>
        <h2>マーク（1〜{marks.length}）</h2>
        <div className="sheet-grid">
          {marks.map(({ q, n }) => (
            <div className="sheet-row" key={q.id}>
              <span className="no">{q.no}</span>
              {Array.from({ length: n }, (_, i) => (
                <button key={i} className={`num-btn ${answers[q.id] === i + 1 ? "selected" : ""}`} onClick={() => pick(q.id, i + 1)} aria-label={`${q.no}番に${i + 1}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          ))}
        </div>
        <h2>記述（1〜{writes.length}）</h2>
        <div className="sheet-grid">
          {writes.map(({ q }) => (
            <label className="sheet-row" key={q.id}>
              <span className="no">{q.no}</span>
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
