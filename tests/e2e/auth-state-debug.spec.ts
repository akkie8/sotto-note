import { test } from "@playwright/test";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// テスト用の認証情報を環境変数から取得
const TEST_EMAIL = process.env.TEST_USER_EMAIL || "test@example.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "TestPassword123!";

test.describe("Auth State Debug", () => {
  test("debug auth state and header visibility", async ({ page }) => {
    // コンソールログを収集
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("[Root]") ||
        text.includes("Header") ||
        text.includes("BottomNav")
      ) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
    });

    // ログイン
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

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

    // 少し待機
    await page.waitForTimeout(2000);

    // 現在のHTMLを取得
    const html = await page.content();
    const hasHeader = html.includes("<header");
    const hasBottomNav =
      html.includes("ホーム") &&
      html.includes("ノート") &&
      html.includes("タグ");
    const hasGreeting =
      html.includes("こんばんは") ||
      html.includes("こんにちは") ||
      html.includes("おはようございます");

    // 結果を出力
    console.log("\n=== Auth State Debug Results ===");
    console.log("Has header tag:", hasHeader);
    console.log("Has bottom nav:", hasBottomNav);
    console.log("Has greeting:", hasGreeting);
    console.log("\n=== Root Component Logs ===");
    consoleLogs.forEach((log) => console.log(log));

    // ページの構造を確認
    const bodyChildren = await page.locator("body > *").count();
    console.log("\nBody direct children count:", bodyChildren);

    // 各要素の可視性を確認
    const headerVisible = await page
      .locator("header")
      .isVisible()
      .catch(() => false);
    const bottomNavVisible = await page
      .locator("div.fixed.bottom-0")
      .isVisible()
      .catch(() => false);
    const mainVisible = await page
      .locator("main")
      .isVisible()
      .catch(() => false);

    console.log("\nElement visibility:");
    console.log("Header visible:", headerVisible);
    console.log("Bottom nav visible:", bottomNavVisible);
    console.log("Main visible:", mainVisible);

    // デバッグ用にスクリーンショット
    await page.screenshot({
      path: "tests/e2e/screenshots/auth-state-debug.png",
      fullPage: true,
    });
  });
});
