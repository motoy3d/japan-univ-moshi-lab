import fs from "node:fs";
import type { AttemptDetail } from "../../shared/types";
import type { RawStats } from "../../shared/stats";
import type { Repo } from "./repo";

interface Data {
  attempts: Record<string, AttemptDetail[]>;
  firsts: Record<string, string>;
  stats: Record<string, RawStats>;
}

/** ローカル開発用。file を渡すと JSON に保存して再起動後も残す */
export class MemoryRepo implements Repo {
  private data: Data = { attempts: {}, firsts: {}, stats: {} };
  constructor(private file?: string) {
    if (file && fs.existsSync(file)) this.data = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  private save() {
    if (this.file) fs.writeFileSync(this.file, JSON.stringify(this.data));
  }
  async putAttempt(userId: string, attempt: AttemptDetail) {
    (this.data.attempts[userId] ??= []).push(attempt);
    this.save();
  }
  async listAttempts(userId: string) {
    return [...(this.data.attempts[userId] ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getAttempt(userId: string, attemptId: string) {
    return this.data.attempts[userId]?.find((a) => a.attemptId === attemptId);
  }
  async claimFirstAttempt(examId: string, userId: string, attemptId: string) {
    const key = `${examId}#${userId}`;
    if (this.data.firsts[key]) return false;
    this.data.firsts[key] = attemptId;
    this.save();
    return true;
  }
  async addToStats(examId: string, score: number, bucket: number, sectionScores: Record<string, number>) {
    const s = (this.data.stats[examId] ??= { count: 0, sum: 0, sumSq: 0, buckets: {}, sectionSums: {} });
    s.count += 1;
    s.sum += score;
    s.sumSq += score * score;
    s.buckets[bucket] = (s.buckets[bucket] ?? 0) + 1;
    for (const [k, v] of Object.entries(sectionScores)) s.sectionSums[k] = (s.sectionSums[k] ?? 0) + v;
    this.save();
  }
  async getStats(examId: string): Promise<RawStats> {
    return this.data.stats[examId] ?? { count: 0, sum: 0, sumSq: 0, buckets: {}, sectionSums: {} };
  }
}
