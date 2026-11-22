import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { allQuestions } from "../../../shared/scoring";

export function ExamPage() {
  const { id = "" } = useParams();
  const exam = useAsync(() => api.exam(id), [id]);
  const stats = useAsync(() => api.stats(id), [id]);
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
            <dt>受験者数</dt><dd>{stats.data ? `${stats.data.count}人` : "—"}{stats.data && stats.data.count > 0 && `（平均 ${stats.data.mean.toFixed(1)}点）`}</dd>
          </dl>
          <p className="small muted">{e.disclaimer}</p>
        </div>
        <div className="card grid" style={{ gap: 10, alignContent: "start" }}>
          <Link className="btn btn-primary btn-block" to={`/exams/${id}/take`}>Webで受験する（{e.durationMin}分）</Link>
          <Link className="btn btn-block" to={`/exams/${id}/print`}>問題冊子・解答用紙を印刷 / PDF</Link>
          <Link className="btn btn-block" to={`/exams/${id}/take?mode=paper`}>紙で解いた解答を入力して採点</Link>
          <p className="small muted" style={{ margin: 0 }}>
            偏差値の母集団には各ユーザーの初回受験のみが含まれます。本番同様、初回は時間を計って取り組みましょう。
          </p>
        </div>
      </div>
      <h2>大問構成</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>大問</th><th>内容</th><th className="num">問題数</th><th className="num">配点</th></tr></thead>
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
    </>
  );
}

function sectionKind(s: { groups: { questions: { kind: string; category: string }[] }[] }) {
  const qs = s.groups.flatMap((g) => g.questions);
  const has = (c: string) => qs.some((q) => q.category === c);
  if (has("verb-form")) return "中文空所補充（記述・動詞の語形変化）";
  if (has("noun-form")) return "中文空所補充（記述・名詞形）";
  if (has("inference")) return "短文の内容推測（4題）";
  if (has("grammar")) return "文法・語法（空所補充）";
  if (has("paraphrase")) return "長文読解（空所補充・下線部内容説明・内容一致）";
  return "中文空所補充";
}
