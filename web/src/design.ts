// デザイン確認用の切り替え（配色・形・トップの見せ方・ヘッダー・書体・ロゴ）。
// 「?design=1」を付けて開いた端末（またはデモ版）だけで切り替えパネルが出る。本番の利用者には出ない。
// 決まったら DEFAULT を書き換えれば、その組み合わせが全員の標準になる。
import { store } from "./hooks";

export const DESIGN_OPTIONS = {
  palette: { navy: "紺（標準）", soft: "やわらか（クリーム×テラコッタ）", sakura: "さくら", mint: "ミント", lavender: "ラベンダー", sky: "空色" },
  shape: { standard: "標準", round: "丸み", flat: "フラット" },
  hero: { bold: "濃い色", light: "淡い色" },
  header: { dark: "濃い色", light: "白" },
  font: { sans: "ゴシック", maru: "丸ゴシック" },
  logo: { kanji: "模（漢字タイル）", bubbles: "マークシート", flask: "フラスコ", growth: "伸びるグラフ", ring: "スコアリング", booklet: "問題冊子" },
} as const;

export type Design = { [K in keyof typeof DESIGN_OPTIONS]: keyof (typeof DESIGN_OPTIONS)[K] };

export const DEFAULT: Design = { palette: "navy", shape: "standard", hero: "bold", header: "dark", font: "sans", logo: "kanji" };

const KEY = "moshi.design.v1";
const PREVIEW_KEY = "moshi.design.preview";

/** 切り替えパネルを出すか（?design=1 で有効、?design=0 で無効。デモ版は常に有効） */
export function designPreviewEnabled(force?: boolean): boolean {
  try {
    const q = new URLSearchParams(location.search).get("design");
    if (q === "1") store.set(PREVIEW_KEY, true);
    if (q === "0") store.del(PREVIEW_KEY);
  } catch {
    /* noop */
  }
  return !!force || !!store.get<boolean>(PREVIEW_KEY);
}

export function loadDesign(preview: boolean): Design {
  if (!preview) return DEFAULT;
  return { ...DEFAULT, ...(store.get<Partial<Design>>(KEY) ?? {}) };
}

export function applyDesign(d: Design) {
  const el = document.documentElement;
  for (const [k, v] of Object.entries(d)) el.dataset[k] = String(v);
}

export function saveDesign(d: Design) {
  store.set(KEY, d);
  applyDesign(d);
  window.dispatchEvent(new CustomEvent("moshi:design", { detail: d }));
}

export const currentDesign = (): Design => ({ ...DEFAULT, ...(document.documentElement.dataset as Partial<Design>) }) as Design;
