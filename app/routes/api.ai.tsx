import { ActionFunctionArgs } from "@remix-run/node";

import { getOptionalUser } from "~/lib/auth.server";
import { getSupabase } from "~/lib/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("=== [AI API] FUNCTION CALLED ===");

  try {
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

    // リクエストヘッダーをログ出力
    console.log("[AI API] Request headers:", {
      authorization: request.headers.get("authorization")
        ? "Bearer ..."
        : "None",
      contentType: request.headers.get("content-type"),
    });

    // 認証ユーザーを取得（オプション）
    const { user } = await getOptionalUser(request);
    console.log(
      "[AI API] User:",
      user ? `ID: ${user.id}` : "Not authenticated"
    );

    // 既にAI回答が存在するかチェック
    if (user) {
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

    console.log("[AI API] Starting OpenAI request...");
    const { openai } = await import("~/lib/openai.server");
    console.log("[AI API] OpenAI client loaded");

    // プロンプトを環境変数から取得
    const systemPrompt = process.env.PROMPT_SOTTO_MESSAGE;

    if (!systemPrompt) {
      console.error(
        "[AI API] PROMPT_SOTTO_MESSAGE environment variable is not set"
      );
      throw new Error("そっとさんのプロンプトが設定されていません");
    }

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

    console.log("[AI API] OpenAI response received");
    const reply =
      completion.choices[0]?.message?.content ||
      "申し訳ありません。返答を生成できませんでした。";
    console.log("[AI API] Reply generated, length:", reply.length);

    // AI回答をデータベースに保存
    if (user) {
      console.log(
        "[AI API] Attempting to save reply for user:",
        user.id,
        "journal:",
        journalId
      );
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
      const { data, error: saveError } = await supabase
        .from("ai_replies")
        .insert({
          journal_id: journalId,
          user_id: user.id,
          content: reply,
          model: "gpt-3.5-turbo",
        })
        .select();

      if (saveError) {
        console.error("[AI API] Failed to save reply:", saveError);
        console.error(
          "[AI API] Save error details:",
          JSON.stringify(saveError, null, 2)
        );
        // エラーでも回答は返す
      } else {
        console.log("[AI API] Reply saved to database:", data);

        // journalsテーブルのhas_ai_replyフラグを更新
        const { error: updateError } = await supabase
          .from("journals")
          .update({ has_ai_reply: true })
          .eq("id", journalId)
          .eq("user_id", user.id);

        if (updateError) {
          console.error(
            "[AI API] Failed to update has_ai_reply flag:",
            updateError
          );
        } else {
          console.log("[AI API] Updated has_ai_reply flag");
        }
      }
    } else {
      console.log("[AI API] No user found, reply not saved");
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[AI API] Error:", error);
    return new Response(
      JSON.stringify({ error: "AI返答の生成中にエラーが発生しました。" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
