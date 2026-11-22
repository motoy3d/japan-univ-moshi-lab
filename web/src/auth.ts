// 認証: Cognito Hosted UI の認可コード + PKCE フロー（Google / メール+パスワード）
// ローカル開発時はダミーログイン（"dev:<名前>" トークン）
import { getConfig } from "./config";

const KEY = "moshi.auth";
const PKCE_KEY = "moshi.pkce";

interface Tokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

export interface User {
  id: string;
  name: string;
  email?: string;
}

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function decodeJwt(token: string): Record<string, unknown> {
  const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(part)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
  return JSON.parse(json);
}

function load(): Tokens | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function save(t: Tokens | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* ストレージ不可（プライベートモード等） */
  }
}

const redirectUri = () => `${location.origin}/callback`;

export function currentUser(): User | null {
  const t = load();
  if (!t) return null;
  if (getConfig().authMode === "local") {
    const name = decodeURIComponent(t.accessToken.slice(4));
    return { id: `dev-${name}`, name };
  }
  const c = decodeJwt(t.idToken);
  return {
    id: String(c.sub),
    name: String(c.name ?? c.given_name ?? (c.email as string | undefined)?.split("@")[0] ?? "ユーザー"),
    email: c.email as string | undefined,
  };
}

export function localLogin(name: string) {
  // HTTP ヘッダーには ASCII しか使えないので、日本語名は URL エンコードする
  save({ accessToken: `dev:${encodeURIComponent(name)}`, idToken: "", expiresAt: Date.now() + 365 * 864e5 });
}

/** Hosted UI へリダイレクト。provider="Google" なら Google の画面へ直行 */
export async function login(provider?: "Google", returnTo = "/") {
  const { cognitoDomain, clientId } = getConfig();
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, returnTo }));
  const q = new URLSearchParams({
    response_type: "code",
    client_id: clientId!,
    redirect_uri: redirectUri(),
    scope: "openid email profile",
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });
  if (provider) q.set("identity_provider", provider);
  location.assign(`${cognitoDomain}/oauth2/authorize?${q}`);
}

/** /callback で呼ぶ。成功したら戻り先パスを返す */
export async function handleCallback(): Promise<string> {
  const params = new URLSearchParams(location.search);
  const saved = JSON.parse(sessionStorage.getItem(PKCE_KEY) ?? "null");
  sessionStorage.removeItem(PKCE_KEY);
  if (params.get("error")) throw new Error(params.get("error_description") ?? params.get("error")!);
  if (!saved || params.get("state") !== saved.state) throw new Error("ログイン状態が一致しません。もう一度お試しください。");
  const { cognitoDomain, clientId } = getConfig();
  const r = await fetch(`${cognitoDomain}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId!,
      code: params.get("code") ?? "",
      redirect_uri: redirectUri(),
      code_verifier: saved.verifier,
    }),
  });
  if (!r.ok) throw new Error("トークンの取得に失敗しました");
  const j = await r.json();
  save({ accessToken: j.access_token, idToken: j.id_token, refreshToken: j.refresh_token, expiresAt: Date.now() + j.expires_in * 1000 });
  return saved.returnTo ?? "/";
}

async function refresh(t: Tokens): Promise<Tokens | null> {
  if (!t.refreshToken) return null;
  const { cognitoDomain, clientId } = getConfig();
  const r = await fetch(`${cognitoDomain}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId!, refresh_token: t.refreshToken }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  const next = { ...t, accessToken: j.access_token, idToken: j.id_token ?? t.idToken, expiresAt: Date.now() + j.expires_in * 1000 };
  save(next);
  return next;
}

/** API 呼び出し用のアクセストークン（期限切れ間近なら更新） */
export async function getAccessToken(): Promise<string | null> {
  let t = load();
  if (!t) return null;
  if (getConfig().authMode === "cognito" && t.expiresAt - Date.now() < 60_000) {
    t = await refresh(t);
    if (!t) {
      save(null);
      return null;
    }
  }
  return t.accessToken;
}

export function logout() {
  save(null);
  const { authMode, cognitoDomain, clientId } = getConfig();
  if (authMode === "cognito") {
    location.assign(`${cognitoDomain}/logout?${new URLSearchParams({ client_id: clientId!, logout_uri: `${location.origin}/` })}`);
  } else {
    location.assign("/");
  }
}
