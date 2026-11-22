import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { renderMarkup, splitSpeaker } from "../components/PassageText";
import { allQuestions, questionLabel } from "../../../shared/scoring";
import type { Exam, Passage, Question, QuestionGroup } from "../../../shared/types";

type Paper = "A4" | "B5";
const PARTS = [
  ["cover", "表紙"],
  ["booklet", "問題"],
  ["mark", "解答用紙A（マーク）"],
  ["write", "解答用紙B（記述）"],
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
@page mark-sheet { size: ${paper} landscape; margin: 8mm; @bottom-center { content: none; } }
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
          <div className="sheet landscape"><MarkSheet exam={e} /></div>
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
      <div className="subject">{exam.subject}</div>
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
          {s.sheetNotice && <div className="b-sheet-notice">{s.sheetNotice}</div>}
          <div className="b-section-head">
            <span className="b-roman">{s.label}</span>
            <span className="b-instruction">{s.instruction}</span>
          </div>
          {s.example && <div className="b-example">{s.example}</div>}
          {s.passage && s.groups.map((g, gi) => g.wordBox && <WordBox key={gi} words={g.wordBox} />)}
          {s.passage && <BookletPassage passage={s.passage} />}
          {s.groups.map((g, gi) => (
            <BookletGroup key={gi} group={g} wordBoxShown={!!s.passage} />
          ))}
        </section>
      ))}
      <div className="b-end">《以下余白》</div>
    </div>
  );
}

function BookletPassage({ passage }: { passage: Passage }) {
  return (
    <>
      <div className={`b-passage ${passage.dialogue ? "dialogue" : ""}`}>
        {passage.title && <p style={{ textAlign: "center", textIndent: 0, fontWeight: 700 }}>{passage.title}</p>}
        {passage.paragraphs.map((para, i) => {
          const sp = passage.dialogue ? splitSpeaker(para) : null;
          return (
            <p key={i}>
              {i === 0 && passage.label && <span className="b-plabel">{passage.label}</span>}
              {sp ? <><span style={{ display: "inline-block", width: "4.2em" }}>{sp[0]}:</span>{renderMarkup(sp[1])}</> : renderMarkup(para)}
            </p>
          );
        })}
      </div>
      {passage.source && <div className="b-source">{passage.source}</div>}
      {passage.notes && (
        <div className="b-notes">
          （注）{passage.notes.map((n) => <span key={n}>{n}</span>)}
        </div>
      )}
    </>
  );
}

function choiceLayout(choices: string[]) {
  const max = Math.max(...choices.map((c) => c.length));
  if (max <= 16 && choices.length <= 4) return "inline";
  if (max <= 38) return "cols2";
  return "";
}

const WordBox = ({ words }: { words: string[] }) => (
  <div className="word-box print">
    {words.map((w) => <span key={w}>{w}</span>)}
  </div>
);

function BookletGroup({ group, wordBoxShown }: { group: QuestionGroup; wordBoxShown?: boolean }) {
  return (
    <div className="b-group">
      {group.instruction && <div className="b-group-inst">{group.instruction}</div>}
      {group.passage && <BookletPassage passage={group.passage} />}
      {group.wordBox && !wordBoxShown && <WordBox words={group.wordBox} />}
      {group.choices && (
        <div className="b-shared">
          {group.choices.map((c, i) => (
            <div className="c" key={i}><span>{i + 1}.</span><span>{c}</span></div>
          ))}
        </div>
      )}
      {!group.choices &&
        group.questions
          .filter((q) => q.kind === "mark")
          .map((q) => <BookletQuestion key={q.id} q={q} answerLine={group.answerLine} hideNo={!!group.passage?.label} />)}
    </div>
  );
}

/** 解答番号の枠（本文の空所と同じ見た目） */
const AnsBox = ({ no }: { no: string }) => <span className="b-ansbox">({no})</span>;

