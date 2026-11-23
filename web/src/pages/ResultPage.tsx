import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { track } from "../analytics";
import { currentUser } from "../auth";
import { clientId, getLocalResult, localResults } from "../guest";
import { fmtDate, fmtDuration, store, useAsync } from "../hooks";
import { Histogram, PartBars } from "../components/Charts";
import { CountUp, Ring, cheer, opportunities } from "../components/Motivation";
import { MIN_POPULATION_FOR_DEVIATION, scoreForDeviation } from "../../../shared/stats";
import { questionLabel } from "../../../shared/scoring";
import { FEEDBACK_REASONS, type AttemptReview, type AttemptSummary, type FeedbackReason, type Profile, type QuestionWithKey } from "../../../shared/types";

export function ResultPage() {
  const { id = "" } = useParams();
  const r = useAsync(() => Promise.all([api.attempt(id), api.attempts(), api.me()]), [id]);
  if (r.error) return <p className="error">{r.error}</p>;
  if (!r.data) return <p className="muted">読み込み中…</p>;
  const [review, history, profile] = r.data;
  return <Result review={review} history={history} profile={profile} />;
}

/** 登録なし受験の結果（端末内に保存したもの） */
export function LocalResultPage() {
  const { id = "" } = useParams();
  const local = getLocalResult(id);
  if (!local) return <p className="notice">この端末に結果が見つかりません。<Link to="/">ホームへ</Link></p>;
  const history = localResults().map((x) => x.review.attempt);
  return <Result review={local.review} history={history} profile={{}} local />;
}

export function answerText(q: QuestionWithKey, groupChoices: string[] | undefined, v: unknown) {
  if (v === undefined || v === null || v === "") return "（無解答）";
  if (q.kind === "write") return String(v);
  const c = (q.choices ?? groupChoices)?.[Number(v) - 1];
  return c ? `${v}. ${c}` : String(v);
}

