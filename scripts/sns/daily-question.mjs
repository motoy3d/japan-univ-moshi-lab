// SNS 用「今日の1問」を、大問演習の問題から作る。
//   node scripts/sns/daily-question.mjs [開始日 YYYY-MM-DD] [出力先フォルダ]
// 出力: 日ごとの問題カード・答えカード（PNG、1080×1350。X と Instagram の両方に使える縦長）と、
//       予約投稿用の posts.csv（日時・投稿文・画像ファイル名）。
//
// 品質のための決まり:
// - 使うのは大問演習（content/practice）の問題だけ。模試の問題は初見性を守るため使わない。
// - 単独で答えが一つに決まる形だけを使う（文法・語法の1文問題、短文と設問がひとまとまりの内容推測）。
//   長文の空所・下線部や記述は、本文の前後がないと答えが決まらないことがあるので使わない。
// - 問題文・選択肢・正解・解説は、検査済みのデータをそのまま使う（書き換えない）。
// 出力は .local/ などリポジトリの外に置く（答えカードを先に公開しないため）。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(import.meta.dirname, "../..");
const start = process.argv[2] ?? new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const OUT = path.resolve(process.argv[3] ?? path.join(ROOT, ".local/sns/daily"));
const SITE = "https://moshi-lab.com";
const POST_Q = "07:00"; // 通学前
const POST_A = "21:00"; // 夜

// ---- 1. 単独で出せる問題を集める ----
const items = [];
for (const f of fs.readdirSync(path.join(ROOT, "content/practice")).sort()) {
  const exam = JSON.parse(fs.readFileSync(path.join(ROOT, "content/practice", f), "utf8"));
  const subject = exam.subject ?? "英語";
  for (const s of exam.sections) {
    for (const g of s.groups) {
      const passage = g.passage ?? null;
      for (const q of g.questions) {
        if (q.kind !== "mark" || !q.choices) continue;
        const standalone =
          (q.category === "grammar" && !s.passage && !passage && /_{3,}/.test(q.prompt ?? "")) ||
          (q.category === "inference" && passage && g.questions.length === 1);
        if (!standalone) continue;
        items.push({ exam, subject, section: s.label, q, passage, type: q.category === "grammar" ? "文法・語法" : "短文の内容推測" });
      }
    }
  }
}
// 種類が続かないように交互に並べる（文法が多いので、内容推測を間に挟む）
const byType = Object.values(Object.groupBy(items, (x) => x.type)).sort((a, b) => b.length - a.length);
const order = [];
while (byType.some((l) => l.length)) for (const l of byType) if (l.length) order.push(l.shift());

// ---- 2. カード（HTML → PNG） ----
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const CSS = `
:root{--ink:#1a2530;--ink2:#475766;--red:#c2453a;--pencil:#2b2b2b;--accent:#1d6698;--bg:#f7f9fb;--line:#d9e6f0}
*{box-sizing:border-box}body{margin:0;width:1080px;height:1350px;background:var(--bg);color:var(--ink);font-family:"Noto Sans JP",sans-serif;overflow:hidden}
.page{position:absolute;inset:0;padding:70px 76px 150px;display:flex;flex-direction:column;gap:30px}
.tag{display:flex;align-items:center;gap:16px;font-size:30px;font-weight:700;color:var(--ink2)}
.day{font-family:"Noto Serif JP",serif;font-size:58px;color:var(--ink);font-weight:700}
.kind{font-size:28px;color:var(--ink2);margin-top:-14px}
.passage{font-family:Tinos,serif;font-size:var(--pf,31px);line-height:1.5;text-align:justify;border-left:4px solid var(--line);padding-left:24px}
.prompt{font-family:Tinos,serif;font-size:var(--qf,40px);line-height:1.45}
.prompt .blank{display:inline-block;min-width:4em;border-bottom:3px solid var(--ink)}
.choices{display:grid;gap:var(--cg,18px)}
.c{display:grid;grid-template-columns:44px 1fr;gap:20px;align-items:start;font-family:Tinos,serif;font-size:var(--cf,36px);line-height:1.35}
.o{width:40px;height:58px;border-radius:50%;border:3px solid var(--red);color:var(--red);display:grid;place-items:center;font:700 24px "Noto Sans JP",sans-serif;margin-top:-6px}
.o.f{background:var(--pencil);border-color:var(--pencil);color:#fff}
.ans{font-size:40px;font-weight:700;display:flex;align-items:center;gap:20px;white-space:nowrap}
.ans .choices{white-space:normal}
.ans .c{font-size:38px}
.exp{font-size:var(--ef,32px);line-height:1.75;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:14px;padding:28px 32px}
.foot{position:absolute;left:76px;right:76px;bottom:56px;display:flex;align-items:center;gap:14px;font-size:30px;font-weight:700;border-top:2px solid var(--ink);padding-top:26px}
.foot .dom{margin-left:auto;font-weight:500;color:var(--ink2);font-size:26px}
.hint{font-size:28px;color:var(--ink2);margin-top:auto}`;
const LOGO = `<svg width="44" height="44" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="8" fill="#2a5a80"/><ellipse cx="9" cy="16" rx="3.2" ry="6" fill="none" stroke="#fff" stroke-width="1.6"/><ellipse cx="16" cy="16" rx="3.2" ry="6" fill="#dcecf7" stroke="#fff" stroke-width="1.6"/><ellipse cx="23" cy="16" rx="3.2" ry="6" fill="none" stroke="#fff" stroke-width="1.6"/></svg>`;
const shell = (body, vars = "") => `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@700&family=Tinos:wght@400;700&display=block" rel="stylesheet">
<style>${CSS}</style></head><body style="${vars}"><div class="page">${body}</div>
<div class="foot">${LOGO}模試ラボ<span class="dom">moshi-lab.com　無料・登録なし</span></div></body></html>`;
const head = (it) => `<div class="tag"><span class="day">今日の1問</span></div>
<div class="kind">慶應 商学部 ${esc(it.subject)}｜大問${esc(it.section)}　${esc(it.type)}</div>`;
const promptHtml = (p) => esc(p).replace(/_{3,}/g, '<span class="blank"></span>');
const choicesHtml = (q, filled) =>
  `<div class="choices">${q.choices.map((c, i) => `<div class="c"><span class="o ${filled === i + 1 ? "f" : ""}">${i + 1}</span><span>${esc(c)}</span></div>`).join("")}</div>`;