function BookletQuestion({ q, answerLine, hideNo }: { q: Question; answerLine?: boolean; hideNo?: boolean }) {
  const isJp = q.prompt ? /[぀-ヿ一-龯]/.test(q.prompt.split("\n")[0]) : false;
  const no = questionLabel(q);
  return (
    <div className={`b-q ${hideNo ? "no-num" : ""}`}>
      {!hideNo && <span className="no">({no})</span>}
      <div>
        {(q.prompt || answerLine) && (
          <div className={`prompt ${isJp ? "jp" : ""}`}>
            {q.prompt}
            {answerLine && <>{q.prompt ? " " : ""}The answer is: <AnsBox no={no} />.</>}
          </div>
        )}
        {q.choices && (
          <div className={`b-choices ${choiceLayout(q.choices)}`}>
            {q.choices.map((c, i) => (
              <span className="c" key={i}><span>{i + 1}</span><span>{c}</span></span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- マーク解答用紙 ----------------
   大学が公表している様式（見本）に合わせ、解答番号を横に並べ、各列に縦に 1〜9・0・− の楕円を置く。
   1ブロック35列 × 2ブロック。 */
const COLS_PER_BLOCK = 35;
const BLOCKS = 2;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-"];

export function MarkSheet({ exam, filled }: { exam: Exam; filled?: Record<number, number> }) {
  const used = allQuestions(exam).filter((q) => q.kind === "mark").length;
  return (
    <div className="ms">
      <div className="ms-top">
        <div className="ms-box ms-name">
          <div className="h">氏　　　名</div>
          <div className="b" />
        </div>
        <div className="ms-box ms-mid">
          <span>{exam.edition}　{exam.university} {exam.faculty} 予想模試　英語</span>
          <b>解答用紙A</b>
        </div>
        <div className="ms-notes">
          <div>［注意事項］</div>
          <div>1. マークにはＨＢの黒色鉛筆を使用してください。</div>
          <div>2. 折り曲げたり、汚したりしてはいけません。</div>
          <div>3. 訂正は消しゴムできれいに消し、消しくずを残してはいけません。</div>
          <div>4. 氏名・受験番号・解答欄以外にはマークしたり記入したりしてはいけません。</div>
          <div className="ex">
            マーク例　よい例 <span className="oval filled" />
            　悪い例 <span className="oval check">✓</span><span className="oval cross">×</span><span className="oval thin" /><span className="oval dot">•</span>
          </div>
        </div>
      </div>
      <div className="ms-main">
        <div className="ms-left">
          <div className="ms-box ms-id" aria-label="受験番号">
            <div className="h">受　験　番　号</div>
            <div className="write-row">{Array.from({ length: 5 }, (_, i) => <div key={i} />)}</div>
            <div className="digit-row">
              {Array.from({ length: 5 }, (_, c) => (
                <div className="col" key={c}>
                  {DIGITS.slice(0, c === 0 ? 9 : 10).map((d) => <span className="oval" key={d}>{d}</span>)}
                </div>
              ))}
            </div>
          </div>
          <div className="ms-box ms-nomark">
            <div className="h">この欄にはマークしないこと</div>
            <div className="b" />
          </div>
        </div>
        <div className="ms-blocks">
          {Array.from({ length: BLOCKS }, (_, b) => (
            <div className="ms-box ms-block" key={b}>
              <div className="h">解　　　　答　　　　欄</div>
              <div className="ms-qcols">
                {Array.from({ length: COLS_PER_BLOCK }, (_, c) => {
                  const no = b * COLS_PER_BLOCK + c + 1;
                  return (
                    <div className={`ms-qcol ${no > used ? "unused" : ""}`} key={no}>
                      <span className="qno">({no})</span>
                      {DIGITS.map((d, i) => (
                        <span key={d} className={`cell ${d === "0" ? "zero" : ""}`}>
                          <span className={`oval ${filled?.[no] === i + 1 ? "filled" : ""}`}>{d}</span>
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="ms-foot">
            解答番号（{used + 1}）以降の欄は使用しません。
            {allQuestions(exam).some((q) => q.kind === "write") && "記述の設問は解答用紙Bに記入すること。"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 記述解答用紙 ---------------- */
function WriteSheet({ exam }: { exam: Exam }) {
  const secs = exam.sections.filter((s) => s.groups.some((g) => g.questions.some((q) => q.kind === "write")));
  return (
    <div className="ws">
      <div className="ws-head">
        <div className="ws-title">英語　解答用紙B</div>
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
                {qs.map((q) => (
                  <tr key={q.id}>
                    <td className="no">({questionLabel(q)})</td>
                    <td className="ans" />
                    <td className="score" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <div className="ws-note">※ 斜線の欄には何も記入しないこと。</div>
    </div>
  );
}
