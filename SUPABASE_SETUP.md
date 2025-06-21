# Supabase Google OAuth 設定ガイド

## 1. Supabaseダッシュボードでの設定

### Authentication > Providers > Google

1. **Enable Google** をONにする

2. **Authorized Client IDs** に Google Cloud Console で作成した OAuth 2.0 クライアントIDを入力

3. **Callback URL (for OAuth)** をコピーして、Google Cloud Console に登録
   - 例: `https://[PROJECT_ID].supabase.co/auth/v1/callback`

## 2. Google Cloud Console での設定

### OAuth 2.0 クライアントの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. APIs & Services > Credentials に移動
3. 「+ CREATE CREDENTIALS」 > 「OAuth client ID」を選択
4. Application type: 「Web application」を選択
5. 設定:

   - **Name**: 任意の名前（例: Sotto Note OAuth）
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (開発環境)
     - `http://localhost:3000` (開発環境)
     - `https://[YOUR_DOMAIN]` (本番環境)
   - **Authorized redirect URIs**:
     - SupabaseからコピーしたコールバックURL
     - `http://localhost:5173/auth/callback` (開発環境)
     - `https://[YOUR_DOMAIN]/auth/callback` (本番環境)

6. 作成後、Client IDとClient Secretをコピー

## 3. Supabaseに戻って設定を完了

1. **Google client ID** と **Google client secret** を入力
2. 「Save」をクリック

## 4. 重要な注意点

### リダイレクトURLの設定

Supabase は以下の2つのパターンでリダイレクトする可能性があります：

1. **PKCEフロー（推奨）**: `?code=xxx` パラメータでリダイレクト
2. **Implicitフロー**: `#access_token=xxx` ハッシュフラグメントでリダイレクト

現在のアプリケーションは両方のパターンに対応しています。

### エラーが発生する場合

1. **"invalid request: both auth code and code verifier should be non-empty"**

   - PKCEフローでcode_verifierが不足している
   - `flowType: "implicit"` に設定して回避

2. **リダイレクトがルート（/）に戻ってしまう**

   - Supabaseのサイト設定でリダイレクトURLを確認
   - Authentication > URL Configuration > Redirect URLs に `/auth/callback` を追加

3. **プロフィールが作成されない**
   - RLSポリシーを確認
   - `profiles` テーブルの INSERT ポリシーが適切に設定されているか確認

## 5. デバッグ方法

開発環境で以下のURLにアクセスして、認証情報を確認：

- `/debug/google-auth` - セッションとプロフィール情報を表示
- `/test/auth-debug` - 認証システムの詳細なデバッグ情報

## 6. 環境変数

`.env` ファイルに以下が設定されていることを確認：

```env
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

SESSION_SECRET は必須ではありませんが、設定することでセキュリティが向上します。
