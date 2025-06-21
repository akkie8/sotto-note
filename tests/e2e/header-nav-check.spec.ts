import { expect, test } from "@playwright/test";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// テスト用の認証情報を環境変数から取得
const TEST_EMAIL = process.env.TEST_USER_EMAIL || "test@example.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "TestPassword123!";

test.describe("Header and Navigation Check", () => {
  test("should display header and bottom navigation on dashboard", async ({
    page,
  }) => {
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

    // グリーティングが表示されるまで待つ（ダッシュボードの読み込み完了を確認）
    const greetingElement = page.locator("h1").filter({
      hasText: /おはようございます|こんにちは|こんばんは/,
    });
    await expect(greetingElement).toBeVisible({ timeout: 10000 });

    // ヘッダーの存在を確認
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // ヘッダー内の「そっとノート」ロゴを確認
    const logo = header.getByRole("link", { name: "そっとノート" });
    await expect(logo).toBeVisible();

    // ヘッダー内のユーザーメニューボタンを確認
    const userMenuButton = header.locator("button").first();
    await expect(userMenuButton).toBeVisible();

    // ボトムナビゲーションの存在を確認
    const bottomNav = page.locator('nav[aria-label="メインナビゲーション"]');
    await expect(bottomNav).toBeVisible();

    // ボトムナビの各項目を確認
    const homeLink = bottomNav.getByRole("link", { name: "ホーム" });
    await expect(homeLink).toBeVisible();

    const journalLink = bottomNav.getByRole("link", { name: "ノート" });
    await expect(journalLink).toBeVisible();

    const breathingLink = bottomNav.getByRole("link", { name: "深呼吸" });
    await expect(breathingLink).toBeVisible();

    // スクリーンショットを撮影
    await page.screenshot({
      path: "tests/e2e/screenshots/dashboard-with-header-nav.png",
      fullPage: true,
    });

    console.log("Header visible:", await header.isVisible());
    console.log("Bottom nav visible:", await bottomNav.isVisible());
  });
});
