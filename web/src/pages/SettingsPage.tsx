import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { cognitoUserCall, currentUser, logout } from "../auth";
import { getConfig } from "../config";
import { daysUntil } from "../components/Motivation";
import { TargetPicker } from "../components/TargetPicker";
import type { TargetRef } from "../targets";

const GOALS = [55, 58, 60, 62, 65, 68, 70, 72, 75];

export function SettingsPage() {
  const nav = useNavigate();
  const user = currentUser();
  const [nickname, setNickname] = useState("");
  const [goal, setGoal] = useState<number | "">("");
  const [examDate, setExamDate] = useState("");
  const [targets, setTargets] = useState<TargetRef[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");

  useEffect(() => {
    api.me().then((p) => {
      setNickname(p.nickname ?? "");
      setGoal(p.goalDeviation ?? "");
      setExamDate(p.examDate ?? "");
      setTargets(p.targets ?? []);
    });
  }, []);

  // ヘッダーのメニューの「アカウント」（/settings#account）から来たときは、その見出しまで動かす
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash) requestAnimationFrame(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ block: "start" }));
  }, [loc.hash]);

  const days = daysUntil(examDate);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    try {
      await api.saveMe({ nickname: nickname || undefined, goalDeviation: goal === "" ? undefined : goal, examDate: examDate || undefined, targets });
      setState("saved");
      setTimeout(() => nav("/"), 500);
    } catch (err) {
      setState((err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <h1>マイページ</h1>
      <h2 id="targets" className="first">志望校と目標</h2>
      <form className="card grid" style={{ gap: 18 }} onSubmit={save}>
        <div className="field">
          <span>志望校・学部・受験方式</span>
          <TargetPicker value={targets} onChange={setTargets} />
          <small className="muted">第1志望の試験日でホームのカウントダウンを表示します。</small>
        </div>
        <label className="field">
          <span>表示名</span>
          <input type="text" value={nickname} maxLength={20} placeholder={user?.name} onChange={(e) => setNickname(e.target.value)} />
        </label>
        <div className="field">
          <span>目標偏差値</span>
          <div className="chips">
            {GOALS.map((g) => (
              <button type="button" key={g} className={`chip ${goal === g ? "on" : ""}`} onClick={() => setGoal(goal === g ? "" : g)}>{g}</button>
            ))}
          </div>
          <small className="muted">ホームに「目標まであと何点か」を表示します。偏差値は、この模試の受験者の中での位置です。</small>
        </div>
        {targets.length === 0 && <label className="field">
          <span>本番の受験日（志望校を選ばない場合）</span>
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          <small className="muted">{days !== null && days >= 0 ? `本番まで ${days} 日` : "大学の入学試験要項で日程を確認して入力してください。"}</small>
        </label>}
        {state !== "idle" && state !== "saving" && state !== "saved" && <p className="error">{state}</p>}
        <button className="btn btn-primary" type="submit" disabled={state === "saving"}>
          {state === "saved" ? "保存しました" : state === "saving" ? "保存中…" : "保存する"}
        </button>
      </form>
      <h2 id="account">アカウント</h2>
      <div className="card row" style={{ justifyContent: "space-between" }}>
        <span className="small">{user?.email ?? user?.name}</span>
        <button className="btn" onClick={logout}>ログアウト</button>
      </div>
      {user?.admin && <p className="small" style={{ marginTop: 10 }}><Link to="/admin">運営（管理画面）を開く</Link></p>}
      <AccountSecurity />
      <DeleteAccount />
    </div>
  );
}

/** 退会（受験記録などのデータとアカウントを削除）。押し間違いを防ぐため、確認の文字を入力してもらう */
function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const run = async () => {
    setBusy(true);
    try {
      await api.deleteMe();
      logout();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <details className="danger-zone" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="small muted">退会する（データを削除）</summary>
      <div className="grid" style={{ gap: 8, marginTop: 8 }}>
        <p className="small" style={{ margin: 0 }}>受験記録・志望校などの設定・ログイン用のアカウントを削除します。元に戻せません。偏差値の計算に使った匿名の集計値は残ります。</p>
        <input type="text" placeholder="確認のため「削除」と入力" value={text} onChange={(e) => setText(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-danger" disabled={text !== "削除" || busy} onClick={run}>{busy ? "削除中…" : "退会してデータを削除する"}</button>
      </div>
    </details>
  );
}

/** メールアドレス・パスワードの変更（メールで登録した人のみ。Google でログインした人は Google 側で管理） */
function AccountSecurity() {
  const user = currentUser();
  if (getConfig().authMode !== "cognito")
    return <p className="small muted">メールアドレス・パスワードの変更は、本番環境（メールで登録したアカウント）で使えます。表示名は上の「表示名」で変えられます。</p>;
  if (user?.federated)
    return <p className="small muted">Google でログインしています。メールアドレスとパスワードは Google アカウントで管理されています。表示名は上の「表示名」で変えられます。</p>;
  return (
    <div className="grid" style={{ gap: 12, marginTop: 12 }}>
      <ChangeEmail current={user?.email} />
      <ChangePassword />
    </div>
  );
}

function ChangeEmail({ current }: { current?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "code" | "done">("input");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <details className="card">
      <summary><b>メールアドレスを変更</b> <span className="small muted">{current}</span></summary>
      <div className="grid" style={{ gap: 8, marginTop: 10 }}>
        {step === "input" && (
          <>
            <input type="email" autoComplete="email" placeholder="新しいメールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="新しいメールアドレス" />
            <button className="btn btn-primary" disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)}
              onClick={() => act(async () => { await cognitoUserCall("UpdateUserAttributes", { UserAttributes: [{ Name: "email", Value: email }] }); setStep("code"); })}>
              確認コードを送る
            </button>
          </>
        )}
        {step === "code" && (
          <>
            <p className="small" style={{ margin: 0 }}>{email} に届いた6桁の確認コードを入力してください。確認できるまでは、今のメールアドレスのままです。</p>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="確認コード" value={code} onChange={(e) => setCode(e.target.value.trim())} aria-label="確認コード" />
            <button className="btn btn-primary" disabled={busy || code.length < 6}
              onClick={() => act(async () => { await cognitoUserCall("VerifyUserAttribute", { AttributeName: "email", Code: code }); setStep("done"); })}>
              確認する
            </button>
          </>
        )}
        {step === "done" && <p className="small" style={{ margin: 0 }}>メールアドレスを変更しました。次回から新しいアドレスでログインしてください。</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </details>
  );
}

function ChangePassword() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError(undefined);
    setMsg(undefined);
    try {
      await cognitoUserCall("ChangePassword", { PreviousPassword: cur, ProposedPassword: next });
      setMsg("パスワードを変更しました");
      setCur("");
      setNext("");
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <details className="card">
      <summary><b>パスワードを変更</b></summary>
      <form className="grid" style={{ gap: 8, marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <input type="password" autoComplete="current-password" placeholder="現在のパスワード" value={cur} onChange={(e) => setCur(e.target.value)} aria-label="現在のパスワード" />
        <input type="password" autoComplete="new-password" placeholder="新しいパスワード（8文字以上・英大小文字と数字）" value={next} onChange={(e) => setNext(e.target.value)} aria-label="新しいパスワード" />
        <button className="btn btn-primary" type="submit" disabled={busy || !cur || next.length < 8}>変更する</button>
        <p className="small muted" style={{ margin: 0 }}>パスワードを忘れた場合は、ログアウトしてからログイン画面の「パスワードを忘れた場合」で再設定できます。</p>
        {msg && <p className="notice small">{msg}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </details>
  );
}
