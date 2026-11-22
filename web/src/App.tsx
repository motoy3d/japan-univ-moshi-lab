import type { ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { currentUser } from "./auth";
import { CallbackPage, LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ExamPage } from "./pages/ExamPage";
import { TakePage } from "./pages/TakePage";
import { PrintPage } from "./pages/PrintPage";
import { ResultPage } from "./pages/ResultPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AnswerKeyPrintPage } from "./pages/AnswerKeyPrintPage";
import { SettingsPage } from "./pages/SettingsPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const loc = useLocation();
  if (!currentUser()) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  const user = currentUser();
  return (
    <>
      <header className="app-header no-print">
        <Link to="/" className="brand"><span className="logo" aria-hidden>模</span>予想模試ラボ</Link>
        {user && (
          <nav className="top-nav">
            <NavLink to="/" end>ホーム</NavLink>
            <NavLink to="/history">成績分析</NavLink>
            <NavLink to="/settings">目標・設定</NavLink>
          </nav>
        )}
      </header>
      <main className={`container ${user ? "with-tabbar" : ""}`}>{children}</main>
      {user && (
        <nav className="tabbar no-print" aria-label="メインメニュー">
          <NavLink to="/" end><TabIcon d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />ホーム</NavLink>
          <NavLink to="/history"><TabIcon d="M4 20V10M10 20V4M16 20v-7M22 20H2" />成績分析</NavLink>
          <NavLink to="/settings"><TabIcon d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z" />目標</NavLink>
        </nav>
      )}
    </>
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

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Shell><LoginPage /></Shell>} />
      <Route path="/callback" element={<Shell><CallbackPage /></Shell>} />
      <Route path="/" element={authed(<HomePage />)} />
      <Route path="/exams/:id" element={authed(<ExamPage />)} />
      <Route path="/exams/:id/take" element={authed(<TakePage />, false)} />
      <Route path="/exams/:id/print" element={authed(<PrintPage />, false)} />
      <Route path="/results/:id" element={authed(<ResultPage />)} />
      <Route path="/results/:id/print" element={authed(<AnswerKeyPrintPage />, false)} />
      <Route path="/history" element={authed(<HistoryPage />)} />
      <Route path="/settings" element={authed(<SettingsPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
