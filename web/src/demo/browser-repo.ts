// デモ版: API の永続化層をブラウザの localStorage に置き換える（端末内だけに保存）
import type { AttemptDetail, PhotoJob, Profile } from "../../../shared/types";
import type { RawStats } from "../../../shared/stats";
import type { FeedbackRecord, Repo } from "../../../api/src/repo";

interface Data {
  attempts: Record<string, AttemptDetail[]>;
  firsts: Record<string, string>;
  stats: Record<string, RawStats>;
  profiles: Record<string, Profile>;
  guests?: { clientId: string; attempt: AttemptDetail }[];
  feedback?: FeedbackRecord[];
  photoJobs?: Record<string, PhotoJob[]>;
  seeded?: number;
}

const KEY = "moshi.demo.data.v1";
const empty = (): Data => ({ attempts: {}, firsts: {}, stats: {}, profiles: {} });

export class BrowserRepo implements Repo {
  data: Data = empty();
  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...empty(), ...JSON.parse(raw) };
    } catch {
      /* 保存できない環境ではメモリだけで動く */
    }
  }
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* 同上 */
    }
  }
  reset() {
    this.data = empty();
    this.save();
  }
  async putAttempt(userId: string, attempt: AttemptDetail) {
    (this.data.attempts[userId] ??= []).push(attempt);
    this.save();
  }
  async listAttempts(userId: string) {
    return [...(this.data.attempts[userId] ?? [])].sort((a, b) => b.attemptId.localeCompare(a.attemptId));
  }
  async getAttempt(userId: string, attemptId: string) {
    return this.data.attempts[userId]?.find((a) => a.attemptId === attemptId);
  }
  async recordFirstAttempt(examId: string, userId: string, attemptId: string, score: number, bucket: number, sectionScores: Record<string, number>) {
    const key = `${examId}#${userId}`;
    if (this.data.firsts[key]) return false;
    this.data.firsts[key] = attemptId;
    const s = (this.data.stats[examId] ??= { count: 0, sum: 0, sumSq: 0, buckets: {}, sectionSums: {} });
    s.count += 1;
    s.sum += score;
    s.sumSq += score * score;
    s.buckets[bucket] = (s.buckets[bucket] ?? 0) + 1;
    for (const [k, v] of Object.entries(sectionScores)) s.sectionSums[k] = (s.sectionSums[k] ?? 0) + v;
    this.save();
    return true;
  }
  async getStats(examId: string): Promise<RawStats> {
    return this.data.stats[examId] ?? { count: 0, sum: 0, sumSq: 0, buckets: {}, sectionSums: {} };
  }
  async getProfile(userId: string) {
    return this.data.profiles[userId] ?? {};
  }
  async putProfile(userId: string, profile: Profile) {
    this.data.profiles[userId] = profile;
    this.save();
  }
  async putGuestAttempt(clientId: string, attempt: AttemptDetail) {
    (this.data.guests ??= []).push({ clientId, attempt });
    this.save();
  }
  async putFeedback(item: FeedbackRecord) {
    (this.data.feedback ??= []).push(item);
    this.save();
  }
  async putPhotoJob(userId: string, job: PhotoJob) {
    const list = ((this.data.photoJobs ??= {})[userId] ??= []);
    const i = list.findIndex((j) => j.jobId === job.jobId);
    if (i >= 0) list[i] = job;
    else list.push(job);
    this.save();
  }
  async getPhotoJob(userId: string, jobId: string) {
    return this.data.photoJobs?.[userId]?.find((j) => j.jobId === jobId);
  }
  async countPhotoJobs(userId: string, since: string) {
    return (this.data.photoJobs?.[userId] ?? []).filter((j) => j.createdAt >= since).length;
  }
}
