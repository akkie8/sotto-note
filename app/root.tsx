import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";

import "./tailwind.css";

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
];

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
        <div className="min-h-screen flex justify-center">
          {/* 左サイドバー - PCのみ表示 */}
          <div className="hidden xl:block w-64 shrink-0 bg-gray-900" />

          {/* メインコンテンツ */}
          <main className="w-full max-w-4xl bg-gradient-to-b from-gray-50 to-white px-4 sm:px-6 lg:px-8">
            {children}
          </main>

          {/* 右サイドバー - PCのみ表示 */}
          <div className="hidden xl:block w-64 shrink-0 bg-gray-900" />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
