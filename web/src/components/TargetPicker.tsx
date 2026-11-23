import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { periodsFor } from "../../../content/admissions";
import { daysUntil } from "./Motivation";
import { findTarget, jpDate, jpDateTime, searchFaculties, targetName, type FacultyHit, type TargetRef } from "../targets";

export const MAX_TARGETS = 3;
const RANK = ["第1志望", "第2志望", "第3志望"];

/** 志望校の選択（検索・おすすめ → 方式を選ぶだけ。日程は公式データから自動設定） */
export function TargetPicker({ value, onChange }: { value: TargetRef[]; onChange: (v: TargetRef[]) => void }) {
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState<FacultyHit | null>(null);
  const hits = useMemo(() => searchFaculties(query), [query]);
  const full = value.length >= MAX_TARGETS;
  const has = (t: TargetRef) => value.some((v) => v.admissionId === t.admissionId && v.facultyId === t.facultyId && v.methodId === t.methodId);

  const add = (hit: FacultyHit, methodId: string) => {
    const t = { admissionId: hit.admission.id, facultyId: hit.faculty.id, methodId };
    if (!has(t) && !full) onChange([...value, t]);
    setPicking(null);
    setQuery("");
  };
  const choose = (hit: FacultyHit) => {
    if (hit.faculty.methods.length === 1) add(hit, hit.faculty.methods[0].id);
    else setPicking(hit);
  };
  const move = (i: number, d: -1 | 1) => {
    const n = [...value];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
  };

  return (
    <div className="targets">
      {value.length > 0 && (
        <ol className="target-list">
          {value.map((t, i) => (
            <TargetCard
              key={`${t.admissionId}/${t.facultyId}/${t.methodId}`}
              t={t}
              rank={RANK[i]}
              onUp={i > 0 ? () => move(i, -1) : undefined}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </ol>
      )}

      {picking ? (
        <div className="picker card-inset">
          <p className="small" style={{ margin: "0 0 8px" }}>
            <b>{picking.admission.name} {picking.faculty.name}</b> の受験方式・学科を選んでください
          </p>
          <div className="chips">
            {picking.faculty.methods.map((m) => (
              <button type="button" key={m.id} className="chip method" onClick={() => add(picking, m.id)}>
                {m.name}
                <small>募集 {m.capacity}</small>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost small" style={{ marginTop: 8 }} onClick={() => setPicking(null)}>戻る</button>
        </div>
      ) : full ? (
        <p className="small muted">志望校は{MAX_TARGETS}つまで登録できます。入れ替えるときは削除してから追加してください。</p>
      ) : (
        <div className="picker">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="大学・学部名で検索（例: 慶應 商、SFC、けいおう ほう）"
            aria-label="志望校を検索"
          />
          <div className="chips" style={{ marginTop: 10 }}>
            {hits.slice(0, query ? 20 : 8).map((h) => (
              <button type="button" key={`${h.admission.id}/${h.faculty.id}`} className={`chip ${h.hasMock ? "chip-accent" : ""}`} onClick={() => choose(h)}>
                {h.admission.shortName} {h.faculty.name}
                {h.hasMock && <small>模試あり</small>}
              </button>
            ))}
            {hits.length === 0 && <span className="small muted">見つかりません。現在は慶應義塾大学の全学部と共通テストに対応しています。</span>}
          </div>
          {!query && <p className="small muted" style={{ margin: "6px 0 0" }}>タップして追加 → 試験日・時間割・合格発表日が自動で入ります。</p>}
        </div>
      )}
    </div>
  );
}

function TargetCard({ t, rank, onUp, onRemove }: { t: TargetRef; rank: string; onUp?: () => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const r = findTarget(t);
  if (!r) return null;
  const { admission, faculty, method } = r;
  const first = faculty.stages[0];
  const days = daysUntil(first?.date);
  return (
    <li className="target-card">
      <div className="target-head">
        <span className="pill">{rank}</span>
        <b>{targetName(t)}</b>
        <span className="spacer" />
        {onUp && <button type="button" className="icon-btn" onClick={onUp} aria-label="志望順位を上げる">↑</button>}
        <button type="button" className="icon-btn" onClick={onRemove} aria-label="削除">✕</button>
      </div>
      {first && (
        <p className="target-date">
          {first.label ? `${first.label.replace(/（.*）/, "")} ` : "試験日 "}
          <b>{jpDate(first.date, true)}</b>
          {days !== null && days >= 0 && <span className="muted">　あと {days} 日</span>}
        </p>
      )}
      <button type="button" className="link-btn small" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "日程を閉じる" : "時間割・合格発表・出願期間を見る"}
      </button>
      {open && (
        <div className="target-detail small">
          {faculty.stages.map((s, si) => (
            <div key={si}>
              <div className="target-stage">
                {s.label ?? "試験"}：{jpDate(s.date)}　集合 {s.gather}
                {s.result && <>　／ 合格発表 {jpDateTime(s.result)}</>}
              </div>
              {periodsFor(s, method, si).length > 0 && (
                <table className="table compact">
                  <tbody>
                    {periodsFor(s, method, si).map((p, i) => (
                      <tr key={i}>
                        <td className="num" style={{ whiteSpace: "nowrap" }}>{p.start}〜{p.end}</td>
                        <td><b>{p.subject}</b>{p.note && <div className="muted">{p.note}</div>}</td>
                        <td className="num">{p.points !== null ? `${p.points}点` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
          {method.capacity !== "—" && <p style={{ margin: "6px 0" }}>募集人員 {method.capacity}{faculty.totalPoints ? `　／ 満点 ${faculty.totalPoints}点` : ""}</p>}
          {admission.application?.map((a) => (
            <p key={a.label} style={{ margin: "4px 0" }}>{a.label}：{jpDateTime(a.start)} 〜 {jpDateTime(a.end)}</p>
          ))}
          <div className="target-links">
            {faculty.url && <a href={faculty.url} target="_blank" rel="noopener noreferrer">{faculty.name}（公式）↗</a>}
            {admission.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
            ))}
            {faculty.mockExamIds.map((id) => <Link key={id} to={`/exams/${id}`}>この学部の模試へ →</Link>)}
          </div>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            出典：{admission.source.title}（{admission.source.checkedAt.replaceAll("-", "/")} 確認）。最新情報は必ず大学の公式発表で確認してください。
          </p>
        </div>
      )}
    </li>
  );
}
