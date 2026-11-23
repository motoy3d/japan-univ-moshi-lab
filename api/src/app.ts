import { EXAMS, findExam } from "../../content/index";
import { findTarget } from "../../content/admissions";

/** 志望校の登録上限 */
const MAX_TARGETS = 3;
import { allQuestions, scoreExam, stripAnswers } from "../../shared/scoring";
import { bucketOf, deviationScore, toExamStats, topPercent } from "../../shared/stats";
import {
  FEEDBACK_REASONS,
  type AttemptDetail,
  type AttemptReview,
  type AttemptSummary,
  type ExamListItem,
  type ExamWithKey,
  type FeedbackRequest,
  type GuestSubmitRequest,
  type PhotoJob,
  type PhotoJobRequest,
  type Profile,
  type SubmitAttemptRequest,
} from "../../shared/types";
import { newAttemptId, type FeedbackRecord, type Repo } from "./repo";
import { itemStats, summarize } from "./admin";

export interface ApiResponse {
  status: number;
  body: unknown;
}

/** ボット的な提出の判定（不正対策ではなく、偏差値の母集団を守るための最低限のフィルタ） */
export const BOT_GUARD = {
  /** 1ユーザーが24時間に提出できる回数 */
  dailySubmitLimit: 20,
  /** これより短い所要時間の提出は母集団に含めない（90分の試験を数分で解き終えるのは不自然） */
  minSecondsForPopulation: 15 * 60,
  /** 解答した設問の割合がこれ未満の提出は母集団に含めない（ほぼ白紙） */
  minAnsweredRatio: 0.3,
};

/** 撮影採点: 1人が24時間に使える回数 */
export const PHOTO_DAILY_LIMIT = 5;
/** 撮影採点: 画像1枚あたりの上限（Base64 の文字数。端末で長辺2000pxの JPEG に縮小してから送る） */
const PHOTO_MAX_B64 = 3_000_000;

/**
 * 登録なしで使える API の回数制限（濫用・費用の暴走を防ぐ）。
 * 端末ID は作り直せるので、送信元 IP でも数える。学校など同じ IP から大勢が使う場合を考え、IP の上限は大きめ。
 */
export const LIMITS = {
  guestPerClientPerDay: 30,
  guestPerIpPerDay: 300,
  feedbackPerIpPerDay: 100,
  /** 撮影採点のサービス全体の1日の上限（API 費用の上限になる） */
  photoTotalPerDay: 300,
};

/** リクエストごとの情報（Lambda がオーソライザのクレームと送信元から作る） */
export interface RequestContext {
  /** Cognito の admin グループに属する（運営者） */
  admin?: boolean;
  /** 送信元 IP（回数制限に使う。保存はしない） */
  ip?: string;
  /** Cognito のユーザー名（退会でアカウントを消すのに使う） */
  username?: string;
}

/** 環境ごとに差し替える外部処理（本番: S3 + 読み取り用 Lambda。ローカル・デモ: なし） */
export interface Services {
  photo?: { start(userId: string, job: PhotoJob, images: string[]): Promise<void> };
  /** 退会時にログイン用のアカウント（Cognito）を削除する */
  deleteAccount?: (username: string) => Promise<void>;
}

const ok = (body: unknown): ApiResponse => ({ status: 200, body });
const err = (status: number, message: string): ApiResponse => ({ status, body: { message } });

async function currentStats(repo: Repo, examId: string) {
  const exam = findExam(examId)!;
  return toExamStats(examId, exam.totalPoints, await repo.getStats(examId));
}

function parse<T>(rawBody: string | undefined): T | undefined {
  try {
    return JSON.parse(rawBody ?? "") as T;
  } catch {
    return undefined;
  }
}

/** 解答を既知の設問だけに絞って採点し、母集団に入れない理由（あれば）を判定する */
function grade(exam: ExamWithKey, req: SubmitAttemptRequest) {
  const answers: AttemptDetail["answers"] = {};
  for (const q of allQuestions(exam)) {
    const v = req.answers[q.id];
    if (v === undefined || v === null || v === "") continue;
    answers[q.id] = q.kind === "mark" ? Number(v) : String(v).slice(0, 60);
  }
  const scored = scoreExam(exam, answers);
  const durationSec = Math.max(0, Math.min(Math.round(Number(req.durationSec) || 0), 6 * 3600));
  const answeredRatio = Object.keys(answers).length / allQuestions(exam).length;
  // 演習（短時間の試験）は時間の下限を試験時間の1/6 にする
  const minSec = Math.min(BOT_GUARD.minSecondsForPopulation, (exam.durationMin * 60) / 6);
  const excludedReason = req.imported
    ? "ログイン前の受験を取り込んだため"
    : durationSec < minSec
      ? `所要時間が${Math.round(minSec / 60)}分未満のため`
      : answeredRatio < BOT_GUARD.minAnsweredRatio
        ? `解答した設問が${Math.round(BOT_GUARD.minAnsweredRatio * 100)}%未満のため`
        : undefined;
  return { answers, scored, durationSec, excludedReason };
}

