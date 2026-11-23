import { Link } from "react-router-dom";
import { api } from "../api";
import { fmtDate, fmtDuration, useAsync } from "../hooks";
import { PartBars, TrendLine } from "../components/Charts";
import type { AttemptSummary, PartScore } from "../../../shared/types";

/** 全受験の分野別得点を合算 */
function aggregate(list: AttemptSummary[]): PartScore[] {
  const m = new Map<string, PartScore>();
  for (const a of list)
    for (const c of a.categories) {
      const t = m.get(c.key) ?? { ...c, score: 0, max: 0, correct: 0, total: 0 };
      t.score += c.score;
      t.max += c.max;
      t.correct += c.correct;
      t.total += c.total;
      m.set(c.key, t);
    }
  return [...m.values()].sort((x, y) => x.score / x.max - y.score / y.max);
}

const ADVICE: Record<string, string> = {
  logic: "空所の前後の論理関係（逆接・譲歩・因果・付加）を先に決めてから選択肢を見る。",
  vocab: "コロケーション（meet demand, profit from など）と語法をセットで覚える。",
  paraphrase: "下線部をまず語義どおりに訳し、直後のコロン・具体例と照らして選択肢を吟味する。",
  detail: "設問の該当段落を特定し、本文の根拠と選択肢を一語ずつ照合する。言い過ぎ（always / all）に注意。",
  "main-idea": "各段落の要旨を1行でメモし、全体を貫くテーマを表す表題を選ぶ。部分的な話題の選択肢は外す。",
  inference: "本文に書かれていることから『確実に言えること』だけを選ぶ。本文にない一般化は外す。",
  grammar: "仮定法・関係詞・品詞の判別・多義語など頻出事項を短時間で反復する。",
  "verb-form": "時制・態・文構造（分詞構文など）を先に判定し、不規則動詞の活用を綴りまで書いて覚える。",
  "noun-form": "動詞の名詞形（-tion / -ment / -ance / -ence / -al）を綴りまで書いて覚え、単数・複数も確認する。",
};

export function HistoryPage() {
  const r = useAsync(() => api.attempts(), []);
  if (r.error) return <p className="error">{r.error}</p>;
  if (!r.data) return <p className="muted">読み込み中…</p>;
  const list = r.data;
  if (!list.length)
    return (
      <>
        <h1>成績分析</h1>
        <div className="empty">
          <EmptyMarks />
          <p>まだ受験の記録がありません。<br />1回受けると、ここに得点の推移と、伸ばしたい分野が出ます。</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary" to="/#practice">15分の大問演習から</Link>
            <Link className="btn" to="/#mocks">90分の模試</Link>
          </div>
        </div>
      </>
    );
  const chrono = [...list].reverse();
  const cats = aggregate(list);
  const weak = cats.filter((c) => c.max > 0).slice(0, 3);
  const best = Math.max(...list.map((a) => a.score));
  const avg = list.reduce((s, a) => s + a.score / a.maxScore, 0) / list.length;

  return (
    <>
      <h1>成績分析</h1>
      <div className="score-hero">
        <div className="stat"><div className="label">受験回数</div><div className="value">{list.length}<small>回</small></div></div>
        <div className="stat"><div className="label">最高点</div><div className="value">{best}</div></div>
        <div className="stat"><div className="label">平均得点率</div><div className="value">{(avg * 100).toFixed(1)}<small>%</small></div></div>
        <div className="stat"><div className="label">最新の偏差値</div><div className="value">{list[0].deviation?.toFixed(1) ?? "—"}</div><div className="sub">提出時点</div></div>
      </div>

      <h2>得点率の推移</h2>
      <div className="card">
        <TrendLine points={chrono.map((a, i) => ({ label: `${i + 1}回目`, value: (a.score / a.maxScore) * 100, sub: `${a.score}点 ${fmtDate(a.createdAt)}` }))} />
      </div>

      <div className="grid grid-2">
        <div>
          <h2>分野別の得点率（全受験の累計）</h2>
          <div className="card"><PartBars parts={cats} /></div>
        </div>
        <div>
          <h2>重点的に復習したい分野</h2>
          <div className="card">
            <ol style={{ margin: 0, paddingLeft: "1.2em" }}>
              {weak.map((c) => (
                <li key={c.key} style={{ marginBottom: 10 }}>
                  <b>{c.label}</b>（{((c.score / c.max) * 100).toFixed(0)}%・{c.correct}/{c.total}問）
                  <div className="small muted">{ADVICE[c.key]}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <h2>受験履歴</h2>
      <div className="recent">
        {list.map((a) => (
          <Link key={a.attemptId} to={`/results/${a.attemptId}`} className="recent-row history-row">
            <span className="recent-date">{fmtDate(a.createdAt)}</span>
            <span className="recent-title">
              {a.examTitle.replace(/慶應義塾大学 商学部 英語\s*/, "")}
              {a.mode === "paper" && <span className="badge" style={{ marginLeft: 6 }}>紙</span>}
              <span className="history-meta">偏差値 {a.deviation?.toFixed(1) ?? "—"} ・ {fmtDuration(a.durationSec)}</span>
            </span>
            <span className="recent-score">{a.score}<small>/{a.maxScore}</small></span>
          </Link>
        ))}
      </div>
    </>
  );
}

/** 記録がないときの絵: まだ何も塗られていないマークシートの1列 */
function EmptyMarks() {
  return (
    <div className="mark-strip quiet" aria-hidden>
      {["1", "2", "3", "4"].map((d) => <span key={d} className="ms-o">{d}</span>)}
    </div>
  );
}
