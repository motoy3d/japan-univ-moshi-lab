import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { currentUser, logout } from "./auth";
import { trackPage } from "./analytics";
import { importLocalResults } from "./guest";
import { PhotoPage } from "./pages/PhotoPage";
import { AdminPage } from "./pages/AdminPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Logo } from "./components/Logo";
import { DesignPanel } from "./components/DesignPanel";
import { DesignGallery } from "./pages/DesignGallery";
import { LocalResultPage } from "./pages/ResultPage";
import { CallbackPage, LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ExamPage } from "./pages/ExamPage";
import { TakePage } from "./pages/TakePage";
import { PrintPage } from "./pages/PrintPage";
import { ResultPage } from "./pages/ResultPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AnswerKeyPrintPage } from "./pages/AnswerKeyPrintPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PrivacyPage, TermsPage } from "./pages/LegalPages";
import { AboutPage } from "./pages/AboutPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const loc = useLocation();
  if (!currentUser()) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}

/** 画面遷移の計測と、ログイン直後の端末内の結果の取り込み */
function Effects() {
  const loc = useLocation();
  useEffect(() => trackPage(loc.pathname), [loc.pathname]);
  // 画面が変わったら先頭へ。#practice などの印が付いていれば、その場所へ（一覧の読み込みを少し待つ）
  useEffect(() => {
    if (!loc.hash) {
      window.scrollTo(0, 0);
      return;
    }
    let tries = 0;
    const id = loc.hash.slice(1);
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 20) {
        clearInterval(timer);
        el?.scrollIntoView({ block: "start" });
      }
    }, 100);
    return () => clearInterval(timer);
  }, [loc.pathname, loc.hash]);
  const user = currentUser();
  useEffect(() => {
    if (user) void importLocalResults();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Shell({ children }: { children: ReactNode }) {
  const user = currentUser();
  const loc = useLocation();
  return (
    <>
      <header className="app-header no-print">
        <Link to="/" className="brand" aria-label="模試ラボ ホーム"><Logo /></Link>
        {user ? (
          <nav className="top-nav">
            <NavLink to="/" end>ホーム</NavLink>
            <NavLink to="/history">成績分析</NavLink>
            <UserMenu name={user.name} admin={!!user.admin} />
          </nav>
        ) : (
          <nav className="guest-nav">
            <NavLink to="/about">模試ラボについて</NavLink>
            {loc.pathname !== "/login" && <Link className="header-login" to={`/login?next=${encodeURIComponent(loc.pathname)}`}>ログイン</Link>}
          </nav>
        )}
      </header>
      <main className={`container ${user ? "with-tabbar" : ""}`}>{children}</main>
      <footer className={`app-footer no-print ${user ? "with-tabbar" : ""}`}>
        <Link to="/about">模試ラボについて</Link>
        <Link to="/terms">利用規約</Link>
        <Link to="/privacy">プライバシーポリシー</Link>
        <span>© 模試ラボ</span>
      </footer>
      {user && (
        <nav className="tabbar no-print" aria-label="メインメニュー">
          <NavLink to="/" end><TabIcon d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />ホーム</NavLink>
          <NavLink to="/history"><TabIcon d="M4 20V10M10 20V4M16 20v-7M22 20H2" />成績分析</NavLink>
          <NavLink to="/settings"><TabIcon d={PERSON} />マイページ</NavLink>
        </nav>
      )}
    </>
  );
}

const PERSON = "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0";

/**
 * 右上の人のアイコン。個人の設定（志望校・目標、アカウント）はここにまとめる。
 * 設定が増えても、メニューに1行足すだけで済む。
 */
function UserMenu({ name, admin }: { name: string; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const active = loc.pathname === "/settings" || loc.pathname === "/admin";
  return (
    <div className="user-menu" ref={ref}>
      <button className={`user-btn ${active ? "active" : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="avatar" aria-hidden>{[...name][0] ?? "？"}</span>
        <span className="user-name">マイページ</span>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="menu" role="menu">
          <p className="menu-who">{name} さん</p>
          <Link role="menuitem" to="/settings">志望校と目標</Link>
          <Link role="menuitem" to="/settings#account">アカウント</Link>
          {admin && <Link role="menuitem" to="/admin">運営（管理画面）</Link>}
          <hr />
          <button role="menuitem" onClick={() => { logout(); }}>ログアウト</button>
        </div>
      )}
    </div>
  );
}

function TabIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const authed = (el: ReactNode, shell = true) => <RequireAuth>{shell ? <Shell>{el}</Shell> : el}</RequireAuth>;
const open = (el: ReactNode, shell = true) => (shell ? <Shell>{el}</Shell> : el);

export function App({ designPreview = false }: { designPreview?: boolean }) {
  return (
    <ErrorBoundary>
    <Effects />
    {designPreview && <DesignPanel />}
    <Routes>
      <Route path="/login" element={<Shell><LoginPage /></Shell>} />
      <Route path="/callback" element={<Shell><CallbackPage /></Shell>} />
      <Route path="/about" element={<Shell><AboutPage /></Shell>} />
      <Route path="/terms" element={<Shell><TermsPage /></Shell>} />
      <Route path="/privacy" element={<Shell><PrivacyPage /></Shell>} />
      <Route path="/" element={open(<HomePage />)} />
      <Route path="/exams/:id" element={open(<ExamPage />)} />
      <Route path="/exams/:id/take" element={open(<TakePage />, false)} />
      <Route path="/exams/:id/print" element={open(<PrintPage />, false)} />
      <Route path="/exams/:id/photo" element={authed(<PhotoPage />)} />
      <Route path="/results/local/:id" element={open(<LocalResultPage />)} />
      <Route path="/results/:id" element={authed(<ResultPage />)} />
      <Route path="/results/:id/print" element={authed(<AnswerKeyPrintPage />, false)} />
      <Route path="/history" element={authed(<HistoryPage />)} />
      <Route path="/settings" element={authed(<SettingsPage />)} />
      <Route path="/admin" element={authed(<AdminPage />)} />
      <Route path="/design" element={open(<DesignGallery />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
