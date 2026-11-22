// web/dist-demo の成果物を、共有用の1枚の HTML（ページ本体のみ）にまとめる
//   npm -w web run build:demo && node scripts/build-demo-artifact.mjs <出力先.html>
import fs from "node:fs";
import path from "node:path";

const dir = "web/dist-demo/assets";
const files = fs.readdirSync(dir);
const css = fs.readFileSync(path.join(dir, files.find((f) => f.endsWith(".css"))), "utf8");
const js = fs.readFileSync(path.join(dir, files.find((f) => f.endsWith(".js"))), "utf8").replace(/<\/script/gi, "<\\/script");
const out = `<title>模試ラボ デモ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&family=Noto+Serif+JP:wght@400;600;700&family=Tinos:ital,wght@0,400;0,700;1,400&display=swap">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;
fs.writeFileSync(process.argv[2], out);
console.log(`${process.argv[2]}: ${(out.length / 1024).toFixed(0)} KB`);
