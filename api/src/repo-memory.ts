import fs from "node:fs";
import type { AttemptDetail, PhotoJob, Profile } from "../../shared/types";
import type { RawStats } from "../../shared/stats";
import type { FeedbackRecord, Repo } from "./repo";

interface Data {
  attempts: Record<string, AttemptDetail[]>;
  firsts: Record<string, string>;
  stats: Record<string, RawStats>;
  profiles: Record<string, Profile>;
  guests?: { clientId: string; attempt: AttemptDetail }[];
  feedback?: FeedbackRecord[];
  photoJobs?: Record<string, PhotoJob[]>;
  hits?: Record<string, number>;
}

/** ローカル開発・テスト用。file を渡すと JSON に保存して再起動後も残す */
export class MemoryRepo implements Repo {
  data: Data = { attempts: {}, firsts: {}, stats: {}, profiles: {} };
  constructor(private file?: string) {
    if (file && fs.existsSync(file)) this.data = { ...this.data, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  }
  private save() {
    if (this.file) fs.writeFileSync(this.file, JSON.stringify(this.data));
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
  async hit(key: string, bucket: string) {
    const k = `${key}#${bucket}`;
    const hits = (this.data.hits ??= {});
    hits[k] = (hits[k] ?? 0) + 1;
    this.save();
    return hits[k];
  }
  async listAllAttempts(since: string) {
    const users = Object.entries(this.data.attempts).flatMap(([u, list]) => list.map((attempt) => ({ who: `user:${u}`, attempt })));
    const guests = (this.data.guests ?? []).map((g) => ({ who: `guest:${g.clientId}`, attempt: g.attempt }));
    return [...users, ...guests].filter((x) => x.attempt.createdAt >= since);
  }
  async listFeedback(since: string) {
    return (this.data.feedback ?? []).filter((f) => f.createdAt >= since);
  }
  async listAllPhotoJobs(since: string) {
    return Object.values(this.data.photoJobs ?? {}).flat().filter((j) => j.createdAt >= since);
  }
}
