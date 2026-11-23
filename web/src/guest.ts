// 登録なし受験: 端末ごとの匿名ID と、端末内に保存する受験結果。
// ログインしたら、端末内の結果を自分の履歴へ取り込む（偏差値の母集団には入れない）。
import { api } from "./api";
import { store } from "./hooks";
import type { AttemptReview } from "../../shared/types";

const CLIENT_KEY = "moshi.clientId";
const RESULTS_KEY = "moshi.guest.results.v1";
const COUNT_KEY = "moshi.attemptCount";
const MAX_RESULTS = 10;

export function clientId(): string {
  let id = store.get<string>(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    store.set(CLIENT_KEY, id);
  }
  return id;
}

export interface LocalResult {
  id: string;
  review: AttemptReview;
  imported?: boolean;
}

export const localResults = (): LocalResult[] => store.get<LocalResult[]>(RESULTS_KEY) ?? [];

export function saveLocalResult(review: AttemptReview): string {
  const id = review.attempt.attemptId;
  const list = [{ id, review }, ...localResults().filter((r) => r.id !== id)].slice(0, MAX_RESULTS);
  store.set(RESULTS_KEY, list);
  return id;
}

export const getLocalResult = (id: string) => localResults().find((r) => r.id === id);

/** この端末での提出回数（2回目受験率の計測用） */
export function bumpAttemptCount(): number {
  const n = (store.get<number>(COUNT_KEY) ?? 0) + 1;
  store.set(COUNT_KEY, n);
  return n;
}

/** ログイン後: まだ取り込んでいない端末内の結果を履歴に取り込む。取り込んだ件数を返す */
export async function importLocalResults(): Promise<number> {
  const list = localResults();
  let n = 0;
  for (const r of list) {
    if (r.imported) continue;
    const a = r.review.attempt;
    try {
      await api.submit({ examId: a.examId, answers: a.answers, durationSec: a.durationSec, mode: a.mode, imported: true, createdAt: a.createdAt });
      r.imported = true;
      n++;
    } catch {
      break; // 通信エラーなどは次回に再試行
    }
  }
  store.set(RESULTS_KEY, list);
  return n;
}
