import { ActionFunctionArgs } from "@remix-run/node";

import { getOptionalUser } from "~/lib/auth.server";
import { getSupabase } from "~/lib/supabase.server";
import { getUserProfile } from "~/lib/userUtils.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // 環境情報をログ出力（デバッグ用）
    console.log("[API/AI] Environment:", process.env.NODE_ENV);
    console.log("[API/AI] Request URL:", request.url);

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { content, journalId } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return new Response(JSON.stringify({ error: "内容を入力してください" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!journalId) {
      return new Response(JSON.stringify({ error: "ジャーナルIDが必要です" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 認証ユーザーを取得（必須）
    const { user } = await getOptionalUser(request);

    if (!user) {
      return new Response(JSON.stringify({ error: "認証が必要です" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = new Response();
    const supabase = getSupabase(request, response);

    // Supabaseセッションを設定
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: "", // リフレッシュトークンは不要
      });
    }

    // ユーザーのロールと名前を取得
    const { userName, userRole, isAdmin } = await getUserProfile(request, user);

    // 既にAI回答が存在するかチェック（adminは除く）
    if (userRole !== "admin") {
      const { data: existingReply } = await supabase
        .from("ai_replies")
        .select("id")
        .eq("journal_id", journalId)
        .eq("user_id", user.id)
        .single();

      if (existingReply) {
        return new Response(
          JSON.stringify({
            error: "このジャーナルには既にそっとさんが回答しています",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // adminユーザー以外は月5回の制限をチェック
    if (userRole !== "admin") {
      // 今月の開始日を取得
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      // 今月のAI回答数をカウント
      const { count, error: countError } = await supabase
        .from("ai_replies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      if (countError) {
        console.error("Error counting AI replies:", countError);
        return new Response(
          JSON.stringify({ error: "使用回数の確認中にエラーが発生しました" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const monthlyCount = count || 0;
      const monthlyLimit = 5;

      if (monthlyCount >= monthlyLimit) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const resetDate = nextMonth.toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return new Response(
          JSON.stringify({
            error: `今月のそっとさんの回答は上限（${monthlyLimit}回）に達しました。次回は${resetDate}からご利用いただけます。`,
            remainingCount: 0,
            monthlyLimit,
          }),
          {
            status: 429, // Too Many Requests
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // OpenAI APIキーの確認
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI APIキーが設定されていません");
    }

    let openai;
    try {
      console.log("[API/AI] Importing OpenAI module...");
      const openaiModule = await import("~/lib/openai.server");
      openai = openaiModule.openai;
      console.log("[API/AI] OpenAI module imported successfully");
    } catch (importError) {
      console.error("[API/AI] Failed to import OpenAI module:", importError);
      throw new Error("OpenAIモジュールの読み込みに失敗しました");
    }

    // プロンプトを環境変数から取得
    const baseSystemPrompt = process.env.PROMPT_SOTTO_MESSAGE;

    if (!baseSystemPrompt) {
      throw new Error("そっとさんのプロンプトが設定されていません");
    }

    // ユーザー名をプロンプトに含める
    const systemPrompt = `${baseSystemPrompt}

今回あなたが返答する相手は「${userName}」さんです。返答の際は自然に「${userName}さん」として呼びかけてください。ただし、冒頭で「そっとさんですね。」のような不自然な表現は避け、直接的で温かい言葉をかけてください。`;

    console.log("[API/AI] Calling OpenAI API...");
    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseTime = Date.now() - startTime;
    console.log(`[API/AI] OpenAI API responded in ${responseTime}ms`);

    const reply =
      completion.choices[0]?.message?.content ||
      "申し訳ありません。返答を生成できませんでした。";

    if (!completion.choices[0]?.message?.content) {
      console.warn("[API/AI] OpenAI returned empty response");
    }

    // AI回答をデータベースに保存
    // adminの場合は既存の回答を更新、それ以外は新規作成
    let saveError = null;

    if (userRole === "admin") {
      // 既存の回答があれば更新、なければ新規作成
      const { data: existingReply } = await supabase
        .from("ai_replies")
        .select("id")
        .eq("journal_id", journalId)
        .eq("user_id", user.id)
        .single();

      if (existingReply) {
        const { error } = await supabase
          .from("ai_replies")
          .update({
            content: reply,
            model: "gpt-3.5-turbo",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingReply.id);
        saveError = error;
      } else {
        const { error } = await supabase.from("ai_replies").insert({
          journal_id: journalId,
          user_id: user.id,
          content: reply,
          model: "gpt-3.5-turbo",
        });
        saveError = error;
      }
    } else {
      // 一般ユーザーは新規作成のみ
      const { error } = await supabase.from("ai_replies").insert({
        journal_id: journalId,
        user_id: user.id,
        content: reply,
        model: "gpt-3.5-turbo",
      });
      saveError = error;
    }

    if (saveError) {
      console.error("Error saving AI reply:", saveError);
      // エラーでも回答は返す
    } else {
      // journalsテーブルのhas_ai_replyフラグを更新
      const { error: updateError } = await supabase
        .from("journals")
        .update({ has_ai_reply: true })
        .eq("id", journalId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error updating journal flag:", updateError);
      }
    }

    // 残り回数を計算（adminユーザーは無制限）
    let remainingCount = null;
    let monthlyLimit = null;

    if (userRole !== "admin") {
      monthlyLimit = 5;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      // 保存後の今月のAI回答数をカウント
      const { count } = await supabase
        .from("ai_replies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      const currentCount = count || 0;
      remainingCount = Math.max(0, monthlyLimit - currentCount);
    }

    return new Response(
      JSON.stringify({
        reply,
        remainingCount,
        monthlyLimit,
        isAdmin,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // エラーの詳細をログに記録
    console.error("[API/AI] Error occurred:", error);

    // エラーの種類を判別してより具体的なメッセージを返す
    let errorMessage = "AI返答の生成中にエラーが発生しました。";
    let statusCode = 500;

    if (error instanceof Error) {
      console.error("[API/AI] Error message:", error.message);
      console.error("[API/AI] Error stack:", error.stack);

      // OpenAI APIキーのエラー
      if (
        error.message.includes("apiKey") ||
        error.message.includes("API key")
      ) {
        errorMessage =
          "APIキーが設定されていません。管理者に連絡してください。";
        console.error("[API/AI] OpenAI API key is missing or invalid");
      }
      // プロンプト設定のエラー
      else if (error.message.includes("プロンプト")) {
        errorMessage = error.message;
      }
      // OpenAI APIのレート制限
      else if (
        error.message.includes("rate limit") ||
        error.message.includes("429")
      ) {
        errorMessage =
          "AIサービスの利用制限に達しました。しばらく待ってから再度お試しください。";
        statusCode = 429;
      }
      // ネットワークエラー
      else if (
        error.message.includes("fetch") ||
        error.message.includes("network")
      ) {
        errorMessage =
          "ネットワークエラーが発生しました。インターネット接続を確認してください。";
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
};
