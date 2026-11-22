import type { ReactNode } from "react";

/**
 * 本文マークアップを描画する。
 *   {{b:N}}       → 空所（ N ）
 *   {{u:N|text}}  → (N) 付きの下線部
 *   {{w:a}}       → 記述の空所（ a ）
 */
export function renderMarkup(
  text: string,
  opts: {
    blank?: (no: number) => ReactNode;
    underline?: (no: number, text: string) => ReactNode;
    write?: (label: string) => ReactNode;
  } = {},
): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\{\{([buw]):(\w+)(?:\|([^}]*))?\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const no = Number(m[2]);
    if (m[1] === "w") {
      const label = m[2];
      out.push(<span key={k++}>{opts.write ? opts.write(label) : <span className="b-blank w">(&nbsp;&nbsp;{label}&nbsp;&nbsp;)</span>}</span>);
    } else if (m[1] === "b") {
      out.push(<span key={k++}>{opts.blank ? opts.blank(no) : <span className="b-blank">(&nbsp;&nbsp;{no}&nbsp;&nbsp;)</span>}</span>);
    } else {
      out.push(
        <span key={k++}>
          {opts.underline ? (
            opts.underline(no, m[3] ?? "")
          ) : (
            <>
              <span className="uline-no">({no})</span>
              <span className="uline">{m[3]}</span>
            </>
          )}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** 会話文の「Name: 発話」を分解 */
export function splitSpeaker(line: string): [string, string] | null {
  const m = line.match(/^([A-Z][a-zA-Z]+):\s(.*)$/);
  return m ? [m[1], m[2]] : null;
}
