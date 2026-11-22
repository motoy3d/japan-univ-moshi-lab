// 模試ラボのロゴ（6案）。色は currentColor（文字色）と --logo-accent（アクセント）で決まるので、配色を変えても崩れない。
import { useEffect, useState } from "react";
import { currentDesign, type Design } from "../design";

type Variant = Design["logo"];

export function LogoMark({ variant, size = 28 }: { variant: Variant; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 32 32", "aria-hidden": true } as const;
  switch (variant) {
    case "bubbles": // マークシートの楕円。真ん中だけ塗られている
      return (
        <svg {...common}>
          <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--logo-bg)" />
          {[9, 16, 23].map((x, i) => (
            <ellipse key={x} cx={x} cy="16" rx="3.2" ry="6" fill={i === 1 ? "var(--logo-accent)" : "none"} stroke="var(--logo-fg)" strokeWidth="1.6" />
          ))}
        </svg>
      );
    case "flask": // 実験のフラスコ。中身がチェックマーク
      return (
        <svg {...common}>
          <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--logo-bg)" />
          <path d="M13 7h6M14 7v6.5L8.8 22.6A2.6 2.6 0 0 0 11 26.5h10a2.6 2.6 0 0 0 2.2-3.9L18 13.5V7" fill="none" stroke="var(--logo-fg)" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M12.3 20.2l2.4 2.4 4.8-5" fill="none" stroke="var(--logo-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "growth": // 右肩上がりの棒と、塗られたマーク
      return (
        <svg {...common}>
          <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--logo-bg)" />
          <rect x="7" y="18" width="4" height="7" rx="1" fill="var(--logo-fg)" opacity="0.55" />
          <rect x="14" y="14" width="4" height="11" rx="1" fill="var(--logo-fg)" opacity="0.8" />
          <rect x="21" y="10" width="4" height="15" rx="1" fill="var(--logo-fg)" />
          <circle cx="23" cy="6.8" r="2.6" fill="var(--logo-accent)" />
        </svg>
      );
    case "ring": // スコアのリング（3/4 まで達成）と「模」
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="13" fill="var(--logo-bg)" />
          <circle cx="16" cy="16" r="10.5" fill="none" stroke="var(--logo-fg)" strokeOpacity="0.22" strokeWidth="2.6" />
          <path d="M16 5.5a10.5 10.5 0 1 1-10.5 10.5" fill="none" stroke="var(--logo-accent)" strokeWidth="2.6" strokeLinecap="round" />
          <text x="16" y="20.6" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--logo-fg)" fontFamily="var(--font-jp-serif)">模</text>
        </svg>
      );
    case "booklet": // 問題冊子。右上が折れた紙に本文の行と、塗られたマーク
      return (
        <svg {...common}>
          <path d="M7 3h13l6 6v18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="var(--logo-bg)" />
          <path d="M20 3v4.5a1.5 1.5 0 0 0 1.5 1.5H26" fill="none" stroke="var(--logo-fg)" strokeOpacity="0.5" strokeWidth="1.4" />
          <path d="M9 14h8M9 18h11M9 22h6" stroke="var(--logo-fg)" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
          <ellipse cx="20.5" cy="22" rx="2.2" ry="3.2" fill="var(--logo-accent)" />
        </svg>
      );
    default: // kanji: 漢字「模」のタイル
      return (
        <svg {...common}>
          <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--logo-bg)" />
          <text x="16" y="22.5" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--logo-fg)" fontFamily="var(--font-jp-serif)">模</text>
          <rect x="22" y="23.5" width="5" height="2.2" rx="1.1" fill="var(--logo-accent)" />
        </svg>
      );
  }
}

/** ヘッダーのロゴ（マーク＋文字）。デザインの切り替えに追従する */
export function Logo() {
  const [variant, setVariant] = useState<Variant>(() => currentDesign().logo);
  useEffect(() => {
    const on = () => setVariant(currentDesign().logo);
    window.addEventListener("moshi:design", on);
    return () => window.removeEventListener("moshi:design", on);
  }, []);
  return (
    <>
      <LogoMark variant={variant} />
      <span className="wordmark">模試<span>ラボ</span></span>
    </>
  );
}
