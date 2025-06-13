# セキュリティガイド

## 環境変数設定

本プロジェクトでは機密情報を環境変数で管理しています。

### 設定手順

1. `.env.example`を`.env`にコピー
2. 各環境変数に実際の値を設定

### 必要な環境変数

- `OPENAI_API_KEY`: OpenAI APIキー
- `VITE_SUPABASE_URL`: Supabase プロジェクトURL
- `VITE_SUPABASE_ANON_KEY`: Supabase匿名キー
- `VITE_OAUTH_REDIRECT_URL`: OAuth リダイレクトURL
- `PROMPT_SOTTO_MESSAGE`: そっとさんのプロンプト

### 重要な注意事項

- `.env`ファイルは**絶対にコミットしない**
- APIキーは定期的に再生成する
- 本番環境と開発環境でキーを分ける

## 本番デプロイ時

環境変数の設定を本番用に切り替えてください：

```bash
# 開発環境用をコメントアウト
# VITE_SUPABASE_URL=your_dev_supabase_url

# 本番環境用のコメントを外す
VITE_SUPABASE_URL=your_prod_supabase_url
```
