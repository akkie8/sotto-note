# Claude Code Configuration

このファイルはClaude Codeがプロジェクトの設定と構造を理解するためのものです。

## 🔨 最重要ルール - 新しいルールの追加プロセス

ユーザーから今回限りではなく常に対応が必要だと思われる指示を受けた場合：

1. 「これを標準のルールにしますか？」と質問する
2. YESの回答を得た場合、CLAUDE.mdに追加ルールとして記載する
3. 以降は標準ルールとして常に適用する

このプロセスにより、プロジェクトのルールを継続的に改善していきます。

## 🚀 コード品質チェック（必須実行）

**作業完了時は必ず以下を実行して問題ないことを確認してから完了報告すること：**

```bash
yarn lint
yarn typecheck
yarn dev    # 実際の開発サーバー起動確認
```

**実行時テスト確認項目：**

- アプリケーションが正常に起動すること
- SSRエラー、Hydrationエラーがないこと
- ブラウザコンソールにエラーがないこと
- 基本的なページ遷移が動作すること

**完了報告のテンプレート：**

```
✅ **作業完了**
- [実装内容の簡潔な説明]

✅ **コード品質チェック完了**
- `yarn lint`: ✅ エラーなし
- `yarn typecheck`: ✅ エラーなし
- `yarn dev`: ✅ 正常起動

[その他の追加情報があれば記載]
```

**重要**: 全てのチェックと実際の動作確認が完了した状態でのみ完了報告を行う。エラーがある場合は必ず修正してから報告すること。

## 🏗️ 開発ルール

### TypeScript

- 全てのコンポーネントにTypeScript型定義を必須とする
- `any` 型の使用は極力避ける
- 適切なインターフェースと型エイリアスを定義

### エラーハンドリング

- try-catch文を適切に使用
- ユーザーフレンドリーなエラーメッセージを表示（sonner toast）
- 適切なローディング状態の表示

### レスポンシブデザイン

- Mobile-firstアプローチを採用
- Tailwind CSSのレスポンシブクラスを活用
- 全デバイスでの動作確認を実施

### パフォーマンス

- 不要な再レンダリングを避ける
- 画像最適化を実施
- キャッシュを適切に活用

### セキュリティ

- Supabase Auth による認証
- 環境変数による機密情報管理
- TypeScript による型安全性
- **絶対禁止**: ハードコードされたユーザーIDやメールアドレスによる権限管理
- 権限管理は必ずプロファイルテーブルの `role` カラムを使用すること

### 継続的改善

- 新しいパターンや要件が出た場合、ルール追加を提案
- エラーや警告が出た場合は必ず解決策を提示
- API仕様変更時はdocs/を更新するよう提案

## 📝 Git & コメント規則

### Git Commit Messages (Angular Convention)

**必須フォーマット:** `prefix: message`

**Prefix Rules:**

- `feat:` 新機能追加
- `fix:` バグ修正
- `docs:` ドキュメント変更のみ
- `style:` コードの意味に影響しない変更（フォーマット、セミコロンなど）
- `refactor:` バグ修正でも新機能でもないコード変更
- `perf:` パフォーマンス改善
- `test:` テストの追加や修正
- `chore:` ビルドプロセスや補助ツールの変更

**ルール:**

- 50文字以内（prefix含む）
- 命令法使用
- **日本語で記述**（このプロジェクトでは）
- 末尾にピリオドなし

### Code Comments Language

- **このプロジェクト**: 日本語コメント
- チームの方針とプロジェクト要件に基づいて選択

## 📁 ファイル命名規則

**ファイル命名規則：**

- コンポーネント: PascalCase（例: `JournalEditor.tsx`）
- ルート: kebab-case（例: `journal.$id.tsx`）
- ユーティリティ: camelCase（例: `supabase.client.ts`）

## プロジェクト概要

そっとノート - 感情を受け止めるジャーナリングアプリケーション
Remix + TypeScript + Tailwind CSS + Supabase で構築

## 技術スタック

### フロントエンド

- **フレームワーク**: Remix (React フルスタックフレームワーク)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS（wellnessテーマ）
- **UI通知**: Sonner（トースト通知）
- **アイコン**: Lucide React

### バックエンド・データベース

- **認証・DB**: Supabase (PostgreSQL)
- **AIサービス**: OpenAI API (GPT-3.5-turbo)

### 開発ツール

- **パッケージマネージャー**: Yarn（統一）
- **TypeScript**: 型チェック
- **ESLint**: コード品質チェック
- **Prettier**: コードフォーマット

### デプロイ・インフラ

- **ホスティング**: Vercel（予定）

## プロジェクト構造

```
/
├── app/
│   ├── components/       # 共通コンポーネント
│   │   ├── Header.tsx
│   │   ├── JournalEditor.tsx
│   │   ├── Loading.tsx
│   │   └── ...
│   ├── lib/             # ライブラリ・ユーティリティ
│   │   ├── supabase.client.ts
│   │   ├── supabase.server.ts
│   │   ├── auth.server.ts
│   │   └── ...
│   ├── routes/          # ページルート
│   │   ├── _index.tsx   # ホーム
│   │   ├── journal.$id.tsx
│   │   ├── api.ai.tsx
│   │   └── ...
│   ├── root.tsx         # ルートコンポーネント
│   └── tailwind.css     # Tailwindスタイル
├── docs/                # プロジェクトドキュメント
├── public/              # 静的アセット
├── .env                 # 環境変数（Git管理外）
└── package.json         # 依存関係
```

## 開発コマンド

```bash
# 開発サーバー起動
yarn dev

# ビルド
yarn build

# 本番サーバー起動
yarn start

# 型チェック
yarn typecheck

# Lint
yarn lint

# フォーマット
yarn format
yarn format:check
```

## 環境変数

必要な環境変数：

- `VITE_SUPABASE_URL` - Supabase プロジェクトURL
- `VITE_SUPABASE_ANON_KEY` - Supabase 公開キー
- `OPENAI_API_KEY` - OpenAI APIキー
- `PROMPT_SOTTO_MESSAGE` - そっとさんのシステムプロンプト

## 主な機能

- **ジャーナル作成・編集**: 感情ログの記録
- **AIアシスタント（そっとさん）**: 感情を受け止めるAI回答
- **タグ管理**: ハッシュタグによる分類
- **呼吸エクササイズ**: ストレス軽減のための深呼吸ガイド
- **プライバシー重視**: 完全プライベートな記録

## ユーザーロール

- **free**: 一般ユーザー（AI回答は月5回まで）
- **admin**: 管理者（AI回答無制限）

## セキュリティ

- Supabase Row Level Security (RLS)
- 環境変数による機密情報管理
- TypeScript による型安全性
- 認証トークンの適切な管理

## パフォーマンス最適化

- キャッシュ機能（cache.client.ts）
- 共通ローディングコンポーネント
- リアルタイム更新（Supabase Realtime）

## トラブルシューティング

### よくある問題

1. **無限ループエラー**

   - useEffect内での状態更新を確認
   - 依存配列の設定を確認

2. **認証エラー**

   - Supabase トークンの有効期限を確認
   - 環境変数の設定を確認

3. **AI回答エラー**
   - OpenAI APIキーの有効性を確認
   - 月次制限の状態を確認

## 今後の拡張予定

- PWA対応
- オフライン機能
- より高度な分析機能
- コミュニティ機能（オプション）
