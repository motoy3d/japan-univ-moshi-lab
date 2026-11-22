// 単一系列のチャート群（色は1色 + 「あなた」の強調のみ。数値はテキスト色で表示）
import type { ExamStats, PartScore } from "../../../shared/types";

/** 得点分布ヒストグラム。自分の帯を強調 */
export function Histogram({ stats, myScore }: { stats: ExamStats; myScore: number }) {
  const W = 640, H = 220, L = 32, R = 8, T = 12, B = 34;
  const n = stats.histogram.length;
  const maxC = Math.max(1, ...stats.histogram);
  const step = (W - L - R) / n;
  const bw = Math.max(2, step - 2); // 2px の隙間
  const my = Math.min(Math.floor(myScore / stats.bucketSize), n - 1);
  const y = (c: number) => T + (H - T - B) * (1 - c / maxC);
  const ticks = niceTicks(maxC);
  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="得点分布">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text x={L - 6} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        {stats.histogram.map((c, i) => {
          const x = L + i * step + 1;
          const lo = i * stats.bucketSize;
          const hi = i === n - 1 ? stats.maxScore : lo + stats.bucketSize - 1;
          const h = H - B - y(c);
          return (
            <g key={i}>
              <title>{`${lo}〜${hi}点: ${c}人${i === my ? "（あなた）" : ""}`}</title>
              <rect x={x - 1} y={T} width={step} height={H - T - B} fill="transparent" />
              {c > 0 && (
                <path
                  d={roundTop(x, y(c), bw, h, Math.min(4, h))}
                  fill={i === my ? "var(--chart-bar)" : "var(--chart-other)"}
                />
              )}
              {i % 2 === 0 && (
                <text x={x + bw / 2} y={H - B + 14} textAnchor="middle">{lo}</text>
              )}
            </g>
          );
        })}
        <line className="axis" x1={L} x2={W - R} y1={H - B} y2={H - B} />
        <text x={W - R} y={H - 4} textAnchor="end">得点 →</text>
      </svg>
      <div className="legend">
        <span><i style={{ background: "var(--chart-bar)" }} />あなたの得点帯</span>
        <span><i style={{ background: "var(--chart-other)" }} />その他（人数）</span>
      </div>
    </figure>
  );
}

function roundTop(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function niceTicks(max: number): number[] {
  const step = max <= 5 ? 1 : max <= 10 ? 2 : Math.ceil(max / 5 / 5) * 5;
  const out = [];
  for (let t = 0; t <= max; t += step) out.push(t);
  return out;
}

/** 横棒（得点率）+ 任意で平均マーカー */
export function PartBars({ parts, means }: { parts: PartScore[]; means?: Record<string, number> }) {
  return (
    <div className="hbar-list">
      {parts.map((p) => {
        const pct = p.max ? (p.score / p.max) * 100 : 0;
        const mean = means?.[p.key];
        return (
          <div className="hbar" key={p.key} title={`${p.label}: ${p.score}/${p.max}点（${p.correct}/${p.total}問正解）${mean !== undefined ? ` 平均 ${mean.toFixed(1)}点` : ""}`}>
            <span>{p.label}</span>
            <span className="track">
              <span className="fill" style={{ width: `${pct}%` }} />
              {mean !== undefined && p.max > 0 && <span className="mean" style={{ left: `${(mean / p.max) * 100}%` }} />}
            </span>
            <span className="val">{p.score}/{p.max}</span>
          </div>
        );
      })}
      {means && (
        <div className="legend">
          <span><i style={{ background: "var(--chart-bar)" }} />あなたの得点</span>
          <span><i style={{ background: "var(--ink)", width: 2 }} />受験者平均</span>
        </div>
      )}
    </div>
  );
}

/** 得点率の推移（折れ線） */
export function TrendLine({ points }: { points: { label: string; value: number; sub?: string }[] }) {
  const W = 640, H = 200, L = 36, R = 16, T = 12, B = 30;
  const n = points.length;
  const x = (i: number) => (n === 1 ? (L + W - R) / 2 : L + ((W - L - R) * i) / (n - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / 100);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="得点率の推移">
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line className="grid-line" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
          <text x={L - 6} y={y(t) + 4} textAnchor="end">{t}%</text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--chart-bar)" strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <title>{`${p.label}: ${p.value.toFixed(1)}%${p.sub ? ` / ${p.sub}` : ""}`}</title>
          <circle cx={x(i)} cy={y(p.value)} r={12} fill="transparent" />
          <circle cx={x(i)} cy={y(p.value)} r={4.5} fill="var(--chart-bar)" stroke="var(--surface)" strokeWidth={2} />
          {(i === n - 1 || n <= 6) && <text x={x(i)} y={H - B + 16} textAnchor="middle">{p.label}</text>}
        </g>
      ))}
      {n > 0 && (
        <text x={x(n - 1)} y={y(points[n - 1].value) - 10} textAnchor="middle" style={{ fill: "var(--ink)", fontWeight: 700 }}>
          {points[n - 1].value.toFixed(0)}%
        </text>
      )}
    </svg>
  );
}
