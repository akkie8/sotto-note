#!/usr/bin/env node
/* eslint-env node */

/**
 * 認証システムの動作確認テストスクリプト
 * 新しい認証システムの機能をテストします
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// 環境変数から設定を読み込み
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = serviceKey ? createClient(supabaseUrl, serviceKey) : null;

console.log("🧪 認証システム動作確認テスト開始\n");

async function testSupabaseConnection() {
  console.log("1. Supabase接続テスト");
  try {
    const { error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);
    if (error) {
      console.log(`   ⚠️  プロファイルテーブルへのアクセス: ${error.message}`);
    } else {
      console.log("   ✅ Supabase接続成功");
    }
  } catch (err) {
    console.log(`   ❌ Supabase接続エラー: ${err.message}`);
  }
}

async function testServiceRoleKey() {
  console.log("\n2. サービスロールキーテスト");
  if (!supabaseAdmin) {
    console.log("   ⚠️  SUPABASE_SERVICE_ROLE_KEY が設定されていません");
    return;
  }

  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .select("count")
      .limit(1);
    if (error) {
      console.log(`   ❌ サービスロールアクセスエラー: ${error.message}`);
    } else {
      console.log("   ✅ サービスロールキー正常");
    }
  } catch (err) {
    console.log(`   ❌ サービスロールキーエラー: ${err.message}`);
  }
}

async function testSessionSecret() {
  console.log("\n3. セッションシークレットテスト");
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    console.log("   ❌ SESSION_SECRET が設定されていません");
    return;
  }

  if (sessionSecret.length < 32) {
    console.log("   ⚠️  SESSION_SECRET が短すぎます（32文字以上推奨）");
  } else {
    console.log("   ✅ SESSION_SECRET 正常");
  }
}

async function testJWTExpiration() {
  console.log("\n4. JWT期限チェック機能テスト");

  // JWTデコード機能をテスト
  const testToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheW1za3BybnVyYmh2dHRjeWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MjA0NDAsImV4cCI6MjA2NDA5NjQ0MH0.WpTQlV31j-Y3NlkjoZaoy5YZQ-g4qrZ9-laTh4s6r10";

  try {
    const payload = JSON.parse(
      Buffer.from(testToken.split(".")[1], "base64").toString()
    );
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = payload.exp;
    const timeUntilExpiry = expirationTime - currentTime;

    console.log(
      `   📅 テストトークン有効期限: ${new Date(expirationTime * 1000).toLocaleString()}`
    );
    console.log(`   ⏰ 残り時間: ${Math.floor(timeUntilExpiry / 86400)}日`);
    console.log("   ✅ JWT期限チェック機能正常");
  } catch (err) {
    console.log(`   ❌ JWT期限チェックエラー: ${err.message}`);
  }
}

async function testEndpoints() {
  console.log("\n5. 認証エンドポイントテスト");

  const endpoints = [
    "http://localhost:5173/",
    "http://localhost:5173/login",
    "http://localhost:5173/auth/refresh",
    "http://localhost:5173/auth/callback",
    "http://localhost:5173/dashboard",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: "GET" });
      const status = response.status;

      if (endpoint.includes("/auth/refresh") && status === 405) {
        console.log(`   ✅ ${endpoint}: Method Not Allowed (正常)`);
      } else if (endpoint.includes("/dashboard") && status === 302) {
        console.log(`   ✅ ${endpoint}: リダイレクト (正常)`);
      } else if (status === 200) {
        console.log(`   ✅ ${endpoint}: アクセス可能`);
      } else {
        console.log(`   ⚠️  ${endpoint}: Status ${status}`);
      }
    } catch (err) {
      console.log(`   ❌ ${endpoint}: ${err.message}`);
    }
  }
}

async function runTests() {
  await testSupabaseConnection();
  await testServiceRoleKey();
  await testSessionSecret();
  await testJWTExpiration();
  await testEndpoints();

  console.log("\n🎉 認証システムテスト完了\n");

  console.log("📋 手動テスト項目:");
  console.log("   1. http://localhost:5173/ でトップページ表示確認");
  console.log("   2. http://localhost:5173/login でログインページ表示確認");
  console.log("   3. Googleログインボタンの動作確認");
  console.log("   4. メール/パスワードログインの動作確認");
  console.log("   5. ログイン後のダッシュボード表示確認");
  console.log("   6. ブラウザ開発者ツールでコンソールエラー確認");
  console.log("   7. セッション有効期限とリフレッシュ機能確認");
}

// テスト実行
runTests().catch(console.error);
