import { useEffect } from "react";

import { supabase } from "~/lib/supabase.client";

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // セッション変更を監視してクッキーに同期
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // セッションが存在する場合、サーバーにセッション情報を送信
        try {
          await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
          });
        } catch (error) {
          console.error("[SupabaseProvider] Failed to sync session:", error);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
