import { useEffect, useState } from "react";

/** 非同期取得の簡易フック */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    fn().then(
      (data) => alive && setState({ data, loading: false }),
      (e: Error) => alive && setState({ error: e.message, loading: false }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export const fmtDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s.toString().padStart(2, "0")}秒`;
};

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** localStorage を例外安全に扱う */
export const store = {
  get<T>(k: string): T | null {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* noop */
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* noop */
    }
  },
};
