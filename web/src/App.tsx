import type { ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { currentUser, logout } from "./auth";
import { CallbackPage, LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ExamPage } from "./pages/ExamPage";
import { TakePage } from "./pages/TakePage";
import { PrintPage } from "./pages/PrintPage";
import { ResultPage } from "./pages/ResultPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AnswerKeyPrintPage } from "./pages/AnswerKeyPrintPage";

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
        <Link to="/" className="brand">予想模試ラボ<small>大学別オリジナル模試</small></Link>
        {user && (
          <nav>
            <NavLink to="/" end>模試</NavLink>
            <NavLink to="/history">成績分析</NavLink>
            <button onClick={logout} title={user.email ?? user.name}>ログアウト</button>
          </nav>
        )}
      </header>
      <main className="container">{children}</main>
    </>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
