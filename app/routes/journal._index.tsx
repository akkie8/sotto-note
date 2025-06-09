import { redirect } from "@remix-run/node";

export async function loader() {
  // /journal にアクセスしたら自動的に /journal/new にリダイレクト
  return redirect("/journal/new");
}

export default function JournalIndex() {
  // このコンポーネントは実際には表示されない（リダイレクトされるため）
  return null;
}
