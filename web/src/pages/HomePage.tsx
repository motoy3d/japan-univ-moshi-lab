import { Link } from "react-router-dom";
import { api } from "../api";
import { getConfig } from "../config";
import { currentUser } from "../auth";
import { localResults } from "../guest";
import { fmtDate, useAsync, useTitle } from "../hooks";
import type { AttemptSummary, ExamListItem } from "../../../shared/types";
import { Ring, daysUntil, opportunities } from "../components/Motivation";
import { deviationScore, scoreForDeviation } from "../../../shared/stats";
import { jpDate, jpDateTime, nextDeadline, primaryExamDate, targetName } from "../targets";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "遅くまでお疲れさまです" : h < 11 ? "おはようございます" : h < 18 ? "こんにちは" : "こんばんは";
}

/** 演習の見出し。「大問演習1 長文（論説）返品無料の代償」→「返品無料の代償」（種類はバッジで見せる） */
function practiceTitle(e: ExamListItem) {
  const t = e.title.replace(/^大問演習\d+\s*/, "");
  return e.practiceType && t.startsWith(e.practiceType) ? t.slice(e.practiceType.length).trim() || t : t;
}

/** 模試と大問演習の一覧（ログインしていなくても見られる） */
function ExamLists({ exams, list, error }: { exams?: ExamListItem[]; list: AttemptSummary[]; error?: string }) {
  const mocks = exams?.filter((e) => e.kind !== "practice") ?? [];
  const practice = exams?.filter((e) => e.kind === "practice") ?? [];
  const practiceSubjects = [...new Set(practice.map((e) => e.subject))];
  const resultLink = (a: AttemptSummary) => (currentUser() ? `/results/${a.attemptId}` : `/results/local/${a.attemptId}`);
  return (
    <>
      {error && <p className="error">{error}</p>}
      <h2 id="practice">大問演習 <small className="muted">15〜25分・大問1つ</small></h2>
      <p className="small muted section-lead">模試とは別の問題です。演習で解いた問題が模試に出ることはありません。</p>
      {!exams && !error && <div className="grid grid-3"><Skeletons n={6} cls="practice-card" /></div>}
      {/* 科目が2つ以上あるときは、科目ごとに見出しを付けて分ける（英語・世界史が混ざらないように） */}
      {practiceSubjects.map((subject) => (
      <section key={subject} aria-label={`大問演習（${subject}）`}>
      {practiceSubjects.length > 1 && <h3 style={{ margin: "16px 0 8px" }}>{subject}</h3>}
      <div className="grid grid-3">
        {practice.filter((e) => e.subject === subject).map((e) => {
          const mine = list.filter((a) => a.examId === e.id);
          return (
            <Link key={e.id} to={`/exams/${e.id}`} className="card exam-card practice-card">
              <div className="exam-card-top">
                <span className="badge">{e.practiceType}</span>
                <span className={`status ${mine.length ? "done" : ""}`}>{mine.length ? `済 ${Math.max(...mine.map((a) => a.score))}/${e.totalPoints}` : `${e.durationMin}分`}</span>
              </div>
              <h3>{practiceTitle(e)}</h3>
              <div className="meta">{e.questionCount}問 ・ {e.totalPoints}点</div>
            </Link>
          );
        })}
      </div>
      </section>
      ))}

      <h2 id="mocks">模試 <small className="muted">本番と同じ時間・形式</small></h2>
      <p className="small muted section-lead">本番どおりに受けるなら、印刷して紙で解くのがおすすめです。{getConfig().photoGrading ? "解答用紙は撮影して採点できます。" : "解き終えた答えを入力すると採点できます。"}</p>
      <div className="grid grid-2">
        {!exams && !error && <Skeletons n={3} cls="mock-skel" />}
        {mocks.map((e) => {
          const mine = list.filter((a) => a.examId === e.id);
          const top = mine.length ? Math.max(...mine.map((a) => a.score)) : 0;
          return (
            <Link key={e.id} to={`/exams/${e.id}`} className="card exam-card">
              <div className="exam-card-top">
                <span className="badge">{e.edition}</span>
                <span className={`status ${mine.length ? "done" : ""}`}>{mine.length ? `受験済み ${mine.length}回` : "未受験"}</span>
              </div>
              <h3>{e.university}<br /><span>{e.faculty}　{e.subject}</span></h3>
              <div className="meta">{e.durationMin}分 ・ {e.totalPoints}点満点 ・ {e.questionCount}問</div>
              <div className="exam-progress" aria-label={`自己ベスト ${top}点`}>
                <span style={{ width: `${(top / e.totalPoints) * 100}%` }} />
              </div>
              <div className="meta">{mine.length ? `自己ベスト ${top} / ${e.totalPoints}点` : "時間を計って1回"}</div>
            </Link>
          );
        })}
      </div>

      {list.length > 0 && (
        <>
          <h2>最近の受験</h2>
          <div className="recent">
            {list.slice(0, 5).map((a) => (
              <Link key={a.attemptId} to={resultLink(a)} className="recent-row">
                <span className="recent-date">{fmtDate(a.createdAt)}</span>
                <span className="recent-title">{shortTitle(a.examTitle)}</span>
                <span className="recent-score">{a.score}<small>/{a.maxScore}</small></span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** 読み込み中の枠。実物と同じ大きさにして、表示されたときに中身がずれないようにする */
function Skeletons({ n, cls }: { n: number; cls: string }) {
  return <>{Array.from({ length: n }, (_, i) => <div key={i} className={`card exam-card skeleton ${cls}`} aria-hidden />)}</>;
}

/** 「第1回 慶應義塾大学 商学部 英語 予想模試」→「第1回 英語 予想模試」。大学・学部が増えたら残す */
function shortTitle(t: string) {
  return t.replace(/慶應義塾大学 商学部\s*/, "");
}

export function HomePage() {
  useTitle(undefined);
  return currentUser() ? <MemberHome /> : <GuestHome />;
}

/** ログインしていない人のホーム: 説明は2行、入口は「大問演習」と「模試」の2つ */
function GuestHome() {
  const exams = useAsync(() => api.exams(), []);
  const list = localResults().map((r) => r.review.attempt);
  const firstPractice = exams.data?.find((e) => e.kind === "practice");
  const firstMock = exams.data?.find((e) => e.kind !== "practice");
  return (
    <>
      <section className="hero hero-guest">
        <div className="hero-main">
          <p className="hero-greet">慶應義塾大学 商学部　英語・世界史</p>
          <h1 className="hero-title">本番と同じ形の予想模試</h1>
          <p className="hero-sub">大問の並びも、設問の数も、本番に合わせて作っています。<b>無料・登録なし</b>で、すぐ受けられます。</p>
          <div className="row" style={{ marginTop: 14 }}>
            {firstPractice && <a className="btn btn-hero" href="#practice">大問演習（15〜25分）</a>}
            {firstMock && <Link className="btn btn-ghost" to={`/exams/${firstMock.id}`}>模試（90分）</Link>}
          </div>
          <p className="hero-more"><Link to="/about">模試ラボのこだわり →</Link></p>
        </div>
      </section>
      <ExamLists exams={exams.data} list={list} error={exams.error} />
    </>
  );
}

function MemberHome() {
  const exams = useAsync(() => api.exams(), []);
  const attempts = useAsync(() => api.attempts(), []);
  const me = useAsync(() => api.me(), []);
  const firstExamId = exams.data?.find((e) => e.kind !== "practice")?.id;
  const stats = useAsync(() => (firstExamId ? api.stats(firstExamId) : Promise.resolve(undefined)), [firstExamId]);
  const user = currentUser();
  const name = me.data?.nickname || user?.name;
  const list = attempts.data ?? [];
  const latest = list[0];
  const best = list.length ? Math.max(...list.map((a) => a.score)) : null;
  const primary = me.data?.targets?.[0];
  const days = daysUntil(primaryExamDate(me.data?.targets, me.data?.examDate));
  const deadline = nextDeadline(primary);
  const goal = me.data?.goalDeviation;
  const latestDev = latest && stats.data ? deviationScore(latest.score, stats.data) : null;
  const goalScore = goal && stats.data ? scoreForDeviation(goal, stats.data) : null;
  const opp = latest ? opportunities(latest.categories, 1)[0] : undefined;

  return (
    <>
      <section className="hero">
        <div className="hero-main">
          <p className="hero-greet">{greeting()}、{name} さん</p>
          {days !== null && days >= 0 ? (
            <>
              {primary && <p className="hero-target">{targetName(primary, true)}　{jpDate(primaryExamDate(me.data?.targets)!)}</p>}
              <h1 className="hero-title">本番まで <span className="hero-num">{days}</span> 日</h1>
            </>
          ) : (
            <h1 className="hero-title">今日も1セット、積み上げよう</h1>
          )}
          <p className="hero-sub">
            {latest
              ? opp
                ? `次の一手：「${opp.label}」の失点 ${opp.lost}点 が最大の伸びしろです。`
                : "前回は満点。次は時間を短縮して精度を保ちましょう。"
              : "まずは1回、本番と同じ90分で現在地を測りましょう。"}
          </p>
          {deadline && (
            <p className="hero-deadline">
              {deadline.label.replace(/（.*）/, "")}：{jpDateTime(deadline.start)} 〜 <b>{jpDateTime(deadline.end)}</b>
            </p>
          )}
          <div className="row" style={{ marginTop: 14 }}>
            {firstExamId && (
              <Link className="btn btn-hero" to={`/exams/${firstExamId}${latest ? "" : "/take"}`}>
                {latest ? "模試に取り組む" : "最初の模試を始める"}
              </Link>
            )}
            {(!goal || (!primary && !me.data?.examDate)) && (
              <Link className="btn btn-ghost" to="/settings">{primary ? "目標偏差値を設定" : "志望校を設定（30秒）"}</Link>
            )}
          </div>
        </div>
        <div className="hero-side">
          {goal ? (
            <Ring
              value={latestDev ?? 0}
              max={goal}
              label={latestDev !== null ? latestDev.toFixed(1) : "—"}
              sub={`目標 偏差値${goal}`}
            />
          ) : (
            <Ring value={latest ? latest.score : 0} max={latest?.maxScore ?? 200} label={latest ? `${latest.score}` : "—"} sub="最新の得点" />
          )}
          {goal && goalScore !== null && (
            <p className="hero-goal">
              {latest && latest.score >= goalScore ? "目標ライン到達！" : <>目標まで あと <b>{Math.max(0, goalScore - (latest?.score ?? 0))}</b> 点</>}
              <span>（{goalScore}点 ≒ 偏差値{goal}）</span>
            </p>
          )}
        </div>
      </section>

      <div className="kpis">
        <div className="kpi"><span>受験回数</span><b>{list.length}</b><small>回</small></div>
        <div className="kpi"><span>自己ベスト</span><b>{best ?? "—"}</b><small>{best !== null ? "点" : ""}</small></div>
        <div className="kpi"><span>最新の偏差値</span><b>{latestDev?.toFixed(1) ?? "—"}</b></div>
      </div>

      <ExamLists exams={exams.data} list={list} error={exams.error} />
    </>
  );
}
