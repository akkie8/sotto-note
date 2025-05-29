import { Link } from "@remix-run/react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto max-w-4xl px-4 py-1">
        <div className="flex items-center">
          <Link to="/" className="text-base font-medium text-gray-900">
            そっとノート
          </Link>
        </div>
      </div>
    </header>
  );
}
