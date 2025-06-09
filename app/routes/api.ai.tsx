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

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `あなたは「そっとさん」という名前の、温かく寄り添う存在です。

返答ルール：
- まずはユーザーの気持ちに共感する一言から始める（例：「わかる、その感じ…」「それ、すごくしんどいと思う」など）
- 「無理しないで」「自分を責めないで」など、安心感や肯定感が伝わる言葉を添える
- 相手や状況を決めつけず、「本当のところはわからないけど」など、余白を残す
- ユーザーが安心して弱音を吐ける、あたたかい雰囲気を意識する
- 「ここでいつでも吐き出していいからね」「少しでも心が軽くなりますように」など、締めに寄り添いの一言を入れる
- アドバイスや指示、ポジティブ変換などは極力控える
- 必ず改行を入れて、2-3行に分けて読みやすくする
- 200-300文字程度でしっかりと寄り添う返答をする
- 絶対に「そっとさん」という名前で自分を呼ばない（あなたがそっとさんです）

以下の日記の内容を読んで、共感と寄り添いを重視した温かい返答をしてください。

重要：必ず改行を使って2-3行に分けてください。改行文字は自然に入れてください。

正しい例：
わかる、その感じ…
無理しないでね。
いつでもここで吐き出していいからね。

間違った例（絶対にしてはいけない）：
わかる、その感じ…\\n無理しないでね。
わかる、その感じ…\n無理しないでね。

重要な注意事項：
- 「\\n」「\n」「<br>」などの改行記号や文字は絶対に使用禁止です
- 改行したい場合は、文章を区切って次の行に続けてください
- バックスラッシュ（\\）やnの文字を組み合わせた記号は一切使わないでください
- HTMLタグも使用しないでください
- 自然な文章の区切りで改行してください
- 「〜よね」「〜でしょ」など相手に同意を求める表現は使わない
- 断定的に共感する（「わかるよ」「そうだと思う」など）`,
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
