import { test } from "@playwright/test";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// テスト用の認証情報を環境変数から取得
const TEST_EMAIL = process.env.TEST_USER_EMAIL || "test@example.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "TestPassword123!";

test.describe("Root State Debug", () => {
  test("debug root component state flow", async ({ page }) => {
    // ページのリロードイベントを監視
    let reloadCount = 0;
    page.on("load", () => {
      reloadCount++;
      console.log(`[Page Load Event] Count: ${reloadCount}`);
    });

    // ネットワークリクエストを監視
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/dashboard") || url.includes("/login")) {
        console.log(`[Network] ${request.method()} ${url}`);
      }
    });

    // コンソールログを収集（時系列で）
    const consoleLogs: { time: number; message: string }[] = [];
    const startTime = Date.now();

    page.on("console", (msg) => {
      const text = msg.text();
      const time = Date.now() - startTime;
      consoleLogs.push({ time, message: `[${msg.type()}] ${text}` });
    });

    // Step 1: ログインページへ
    console.log("\n=== Step 1: Navigate to login ===");
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Step 2: ログインフォーム入力
    console.log("\n=== Step 2: Fill login form ===");
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

    // Step 3: ログイン実行
    console.log("\n=== Step 3: Submit login ===");
    const submitButton = page.getByRole("button", { name: "メールでログイン" });
    await submitButton.waitFor({ state: "visible" });

    // ナビゲーションを監視
    const navigationPromise = page.waitForURL("/dashboard", { timeout: 10000 });
    await submitButton.click();
    await navigationPromise;

    console.log("\n=== Step 4: Dashboard loaded ===");

    // 少し待機してログを収集
    await page.waitForTimeout(3000);

    // HTMLの状態を確認
    const html = await page.content();
    const hasHeader = html.includes("<header");
    const hasNav = html.includes("<nav");
    const mainClasses = await page.locator("main").getAttribute("class");

    // 結果を出力
    console.log("\n=== Timeline of Console Logs ===");
    consoleLogs
      .filter(
        (log) =>
          log.message.includes("[Root]") ||
          log.message.includes("auth") ||
          log.message.includes("Auth") ||
          log.message.includes("Dashboard")
      )
      .forEach((log) => {
        console.log(`${log.time}ms: ${log.message}`);
      });

    console.log("\n=== DOM State ===");
    console.log("Has <header>:", hasHeader);
    console.log("Has <nav>:", hasNav);
    console.log("Main classes:", mainClasses);
    console.log("Page reloads:", reloadCount);

    // isLoggedInの状態を確認するため、JavaScriptを実行
    const isLoggedInState = await page.evaluate(() => {
      // Reactコンポーネントの状態を取得する試み
      document.querySelector("#root") || document.querySelector("body");
      return {
        bodyClasses: document.body.className,
        hasHeaderElement: !!document.querySelector("header"),
        hasNavElement: !!document.querySelector("nav"),
        mainClasses: document.querySelector("main")?.className,
      };
    });

    console.log("\n=== JavaScript State ===");
    console.log(isLoggedInState);
  });
});
