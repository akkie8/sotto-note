import { ActionFunctionArgs } from "@remix-run/node";

import { getOptionalUser } from "~/lib/auth.server";
import { getSupabase } from "~/lib/supabase.server";
import { getUserProfile } from "~/lib/userUtils.server";

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

    const { openai } = await import("~/lib/openai.server");

    // プロンプトを環境変数から取得
    const baseSystemPrompt = process.env.PROMPT_SOTTO_MESSAGE;

    if (!baseSystemPrompt) {
      throw new Error("そっとさんのプロンプトが設定されていません");
    }

    // ユーザー名をプロンプトに含める
    const systemPrompt = `${baseSystemPrompt}

今回あなたが返答する相手は「${userName}」さんです。返答の際は自然に「${userName}さん」として呼びかけてください。ただし、冒頭で「そっとさんですね。」のような不自然な表現は避け、直接的で温かい言葉をかけてください。`;

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
        const { error } = await supabase
          .from("ai_replies")
          .insert({
            journal_id: journalId,
            user_id: user.id,
            content: reply,
            model: "gpt-3.5-turbo",
          });
        saveError = error;
      }
    } else {
      // 一般ユーザーは新規作成のみ
      const { error } = await supabase
        .from("ai_replies")
        .insert({
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
        isAdmin
      }), 
      {
        headers: { "Content-Type": "application/json" },
      }
    );
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
