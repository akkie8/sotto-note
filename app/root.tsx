import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "@remix-run/react";
import { BookOpen, Home, Settings, Wind } from "lucide-react";

import styles from "./tailwind.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: styles },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto max-w-md px-4">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center px-3 py-2 text-xs ${
                  isActive(item.path)
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="mb-1 h-6 w-6" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-900">
        <div className="flex min-h-screen justify-center">
          {/* 左サイドバー - PCのみ表示 */}
          <div className="hidden w-64 shrink-0 bg-gray-900 xl:block" />

          {/* メインコンテンツ */}
          <main className="w-full max-w-4xl bg-gradient-to-b from-gray-50 to-white px-4 sm:px-6 lg:px-8">
            {children}
          </main>

          {/* 右サイドバー - PCのみ表示 */}
          <div className="hidden w-64 shrink-0 bg-gray-900 xl:block" />
        </div>
        <BottomNav />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
