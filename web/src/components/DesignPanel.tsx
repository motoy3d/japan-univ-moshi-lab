// デザイン確認用の切り替えパネル（designPreviewEnabled のときだけ表示）
import { useState } from "react";
import { Link } from "react-router-dom";
import { DEFAULT, DESIGN_OPTIONS, currentDesign, saveDesign, type Design } from "../design";

export function DesignPanel() {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Design>(currentDesign);
  const set = <K extends keyof Design>(k: K, v: Design[K]) => {
    const next = { ...d, [k]: v };
    setD(next);
    saveDesign(next);
  };
  return (
    <div className={`design-panel no-print ${open ? "open" : ""}`}>
      <button className="design-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "閉じる" : "デザイン"}
      </button>
      {open && (
        <div className="design-body">
          <p className="small" style={{ margin: 0 }}><b>デザイン確認用</b>（この端末だけ。利用者には表示されません）</p>
          {(Object.keys(DESIGN_OPTIONS) as (keyof Design)[]).map((k) => (
            <label key={k} className="design-row">
              <span>{{ palette: "配色", shape: "形", hero: "トップ", header: "ヘッダー", font: "書体", logo: "ロゴ" }[k]}</span>
              <select value={d[k]} onChange={(e) => set(k, e.target.value as Design[typeof k])}>
                {Object.entries(DESIGN_OPTIONS[k]).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>
          ))}
          <div className="row" style={{ gap: 6 }}>
            <button className="btn" onClick={() => { setD(DEFAULT); saveDesign(DEFAULT); }}>標準に戻す</button>
            <Link className="btn" to="/design" onClick={() => setOpen(false)}>一覧で比べる</Link>
          </div>
        </div>
      )}
    </div>
  );
}
