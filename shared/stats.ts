import type { ExamStats } from "./types";

export const BUCKET_SIZE = 10;

/** 偏差値を出すのに必要な最小人数（これ未満は参考値扱い） */
export const MIN_POPULATION_FOR_DEVIATION = 2;
/** 偏差値を「信頼できる」と表示する人数の目安 */
export const RELIABLE_POPULATION = 30;

export interface RawStats {
  count: number;
  sum: number;
  sumSq: number;
  buckets: Record<number, number>;
  sectionSums: Record<string, number>;
}

export function bucketOf(score: number, maxScore: number): number {
  const last = Math.ceil(maxScore / BUCKET_SIZE) - 1;
  return Math.min(Math.floor(score / BUCKET_SIZE), last);
}

export function toExamStats(examId: string, maxScore: number, raw: RawStats): ExamStats {
  const n = raw.count;
  const mean = n > 0 ? raw.sum / n : 0;
  // 母標準偏差（模試の偏差値は母集団全体で計算するのが通例）
  const variance = n > 0 ? Math.max(raw.sumSq / n - mean * mean, 0) : 0;
  const nb = Math.ceil(maxScore / BUCKET_SIZE);
  const histogram = Array.from({ length: nb }, (_, i) => raw.buckets[i] ?? 0);
  const sectionMeans: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw.sectionSums)) sectionMeans[k] = n > 0 ? v / n : 0;
  return {
    examId,
    count: n,
    mean,
    sd: Math.sqrt(variance),
    maxScore,
    histogram,
    bucketSize: BUCKET_SIZE,
    sectionMeans,
  };
}

/** 偏差値 = 50 + 10 × (得点 − 平均) / 標準偏差 */
export function deviationScore(score: number, stats: ExamStats): number | null {
  if (stats.count < MIN_POPULATION_FOR_DEVIATION || stats.sd < 1e-9) return null;
  const d = 50 + (10 * (score - stats.mean)) / stats.sd;
  return Math.round(d * 10) / 10;
}

/** ヒストグラムから「上位何%」を推定（同じ帯の中は一様分布と仮定） */
export function topPercent(score: number, stats: ExamStats): number | null {
  if (stats.count < MIN_POPULATION_FOR_DEVIATION) return null;
  const b = bucketOf(score, stats.maxScore);
  let above = 0;
  for (let i = b + 1; i < stats.histogram.length; i++) above += stats.histogram[i];
  const lo = b * stats.bucketSize;
  const hi = Math.min(lo + stats.bucketSize, stats.maxScore);
  const frac = hi > lo ? (hi - score) / (hi - lo) : 0;
  above += stats.histogram[b] * Math.max(0, Math.min(1, frac));
  const pct = (above / stats.count) * 100;
  return Math.max(0.1, Math.round(pct * 10) / 10);
}

/** 目標偏差値に必要な得点（現在の母集団で換算）。母集団が小さい間は null */
export function scoreForDeviation(goal: number, stats: ExamStats): number | null {
  if (stats.count < MIN_POPULATION_FOR_DEVIATION || stats.sd < 1e-9) return null;
  return Math.min(stats.maxScore, Math.max(0, Math.ceil(stats.mean + (stats.sd * (goal - 50)) / 10)));
}
