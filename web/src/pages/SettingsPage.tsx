import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { currentUser, logout } from "../auth";
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
      <h1>志望校と目標</h1>
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
      <h2>アカウント</h2>
      <div className="card row" style={{ justifyContent: "space-between" }}>
        <span className="small">{user?.email ?? user?.name}</span>
        <button className="btn" onClick={logout}>ログアウト</button>
      </div>
    </div>
  );
}
