import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { fmtDate, fmtDuration, useAsync } from "../hooks";
import { Histogram, PartBars } from "../components/Charts";
import { CountUp, Ring, cheer, opportunities } from "../components/Motivation";
import { RELIABLE_POPULATION, scoreForDeviation } from "../../../shared/stats";
import { questionLabel } from "../../../shared/scoring";
import type { AttemptReview, AttemptSummary, Profile, QuestionWithKey } from "../../../shared/types";

export function ResultPage() {
  const { id = "" } = useParams();
  const r = useAsync(() => Promise.all([api.attempt(id), api.attempts(), api.me()]), [id]);
  if (r.error) return <p className="error">{r.error}</p>;
  if (!r.data) return <p className="muted">読み込み中…</p>;
  const [review, history, profile] = r.data;
  return <Result review={review} history={history} profile={profile} />;
}

export function answerText(q: QuestionWithKey, groupChoices: string[] | undefined, v: unknown) {
  if (v === undefined || v === null || v === "") return "（無解答）";
  if (q.kind === "write") return String(v);
  const c = (q.choices ?? groupChoices)?.[Number(v) - 1];
  return c ? `${v}. ${c}` : String(v);
}

function Result({ review, history, profile }: { review: AttemptReview; history: AttemptSummary[]; profile: Profile }) {
  const { attempt: a, exam, stats } = review;
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const resultById = new Map(a.results.map((x) => [x.id, x]));
  const reliable = stats.count >= RELIABLE_POPULATION;
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
          <div className="sub">{review.currentDeviation === null ? "受験者が2人以上になると表示" : reliable ? `受験者 ${stats.count}人中` : `参考値（受験者 ${stats.count}人）`}</div>
        </div>
        <div className="stat">
          <div className="label">推定順位</div>
          <div className="value">{review.topPercent !== null ? <>上位 <CountUp to={review.topPercent} decimals={review.topPercent < 10 ? 1 : 0} /><small>%</small></> : "—"}</div>
          <div className="sub">平均 {stats.mean.toFixed(1)}点 ／ 標準偏差 {stats.sd.toFixed(1)}</div>
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
      {!reliable && stats.count >= 2 && (
        <p className="notice small" style={{ marginTop: 12 }}>
          受験者が{RELIABLE_POPULATION}人未満のため、偏差値・順位は参考値です。受験者が増えると更新されます（提出時点: {a.deviation?.toFixed(1) ?? "—"}）。
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
        <Link className="btn" to={`/results/${a.attemptId}/print`}>解答・解説を印刷 / PDF</Link>
        <Link className="btn" to={`/exams/${exam.id}/take`}>もう一度解く</Link>
        <Link className="btn" to="/history">成績分析へ</Link>
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

      {stats.count > 0 && (
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
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