function Result({ review, history, profile, local }: { review: AttemptReview; history: AttemptSummary[]; profile: Profile; local?: boolean }) {
  const { attempt: a, exam, stats } = review;
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const resultById = new Map(a.results.map((x) => [x.id, x]));
  const loggedIn = !!currentUser();
  useEffect(() => track("result_view", { exam_id: exam.id, kind: exam.kind ?? "mock" }), [exam.id, exam.kind]);
  const pct = a.score / a.maxScore;
  const msg = cheer(pct);

  // 同じ模試の過去の受験（この回より前）
  const sameExam = history.filter((h) => h.examId === a.examId);
  const before = sameExam.filter((h) => h.attemptId < a.attemptId);
  const prev = before[0];
  const delta = prev ? a.score - prev.score : null;
  const isBest = before.length > 0 && before.every((h) => a.score > h.score);
  const goal = profile.goalDeviation;
  const goalScore = goal ? scoreForDeviation(goal, stats) : null;
  const opp = opportunities(a.categories);

  const showCategory = (key: string) => {
    setCatFilter(key);
    setOnlyWrong(true);
    requestAnimationFrame(() => document.getElementById("review")?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <>
      <p className="muted small" style={{ margin: 0 }}>
        {fmtDate(a.createdAt)} ／ {a.mode === "paper" ? "紙で受験" : "Web受験"}
        {!a.counted && (a.excludedReason ? ` ／ ${a.excludedReason}、偏差値の母集団には含まれません` : " ／ 2回目以降（偏差値の母集団には含まれません）")}
      </p>
      <h1>{a.examTitle}</h1>

      <section className="result-hero">
        <Ring value={a.score} max={a.maxScore} size={156} label={String(a.score)} sub={`/ ${a.maxScore}点`} />
        <div className="result-hero-body">
          <div className="badges">
            {isBest && <span className="pill pill-gold">自己ベスト更新</span>}
            {delta !== null && delta !== 0 && (
              <span className={`pill ${delta > 0 ? "pill-up" : "pill-down"}`}>前回比 {delta > 0 ? `+${delta}` : delta}点</span>
            )}
            {sameExam.length === 1 && <span className="pill">初受験</span>}
          </div>
          <h2 className="result-title">{msg.title}</h2>
          <p className="result-msg">{msg.body}</p>
          {goal && goalScore !== null && (
            <p className="result-goal">
              {a.score >= goalScore ? (
                <>目標の偏差値{goal}（{goalScore}点）に<b>到達</b>しています。</>
              ) : (
                <>目標の偏差値{goal}まで あと <b>{goalScore - a.score}点</b>（現時点の換算で {goalScore}点）。</>
              )}
            </p>
          )}
        </div>
      </section>

      <div className="score-hero">
        <div className="stat">
          <div className="label">偏差値</div>
          <div className="value">{review.currentDeviation !== null ? <CountUp to={review.currentDeviation} decimals={1} /> : "—"}</div>
          <div className="sub">{review.currentDeviation === null ? `受験者が${MIN_POPULATION_FOR_DEVIATION}人に達すると表示（現在 ${stats.count}人）` : `受験者 ${stats.count}人中`}</div>
        </div>
        <div className="stat">
          <div className="label">推定順位</div>
          <div className="value">{review.topPercent !== null ? <>上位 <CountUp to={review.topPercent} decimals={review.topPercent < 10 ? 1 : 0} /><small>%</small></> : "—"}</div>
          <div className="sub">{review.topPercent !== null ? `平均 ${stats.mean.toFixed(1)}点 ／ 標準偏差 ${stats.sd.toFixed(1)}` : "偏差値と同時に表示"}</div>
        </div>
        <div className="stat">
          <div className="label">得点率</div>
          <div className="value"><CountUp to={pct * 100} decimals={1} /><small>%</small></div>
          <div className="sub">合格の目安とされる8割 = {Math.ceil(a.maxScore * 0.8)}点</div>
        </div>
        <div className="stat">
          <div className="label">所要時間</div>
          <div className="value" style={{ fontSize: 24 }}>{fmtDuration(a.durationSec)}</div>
          <div className="sub">制限 {exam.durationMin}分</div>
        </div>
      </div>
      <Rating examId={exam.id} attemptRef={a.attemptId} kind={exam.kind ?? "mock"} />

      {local && !loggedIn && (
        <p className="notice small" style={{ marginTop: 12 }}>
          この結果はこの端末にだけ保存されています。<Link to={`/login?next=${encodeURIComponent(`/results/local/${a.attemptId}`)}`}>ログイン</Link>すると、受験の履歴として残り、次の受験と比べられます（無料）。
        </p>
      )}

      {opp.length > 0 && (
        <>
          <h2>伸びしろ（失点の大きい分野）</h2>
          <div className="opp-list">
            {opp.map((o, i) => (
              <button key={o.key} className="opp" onClick={() => showCategory(o.key)}>
                <span className="opp-rank">{i + 1}</span>
                <span className="opp-body">
                  <b>{o.label}</b>
                  <span>{o.correct}/{o.total}問正解 ・ 失点 {o.lost}点</span>
                </span>
                <span className="opp-gain">+{o.lost}<small>点</small></span>
              </button>
            ))}
          </div>
          <p className="small muted">タップすると、その分野で間違えた問題の解説に移動します。</p>
        </>
      )}

      <div className="row no-print" style={{ marginTop: 8 }}>
        {!local && <Link className="btn" to={`/results/${a.attemptId}/print`}>解答・解説を印刷 / PDF</Link>}
        <Link className="btn btn-primary" to="/">次の演習・模試を選ぶ</Link>
        <Link className="btn" to={`/exams/${exam.id}/take`}>もう一度解く</Link>
        {loggedIn && <Link className="btn" to="/history">成績分析へ</Link>}
      </div>

      <div className="grid grid-2" style={{ marginTop: 8 }}>
        <div>
          <h2>大問別</h2>
          <div className="card"><PartBars parts={a.sections} means={stats.count > 0 ? stats.sectionMeans : undefined} /></div>
        </div>
        <div>
          <h2>分野別</h2>
          <div className="card"><PartBars parts={[...a.categories].sort((x, y) => x.score / x.max - y.score / y.max)} /></div>
        </div>
      </div>

      {stats.count >= MIN_POPULATION_FOR_DEVIATION && (
        <>
          <h2>得点分布（受験者 {stats.count}人）</h2>
          <div className="card"><Histogram stats={stats} myScore={a.score} /></div>
        </>
      )}

      <h2 id="review">解答・解説</h2>
      <div className="row small no-print" style={{ marginBottom: 8 }}>
        <label className="row"><input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} /> 間違えた問題だけ</label>
        {catFilter && (
          <button className="chip on" onClick={() => setCatFilter(null)}>
            {a.categories.find((c) => c.key === catFilter)?.label} ✕
          </button>
        )}
      </div>
      {exam.sections.map((s) => {
        const items = s.groups.flatMap((g) => g.questions.map((q) => ({ q, g })));
        const shown = items.filter(({ q }) => (!onlyWrong || !resultById.get(q.id)?.correct) && (!catFilter || q.category === catFilter));
        if (!shown.length) return null;
        return (
          <div className="card" key={s.label} style={{ marginBottom: 12 }}>
            <h3 style={{ marginTop: 0, fontFamily: "var(--font-en)" }}>{s.label}</h3>
            {shown.map(({ q, g }) => {
              const res = resultById.get(q.id);
              const correctText = q.kind === "write" ? (q.answer as string[]).join(" / ") : answerText(q, g.choices, q.answer);
              return (
                <div className="review-q" key={q.id}>
                  <div>
                    <span className={`mark ${res?.correct ? "o" : "x"}`}>{res?.correct ? "○" : "×"}</span>
                    <b>{q.kind === "write" ? "記述" : ""}({questionLabel(q)})</b>
                    <span className="badge" style={{ marginLeft: 8 }}>{q.points}点</span>
                  </div>
                  {q.prompt && <div className="q-prompt" style={{ fontSize: 15, margin: "4px 0" }}>{q.prompt}</div>}
                  <div className="ans">あなたの解答: {answerText(q, g.choices, a.answers[q.id])}</div>
                  <div className="ans">正解: <b>{correctText}</b></div>
                  <div className="exp">{q.explanation}</div>
                  <QuestionFeedback examId={exam.id} questionId={q.id} attemptRef={a.attemptId} />
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/** 「また受けたいか」の5段階評価（受験ごとに1回だけ聞く） */
function Rating({ examId, attemptRef, kind }: { examId: string; attemptRef: string; kind: string }) {
  const key = `moshi.rated.${attemptRef}`;
  const [done, setDone] = useState(() => !!store.get<boolean>(key));
  const [value, setValue] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (done) return null;
  const send = async () => {
    setBusy(true);
    try {
      await api.feedback({ type: "rating", examId, attemptRef, rating: value, text: text.trim() || undefined, clientId: clientId() });
      track("rating_submit", { exam_id: examId, rating: value });
    } catch {
      /* 送れなくても受験の邪魔はしない */
    }
    store.set(key, true);
    setDone(true);
  };
  return (
    <section className="card rating no-print" aria-label="ご感想">
      <p className="rating-q">この{kind === "practice" ? "演習" : "模試"}を、また受けたいと思いますか？</p>
      <div className="rating-scale" role="radiogroup" aria-label="5段階">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={value === n} className={`rating-btn ${value === n ? "on" : ""}`} onClick={() => setValue(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="rating-legend small muted"><span>受けたくない</span><span>ぜひ受けたい</span></div>
      {value > 0 && (
        <div className="grid" style={{ gap: 8 }}>
          <input type="text" maxLength={200} placeholder="ひとこと（任意）" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn btn-primary" disabled={busy} onClick={send}>送る</button>
        </div>
      )}
    </section>
  );
}

/** 問題ごとの意見。普段は小さなアイコンだけを出し、押したときだけ入力欄を開く */
function QuestionFeedback({ examId, questionId, attemptRef }: { examId: string; questionId: string; attemptRef: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FeedbackReason>("explanation");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (sent) return <p className="qfb-thanks small muted">ありがとうございます。確認して改善します。</p>;
  const send = async () => {
    setBusy(true);
    try {
      await api.feedback({ type: "question", examId, questionId, attemptRef, reason, text: text.trim() || undefined, clientId: clientId() });
      track("question_feedback", { exam_id: examId, reason });
      setSent(true);
    } catch {
      setBusy(false);
    }
  };
  return (
    <div className="qfb no-print">
      <button className="qfb-icon" aria-label="この問題について知らせる" title="この問題について知らせる" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        </svg>
      </button>
      {open && (
        <div className="qfb-form">
          <select value={reason} onChange={(e) => setReason(e.target.value as FeedbackReason)} aria-label="内容">
            {Object.entries(FEEDBACK_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <textarea rows={2} maxLength={500} placeholder="詳しく（任意）" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn" disabled={busy} onClick={send}>送る</button>
        </div>
      )}
    </div>
  );
}
