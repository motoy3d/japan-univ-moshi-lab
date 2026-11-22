import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { fmtDate, fmtDuration, useAsync } from "../hooks";
import { Histogram, PartBars } from "../components/Charts";
import { RELIABLE_POPULATION } from "../../../shared/stats";
import type { AttemptReview, QuestionWithKey } from "../../../shared/types";

export function ResultPage() {
  const { id = "" } = useParams();
  const r = useAsync(() => api.attempt(id), [id]);
  if (r.error) return <p className="error">{r.error}</p>;
  if (!r.data) return <p className="muted">読み込み中…</p>;
  return <Result review={r.data} />;
}

export function answerText(q: QuestionWithKey, groupChoices: string[] | undefined, v: unknown) {
  if (v === undefined || v === null || v === "") return "（無解答）";
  if (q.kind === "write") return String(v);
  const c = (q.choices ?? groupChoices)?.[Number(v) - 1];
  return c ? `${v}. ${c}` : String(v);
}

function Result({ review }: { review: AttemptReview }) {
  const { attempt: a, exam, stats } = review;
  const [onlyWrong, setOnlyWrong] = useState(false);
  const resultById = new Map(a.results.map((x) => [x.id, x]));
  const reliable = stats.count >= RELIABLE_POPULATION;
  const pct = (a.score / a.maxScore) * 100;

  return (
    <>
      <p className="muted small" style={{ margin: 0 }}>{fmtDate(a.createdAt)} ／ {a.mode === "paper" ? "紙で受験" : "Web受験"}{!a.counted && " ／ 2回目以降の受験（母集団に含まれません）"}</p>
      <h1>{a.examTitle}　成績</h1>

      <div className="score-hero">
        <div className="stat">
          <div className="label">得点</div>
          <div className="value">{a.score}<small>/ {a.maxScore}</small></div>
          <div className="sub">得点率 {pct.toFixed(1)}%</div>
        </div>
        <div className="stat">
          <div className="label">偏差値</div>
          <div className="value">{review.currentDeviation?.toFixed(1) ?? "—"}</div>
          <div className="sub">{review.currentDeviation === null ? "受験者が2人以上になると表示" : reliable ? `受験者 ${stats.count}人中` : `参考値（受験者 ${stats.count}人）`}</div>
        </div>
        <div className="stat">
          <div className="label">推定順位</div>
          <div className="value">{review.topPercent !== null ? <>上位{review.topPercent}<small>%</small></> : "—"}</div>
          <div className="sub">平均 {stats.mean.toFixed(1)}点 ／ 標準偏差 {stats.sd.toFixed(1)}</div>
        </div>
        <div className="stat">
          <div className="label">所要時間</div>
          <div className="value" style={{ fontSize: 24 }}>{fmtDuration(a.durationSec)}</div>
          <div className="sub">制限 {exam.durationMin}分</div>
        </div>
      </div>
      {!reliable && stats.count >= 2 && (
        <p className="notice small" style={{ marginTop: 12 }}>
          受験者数が{RELIABLE_POPULATION}人未満のため、偏差値・順位は参考値です。受験者が増えると随時更新されます（提出時点の偏差値: {a.deviation?.toFixed(1) ?? "—"}）。
        </p>
      )}

      <div className="row no-print" style={{ marginTop: 16 }}>
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

      <h2>解答・解説</h2>
      <label className="row small no-print" style={{ marginBottom: 8 }}>
        <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} /> 間違えた問題だけ表示
      </label>
      {exam.sections.map((s) => {
        const items = s.groups.flatMap((g) => g.questions.map((q) => ({ q, g })));
        const shown = items.filter(({ q }) => !onlyWrong || !resultById.get(q.id)?.correct);
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
                    <b>{q.kind === "write" ? "記述" : ""}({q.no})</b>
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
