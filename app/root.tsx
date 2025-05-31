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
} from "@remix-run/react";
import { BookOpen, Home, Settings, Wind } from "lucide-react";
import { Toaster } from "sonner";

import { Header } from "~/components/Header";
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
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", icon: Home, label: "ホーム" },
    { path: "/journal", icon: BookOpen, label: "ジャーナル" },
    { path: "/breathing", icon: Wind, label: "呼吸" },
    { path: "/settings", icon: Settings, label: "設定" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-wellness-accent bg-white/80 shadow-gentle backdrop-blur-lg">
      <div className="mx-auto max-w-md">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center rounded-full px-2 py-1.5 text-[10px] transition-all duration-200 ${
                  isActive(item.path)
                    ? "bg-wellness-accent/20 text-wellness-accent"
                    : "text-gray-400 hover:bg-wellness-accent/10 hover:text-wellness-accent"
                }`}
              >
                <Icon className="mb-0.5 h-5 w-5" />
                <span>{item.label}</span>
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

  useEffect(() => {
    // クライアントサイドでSupabase認証状態を取得
    import("~/lib/supabase.client").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsLoggedIn(!!user);
      });
      // セッション変化も監視
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setIsLoggedIn(!!session?.user);
        }
      );
      return () => {
        listener?.subscription.unsubscribe();
      };
    });
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
      </head>
      <body className="min-h-screen overscroll-none scroll-smooth bg-wellness-bg">
        <div className="flex min-h-screen justify-center">
          {/* 左サイドバー - PCのみ表示 */}
          <div className="hidden w-64 shrink-0 bg-wellness-bg xl:block" />

          {/* メインコンテンツ */}
          <div className="flex w-full max-w-4xl flex-col rounded-3xl bg-white/80 shadow-gentle transition-all duration-300">
            {isLoggedIn && <Header />}
            <main className="fade-in min-h-screen px-2 pb-[3.25rem]">
              {children}
            </main>
          </div>

          {/* 右サイドバー - PCのみ表示 */}
          <div className="hidden w-64 shrink-0 bg-wellness-bg xl:block" />
        </div>

        {isLoggedIn && <BottomNav />}
        <ScrollRestoration />
        <Scripts />
        <Toaster richColors position="top-center" />
        {/* <LiveReload /> */}
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
