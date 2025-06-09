import { ActionFunctionArgs } from "@remix-run/node";

import { getOptionalUser } from "~/lib/auth.server";
import { getSupabase } from "~/lib/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
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

    // 認証ユーザーを取得（必須）
    const { user } = await getOptionalUser(request);

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

    const { openai } = await import("~/lib/openai.server");

    // プロンプトを環境変数から取得
    const systemPrompt = process.env.PROMPT_SOTTO_MESSAGE;

    if (!systemPrompt) {
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

    const reply =
      completion.choices[0]?.message?.content ||
      "申し訳ありません。返答を生成できませんでした。";

    // AI回答をデータベースに保存
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
      const { error: saveError } = await supabase
        .from("ai_replies")
        .insert({
          journal_id: journalId,
          user_id: user.id,
          content: reply,
          model: "gpt-3.5-turbo",
        })
        .select();

      if (saveError) {
        // エラーでも回答は返す
      } else {
        // journalsテーブルのhas_ai_replyフラグを更新
        const { error: updateError } = await supabase
          .from("journals")
          .update({ has_ai_reply: true })
          .eq("id", journalId)
          .eq("user_id", user.id);

        if (updateError) {
          // Error updating flag
        }
      }
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "AI返答の生成中にエラーが発生しました。" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
