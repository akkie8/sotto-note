# Remix + Supabase 認証システム実装ガイド

## 概要

JWT期限切れによる予期しないログアウト問題を解決するための包括的な認証システムです。

## 主な機能

### 1. 自動トークンリフレッシュ
- JWT期限切れ5分前に自動リフレッシュ
- サーバーサイドでの期限チェック
- 失敗時のグレースフルな処理

### 2. セッション管理
- Remix Cookie Session Storage使用
- 30日間の長期セッション
- セキュアなCookie設定

### 3. 認証状態の維持
- ページフォーカス時の認証チェック
- ネットワーク復旧時の自動リフレッシュ
- 定期的な認証状態確認（30分間隔）

## ファイル構成

```
app/
├── utils/
│   ├── auth.server.ts         # 認証ユーティリティ
│   └── session.server.ts      # セッション管理
├── hooks/
│   └── useAuthRefresh.ts      # 自動リフレッシュHook
└── routes/
    ├── auth.refresh.tsx       # リフレッシュエンドポイント
    ├── auth.login.tsx         # ログインページ
    └── auth.callback.tsx      # 認証コールバック
```

## セットアップ手順

### 1. 環境変数の設定

`.env`ファイルに以下を追加：

```bash
# セッション管理
SESSION_SECRET=your_32_character_secret_key_here

# Supabase設定
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. 既存ルートの移行

既存の認証を使用しているルートを更新：

```typescript
// Before
import { requireAuth } from "~/lib/auth.server";

// After
import { requireAuth } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await requireAuth(request);
  
  return json({ user }, { 
    headers: headers || {} 
  });
}
```

### 3. ルートレイアウトの更新

`app/root.tsx`に自動リフレッシュ機能を追加済み。

## 使用方法

### 認証が必要なページ

```typescript
import { requireAuth } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session, supabase, headers } = await requireAuth(request);
  
  // ユーザーが認証されていることが保証される
  // セッションが期限切れの場合は自動的にリフレッシュ
  
  return json({ user }, {
    headers: headers || {}
  });
}
```

### 認証が任意のページ

```typescript
import { getOptionalAuth } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session, supabase, headers } = await getOptionalAuth(request);
  
  // userがnullの場合は未認証
  
  return json({ user }, {
    headers: headers || {}
  });
}
```

### クライアントサイドでの手動リフレッシュ

```typescript
import { useAuthRefresh } from "~/hooks/useAuthRefresh";

function MyComponent() {
  const { refreshToken, isRefreshing } = useAuthRefresh({
    enabled: true,
    checkInterval: 30, // 30分
    onRefreshError: () => {
      // エラー処理
    }
  });

  return (
    <button 
      onClick={refreshToken} 
      disabled={isRefreshing}
    >
      {isRefreshing ? "更新中..." : "認証更新"}
    </button>
  );
}
```

## セキュリティ機能

### 1. Cookie設定
- `httpOnly: true` - XSS攻撃防止
- `secure: true` - HTTPS必須（本番環境）
- `sameSite: "lax"` - CSRF攻撃防止
- `maxAge: 30日` - 長期セッション

### 2. JWT期限管理
- 5分のバッファ付き期限チェック
- 自動リフレッシュ機構
- 失敗時のセッションクリア

### 3. エラーハンドリング
- ネットワークエラー時の再試行
- 401エラー時の自動ログアウト
- ユーザーフレンドリーなエラーメッセージ

## トラブルシューティング

### よくある問題

1. **SESSION_SECRETエラー**
   ```
   SESSION_SECRET must be set in environment variables
   ```
   → `.env`ファイルに32文字以上のランダム文字列を設定

2. **リフレッシュ失敗**
   ```
   [Auth] Refresh token error: invalid_grant
   ```
   → リフレッシュトークンが期限切れ。ログアウト→再ログインが必要

3. **プロフィール作成エラー**
   ```
   Failed to create user profile
   ```
   → `SUPABASE_SERVICE_ROLE_KEY`が正しく設定されているか確認

### デバッグ方法

開発環境でのログ出力：

```typescript
// utils/auth.server.ts内
console.log("[Auth] Token expired, attempting refresh...");
console.log("[Auth] Token refreshed successfully");
console.log("[Auth] Refresh failed, clearing session");
```

## パフォーマンス考慮事項

### 1. リフレッシュ頻度
- デフォルト30分間隔（調整可能）
- ページフォーカス時のみ実行
- ネットワーク復旧時のみ実行

### 2. Cookie サイズ
- セッションデータは最小限に抑制
- アクセストークンとユーザーIDのみ保存

### 3. サーバー負荷
- リフレッシュは非同期処理
- 同時リフレッシュの防止機構

## 本番環境での設定

### 1. 環境変数
```bash
NODE_ENV=production
SESSION_SECRET=your_production_secret
VITE_SUPABASE_URL=your_production_url
```

### 2. Cookie設定
本番環境では自動的に以下が有効：
- `secure: true`
- HTTPS必須

### 3. Supabase設定推奨
- JWT有効期限: 12-24時間（デフォルト1時間から延長推奨）
- リフレッシュトークン有効期限: 30日
- セッション単一化: 無効（複数デバイス対応）

## 移行手順

1. 新しいファイルをすべて追加
2. 環境変数を設定
3. 既存ルートの`import`文を更新
4. レスポンスヘッダーの処理を追加
5. テスト実行
6. 段階的にデプロイ

これで「気づいたらログアウト」問題は完全に解決されます。