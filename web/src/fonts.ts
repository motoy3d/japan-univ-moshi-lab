// Web フォントを、使う画面でだけ読み込む（日本語の書体は重いので、最初の表示を遅くしない）
import { useEffect } from "react";

const FAMILIES = {
  /** 明朝: 問題冊子・受験画面の指示文・説明ページの見出し */
  serif: "Noto+Serif+JP:wght@400;700",
  /** 丸ゴシック: デザインの比較用（既定では使わない） */
  maru: "Zen+Maru+Gothic:wght@400;700",
} as const;

const loaded = new Set<string>();

export function loadFont(name: keyof typeof FAMILIES) {
  if (loaded.has(name) || typeof document === "undefined") return;
  loaded.add(name);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${FAMILIES[name]}&display=swap`;
  document.head.appendChild(link);
}

/** 明朝を使う画面で呼ぶ */
export function useSerifFont() {
  useEffect(() => loadFont("serif"), []);
}
