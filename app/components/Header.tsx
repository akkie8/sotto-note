import { Link } from "@remix-run/react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto max-w-4xl px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-lg font-medium text-gray-900">
            Sotto Note
          </Link>
          <nav className="flex items-center space-x-4">
            <Link
              to="/journal"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ジャーナル
            </Link>
            <Link
              to="/breathing"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              呼吸
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
