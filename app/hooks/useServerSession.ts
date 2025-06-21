import { useEffect } from 'react';
import { supabase } from '~/lib/supabase.client';

interface ServerSession {
  access_token?: string;
  refresh_token?: string;
}

/**
 * サーバーから渡されたセッション情報をクライアントのSupabaseに設定するフック
 */
export function useServerSession(session: ServerSession | null) {
  useEffect(() => {
    if (!session?.access_token || !session?.refresh_token) {
      console.log("[useServerSession] No valid session to set");
      return;
    }

    const setSessionAsync = async () => {
      console.log("[useServerSession] Setting session from server");
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (error) {
          console.error("[useServerSession] Error setting session:", error);
        } else {
          console.log("[useServerSession] Session set successfully:", {
            hasUser: !!data.user,
            userId: data.user?.id,
          });
        }
      } catch (e) {
        console.error("[useServerSession] Exception setting session:", e);
      }
    };

    setSessionAsync();
  }, [session?.access_token, session?.refresh_token]);
}