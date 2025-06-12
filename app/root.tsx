import { useEffect, useState } from "react";
import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import {
  Link,
  Links,
  // LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from "@remix-run/react";
import { Home, PenTool, Tag } from "lucide-react";
import { Toaster } from "sonner";

import { Header } from "~/components/Header";
import { UserProvider } from "~/providers/UserProvider";
import { supabase } from "~/lib/supabase.client";
import tailwindStyles from "~/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Zen+Kaku+Gothic+New:wght@300..900&display=swap",
  },
  { rel: "stylesheet", href: tailwindStyles },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

function BottomNav() {
  const location = useLocation();
  const isActive = (path: string) => {
    if (path === "/journal") {
      return location.pathname.startsWith("/journal");
    }
    return location.pathname === path;
  };

  const navItems = [
    { path: "/", icon: Home, label: "ホーム" },
    { path: "/journal", icon: PenTool, label: "ノート" },
    { path: "/tags", icon: Tag, label: "タグ" },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 h-14 bg-white/90 backdrop-blur-sm"
      style={{ boxShadow: "inset 0 8px 16px -8px rgba(0, 0, 0, 0.1)" }}
    >
      <div className="mx-auto h-full max-w-md">
        <div className="flex h-full items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex h-full items-center justify-center px-4 transition-colors duration-200 ${
                  isActive(item.path)
                    ? "text-wellness-primary"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);

    // 認証状態チェックを1回のみに制限
    let mounted = true;

    import("~/lib/supabase.client").then(({ supabase }) => {
      if (!mounted) return;

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (mounted) {
          setIsLoggedIn(!!user);
        }
      });

      // セッション変化監視（デバウンス付き）
      let timeoutId: NodeJS.Timeout;
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) return;
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (mounted) {
              setIsLoggedIn(!!session?.user);
            }
          }, 100);
        }
      );

      return () => {
        mounted = false;
        clearTimeout(timeoutId);
        listener?.subscription.unsubscribe();
      };
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <html lang="ja" className="light font-['Zen_Kaku_Gothic_New']">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "そっとノート",
              "description": "心の記録と整理ができるメンタルヘルス対応のジャーナリングアプリ。そっとさんAIが感情に寄り添い、深呼吸ガイドで心を整えます。",
              "url": "https://sotto-note.com",
              "applicationCategory": "HealthApplication",
              "operatingSystem": "Web",
              "softwareVersion": "1.0.0",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "JPY"
              },
              "author": {
                "@type": "Organization",
                "name": "そっとノート"
              },
              "keywords": "ジャーナリング,メンタルヘルス,心の整理,AI,深呼吸,ストレス軽減",
              "inLanguage": "ja-JP"
            })
          }}
        />
      </head>
      <body className="min-h-screen overscroll-none scroll-smooth bg-white">
        <div className="flex min-h-screen justify-center">
          {/* 左サイドバー - PCのみ表示 */}
          <div className="hidden w-64 shrink-0 bg-white xl:block" />

          {/* メインコンテンツ */}
          <div className="flex min-h-screen w-full max-w-4xl flex-col rounded-3xl bg-white shadow-lg transition-all duration-300">
            {isHydrated && isLoggedIn && <Header />}
            <main
              className={`fade-in overflow-y-auto px-2 ${isHydrated && isLoggedIn ? "mt-14 h-[calc(100vh-7rem)]" : "h-full"}`}
            >
              {children}
            </main>
            {isHydrated && (
              <Toaster
                richColors
                position="top-center"
                toastOptions={{
                  style: {
                    top: isLoggedIn ? "56px" : "16px",
                    margin: 0,
                  },
                }}
              />
            )}
          </div>

          {/* 右サイドバー - PCのみ表示 */}
          <div className="hidden w-64 shrink-0 bg-white xl:block" />
        </div>

        {isHydrated && isLoggedIn && <BottomNav />}
        <ScrollRestoration />
        <Scripts />
        {/* <LiveReload /> */}
      </body>
    </html>
  );
}

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // OAuth認証後のリダイレクト処理
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const error = hashParams.get("error");

      if (error) {
        console.error("[Root] OAuth error:", error);
        return;
      }

      if (accessToken) {
        // Supabaseがセッションを処理するのを待つ
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // ハッシュフラグメントをクリーンアップ
          window.history.replaceState(null, "", window.location.pathname);
          // ホームページにリダイレクト
          navigate("/");
        }
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  return (
    <UserProvider>
      <Outlet />
    </UserProvider>
  );
}
