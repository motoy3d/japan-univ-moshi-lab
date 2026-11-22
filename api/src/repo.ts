import type { AttemptDetail, Profile } from "../../shared/types";
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
}

/** 時刻順に並ぶ受験ID（ソートキーにそのまま使える） */
export function newAttemptId(now = Date.now()): string {
  const rand = crypto.getRandomValues(new Uint32Array(2));
  return `${now.toString(36).padStart(9, "0")}-${rand[0].toString(36)}${rand[1].toString(36)}`;
}
