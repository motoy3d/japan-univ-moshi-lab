import type { AttemptDetail } from "../../shared/types";
import type { RawStats } from "../../shared/stats";

/** 永続化層の抽象。本番は DynamoDB、ローカルはメモリ（JSONファイル保存） */
export interface Repo {
  putAttempt(userId: string, attempt: AttemptDetail): Promise<void>;
  listAttempts(userId: string): Promise<AttemptDetail[]>;
  getAttempt(userId: string, attemptId: string): Promise<AttemptDetail | undefined>;
  /**
   * その模試の初回受験なら母集団に登録して true を返す（2回目以降は false）。
   * 偏差値の母集団は「1ユーザー1回（初回）」とする。
   */
  claimFirstAttempt(examId: string, userId: string, attemptId: string): Promise<boolean>;
  addToStats(
    examId: string,
    score: number,
    bucket: number,
    sectionScores: Record<string, number>,
  ): Promise<void>;
  getStats(examId: string): Promise<RawStats>;
}
