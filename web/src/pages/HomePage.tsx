import { Link } from "react-router-dom";
import { api } from "../api";
import { currentUser } from "../auth";
import { fmtDate, useAsync } from "../hooks";

export function HomePage() {
  const exams = useAsync(() => api.exams(), []);
  const attempts = useAsync(() => api.attempts(), []);
  const user = currentUser();
  return (
    <>
      <h1>{user?.name} さんの模試</h1>
      {exams.error && <p className="error">{exams.error}</p>}
      <div className="grid grid-2">
        {exams.data?.map((e) => {
          const mine = attempts.data?.filter((a) => a.examId === e.id) ?? [];
          return (
            <Link key={e.id} to={`/exams/${e.id}`} className="card exam-card" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="badge">{e.edition}</span>
              <h3>{e.university} {e.faculty}　{e.subject}</h3>
              <div className="meta">
                試験時間 {e.durationMin}分 ／ {e.totalPoints}点満点 ／ {e.questionCount}問
              </div>
              <div className="meta" style={{ marginTop: 6 }}>
                {mine.length ? `受験済み ${mine.length}回（最高 ${Math.max(...mine.map((a) => a.score))}点）` : "未受験"}
              </div>
            </Link>
          );
        })}
      </div>

      <h2>最近の受験</h2>
      {attempts.data?.length === 0 && <p className="muted">まだ受験記録はありません。</p>}
      <div className="table-wrap">
        <table className="table">
          <tbody>
            {attempts.data?.slice(0, 5).map((a) => (
              <tr key={a.attemptId}>
                <td>{fmtDate(a.createdAt)}</td>
                <td>{a.examTitle}</td>
                <td className="num">{a.score}/{a.maxScore}</td>
                <td><Link to={`/results/${a.attemptId}`}>結果</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
