import { test, expect } from "@playwright/test";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// テスト用の認証情報を環境変数から取得
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

// ログインヘルパー関数
async function loginAndGetUser(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.locator('input[type="email"], input[name="email"], input#email');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(TEST_EMAIL);
  
  const passwordInput = page.locator('input[type="password"], input[name="password"], input#password');
  await passwordInput.waitFor({ state: 'visible' });
  await passwordInput.fill(TEST_PASSWORD);
  
  const submitButton = page.getByRole('button', { name: 'メールでログイン' });
  await submitButton.waitFor({ state: 'visible' });
  await submitButton.click();
  
  // ダッシュボードへの遷移を待つ
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

test.describe("Dashboard Display", () => {
  test("should display greeting message after successful login", async ({
    page,
  }) => {
    // ログインしてダッシュボードへ遷移
    await loginAndGetUser(page);

    // ダッシュボードURLへの遷移を確認
    await expect(page).toHaveURL("/dashboard");

    // greeting（挨拶）が表示されるまで待機（最大10秒）
    const greetingElement = page.locator("h1").filter({
      hasText: /おはようございます|こんにちは|こんばんは/,
    });

    // 挨拶文が表示されることを確認
    await expect(greetingElement).toBeVisible({ timeout: 10000 });

    // ユーザー名が含まれているかも確認（オプション）
    const greetingText = await greetingElement.textContent();
    console.log("Dashboard greeting displayed:", greetingText);

    // 新規エントリーボタンが表示されていることも確認
    const newEntryButton = page.getByRole("link", {
      name: "今の気持ちをノートに書く",
    });
    await expect(newEntryButton).toBeVisible();

    // タブ切り替えボタンが表示されていることを確認
    const listTab = page.getByRole("button", { name: "リスト" });
    const activityTab = page.getByRole("button", { name: "アクティビティ" });
    await expect(listTab).toBeVisible();
    await expect(activityTab).toBeVisible();

    // 深呼吸リンクが表示されていることを確認
    const breathingLink = page.getByRole("link", { name: "心を整える深呼吸" });
    await expect(breathingLink).toBeVisible();
  });

  test("should display correct greeting based on time of day", async ({
    page,
  }) => {
    await loginAndGetUser(page);
    await expect(page).toHaveURL("/dashboard");

    const hour = new Date().getHours();
    let expectedGreeting: string;

    if (hour >= 5 && hour < 12) {
      expectedGreeting = "おはようございます";
    } else if (hour >= 12 && hour < 17) {
      expectedGreeting = "こんにちは";
    } else {
      expectedGreeting = "こんばんは";
    }

    // 時間帯に応じた挨拶が表示されることを確認
    const greetingElement = page.locator("h1").filter({
      hasText: expectedGreeting,
    });

    await expect(greetingElement).toBeVisible({ timeout: 10000 });
  });

  test("should not show loading screen indefinitely", async ({ page }) => {
    await loginAndGetUser(page);

    // ローディング画面が消えることを確認
    const loadingElement = page.getByText("読み込み中...");
    
    // 最初はローディングが表示される可能性がある
    if (await loadingElement.isVisible({ timeout: 1000 }).catch(() => false)) {
      // ローディングが消えることを確認（最大10秒待機）
      await expect(loadingElement).toBeHidden({ timeout: 10000 });
    }

    // ダッシュボードのメインコンテンツが表示されることを確認
    const dashboardContent = page.locator(".mx-auto.max-w-3xl");
    await expect(dashboardContent).toBeVisible();
  });
});