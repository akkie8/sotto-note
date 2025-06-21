import { expect, test } from "@playwright/test";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// テスト用の認証情報を環境変数から取得
const TEST_EMAIL = process.env.TEST_USER_EMAIL || "test@example.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "TestPassword123!";

test.describe("Dashboard Debug", () => {
  test("debug dashboard loading issue", async ({ page }) => {
    // コンソールログを収集
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // エラーを収集
    page.on("pageerror", (error) => {
      consoleLogs.push(`[ERROR] ${error.message}`);
    });

    // ログインページへ移動
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // ログイン
    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input#email'
    );
    await emailInput.waitFor({ state: "visible" });
    await emailInput.fill(TEST_EMAIL);

    const passwordInput = page.locator(
      'input[type="password"], input[name="password"], input#password'
    );
    await passwordInput.waitFor({ state: "visible" });
    await passwordInput.fill(TEST_PASSWORD);

    const submitButton = page.getByRole("button", { name: "メールでログイン" });
    await submitButton.waitFor({ state: "visible" });
    await submitButton.click();

    // ダッシュボードへの遷移を待つ
    await page.waitForURL("/dashboard", { timeout: 10000 });

    // 少し待機してログを収集
    await page.waitForTimeout(5000);

    // 現在の状態を確認
    const loadingVisible = await page.getByText("読み込み中...").isVisible();
    const greetingVisible = await page
      .locator("h1")
      .filter({
        hasText: /おはようございます|こんにちは|こんばんは/,
      })
      .isVisible();

    // ページのHTMLを取得
    const bodyHTML = await page.locator("body").innerHTML();

    // 結果を出力
    console.log("\n=== Dashboard Debug Results ===");
    console.log("Loading visible:", loadingVisible);
    console.log("Greeting visible:", greetingVisible);
    console.log("\n=== Console Logs ===");
    consoleLogs.forEach((log) => console.log(log));
    console.log("\n=== Page HTML (first 1000 chars) ===");
    console.log(bodyHTML.substring(0, 1000));

    // アサーション（デバッグのため失敗させる）
    expect(loadingVisible).toBe(false);
  });
});
