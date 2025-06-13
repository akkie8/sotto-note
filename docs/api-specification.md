# そっとノート API仕様書 v1.0.0

## 📋 概要

そっとノートのサーバーサイドAPI仕様書です。Remix フレームワークのルートベースAPIとして実装されており、すべてのAPIエンドポイントは認証が必要です。

## 🔐 認証

### 認証方式
- **プロバイダー**: Supabase Auth + Google OAuth
- **トークン形式**: Bearer Token
- **ヘッダー**: `Authorization: Bearer <access_token>`

### 認証フロー
```javascript
// クライアントサイド認証
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin
  }
});
```

## 📚 API エンドポイント

### 1. AI返信API

#### `POST /api/ai`

そっとさんからのAI返信を生成します。

**リクエスト**
```typescript
{
  content: string;      // ジャーナル内容（必須）
  journalId: string;    // ジャーナルID（必須）
}
```

**レスポンス**
```typescript
{
  reply: string;               // AI返信内容
  remainingCount: number | null;  // 残り利用回数（管理者の場合はnull）
  monthlyLimit: number | null;    // 月間制限数（管理者の場合はnull）
  isAdmin: boolean;            // 管理者フラグ
}
```

**エラーレスポンス**
```typescript
{
  error: string;               // エラーメッセージ
  remainingCount?: number;     // 制限超過の場合の残り回数
  monthlyLimit?: number;       // 月間制限数
}
```

**制限・仕様**
- **一般ユーザー**: 月5回まで
- **管理者**: 無制限
- **重複防止**: 同一ジャーナルに対して一般ユーザーは1回のみ（管理者は更新可能）
- **使用モデル**: OpenAI GPT-3.5-turbo
- **最大トークン数**: 500
- **温度設定**: 0.7

**使用例**
```javascript
const response = await fetch('/api/ai', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    content: '今日は仕事で失敗してしまって落ち込んでいます...',
    journalId: 'uuid-here'
  })
});

const data = await response.json();
console.log(data.reply); // そっとさんの返信
```

## 🗄️ データベーススキーマ

### profiles テーブル
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'free' CHECK (role IN ('free', 'admin')),
  base_tags TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### journals テーブル
```sql
CREATE TABLE journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood TEXT,
  tags TEXT,
  timestamp BIGINT NOT NULL,
  date TEXT NOT NULL,
  has_ai_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### ai_replies テーブル
```sql
CREATE TABLE ai_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-3.5-turbo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### feedback テーブル
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のフィードバックのみ作成可能
CREATE POLICY "Users can insert own feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理者はすべてのフィードバックを閲覧可能（将来的に）
CREATE POLICY "Admins can view all feedback" ON feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

## 🔒 セキュリティ

### Row Level Security (RLS)
すべてのテーブルでRLSが有効化されており、ユーザーは自分のデータのみアクセス可能です。

**profiles テーブルのRLSポリシー例**
```sql
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);
```

### 入力検証
- **必須フィールド**: content, journalId
- **文字数制限**: content は1500文字以内（クライアントサイドで制御）
- **型チェック**: TypeScriptによる型安全性確保

### レート制限
- **AI API**: 一般ユーザーは月5回まで
- **制限リセット**: 毎月1日0:00に自動リセット

## 📊 モニタリング・ログ

### エラーログ
```javascript
// サーバーサイドログ例
console.error('Error fetching user profile:', error);
console.error('Error saving AI reply:', saveError);
```

### 使用統計
- AI返信生成回数
- ユーザー別使用状況
- エラー発生率

## ⚙️ 設定・環境変数

### 必須環境変数
```bash
# Supabase設定
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OAuth設定
VITE_OAUTH_REDIRECT_URL=http://localhost:5173/

# OpenAI設定
OPENAI_API_KEY=your_openai_api_key

# そっとさんプロンプト
PROMPT_SOTTO_MESSAGE="your_sotto_prompt_here"
```

### プロンプト設定
環境変数 `PROMPT_SOTTO_MESSAGE` でそっとさんの基本プロンプトを設定。ユーザー名が動的に挿入されます。

```javascript
const systemPrompt = `${baseSystemPrompt}

今回あなたが返答する相手は「${userName}」さんです。返答の際は自然に「${userName}さん」として呼びかけてください。`;
```

## 🚀 パフォーマンス

### レスポンス時間目標
- **AI返信生成**: 10秒以内
- **データベースクエリ**: 1秒以内

### キャッシュ戦略
- **ユーザープロフィール**: 10分間キャッシュ
- **ジャーナルエントリー**: 5分間キャッシュ

## 🔧 開発・テスト

### ローカル開発
```bash
# 開発サーバー起動
yarn dev

# 型チェック
yarn typecheck

# Lint
yarn lint
```

### API テスト例
```javascript
// Jest/Vitest テスト例
describe('AI API', () => {
  test('should generate AI reply', async () => {
    const response = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        content: 'テスト内容',
        journalId: 'test-journal-id'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.reply).toBeDefined();
  });
});
```

## 📋 今後の拡張予定

### v1.1.0 予定機能
- **プレミアムプラン**: 無制限AI返信
- **データエクスポート**: JSON/CSV形式
- **週次レポート**: 自動生成API

### v1.2.0 予定機能
- **Webhook**: リアルタイム通知
- **バッチ処理**: 一括データ処理
- **分析API**: 感情分析エンドポイント

## 📞 サポート・デバッグ

### よくあるエラー

#### 401 Unauthorized
```json
{
  "error": "認証が必要です"
}
```
**解決策**: 有効なBearerトークンをリクエストヘッダーに含める

#### 429 Too Many Requests  
```json
{
  "error": "今月のそっとさんの回答は上限（5回）に達しました。次回は2025年7月1日からご利用いただけます。",
  "remainingCount": 0,
  "monthlyLimit": 5
}
```
**解決策**: 月末まで待つか、管理者権限を付与

#### 400 Bad Request
```json
{
  "error": "内容を入力してください"
}
```
**解決策**: 必須フィールドを正しく送信

### ログ確認
```bash
# 開発環境でのログ確認
yarn dev
# ブラウザのNetwork Tabまたはサーバーコンソールでログ確認
```

---

**そっとノート API v1.0.0**  
© 2025 そっとノート開発チーム