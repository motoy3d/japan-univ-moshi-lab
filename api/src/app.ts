import { EXAMS, findExam } from "../../content/index";
import { allQuestions, scoreExam, stripAnswers } from "../../shared/scoring";
import { bucketOf, deviationScore, toExamStats, topPercent } from "../../shared/stats";
import type {
  AttemptDetail,
  AttemptReview,
  AttemptSummary,
  ExamListItem,
  Profile,
  SubmitAttemptRequest,
} from "../../shared/types";
import { newAttemptId, type Repo } from "./repo";

export interface ApiResponse {
  status: number;
  body: unknown;
}

const ok = (body: unknown): ApiResponse => ({ status: 200, body });
const err = (status: number, message: string): ApiResponse => ({ status, body: { message } });

async function currentStats(repo: Repo, examId: string) {
  const exam = findExam(examId)!;
  return toExamStats(examId, exam.totalPoints, await repo.getStats(examId));
}

/** ルーティング本体。Lambda とローカルサーバの両方から呼ばれる */
export async function route(
  repo: Repo,
  method: string,
  path: string,
  userId: string | undefined,
  rawBody: string | undefined,
): Promise<ApiResponse> {
  const p = path.replace(/^\/api/, "").replace(/\/+$/, "") || "/";
  if (method === "GET" && p === "/health") return ok({ ok: true });
  if (!userId) return err(401, "ログインが必要です");

  // GET /exams
  if (method === "GET" && p === "/exams") {
    const list: ExamListItem[] = EXAMS.map(({ sections: _s, ...meta }) => ({
      ...meta,
      questionCount: allQuestions(findExam(meta.id)!).length,
    }));
    return ok(list);
  }

  // GET /exams/:id （正解を除いた問題）
  let m = p.match(/^\/exams\/([\w-]+)$/);
  if (method === "GET" && m) {
    const exam = findExam(m[1]);
    return exam ? ok(stripAnswers(exam)) : err(404, "模試が見つかりません");
  }

  // GET /exams/:id/stats
  m = p.match(/^\/exams\/([\w-]+)\/stats$/);
  if (method === "GET" && m) {
    if (!findExam(m[1])) return err(404, "模試が見つかりません");
    return ok(await currentStats(repo, m[1]));
  }

  // POST /attempts （採点して保存）
  if (method === "POST" && p === "/attempts") {
    let req: SubmitAttemptRequest;
    try {
      req = JSON.parse(rawBody ?? "");
    } catch {
      return err(400, "リクエストが不正です");
    }
    const exam = findExam(req?.examId);
    if (!exam) return err(404, "模試が見つかりません");
    if (typeof req.answers !== "object" || req.answers === null) return err(400, "解答がありません");

    // 解答を既知の問題IDだけに絞り、長さを制限する
    const answers: AttemptDetail["answers"] = {};
    for (const q of allQuestions(exam)) {
      const v = req.answers[q.id];
      if (v === undefined || v === null || v === "") continue;
      answers[q.id] = q.kind === "mark" ? Number(v) : String(v).slice(0, 60);
    }
    const scored = scoreExam(exam, answers);
    const attemptId = newAttemptId();
    const sec = Object.fromEntries(scored.sections.map((s) => [s.key, s.score]));
    const counted = await repo.recordFirstAttempt(exam.id, userId, attemptId, scored.score, bucketOf(scored.score, exam.totalPoints), sec);
    const stats = await currentStats(repo, exam.id);
    const attempt: AttemptDetail = {
      attemptId,
      examId: exam.id,
      examTitle: `${exam.edition} ${exam.title}`,
      createdAt: new Date().toISOString(),
      mode: req.mode === "paper" ? "paper" : "web",
      durationSec: Math.max(0, Math.min(Math.round(Number(req.durationSec) || 0), 6 * 3600)),
      score: scored.score,
      maxScore: scored.maxScore,
      deviation: deviationScore(scored.score, stats),
      population: stats.count,
      counted,
      sections: scored.sections,
      categories: scored.categories,
      answers,
      results: scored.results,
    };
    await repo.putAttempt(userId, attempt);
    return ok({ attemptId });
  }

  // GET /attempts （自分の受験履歴）
  if (method === "GET" && p === "/attempts") {
    const list = await repo.listAttempts(userId);
    const summaries: AttemptSummary[] = list.map(({ answers: _a, results: _r, ...s }) => s);
    return ok(summaries);
  }

  // GET /attempts/:id （結果・解説）
  m = p.match(/^\/attempts\/([\w-]+)$/);
  if (method === "GET" && m) {
    const attempt = await repo.getAttempt(userId, m[1]);
    if (!attempt) return err(404, "受験記録が見つかりません");
    const exam = findExam(attempt.examId);
    if (!exam) return err(404, "模試が見つかりません");
    const stats = await currentStats(repo, exam.id);
    const review: AttemptReview = {
      attempt,
      exam,
      stats,
      currentDeviation: deviationScore(attempt.score, stats),
      topPercent: topPercent(attempt.score, stats),
    };
    return ok(review);
  }

  // GET /me ・ PUT /me （目標設定）
  if (p === "/me" && method === "GET") return ok(await repo.getProfile(userId));
  if (p === "/me" && method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody ?? "");
    } catch {
      return err(400, "リクエストが不正です");
    }
    const profile: Profile = {};
    if (typeof body.nickname === "string" && body.nickname.trim()) profile.nickname = body.nickname.trim().slice(0, 20);
    const g = Number(body.goalDeviation);
    if (body.goalDeviation != null && Number.isFinite(g)) profile.goalDeviation = Math.min(80, Math.max(40, Math.round(g)));
    if (typeof body.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.examDate)) profile.examDate = body.examDate;
    await repo.putProfile(userId, profile);
    return ok(profile);
  }

  return err(404, "Not Found");
}