// 1文の文法問題は字を大きく、本文つきの内容推測は小さめに（どちらも下の帯にかからない大きさ）
const sizeVars = (it) => (it.passage ? "--pf:29px;--qf:33px;--cf:30px;--cg:12px" : "--qf:54px;--cf:50px;--cg:30px");

function questionCard(it) {
  const passage = it.passage ? `<div class="passage">${it.passage.paragraphs.map(esc).join("<br>")}</div>` : "";
  return shell(`${head(it)}${passage}<div class="prompt">${promptHtml(it.q.prompt)}</div>${choicesHtml(it.q)}
<div class="hint">答えは今夜21時に。</div>`, sizeVars(it));
}
function answerCard(it) {
  const exp = it.q.explanation;
  const ef = exp.length > 220 ? "--ef:28px" : "";
  return shell(`${head(it)}<div class="prompt" style="--qf:30px">${promptHtml(it.q.prompt)}</div>
<div class="ans">答え ${choicesHtml({ choices: [it.q.choices[it.q.answer - 1]] }, 1).replace(">1<", `>${it.q.answer}<`)}</div>
<div class="exp">${esc(exp)}</div>
<div class="hint">同じ形の問題を、大問ごとに15分で。</div>`, ef);
}

// ---- 3. 投稿文（X の上限に収まるよう短く。URL は23字に数えられる） ----
const tags = (it) => (it.subject === "英語" ? "#慶應 #大学受験 #英語" : `#慶應 #大学受験 #${it.subject}`);
const link = (it) => `${SITE}/exams/${it.exam.id}`;
const qText = (it) => `【今日の1問】慶應商学部 ${it.subject}・${it.type}（大問${it.section}の形式）\n1〜4から1つ選んでください。答えは今夜21時に。\n${tags(it)}`;
const aText = (it) => `【今日の1問・答え】正解は ${it.q.answer}。\n解説は画像で。同じ形の大問演習（15分・無料・登録なし）はこちら→ ${link(it)}`;

// ---- 4. 書き出し ----
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : { channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
const rows = [["date", "time", "kind", "text", "image", "source"]];
const check = [];
for (const [i, it] of order.entries()) {
  const d = new Date(`${start}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + i);
  const day = d.toISOString().slice(0, 10); // 正午 UTC を基準にして、時差で日付がずれないようにする
  for (const [kind, html, text, time] of [["q", questionCard(it), qText(it), POST_Q], ["a", answerCard(it), aText(it), POST_A]]) {
    const file = `${day}-${kind}.png`;
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // はみ出し検査: 中身が下の帯にかかったら止める（小さい字で出し直さず、人が見て決める）
    const over = await page.evaluate(() => {
      const foot = document.querySelector(".foot").getBoundingClientRect().top;
      return Math.max(...[...document.querySelectorAll(".page > *")].map((e) => e.getBoundingClientRect().bottom)) > foot - 10;
    });
    if (over) check.push(`${file}: 文字が下の帯にかかっています`);
    await page.screenshot({ path: path.join(OUT, file) });
    rows.push([day, time, kind === "q" ? "問題" : "答え", text, file, `${it.exam.id} ${it.q.id}`]);
  }
}
await browser.close();
const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
fs.writeFileSync(path.join(OUT, "posts.csv"), "﻿" + csv + "\n");
console.log(`${order.length}日分（${start}〜）を ${OUT} に書き出しました`);
if (check.length) {
  console.log("要確認:\n" + check.join("\n"));
  process.exitCode = 1;
}
