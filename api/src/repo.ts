import type { AttemptDetail, FeedbackRequest, PhotoJob, Profile } from "../../shared/types";
import type { RawStats } from "../../shared/stats";

/** 永続化層の抽象。本番は DynamoDB、ローカルはメモリ（JSONファイル保存） */
export interface Repo {
  putAttempt(userId: string, attempt: AttemptDetail): Promise<void>;
  listAttempts(userId: string): Promise<AttemptDetail[]>;
  getAttempt(userId: string, attemptId: string): Promise<AttemptDetail | undefined>;
  /**
   * その模試の初回受験なら、母集団への登録と集計値の加算を「原子的に」行い true を返す。
   * 2回目以降は何もせず false（偏差値の母集団は 1ユーザー1回）。
   */
  recordFirstAttempt(
    examId: string,
    userId: string,
    attemptId: string,
    score: number,
    bucket: number,
    sectionScores: Record<string, number>,
  ): Promise<boolean>;
  getStats(examId: string): Promise<RawStats>;
  getProfile(userId: string): Promise<Profile>;
  putProfile(userId: string, profile: Profile): Promise<void>;
  /** 登録なし受験の匿名記録（KPI・設問の分析用） */
  putGuestAttempt(clientId: string, attempt: AttemptDetail): Promise<void>;
  putFeedback(item: FeedbackRecord): Promise<void>;
  putPhotoJob(userId: string, job: PhotoJob): Promise<void>;
  getPhotoJob(userId: string, jobId: string): Promise<PhotoJob | undefined>;
  /** since（ISO）以降に作った撮影採点のジョブ数 */
  countPhotoJobs(userId: string, since: string): Promise<number>;
  /**
   * 回数制限用のカウンタ。key の bucket（時間枠の名前）の回数を1増やし、増やした後の回数を返す。
   * ttlSec 後に自動で消える
   */
  hit(key: string, bucket: string, ttlSec: number): Promise<number>;

  // ---------- 運営の管理画面用（件数が少ない検証期間向け。全件を読む） ----------
  /** since 以降の受験（ゲスト・ログインユーザーの両方） */
  listAllAttempts(since: string): Promise<{ who: string; attempt: AttemptDetail }[]>;
  listFeedback(since: string): Promise<FeedbackRecord[]>;
  listAllPhotoJobs(since: string): Promise<PhotoJob[]>;
}

export interface FeedbackRecord extends FeedbackRequest {
  createdAt: string;
  userId?: string;
}

/** 時刻順に並ぶ受験ID（ソートキーにそのまま使える） */
export function newAttemptId(now = Date.now()): string {
  const rand = crypto.getRandomValues(new Uint32Array(2));
  return `${now.toString(36).padStart(9, "0")}-${rand[0].toString(36)}${rand[1].toString(36)}`;
}
