import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { renderMarkup, splitSpeaker } from "../components/PassageText";
import { allQuestions } from "../../../shared/scoring";
import type { Exam, Question, QuestionGroup } from "../../../shared/types";

type Paper = "A4" | "B5";
const PARTS = [
  ["cover", "表紙"],
  ["booklet", "問題"],
  ["mark", "マーク解答用紙"],
  ["write", "記述解答用紙"],
] as const;
type Part = (typeof PARTS)[number][0];

/** 用紙サイズに応じた @page ルール（ページ番号は本文のみ） */
export function pageCss(paper: Paper) {
  const m = paper === "A4" ? "20mm 18mm 22mm" : "16mm 15mm 18mm";
  return `
@page { size: ${paper} portrait; margin: ${m};
  @bottom-center { content: "— " counter(page) " —"; font-family: "Tinos", "Times New Roman", serif; font-size: 9pt; } }
@page :first { @bottom-center { content: none; } }
@page answer-sheet { @bottom-center { content: none; } }
`;
}

export function PrintPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const exam = useAsync(() => api.exam(id), [id]);
  const [paper, setPaper] = useState<Paper>((params.get("paper") as Paper) === "B5" ? "B5" : "A4");
  const initParts = (params.get("parts")?.split(",") as Part[] | undefined) ?? ["cover", "booklet", "mark", "write"];
  const [parts, setParts] = useState<Set<Part>>(new Set(initParts));

  useEffect(() => {
    setParams({ paper, parts: [...parts].join(",") }, { replace: true });
  }, [paper, parts, setParams]);

  useEffect(() => {
    if (exam.data) document.title = `${exam.data.edition} ${exam.data.title}`;
  }, [exam.data]);

  if (exam.error) return <div className="container"><p className="error">{exam.error}</p></div>;
  if (!exam.data) return <div className="container"><p className="muted">読み込み中…</p></div>;
  const e = exam.data;
  const toggle = (p: Part) =>
    setParts((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  return (
    <div className={`paper-${paper}`}>
      <style>{pageCss(paper)}</style>
      <div className="print-toolbar no-print">
        <Link to={`/exams/${id}`} className="btn" style={{ minHeight: 36 }}>←</Link>
        <label>
          用紙
          <select value={paper} onChange={(ev) => setPaper(ev.target.value as Paper)}>
            <option value="A4">A4</option>
            <option value="B5">B5</option>
          </select>
        </label>
        {PARTS.map(([k, label]) => (
          <label key={k}>
            <input type="checkbox" checked={parts.has(k)} onChange={() => toggle(k)} /> {label}
          </label>
        ))}
        <button className="btn btn-primary" onClick={() => window.print()} style={{ marginLeft: "auto" }}>
          印刷 / PDFで保存
        </button>
        <span className="small muted" style={{ width: "100%" }}>
          印刷ダイアログで送信先を「PDFに保存」にするとPDFになります。「ヘッダーとフッター」はオフ、倍率は100%を推奨（Chrome / Edge 推奨）。
        </span>
      </div>
      <div className="print-stage" data-testid="print-stage">
        {parts.has("cover") && (
          <div className="sheet"><Cover exam={e} /></div>
        )}
        {parts.has("booklet") && (
          <div className="sheet"><Booklet exam={e} /></div>
        )}
        {parts.has("mark") && (
          <div className="sheet"><MarkSheet exam={e} /></div>
        )}
        {parts.has("write") && (
          <div className="sheet"><WriteSheet exam={e} /></div>
        )}
      </div>
    </div>
  );
}

/* ---------------- 表紙 ---------------- */
function Cover({ exam }: { exam: Exam }) {
  return (
    <div className="booklet cover">
      <div className="cover-top">
        <span>{exam.edition}　{exam.university} {exam.faculty} 予想模試</span>
        <span>{exam.faculty}</span>
      </div>
      <div className="subject">{exam.subject.split("").join("")}</div>
      <div className="subtitle">（ 問 題 ）</div>
      <div className="time">試験時間 <b>{exam.durationMin}分</b>　　配点 {exam.totalPoints}点</div>
      <div className="notes-box">
        <h4>注意事項</h4>
        <ol>
          {exam.coverNotes.map((n, i) => <li key={i}>{n}</li>)}
        </ol>
      </div>
      <div className="id-boxes">
        <div className="id-box"><span>受験番号</span><div /></div>
        <div className="id-box name"><span>氏　名</span><div /></div>
      </div>
      <div className="disclaimer">{exam.disclaimer}</div>
    </div>
  );
}

/* ---------------- 問題本文 ---------------- */
function Booklet({ exam }: { exam: Exam }) {
  return (
    <div className="booklet">
      {exam.sections.map((s) => (
        <section className="b-section" key={s.label}>
          <div className="b-section-head">
            <span className="b-roman">{s.label}</span>
            <span className="b-instruction">{s.instruction}</span>
          </div>
          {s.passage && (
            <>
              <div className={`b-passage ${s.passage.dialogue ? "dialogue" : ""}`}>
                {s.passage.title && <p style={{ textAlign: "center", textIndent: 0, fontWeight: 700 }}>{s.passage.title}</p>}
                {s.passage.paragraphs.map((para, i) => {
                  const sp = s.passage!.dialogue ? splitSpeaker(para) : null;
                  return (
                    <p key={i}>
                      {sp ? <><span style={{ display: "inline-block", width: "4.2em" }}>{sp[0]}:</span>{renderMarkup(sp[1])}</> : renderMarkup(para)}
                    </p>
                  );
                })}
              </div>
              {s.passage.notes && (
                <div className="b-notes">
                  （注）{s.passage.notes.map((n) => <span key={n}>{n}</span>)}
                </div>
              )}
            </>
          )}
          {s.groups.map((g, gi) => (
            <BookletGroup key={gi} group={g} />
          ))}
        </section>
      ))}
      <div className="b-end">— 以　上 —</div>
    </div>
  );
}

function choiceLayout(choices: string[]) {
  const max = Math.max(...choices.map((c) => c.length));
  if (max <= 16 && choices.length <= 4) return "inline";
  if (max <= 38) return "cols2";
  return "";
}

function BookletGroup({ group }: { group: QuestionGroup }) {
  return (
    <div className="b-group">
      {group.instruction && <div className="b-group-inst">{group.instruction}</div>}
      {group.choices && (
        <div className="b-shared">
          {group.choices.map((c, i) => (
            <div className="c" key={i}><span>{i + 1}.</span><span>{c}</span></div>
          ))}
        </div>
      )}
      {!group.choices && group.questions.map((q) => <BookletQuestion key={q.id} q={q} />)}
    </div>
  );
}

function BookletQuestion({ q }: { q: Question }) {
  const isJp = q.prompt ? /[぀-ヿ一-龯]/.test(q.prompt.split("\n")[0]) : false;
  return (
    <div className="b-q">
      <span className="no">({q.no})</span>
      <div>
        {q.prompt && <div className={`prompt ${isJp ? "jp" : ""}`}>{q.prompt}</div>}
        {q.choices && (
          <div className={`b-choices ${choiceLayout(q.choices)}`}>
            {q.choices.map((c, i) => (
              <span className="c" key={i}><span>{i + 1}.</span><span>{c}</span></span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- マーク解答用紙 ---------------- */
const OVALS = 9; // 1〜9 の解答欄（実際のマークシートに合わせて全行同じ列数）

export function MarkSheet({ exam, filled }: { exam: Exam; filled?: Record<number, number> }) {
  const marks = allQuestions(exam).filter((q) => q.kind === "mark");
  const perCol = Math.ceil(marks.length / 3);
  const cols = [0, 1, 2].map((c) => marks.slice(c * perCol, (c + 1) * perCol));
  return (
    <div className="ms">
      <div className="ms-head">
        <div className="ms-title">英語　マーク解答用紙<small>{exam.edition} {exam.university} {exam.faculty}</small></div>
        <div>{exam.durationMin}分</div>
      </div>
      <div className="ms-info">
        <div className="ms-idgrid" aria-label="受験番号">
          <div className="h">受 験 番 号</div>
          {Array.from({ length: 5 }, (_, i) => <div className="write" key={`w${i}`} />)}
          {Array.from({ length: 5 }, (_, c) => (
            <div className="col" key={c}>
              {Array.from({ length: 10 }, (_, d) => <span className="oval" key={d}>{d}</span>)}
            </div>
          ))}
        </div>
        <div>
          <div className="ms-namebox">
            <div className="lab">フリガナ</div>
            <div className="blank" />
            <div className="lab">氏　　名</div>
            <div className="blank" style={{ minHeight: "16mm" }} />
          </div>
          <div className="ms-caution" style={{ marginTop: "3mm" }}>
            <span>
              HBの黒鉛筆で、○の中を正確にぬりつぶすこと。<br />
              訂正は消しゴムできれいに消すこと。<br />
              所定の欄以外には何も書かないこと。
            </span>
            <span className="ex">良い例 <span className="oval filled">　</span></span>
            <span className="ex">悪い例 <span className="oval" style={{ background: "linear-gradient(45deg,transparent 45%,#222 45% 55%,transparent 55%)" }}> </span>
              <span className="oval" style={{ borderStyle: "dashed" }}> </span></span>
          </div>
        </div>
      </div>
      <div className="ms-cols">
        {cols.map((col, ci) => (
          <div className="ms-col" key={ci} style={{ ["--nc" as string]: OVALS }}>
            <div className="hrow">
              <span>解答<br />番号</span>
              <span style={{ gridColumn: `2 / span ${OVALS}` }}>解　答　欄</span>
            </div>
            {col.map((q) => (
              <div className="arow" key={q.id}>
                <span className="no">{q.no}</span>
                {Array.from({ length: OVALS }, (_, i) => (
                  <span key={i} className={`oval ${filled?.[q.no] === i + 1 ? "filled" : ""}`}>{i + 1}</span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="ms-foot">解答番号 {marks.length + 1} 以降の欄は使用しません。</div>
    </div>
  );
}

/* ---------------- 記述解答用紙 ---------------- */
function WriteSheet({ exam }: { exam: Exam }) {
  const secs = exam.sections.filter((s) => s.groups.some((g) => g.questions.some((q) => q.kind === "write")));
  return (
    <div className="ws">
      <div className="ws-head">
        <div className="ws-title">英語　記述解答用紙</div>
        <div className="ws-id">
          <span>受験番号</span><div />
          <span>氏名</span><div className="name" />
        </div>
      </div>
      {secs.map((s) => {
        const qs = s.groups.flatMap((g) => g.questions).filter((q) => q.kind === "write");
        return (
          <div className="ws-sec" key={s.label}>
            <h4>{s.label}</h4>
            <table className="ws-table">
              <tbody>
                {qs.map((q) => {
                  const first = q.prompt?.match(/\(([a-z])\s{2,}\)/)?.[1];
                  return (
                    <tr key={q.id}>
                      <td className="no">({q.no})</td>
                      <td className="ans">{first && <span className="ws-first">{first}</span>}</td>
                      <td className="score" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      <div className="ws-note">※ 斜線の欄には何も記入しないこと。</div>
    </div>
  );
}
