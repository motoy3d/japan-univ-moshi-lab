import type { Figure } from "../../../shared/types";

/** 設問に付いた図（グラフ・地図）。印刷でも同じ大きさで出す */
export function FigureView({ figure }: { figure: Figure }) {
  return (
    <figure style={{ margin: "8px 0", maxWidth: 600 }}>
      <img src={figure.src} alt={figure.alt} style={{ width: "100%", height: "auto", display: "block", background: "#fff" }} />
      {figure.source && <figcaption style={{ fontSize: "0.85em", textAlign: "right", marginTop: 2 }}>{figure.source}</figcaption>}
    </figure>
  );
}
