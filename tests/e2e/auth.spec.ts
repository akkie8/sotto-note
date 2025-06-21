import { test, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// テスト用の認証情報を環境変数から取得
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

test.describe('Authentication Flow', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    // Create screenshots directory
    const screenshotsDir = path.join(process.cwd(), 'tests/e2e/screenshots');
    
    // Step 1: Navigate to the login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-login-page.png'),
      fullPage: true 
    });

    // Step 2: Enter email
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(TEST_EMAIL);
    await page.screenshot({ 
      path: path.join(screenshotsDir, '02-email-entered.png'),
      fullPage: true 
    });

    // Step 3: Enter password
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password');
    await passwordInput.waitFor({ state: 'visible' });
    await passwordInput.fill(TEST_PASSWORD);
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-password-entered.png'),
      fullPage: true 
    });

    // Step 4: Submit the login form
    // 「メールでログイン」ボタンを明示的に選択
    const submitButton = page.getByRole('button', { name: 'メールでログイン' });
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    
    // 認証処理の完了を待つ（最大30秒）
    await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {
      // ダッシュボード以外のページにリダイレクトされる可能性もある
    });
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '04-after-submit.png'),
      fullPage: true 
    });

    // Step 5: Check if login was successful
    const currentUrl = page.url();
    
    // ログインページではないことを確認
    expect(currentUrl).not.toContain('/login');
    
    // ダッシュボードまたは他の認証済みページにいることを確認
    const isOnDashboard = currentUrl.includes('/dashboard');
    const isAuthenticated = !currentUrl.includes('/login') && !currentUrl.includes('/auth');
    
    expect(isOnDashboard || isAuthenticated).toBeTruthy();
    
    // 追加の確認：ユーザー関連の要素が表示されているか
    const userIndicators = [
      page.locator('button:has-text("ログアウト")'),
      page.locator('[data-testid="user-menu"]'),
      page.locator('text=/dashboard/i'),
      page.locator('text=/そっとノート/i')
    ];
    
    // ユーザー要素の確認（ログ出力用）
    for (const indicator of userIndicators) {
      if (await indicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('User element found:', await indicator.textContent());
        break;
      }
    }
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: path.join(screenshotsDir, '05-login-result.png'),
      fullPage: true 
    });
    
    // ログイン成功の確認
    expect(isAuthenticated).toBeTruthy();
    console.log(`Login successful! Redirected to: ${currentUrl}`);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Enter invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email');
    await emailInput.fill('invalid@example.com');
    
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password');
    await passwordInput.fill('WrongPassword');
    
    const submitButton = page.getByRole('button', { name: 'メールでログイン' });
    await submitButton.click();
    
    // Wait for error message
    await page.waitForLoadState('networkidle');
    
    // Check for error indicators
    const errorSelectors = [
      page.locator('text=/invalid|incorrect|failed|エラー|失敗/i'),
      page.locator('[role="alert"]'),
      page.locator('.error-message'),
      page.locator('[data-testid="error-message"]')
    ];
    
    // エラーメッセージの確認
    for (const errorSelector of errorSelectors) {
      if (await errorSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
        const errorText = await errorSelector.textContent();
        console.log(`Error message found: ${errorText}`);
        expect(errorText).toBeTruthy(); // エラーメッセージが存在することを確認
        break;
      }
    }
    
    // Still on login page
    expect(page.url()).toContain('/login');
  });

  test('capture login page elements for debugging', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Log all visible text elements
    const texts = await page.locator('text=/./').allTextContents();
    console.log('Page texts:', texts);
    
    // Log all buttons
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const type = await button.getAttribute('type');
      console.log(`Button: "${text}" (type: ${type})`);
    }
    
    // Log all input fields
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Input: type="${type}", name="${name}", placeholder="${placeholder}"`);
    }
  });
});