// 運営の管理画面の集計（検証期間のKPI・意見・設問ごとの正答率）
import { EXAMS, findExam } from "../../content/index";
import { allQuestions } from "../../shared/scoring";
import type { AttemptDetail, PhotoJob } from "../../shared/types";
import type { FeedbackRecord } from "./repo";

export interface DayRow {
  date: string;
  attempts: number;
  guestAttempts: number;
  takers: number;
  ratings: number;
  ratingSum: number;
  questionReports: number;
  photoJobs: number;
  photoFailed: number;
}

export interface AdminSummary {
  since: string;
  totals: {
    attempts: number;
    takers: number;
    /** 2回以上提出した受験者の割合（検証の主指標） */
    secondAttemptRate: number | null;
    ratingAvg: number | null;
    ratings: number;
    questionReports: number;
    photoJobs: number;
    photoFailRate: number | null;
    paperShare: number | null;
    loggedInShare: number | null;
  };
  days: DayRow[];
  byExam: { examId: string; title: string; kind: string; attempts: number; takers: number; avgRate: number | null; ratingAvg: number | null; reports: number }[];
}

const day = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10); // 日本時間の日付

export function summarize(since: string, attempts: { who: string; attempt: AttemptDetail }[], feedback: FeedbackRecord[], photos: PhotoJob[]): AdminSummary {
  const days = new Map<string, DayRow & { _takers: Set<string> }>();
  const row = (d: string) => {
    let r = days.get(d);
    if (!r) {
      r = { date: d, attempts: 0, guestAttempts: 0, takers: 0, ratings: 0, ratingSum: 0, questionReports: 0, photoJobs: 0, photoFailed: 0, _takers: new Set() };
      days.set(d, r);
    }
    return r;
  };
  const perWho = new Map<string, number>();
  for (const { who, attempt } of attempts) {
    const r = row(day(attempt.createdAt));
    r.attempts++;
    if (who.startsWith("guest:")) r.guestAttempts++;
    r._takers.add(who);
    perWho.set(who, (perWho.get(who) ?? 0) + 1);
  }
  for (const f of feedback) {
    const r = row(day(f.createdAt));
    if (f.type === "rating" && f.rating) {
      r.ratings++;
      r.ratingSum += f.rating;
    } else if (f.type === "question") r.questionReports++;
  }
  for (const j of photos) {
    const r = row(day(j.createdAt));
    r.photoJobs++;
    if (j.status === "FAILED") r.photoFailed++;
  }
  const rows = [...days.values()].sort((a, b) => b.date.localeCompare(a.date)).map(({ _takers, ...r }) => ({ ...r, takers: _takers.size }));

  const ratings = feedback.filter((f) => f.type === "rating" && f.rating);
  const takers = perWho.size;
  const paper = attempts.filter((a) => a.attempt.mode === "paper").length;
  const loggedIn = attempts.filter((a) => a.who.startsWith("user:")).length;
  const photoFailed = photos.filter((p) => p.status === "FAILED").length;

  const byExam = EXAMS.map((e) => {
    const list = attempts.filter((a) => a.attempt.examId === e.id);
    const rs = ratings.filter((f) => f.examId === e.id);
    return {
      examId: e.id,
      title: e.kind === "practice" ? e.title : `${e.edition} ${e.title}`,
      kind: e.kind ?? "mock",
      attempts: list.length,
      takers: new Set(list.map((a) => a.who)).size,
      avgRate: list.length ? list.reduce((s, a) => s + a.attempt.score / a.attempt.maxScore, 0) / list.length : null,
      ratingAvg: rs.length ? rs.reduce((s, f) => s + (f.rating ?? 0), 0) / rs.length : null,
      reports: feedback.filter((f) => f.type === "question" && f.examId === e.id).length,
    };
  });

  return {
    since,
    totals: {
      attempts: attempts.length,
      takers,
      secondAttemptRate: takers ? [...perWho.values()].filter((n) => n >= 2).length / takers : null,
      ratingAvg: ratings.length ? ratings.reduce((s, f) => s + (f.rating ?? 0), 0) / ratings.length : null,
      ratings: ratings.length,
      questionReports: feedback.filter((f) => f.type === "question").length,
      photoJobs: photos.length,
      photoFailRate: photos.length ? photoFailed / photos.length : null,
      paperShare: attempts.length ? paper / attempts.length : null,
      loggedInShare: attempts.length ? loggedIn / attempts.length : null,
    },
    days: rows,
    byExam,
  };
}

export interface ItemStat {
  id: string;
  label: string;
  section: string;
  category: string;
  kind: string;
  answer: number | string[];
  n: number;
  correctRate: number | null;
  /** マーク: 選択肢ごとの選択数（index 0 = 無解答） / 記述: 多かった誤答 */
  choiceCounts?: number[];
  topWrong?: { text: string; count: number }[];
  /** 上位27%と下位27%の正答率の差（識別力の目安） */
  discrimination: number | null;
  reports: number;
}

export function itemStats(examId: string, attempts: AttemptDetail[], feedback: FeedbackRecord[]): ItemStat[] | undefined {
  const exam = findExam(examId);
  if (!exam) return undefined;
  const list = attempts.filter((a) => a.examId === examId);
  const sorted = [...list].sort((a, b) => b.score - a.score);
  const k = Math.max(1, Math.round(sorted.length * 0.27));
  const top = sorted.slice(0, k);
  const bottom = sorted.slice(-k);
  const rate = (group: AttemptDetail[], id: string) =>
    group.length ? group.filter((a) => a.results.find((r) => r.id === id)?.correct).length / group.length : 0;
  const sectionOf = new Map<string, string>();
  for (const s of exam.sections) for (const g of s.groups) for (const q of g.questions) sectionOf.set(q.id, s.label);

  return allQuestions(exam).map((q) => {
    const n = list.length;
    const correct = list.filter((a) => a.results.find((r) => r.id === q.id)?.correct).length;
    const stat: ItemStat = {
      id: q.id,
      label: q.kind === "write" ? `記述(${q.label ?? q.no})` : `(${q.no})`,
      section: sectionOf.get(q.id) ?? "",
      category: q.category,
      kind: q.kind,
      answer: q.answer,
      n,
      correctRate: n ? correct / n : null,
      discrimination: n >= 10 ? rate(top, q.id) - rate(bottom, q.id) : null,
      reports: feedback.filter((f) => f.type === "question" && f.examId === examId && f.questionId === q.id).length,
    };
    if (q.kind === "mark") {
      const counts = Array.from({ length: (q.choices?.length ?? 4) + 1 }, () => 0);
      for (const a of list) {
        const v = Number(a.answers[q.id] ?? 0);
        counts[Number.isInteger(v) && v >= 0 && v < counts.length ? v : 0]++;
      }
      stat.choiceCounts = counts;
    } else {
      const wrong = new Map<string, number>();
      for (const a of list) {
        if (a.results.find((r) => r.id === q.id)?.correct) continue;
        const t = String(a.answers[q.id] ?? "").trim().toLowerCase() || "（無解答）";
        wrong.set(t, (wrong.get(t) ?? 0) + 1);
      }
      stat.topWrong = [...wrong.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([text, count]) => ({ text, count }));
    }
    return stat;
  });
}
