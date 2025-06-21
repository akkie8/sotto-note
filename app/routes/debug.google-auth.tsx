import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { getSupabase } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // 開発環境のみ
  if (process.env.NODE_ENV === "production") {
    throw new Response("Not Found", { status: 404 });
  }

  const response = new Response();
  const supabase = getSupabase(request, response);

  // 現在のセッション情報を取得
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  let profileData = null;
  let profileError = null;

  if (session?.user) {
    // プロフィール情報を取得
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    profileData = data;
    profileError = error;
  }

  return json({
    session: session
      ? {
          user: {
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata,
            app_metadata: session.user.app_metadata,
            created_at: session.user.created_at,
          },
          access_token: session.access_token ? "***" : null,
          refresh_token: session.refresh_token ? "***" : null,
          expires_at: session.expires_at,
        }
      : null,
    sessionError: sessionError?.message || null,
    profile: profileData,
    profileError: profileError?.message || null,
  });
}

export default function DebugGoogleAuth() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-2xl font-bold">Google認証デバッグ情報</h1>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">セッション情報</h2>
            {data.sessionError ? (
              <p className="text-red-600">エラー: {data.sessionError}</p>
            ) : data.session ? (
              <pre className="overflow-auto whitespace-pre-wrap text-sm">
                {JSON.stringify(data.session, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-500">セッションなし</p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">プロフィール情報</h2>
            {data.profileError ? (
              <p className="text-red-600">エラー: {data.profileError}</p>
            ) : data.profile ? (
              <pre className="overflow-auto whitespace-pre-wrap text-sm">
                {JSON.stringify(data.profile, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-500">プロフィールなし</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
