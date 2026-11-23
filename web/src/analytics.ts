// Google アナリティクス（GA4）。測定ID は /config.json の gaId（無ければ何もしない）。
// CSP でインラインスクリプトを禁止しているため、gtag の初期化はこのモジュールで行う。
// 広告向けの機能（Google シグナル・広告のパーソナライズ）は使わない。
import { getConfig } from "./config";

type Params = Record<string, string | number | boolean | undefined>;
declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

let ready = false;

function gtag(...args: unknown[]) {
  // gtag.js は arguments オブジェクトを積む前提なので、配列ではなく arguments を渡す
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer!.push(arguments);
  void args;
}

export function initAnalytics() {
  const id = getConfig().gaId;
  if (!id || ready || !/^G-[A-Z0-9]+$/.test(id)) return;
  window.dataLayer = window.dataLayer ?? [];
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  gtag("js", new Date());
  gtag("config", id, {
    send_page_view: false, // SPA なので画面遷移ごとに手動で送る
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  ready = true;
}

/** 画面遷移（受験・結果の ID を含む URL はパターンに置き換えて送る） */
export function trackPage(pathname: string) {
  if (!ready) return;
  const path = pathname.replace(/\/results\/(local\/)?[\w-]+/, "/results/:id");
  gtag("event", "page_view", { page_path: path, page_location: location.origin + path, page_title: document.title });
}

export function track(event: string, params: Params = {}) {
  if (!ready) return;
  gtag("event", event, params);
}
