// モチベーション表示用の小さな部品（リング、カウントアップ、カウントダウン、伸びしろ）
import { useEffect, useState } from "react";
import type { PartScore } from "../../../shared/types";

/** 得点率などを示す円形ゲージ */
export function Ring({ value, max, size = 132, label, sub }: { value: number; max: number; size?: number; label: string; sub?: string }) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
        {pct > 0 && <circle
          cx={size / 2} cy={size / 2} r={r} className="ring-fill"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />}
      </svg>
      <div className="ring-text">
        <b>{label}</b>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

/** 数値を 0 からカウントアップ表示（動きを減らす設定なら即表示） */
export function CountUp({ to, decimals = 0, ms = 900 }: { to: number; decimals?: number; ms?: number }) {
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) return setV(to);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, reduce]);
  return <>{v.toFixed(decimals)}</>;
}

export function daysUntil(date?: string): number | null {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 864e5);
}

/** 失点の大きい分野＝伸びしろ。上位 n 件 */
export function opportunities(categories: PartScore[], n = 3) {
  return [...categories]
    .map((c) => ({ ...c, lost: c.max - c.score }))
    .filter((c) => c.lost > 0)
    .sort((a, b) => b.lost - a.lost || a.score / a.max - b.score / b.max)
    .slice(0, n);
}

/** 得点率に応じた一言（事実ベースで前向きに） */
export function cheer(pct: number, first = true): { title: string; body: string } {
  if (pct >= 0.8)
    return { title: "合格ラインの目安を突破", body: "一般に目安と言われる8割を超えました。本番まで、この精度とスピードを保ちましょう。" };
  if (pct >= 0.65)
    return { title: "あと一歩で合格圏", body: "8割まであと少し。失点の多い分野を1つ潰すだけで届く位置です。" };
  if (pct >= 0.5)
    return { title: "土台はできています", body: "得点源を作る段階です。下の「伸びしろ」から1分野ずつ固めていきましょう。" };
  return first
    ? { title: "ここがスタートライン", body: "最初の1回は現在地を知るためのもの。解説を読み、伸びしろの大きい分野から取り組みましょう。" }
    : { title: "解き直しが、いちばん効きます", body: "間違えた問題の解説を読み、伸びしろの大きい分野から1つずつ固めていきましょう。" };
}
