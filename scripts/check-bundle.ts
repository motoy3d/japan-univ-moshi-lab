// 公開する画面のコード（web/dist）に、模試の正解・解説・本文が入っていないかを確かめる。
// 画面から content/index.ts を import すると、正解入りの問題データがまるごと配信されてしまうため。
//   npm run build の最後に実行される
import fs from "node:fs";
import path from "node:path";
import { EXAMS } from "../content/index";

const dir = path.resolve(import.meta.dirname, "../web/dist/assets");
const code = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
let bad = 0;
for (const e of EXAMS) {
  const q = e.sections[0].groups[0].questions[0];
  const samples = [q.explanation.slice(0, 30), (e.sections[0].passage?.paragraphs[0] ?? "").slice(0, 40)].filter((x) => x.length >= 20);
  for (const s of samples)
    if (code.includes(s)) {
      console.error(`✗ ${e.id} の問題データ（正解・解説・本文）が web/dist に含まれています: 「${s}…」`);
      bad++;
    }
}
if (bad) process.exit(1);
console.log(`✓ 画面のコードに問題データは含まれていません（${EXAMS.length}件を確認）`);
