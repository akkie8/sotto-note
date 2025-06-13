import { OpenAI } from "openai";

// OpenAI APIキーの存在を確認
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("[OpenAI] API key is not set in environment variables");
}

export const openai = new OpenAI({
  apiKey: apiKey || "dummy-key-for-build", // ビルド時のエラーを防ぐためのダミーキー
});
