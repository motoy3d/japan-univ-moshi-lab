// 運営の管理画面: 検証期間のKPI、模試・演習ごとの状況、意見の一覧、設問ごとの正答率と識別力。
// 表示の可否は画面でも分けるが、権限の判定は API（Cognito の admin グループ）で行う。
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { fmtDate, useAsync } from "../hooks";
import { CATEGORY_LABELS, FEEDBACK_REASONS, type Category, type FeedbackReason } from "../../../shared/types";
import type { AdminSummary, ItemStat } from "../../../api/src/admin";

const pct = (v: number | null | undefined, d = 0) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
const num = (v: number | null | undefined, d = 1) => (v == null ? "—" : v.toFixed(d));

/** 検証の合格ライン（事業企画書「検証方針」と同じ値） */
const TARGET = { secondAttemptRate: 0.3, ratingAvg: 4.0 };

type Tab = "summary" | "exams" | "feedback" | "items";

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("summary");
  const summary = useAsync(() => api.adminSummary(), []);
  return (
    <>
      <h1>運営</h1>
      <div className="row admin-tabs" role="tablist">
        {([["summary", "概要"], ["exams", "模試・演習別"], ["feedback", "意見"], ["items", "設問分析"]] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {summary.error && <p className="error">{summary.error}</p>}
      {tab === "summary" && summary.data && <Summary s={summary.data} />}
      {tab === "exams" && summary.data && <Exams s={summary.data} />}
      {tab === "feedback" && <Feedback />}
      {tab === "items" && summary.data && <Items s={summary.data} />}
      {!summary.data && !summary.error && <p className="muted">読み込み中…</p>}
    </>
  );
}

function Summary({ s }: { s: AdminSummary }) {
  const t = s.totals;
  return (
    <>
      <p className="small muted">直近60日（{fmtDate(s.since)} 以降）。登録なしの受験を含む。開始率・完了率は Google アナリティクスで見る。</p>
      <div className="kpis admin-kpis">
        <Kpi label="2回目受験率" value={pct(t.secondAttemptRate)} goal={`目標 ${pct(TARGET.secondAttemptRate)}`} ok={t.secondAttemptRate != null && t.secondAttemptRate >= TARGET.secondAttemptRate} />
        <Kpi label="また受けたい（平均）" value={num(t.ratingAvg)} goal={`目標 ${TARGET.ratingAvg.toFixed(1)}／${t.ratings}件`} ok={t.ratingAvg != null && t.ratingAvg >= TARGET.ratingAvg} />
        <Kpi label="受験者" value={String(t.takers)} goal={`提出 ${t.attempts}件`} />
        <Kpi label="問題への指摘" value={String(t.questionReports)} goal="48時間以内に確認" />
        <Kpi label="紙で受験" value={pct(t.paperShare)} goal={`ログイン済み ${pct(t.loggedInShare)}`} />
        <Kpi label="撮影採点" value={String(t.photoJobs)} goal={`失敗 ${pct(t.photoFailRate)}`} />
      </div>
      <h2>日別</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>日付</th><th className="num">提出</th><th className="num">うち登録なし</th><th className="num">受験者</th><th className="num">評価</th><th className="num">平均</th><th className="num">指摘</th><th className="num">撮影</th></tr></thead>
          <tbody>
            {s.days.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td><td className="num">{d.attempts}</td><td className="num">{d.guestAttempts}</td><td className="num">{d.takers}</td>
                <td className="num">{d.ratings}</td><td className="num">{d.ratings ? (d.ratingSum / d.ratings).toFixed(1) : "—"}</td>
                <td className="num">{d.questionReports}</td><td className="num">{d.photoJobs}{d.photoFailed ? `（失敗${d.photoFailed}）` : ""}</td>
              </tr>
            ))}
            {!s.days.length && <tr><td colSpan={8} className="muted">まだデータがありません</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Kpi({ label, value, goal, ok }: { label: string; value: string; goal?: string; ok?: boolean }) {
  return (
    <div className={`kpi ${ok === undefined ? "" : ok ? "kpi-ok" : "kpi-ng"}`}>
      <span>{label}</span><b>{value}</b>{goal && <small>{goal}</small>}
    </div>
  );
}

function Exams({ s }: { s: AdminSummary }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>模試・演習</th><th className="num">提出</th><th className="num">受験者</th><th className="num">平均得点率</th><th className="num">また受けたい</th><th className="num">指摘</th></tr></thead>
        <tbody>
          {s.byExam.map((e) => (
            <tr key={e.examId}>
              <td><Link to={`/exams/${e.examId}`}>{e.title}</Link>{e.kind === "practice" && <span className="badge" style={{ marginLeft: 6 }}>演習</span>}</td>
              <td className="num">{e.attempts}</td><td className="num">{e.takers}</td><td className="num">{pct(e.avgRate)}</td>
              <td className="num">{num(e.ratingAvg)}</td><td className="num">{e.reports}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Feedback() {
  const fb = useAsync(() => api.adminFeedback(), []);
  const [type, setType] = useState<"all" | "question" | "rating">("question");
  if (fb.error) return <p className="error">{fb.error}</p>;
  if (!fb.data) return <p className="muted">読み込み中…</p>;
  const list = fb.data.filter((f) => type === "all" || f.type === type);
  return (
    <>
      <div className="row small" style={{ marginBottom: 8 }}>
        {(["question", "rating", "all"] as const).map((k) => (
          <button key={k} className={`chip ${type === k ? "on" : ""}`} onClick={() => setType(k)}>{k === "question" ? "問題への指摘" : k === "rating" ? "満足度" : "すべて"}</button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>日時</th><th>模試・演習</th><th>設問</th><th>内容</th><th>コメント</th></tr></thead>
          <tbody>
            {list.map((f, i) => (
              <tr key={i}>
                <td className="nowrap">{fmtDate(f.createdAt)}</td>
                <td>{f.examId}</td>
                <td>{f.questionId ?? "—"}</td>
                <td>{f.type === "rating" ? `評価 ${f.rating}` : FEEDBACK_REASONS[(f.reason ?? "other") as FeedbackReason]}</td>
                <td className="admin-text">{f.text ?? ""}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="muted">ありません</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="small muted">コメントは受験生が書いた文章です。個人情報が含まれていたら、外部に出さないでください。</p>
    </>
  );
}

function Items({ s }: { s: AdminSummary }) {
  const [examId, setExamId] = useState(s.byExam[0]?.examId ?? "");
  const items = useAsync(() => api.adminItems(examId), [examId]);
  return (
    <>
      <label className="row small" style={{ marginBottom: 8 }}>
        模試・演習
        <select value={examId} onChange={(e) => setExamId(e.target.value)}>
          {s.byExam.map((e) => <option key={e.examId} value={e.examId}>{e.title}（{e.attempts}件）</option>)}
        </select>
      </label>
      <p className="small muted">
        要確認の目安: 正答率20%未満（難しすぎるか正解が誤っている）、識別力0.1未満（上位層と下位層で差がつかない。受験10件以上で表示）、指摘あり。
        選択肢の分布は 無解答 / 1 / 2 / 3 / 4 の人数。
      </p>
      {items.error && <p className="error">{items.error}</p>}
      {items.data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>大問</th><th>設問</th><th>分野</th><th>正解</th><th className="num">正答率</th><th className="num">識別力</th><th>選択の分布／多い誤答</th><th className="num">指摘</th></tr></thead>
            <tbody>
              {items.data.map((q: ItemStat) => {
                const flag = (q.correctRate != null && q.n >= 5 && q.correctRate < 0.2) || (q.discrimination != null && q.discrimination < 0.1) || q.reports > 0;
                return (
                  <tr key={q.id} className={flag ? "admin-flag" : ""}>
                    <td>{q.section}</td><td>{q.label}</td><td className="small">{CATEGORY_LABELS[q.category as Category]}</td>
                    <td>{Array.isArray(q.answer) ? q.answer.join(" / ") : q.answer}</td>
                    <td className="num">{pct(q.correctRate)}</td><td className="num">{num(q.discrimination, 2)}</td>
                    <td className="small">
                      {q.choiceCounts ? q.choiceCounts.join(" / ") : q.topWrong?.map((w) => `${w.text}(${w.count})`).join("、")}
                    </td>
                    <td className="num">{q.reports || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