async function makeAttempt(repo: Repo, exam: ExamWithKey, req: SubmitAttemptRequest, populationKey: string): Promise<AttemptDetail> {
  const { answers, scored, durationSec, excludedReason } = grade(exam, req);
  const attemptId = newAttemptId();
  const sec = Object.fromEntries(scored.sections.map((s) => [s.key, s.score]));
  // ボット的な提出・取り込みは母集団に入れない（「初回」の枠も消費しないので、次のまともな受験が初回扱いになる）
  const counted = excludedReason
    ? false
    : await repo.recordFirstAttempt(exam.id, populationKey, attemptId, scored.score, bucketOf(scored.score, exam.totalPoints), sec);
  const stats = await currentStats(repo, exam.id);
  const created = req.imported && typeof req.createdAt === "string" && !Number.isNaN(Date.parse(req.createdAt)) && Date.parse(req.createdAt) <= Date.now()
    ? new Date(req.createdAt).toISOString()
    : new Date().toISOString();
  return {
    attemptId,
    examId: exam.id,
    examTitle: exam.kind === "practice" ? exam.title : `${exam.edition} ${exam.title}`,
    createdAt: created,
    mode: req.mode === "paper" ? "paper" : "web",
    durationSec,
    score: scored.score,
    maxScore: scored.maxScore,
    deviation: deviationScore(scored.score, stats),
    population: stats.count,
    counted,
    ...(excludedReason ? { excludedReason } : {}),
    sections: scored.sections,
    categories: scored.categories,
    answers,
    results: scored.results,
  };
}

async function review(repo: Repo, attempt: AttemptDetail, exam: ExamWithKey): Promise<AttemptReview> {
  const stats = await currentStats(repo, exam.id);
  return { attempt, exam, stats, currentDeviation: deviationScore(attempt.score, stats), topPercent: topPercent(attempt.score, stats) };
}

const CLIENT_ID = /^[\w-]{8,64}$/;

