import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { track } from "../analytics";
import { currentUser } from "../auth";
import { getConfig } from "../config";
import { useAsync, useTitle } from "../hooks";
import { allQuestions, usesTwoDigitMarks } from "../../../shared/scoring";

export function ExamPage() {
  const { id = "" } = useParams();
  const exam = useAsync(() => api.exam(id), [id]);
  const stats = useAsync(() => api.stats(id), [id]);
  useTitle(exam.data ? `${exam.data.title}${exam.data.kind === "practice" ? "" : ` ${exam.data.edition}`}` : undefined);
  useEffect(() => {
    if (exam.data) track("exam_view", { exam_id: id, kind: exam.data.kind ?? "mock" });
  }, [exam.data, id]);
  if (exam.error) return <p className="error">{exam.error}</p>;
  if (!exam.data) return <p className="muted">読み込み中…</p>;
  const e = exam.data;
  const qs = allQuestions(e);
  return (
    <>
      <p className="muted small" style={{ margin: 0 }}>{e.edition}</p>
      <h1>{e.title}</h1>
      <div className="grid grid-2">
        <div className="card">
          <dl className="kv">
            <dt>試験時間</dt><dd>{e.durationMin}分</dd>
            <dt>配点</dt><dd>{e.totalPoints}点</dd>
            <dt>構成</dt><dd>大問 {e.sections.map((s) => s.label).join("・")}（マーク {qs.filter((q) => q.kind === "mark").length}問／記述 {qs.filter((q) => q.kind === "write").length}問）</dd>
            <dt>受験者数</dt><dd>{stats.data ? `${stats.data.count}人` : "—"}</dd>
          </dl>
        </div>
        <div className="card grid" style={{ gap: 10, alignContent: "start" }}>
          {e.kind === "practice" ? (
            <>
              <Link className="btn btn-primary btn-block" to={`/exams/${id}/take`}>今すぐ解く（{e.durationMin}分）</Link>
              <Link className="btn btn-block" to={`/exams/${id}/print`} onClick={() => track("print_open", { exam_id: id })}>印刷して解く</Link>
            </>
          ) : (
            <>
              <p className="small" style={{ margin: 0 }}><b>本番どおりに受けるなら紙で</b>：印刷して{e.durationMin}分で解き、{getConfig().photoGrading && !usesTwoDigitMarks(e) ? "解答用紙を撮影するか" : ""}答えを入力して採点します。</p>
              <Link className="btn btn-primary btn-block" to={`/exams/${id}/print`} onClick={() => track("print_open", { exam_id: id })}>問題冊子・解答用紙を印刷</Link>
              {/* 2桁の語群番号で答える形式（世界史）は、撮影採点にまだ対応していない */}
              {getConfig().photoGrading && !usesTwoDigitMarks(e) && (
                <Link className="btn btn-block" to={currentUser() ? `/exams/${id}/photo` : `/login?next=${encodeURIComponent(`/exams/${id}/photo`)}`}>
                  解き終えた解答用紙を撮影して採点{currentUser() ? "" : "（ログインが必要）"}
                </Link>
              )}
              <Link className="btn btn-block" to={`/exams/${id}/take?mode=paper`}>解き終えた答えを入力して採点</Link>
              <p className="or" aria-hidden>または</p>
              <Link className="btn btn-block" to={`/exams/${id}/take`}>Webで受験する（{e.durationMin}分）</Link>
            </>
          )}
          <p className="small muted" style={{ margin: 0 }}>登録なしで受けられます。結果を履歴に残したいときだけログインしてください。</p>
        </div>
      </div>
      <h2>大問構成</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th className="nowrap">大問</th><th>内容</th><th className="num nowrap">問題数</th><th className="num nowrap">配点</th></tr></thead>
          <tbody>
            {e.sections.map((s) => {
              const sq = s.groups.flatMap((g) => g.questions);
              return (
                <tr key={s.label}>
                  <td style={{ fontFamily: "var(--font-en)", fontWeight: 700 }}>{s.label}</td>
                  <td>{sectionKind(s)}</td>
                  <td className="num">{sq.length}</td>
                  <td className="num">{sq.reduce((a, q) => a + q.points, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted disclaimer">{e.disclaimer}</p>
    </>
  );
}

function sectionKind(s: { groups: { questions: { kind: string; category: string }[] }[] }) {
  const qs = s.groups.flatMap((g) => g.questions);
  const has = (c: string) => qs.some((q) => q.category === c);
  if (qs.some((q) => q.category.startsWith("wh-"))) return "テーマ史（語群からの空欄補充・語句の記述・論述）";
  if (has("verb-form")) return "中文空所補充（記述・動詞の語形変化）";
  if (has("noun-form")) return "中文空所補充（記述・名詞形）";
  if (has("inference")) return "短文の内容推測（4題）";
  if (has("grammar")) return "文法・語法（空所補充）";
  if (has("paraphrase")) return "長文読解（空所補充・下線部内容説明・内容一致）";
  return "中文空所補充";
}
