// 検索エンジン向けの sitemap.xml を、模試の登録簿から作る（npm run build の最初に実行）。
// 模試・演習を足したときに書き忘れないよう、手で書かない。
import fs from "node:fs";
import path from "node:path";
import { EXAMS } from "../content/index";

const SITE = "https://moshi-lab.com";
const pages = ["/", "/about", ...EXAMS.map((e) => `/exams/${e.id}`), "/terms", "/privacy"];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n")}
</urlset>
`;
const out = path.resolve(import.meta.dirname, "../web/public/sitemap.xml");
fs.writeFileSync(out, xml);
console.log(`sitemap.xml: ${pages.length}ページ`);
