import { expect, test } from "@playwright/test";

test("登録なしで大問演習を解き、結果・満足度・問題への意見まで送れる", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "本番と同じ形の予想模試" })).toBeVisible();
  await page.getByText("文法・語法と中文の空所補充").click();
  await page.getByRole("link", { name: /今すぐ解く/ }).click();
  await page.getByRole("button", { name: "試験を開始する" }).click();

  await page.getByRole("button", { name: /^1\s*has$/ }).click();
  await page.getByRole("button", { name: "提出", exact: true }).click();
  await page.getByRole("button", { name: "提出して採点する" }).click();

  await expect(page).toHaveURL(/\/results\/local\//);
  await expect(page.getByText("また受けたいと思いますか")).toBeVisible();
  // 30人未満なので偏差値は出さない
  await expect(page.getByText(/受験者が30人に達すると表示/)).toBeVisible();

  // 満足度
  await page.locator(".rating-btn").nth(4).click();
  await page.locator(".rating").getByRole("button", { name: "送る" }).click();
  await expect(page.locator(".rating")).toHaveCount(0);

  // 問題への意見: 普段は文字を出さず、アイコンだけ
  await expect(page.getByText("正解に納得できない")).toHaveCount(0);
  await page.getByRole("button", { name: "この問題について知らせる" }).first().click();
  await page.locator(".qfb-form select").selectOption("answer");
  await page.locator(".qfb-form").getByRole("button", { name: "送る" }).click();
  await expect(page.getByText("確認して改善します")).toBeVisible();

  // ホームの「最近の受験」に出る
  await page.goto("/");
  await expect(page.getByText("最近の受験")).toBeVisible();
  expect(errors).toEqual([]);
});

test("模試は紙で受ける導線: 印刷 → 答えを入力して採点", async ({ page }) => {
  await page.goto("/");
  await page.locator('a.exam-card[href="/exams/keio-shogaku-eigo-01"]').click();
  await expect(page.getByRole("link", { name: "問題冊子・解答用紙を印刷" })).toBeVisible();
  await page.getByRole("link", { name: "解き終えた答えを入力して採点" }).click();
  await page.getByRole("button", { name: "1番に2", exact: true }).click();
  await page.getByRole("button", { name: "採点する" }).first().click();
  await expect(page).toHaveURL(/\/results\/local\//);
  await expect(page.getByText("紙で受験")).toBeVisible();
});

test("ログインした人は、端末に残っていた結果が履歴に取り込まれる", async ({ page }) => {
  await page.goto("/exams/keio-shogaku-eigo-p04/take?mode=paper");
  await page.getByRole("button", { name: "1番に3", exact: true }).click();
  await page.getByRole("button", { name: "採点する" }).first().click();
  await expect(page).toHaveURL(/\/results\/local\//);

  await page.goto("/login?next=/history");
  await page.getByLabel("ユーザー名").fill("e2e-user");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/history/);
  await expect(page.getByText("短文の内容推測").first()).toBeVisible();
});

test("運営の管理画面: 一般ユーザーには出ず、admin は KPI を見られる", async ({ page }) => {
  await page.goto("/login?next=/admin");
  await page.getByLabel("ユーザー名").fill("someone");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByText("権限がありません")).toBeVisible();
  await expect(page.getByRole("link", { name: "運営" })).toHaveCount(0);

  await page.evaluate(() => localStorage.removeItem("moshi.auth"));
  await page.goto("/login?next=/admin");
  await page.getByLabel("ユーザー名").fill("admin");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByText("2回目受験率")).toBeVisible();
  await page.getByRole("tab", { name: "設問分析" }).click();
  await expect(page.getByText("要確認の目安")).toBeVisible();
});
