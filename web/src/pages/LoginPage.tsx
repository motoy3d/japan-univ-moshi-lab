import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { currentUser, handleCallback, localLogin, login } from "../auth";
import { getConfig } from "../config";

export function LoginPage() {
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/";
  const nav = useNavigate();
  const cfg = getConfig();
  const [name, setName] = useState("");

  useEffect(() => {
    if (currentUser()) nav(next, { replace: true });
  }, [nav, next]);

  return (
    <div className="login-wrap">
      <div className="login-pitch">
        <h1>本番そっくりの模試で、<br />合格までの距離を測る。</h1>
        <ul>
          <li>志望学部の出題形式を再現したオリジナル問題</li>
          <li>スマホで90分本番演習。紙に印刷してマークシートでも</li>
          <li>偏差値・分野別の伸びしろ・目標までの残り点数を表示</li>
        </ul>
      </div>
      <div className="card grid" style={{ gap: 12 }}>
        <h2 style={{ margin: 0 }}>ログイン / 新規登録</h2>
        <p className="muted small" style={{ margin: 0 }}>受験記録と成績分析を保存するためにログインします。</p>
        {cfg.authMode === "cognito" ? (
          <>
            {cfg.googleEnabled && (
              <button className="btn btn-google btn-block" onClick={() => login("Google", next)}>
                <GoogleIcon /> Googleでログイン
              </button>
            )}
            <button className="btn btn-block" onClick={() => login(undefined, next)}>
              メールアドレスでログイン / 新規登録
            </button>
          </>
        ) : (
          <form
            className="grid"
            style={{ gap: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              localLogin(name.trim());
              nav(next, { replace: true });
            }}
          >
            <div className="notice">ローカル開発モード: 任意の名前でログインできます（本番では Google / メール認証）。</div>
            <input type="text" placeholder="ユーザー名" value={name} onChange={(e) => setName(e.target.value)} aria-label="ユーザー名" />
            <button className="btn btn-primary btn-block" type="submit">ログイン</button>
          </form>
        )}
      </div>
    </div>
  );
}

export function CallbackPage() {
  const nav = useNavigate();
  const [error, setError] = useState<string>();
  useEffect(() => {
    handleCallback().then((to) => nav(to, { replace: true }), (e: Error) => setError(e.message));
  }, [nav]);
  return error ? (
    <div style={{ maxWidth: 420, margin: "24px auto" }}>
      <p className="error">{error}</p>
      <a className="btn" href="/login">ログイン画面へ</a>
    </div>
  ) : (
    <p className="muted">ログイン処理中…</p>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
