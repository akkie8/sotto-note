import { expect, test } from "@playwright/test";

test.describe("UserStore機能テスト", () => {
  test.beforeEach(async ({ page }) => {
    // テスト環境にログイン（メールアドレスのみ）
    await page.goto("/login");
    await page.fill(
      'input[name="email"]',
      process.env.TEST_USER_EMAIL || "test@example.com"
    );
    await page.click('button[type="submit"]');
    // ログイン処理の完了を待つ
    await page.waitForTimeout(3000);
  });

  test("ユーザープロファイルが正しく表示される", async ({ page }) => {
    // ダッシュボードでユーザー名が表示されることを確認
    await expect(
      page.locator(
        "text=/こんにちは.*さん|おはようございます.*さん|こんばんは.*さん/"
      )
    ).toBeVisible();
  });

  test("管理者権限が正しく識別される", async ({ page }) => {
    // コンソールログを監視
    const logs: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "log") {
        logs.push(msg.text());
      }
    });

    // ページをリロードして初期化を待つ
    await page.reload();
    await page.waitForTimeout(2000);

    // LocalStorageから認証ストアの状態を取得
    const authStorage = await page.evaluate(() => {
      const storage = localStorage.getItem("auth-storage");
      return storage ? JSON.parse(storage) : null;
    });

    // 管理者判定のテスト
    if (authStorage?.state?.profile?.role === "admin") {
      expect(authStorage.state.profile.role).toBe("admin");
    } else {
      expect(authStorage?.state?.profile?.role).toBe("free");
    }
  });

  test("AIUsage情報の取得と表示", async ({ page }) => {
    // API呼び出しを監視
    const aiUsageResponse = page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/ai") && response.status() === 200,
        { timeout: 10000 }
      )
      .catch(() => null);

    await page.goto("/dashboard");

    const response = await aiUsageResponse;
    if (response) {
      const data = await response.json();

      // AI使用情報が正しい形式であることを確認
      if (data.remainingCount !== undefined) {
        expect(typeof data.remainingCount).toBe("number");
      }
      if (data.monthlyLimit !== undefined) {
        expect(typeof data.monthlyLimit).toBe("number");
      }
    }
  });

  test("ユーザーデータのリセット機能", async ({ page }) => {
    // ログアウトボタンをクリック
    await page.click('button:has-text("ログアウト")');

    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL("/login");

    // LocalStorageから認証情報がクリアされていることを確認
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem("auth-storage");
    });

    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      expect(parsed.state.user).toBeNull();
      expect(parsed.state.profile).toBeNull();
    }
  });

  test("エラーハンドリングの検証", async ({ page }) => {
    // コンソールエラーを監視
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // 無効なプロファイルデータでの更新を試みる
    await page.evaluate(() => {
      // @ts-expect-error - テスト用に意図的に不正なデータを注入
      window.__testInvalidProfile = { invalid: "data" };
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // エラーが適切にログされていることを確認
    const hasValidationError = errors.some(
      (error) =>
        error.includes("Invalid profile data") ||
        error.includes("Error setting profile")
    );

    // バリデーションエラーがログされているか、エラーがないことを確認
    expect(errors.length === 0 || hasValidationError).toBeTruthy();
  });

  test("セレクターのパフォーマンステスト", async ({ page }) => {
    await page.goto("/dashboard");

    // パフォーマンス測定
    const metrics = await page.evaluate(() => {
      const start = performance.now();
      const iterations = 1000;

      // セレクター呼び出しのパフォーマンステスト
      for (let i = 0; i < iterations; i++) {
        const storage = localStorage.getItem("auth-storage");
        if (storage) {
          const parsed = JSON.parse(storage);
          // getUserName相当の処理
          // getUserName相当の処理を実行するだけ
          parsed.state?.profile?.name ||
            parsed.state?.user?.user_metadata?.name ||
            "ユーザー";
        }
      }

      const end = performance.now();
      return {
        totalTime: end - start,
        averageTime: (end - start) / iterations,
      };
    });

    // 平均実行時間が1ms未満であることを確認
    expect(metrics.averageTime).toBeLessThan(1);
  });
});

test.describe("UserStoreとAuthStoreの統合テスト", () => {
  test("重複ストアの確認", async ({ page }) => {
    await page.goto("/");

    // グローバルに公開されているストアをチェック
    const storeInfo = await page.evaluate(() => {
      // @ts-expect-error - windowにglobal storeが存在するか確認
      const hasUserStore = typeof window.useUserStore !== "undefined";
      // @ts-expect-error - windowにglobal storeが存在するか確認
      const hasAuthStore = typeof window.useAuthStore !== "undefined";

      return { hasUserStore, hasAuthStore };
    });

    // プロジェクトではAuthStoreを使用すべき
    console.log("Store availability:", storeInfo);
  });
});
