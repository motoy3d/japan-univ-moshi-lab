import { useParams, useSearchParams, Link } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { pageCss } from "./PrintPage";
import { answerText } from "./ResultPage";
import { questionLabel } from "../../../shared/scoring";

/** 解答・解説冊子（自分の解答つき） */
export function AnswerKeyPrintPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const large = params.get("text") === "large";
  const r = useAsync(() => api.attempt(id), [id]);
  if (r.error) return <div className="container"><p className="error">{r.error}</p></div>;
  if (!r.data) return <div className="container"><p className="muted">読み込み中…</p></div>;
  const { exam, attempt: a } = r.data;
  const res = new Map(a.results.map((x) => [x.id, x]));
  return (
    <div className={`paper-A4 ${large ? "large-print" : ""}`}>
      <style>{pageCss("A4", large)}</style>
      <div className="print-toolbar no-print">
        <Link to={`/results/${id}`} className="btn" style={{ minHeight: 36 }}>←</Link>
        <b>解答・解説</b>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => window.print()}>印刷 / PDFで保存</button>
      </div>
      <div className="print-stage">
        <div className="sheet ak">
          <h2>{exam.edition} {exam.title}　解答・解説</h2>
          <p style={{ textAlign: "right" }}>得点 <b>{a.score}</b> / {a.maxScore}点</p>
          {exam.sections.map((s) => {
            const items = s.groups.flatMap((g) => g.questions.map((q) => ({ q, g })));
            return (
              <div key={s.label}>
                <h3><span style={{ fontFamily: "var(--font-en)" }}>{s.label}</span>（{items.reduce((t, { q }) => t + q.points, 0)}点）</h3>
                {items.map(({ q, g }) => (
                  <div className="exp" key={q.id}>
                    <span>{q.selfGrade ? "自" : res.get(q.id)?.correct ? "○" : "×"} {q.kind === "write" ? "記" : ""}({questionLabel(q)})</span>
                    <span className="ans">{q.kind === "write" ? (q.answer as string[]).join(" / ") : g.choiceStart ? answerText(q, g.choices, q.answer, g.choiceStart) : q.answer}</span>
                    <span>
                      {q.explanation}
                      <br />
                      <span className="you">あなたの解答: {answerText(q, g.choices, a.answers[q.id], g.choiceStart)}（配点 {q.points}）</span>
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
