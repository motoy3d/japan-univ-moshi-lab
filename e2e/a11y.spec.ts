// アクセシビリティの自動点検（axe）。重大（critical / serious）な問題がないことを確かめる。
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const [name, path] of [
  ["ホーム", "/"],
  ["模試の案内", "/exams/keio-shogaku-eigo-01"],
  ["受験画面", "/exams/keio-shogaku-eigo-p03/take"],
  ["紙の答えの入力", "/exams/keio-shogaku-eigo-01/take?mode=paper"],
] as const) {
  test(`アクセシビリティ: ${name}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious.map((v) => `${v.id}: ${v.help}（${v.nodes.length}か所: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ")}）`)).toEqual([]);
  });
}

test("アクセシビリティ: ダークモードのホームと受験画面", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  for (const path of ["/", "/exams/keio-shogaku-eigo-p03/take"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious.map((v) => `${path} ${v.id}（${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ")}）`)).toEqual([]);
  }
});

test("アクセシビリティ: デザイン確認用の各配色（明るいモード）", async ({ page }) => {
  const palettes = ["navy", "soft", "sakura", "mint", "lavender", "sky"];
  for (const palette of palettes) {
    for (const variant of [{ hero: "bold", header: "dark" }, { hero: "light", header: "light" }]) {
      await page.goto("/?design=1");
      await page.evaluate((d) => localStorage.setItem("moshi.design.v1", JSON.stringify(d)), { palette, ...variant });
      await page.reload();
      await page.waitForLoadState("networkidle");
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).exclude(".design-panel").analyze();
      const serious = r.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(serious.map((v) => `${palette}/${variant.hero} ${v.id}（${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ")}）`)).toEqual([]);
    }
  }
});