/** ルーティング本体。Lambda とローカルサーバの両方から呼ばれる */
export async function route(
  repo: Repo,
  method: string,
  path: string,
  userId: string | undefined,
  rawBody: string | undefined,
  services: Services = {},
  ctx: RequestContext = {},
): Promise<ApiResponse> {
  const today = new Date().toISOString().slice(0, 10);
  /** 1日の回数制限。上限を超えたら true */
  const over = async (key: string, limit: number) => (await repo.hit(key, today, 2 * 86400)) > limit;
  const p = path.replace(/^\/api/, "").replace(/\/+$/, "") || "/";
  if (method === "GET" && p === "/health") return ok({ ok: true });

  // ---------- ここから登録なしで使える ----------

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

  // POST /guest/attempts （登録なし受験: 採点して、結果と正解・解説をまとめて返す。結果は端末に保存する）
  if (method === "POST" && p === "/guest/attempts") {
    const req = parse<GuestSubmitRequest>(rawBody);
    if (!req) return err(400, "リクエストが不正です");
    const exam = findExam(req.examId);
    if (!exam) return err(404, "模試が見つかりません");
    if (typeof req.answers !== "object" || req.answers === null) return err(400, "解答がありません");
    if (typeof req.clientId !== "string" || !CLIENT_ID.test(req.clientId)) return err(400, "リクエストが不正です");
    if ((await over(`guest:${req.clientId}`, LIMITS.guestPerClientPerDay)) || (ctx.ip && (await over(`ip:${ctx.ip}`, LIMITS.guestPerIpPerDay))))
      return err(429, "本日の提出回数の上限に達しました。明日またお試しください");
    const attempt = await makeAttempt(repo, exam, { ...req, imported: false }, `guest:${req.clientId}`);
    await repo.putGuestAttempt(req.clientId, attempt);
    return ok(await review(repo, attempt, exam));
  }

  // POST /feedback （問題への意見・満足度）
  if (method === "POST" && p === "/feedback") {
    const req = parse<FeedbackRequest>(rawBody);
    const exam = req && findExam(req.examId);
    if (!req || !exam) return err(400, "リクエストが不正です");
    if (ctx.ip && (await over(`fb:${ctx.ip}`, LIMITS.feedbackPerIpPerDay))) return err(429, "本日の送信回数の上限に達しました");
    const rec: FeedbackRecord = { type: req.type === "rating" ? "rating" : "question", examId: exam.id, createdAt: new Date().toISOString() };
    if (userId) rec.userId = userId;
    if (typeof req.clientId === "string" && CLIENT_ID.test(req.clientId)) rec.clientId = req.clientId;
    if (typeof req.attemptRef === "string") rec.attemptRef = req.attemptRef.slice(0, 64);
    if (rec.type === "rating") {
      const r = Number(req.rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) return err(400, "評価は1〜5で指定してください");
      rec.rating = r;
    } else {
      if (!req.questionId || !allQuestions(exam).some((q) => q.id === req.questionId)) return err(400, "設問の指定が不正です");
      rec.questionId = req.questionId;
      rec.reason = req.reason && req.reason in FEEDBACK_REASONS ? req.reason : "other";
    }
    if (typeof req.text === "string" && req.text.trim()) rec.text = req.text.trim().slice(0, rec.type === "rating" ? 200 : 500);
    await repo.putFeedback(rec);
    return ok({ ok: true });
  }

  // ---------- ここからログインが必要 ----------
  if (!userId) return err(401, "ログインが必要です");

  // POST /attempts （採点して保存。imported: ログイン前の受験の取り込み）
  if (method === "POST" && p === "/attempts") {
    const req = parse<SubmitAttemptRequest>(rawBody);
    if (!req) return err(400, "リクエストが不正です");
    const exam = findExam(req?.examId);
    if (!exam) return err(404, "模試が見つかりません");
    if (typeof req.answers !== "object" || req.answers === null) return err(400, "解答がありません");

    // 短時間の連続提出（スクリプトによる大量送信など）を止める
    const now = Date.now();
    const recent = (await repo.listAttempts(userId)).filter((a) => now - Date.parse(a.createdAt) < 24 * 3600 * 1000);
    if (!req.imported && recent.length >= BOT_GUARD.dailySubmitLimit)
      return err(429, `提出は24時間に${BOT_GUARD.dailySubmitLimit}回までです。時間をおいて再度お試しください`);

    const attempt = await makeAttempt(repo, exam, req, userId);
    await repo.putAttempt(userId, attempt);
    return ok({ attemptId: attempt.attemptId });
  }

  // POST /photo-jobs （撮影採点: 画像を受け取り、読み取りを非同期で始める）
  if (method === "POST" && p === "/photo-jobs") {
    if (!services.photo) return err(503, "この環境では撮影採点を使えません");
    const req = parse<PhotoJobRequest>(rawBody);
    const exam = req && findExam(req.examId);
    if (!req || !exam) return err(400, "リクエストが不正です");
    const images = Array.isArray(req.images) ? req.images : [];
    if (images.length < 1 || images.length > 2 || images.some((b) => typeof b !== "string" || b.length > PHOTO_MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(b)))
      return err(400, "画像は1〜2枚の JPEG で送ってください");
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    if ((await repo.countPhotoJobs(userId, since)) >= PHOTO_DAILY_LIMIT)
      return err(429, `撮影採点は24時間に${PHOTO_DAILY_LIMIT}回までです`);
    if (await over("photo:all", LIMITS.photoTotalPerDay)) return err(503, "本日の撮影採点の受付を終了しました。答えを手で入力して採点してください");
    const job: PhotoJob = { jobId: newAttemptId(), examId: exam.id, status: "PENDING", createdAt: new Date().toISOString() };
    await repo.putPhotoJob(userId, job);
    await services.photo.start(userId, job, images);
    return ok(job);
  }

  // GET /photo-jobs/:id
  m = p.match(/^\/photo-jobs\/([\w-]+)$/);
  if (method === "GET" && m) {
    const job = await repo.getPhotoJob(userId, m[1]);
    return job ? ok(job) : err(404, "見つかりません");
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
    return ok(await review(repo, attempt, exam));
  }

  // ---------- 運営の管理画面（Cognito の admin グループのみ） ----------
  if (p.startsWith("/admin/")) {
    if (!ctx.admin) return err(403, "権限がありません");
    const days = 60;
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
    if (method === "GET" && p === "/admin/summary") {
      const [attempts, feedback, photos] = await Promise.all([repo.listAllAttempts(since), repo.listFeedback(since), repo.listAllPhotoJobs(since)]);
      return ok(summarize(since, attempts, feedback, photos));
    }
    if (method === "GET" && p === "/admin/feedback") {
      const list = await repo.listFeedback(since);
      return ok(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 500));
    }
    m = p.match(/^\/admin\/exams\/([\w-]+)\/items$/);
    if (method === "GET" && m) {
      const [attempts, feedback] = await Promise.all([repo.listAllAttempts(since), repo.listFeedback(since)]);
      const items = itemStats(m[1], attempts.map((a) => a.attempt), feedback);
      return items ? ok(items) : err(404, "模試が見つかりません");
    }
    return err(404, "Not Found");
  }

  // DELETE /me （退会: 受験記録などのデータとログイン用のアカウントを削除）
  if (p === "/me" && method === "DELETE") {
    const deleted = await repo.deleteUserData(userId);
    if (services.deleteAccount && ctx.username) await services.deleteAccount(ctx.username);
    console.log(JSON.stringify({ msg: "account deleted", items: deleted }));
    return ok({ ok: true });
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
    if (Array.isArray(body.targets)) {
      const seen = new Set<string>();
      const targets: NonNullable<Profile["targets"]> = [];
      for (const t of body.targets.slice(0, MAX_TARGETS)) {
        const ref = { admissionId: String(t?.admissionId ?? ""), facultyId: String(t?.facultyId ?? ""), methodId: String(t?.methodId ?? "") };
        const key = `${ref.admissionId}/${ref.facultyId}/${ref.methodId}`;
        if (!findTarget(ref)) return err(400, "志望校の指定が不正です");
        if (!seen.has(key)) targets.push(ref);
        seen.add(key);
      }
      if (targets.length) profile.targets = targets;
    }
    await repo.putProfile(userId, profile);
    return ok(profile);
  }

  return err(404, "Not Found");
}
