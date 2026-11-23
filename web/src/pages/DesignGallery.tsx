// デザイン確認用: ロゴ6案と配色6案を並べて比べる（/design）
import { Link } from "react-router-dom";
import { LogoMark } from "../components/Logo";
import { DESIGN_OPTIONS, currentDesign, saveDesign, type Design } from "../design";

export function DesignGallery() {
  const pick = (patch: Partial<Design>) => saveDesign({ ...currentDesign(), ...patch });
  return (
    <>
      <h1>デザインの比較</h1>
      <p className="small muted">デザイン確認用の画面です。タップするとその案が全画面に反映されます（この端末だけ）。左下の「デザイン」からも切り替えられます。</p>

      <h2>ロゴ</h2>
      <div className="gallery-logos">
        {(Object.entries(DESIGN_OPTIONS.logo) as [Design["logo"], string][]).map(([v, label]) => (
          <button key={v} className="logo-tile" onClick={() => pick({ logo: v })} style={{ padding: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}>
            <div className="on-dark"><LogoMark variant={v} size={28} /><span className="wordmark">模試<span>ラボ</span></span></div>
            <div className="on-light"><LogoMark variant={v} size={56} /><LogoMark variant={v} size={32} /><LogoMark variant={v} size={20} /></div>
            <div className="cap">{label}</div>
          </button>
        ))}
      </div>

      <h2>配色</h2>
      <div className="gallery-palettes">
        {(Object.entries(DESIGN_OPTIONS.palette) as [Design["palette"], string][]).map(([v, label]) => (
          <button key={v} data-palette={v} className="palette-tile" onClick={() => pick({ palette: v })} style={{ padding: 0, textAlign: "left", cursor: "pointer", font: "inherit" }}>
            <div className="pt-head"><LogoMark variant={currentDesign().logo} size={22} />模試ラボ</div>
            <div className="pt-body">
              <b>{label}</b>
              <div className="pt-card">
                <div className="small" style={{ color: "var(--ink-2)" }}>大問演習・15分</div>
                <div style={{ fontWeight: 700 }}>文法・語法と中文の空所補充</div>
                <div className="small" style={{ color: "var(--muted)" }}>13問・26点</div>
              </div>
              <span className="btn btn-primary" style={{ minHeight: 38 }}>今すぐ解く</span>
              <div className="swatches">
                {["--navy", "--accent", "--accent-soft", "--bg", "--surface-2", "--ink"].map((c) => <span key={c} style={{ background: `var(${c})` }} />)}
              </div>
            </div>
          </button>
        ))}
      </div>

      <h2>そのほか</h2>
      <p className="small">形（標準・丸み・フラット）、トップの見せ方（濃い色・淡い色）、ヘッダー（濃い色・白）、書体（ゴシック・丸ゴシック）は、左下の「デザイン」で切り替えて<Link to="/">ホーム</Link>や結果画面で確かめてください。</p>
    </>
  );
}
