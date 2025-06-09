import { useEffect } from "react";
import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  // /journal にアクセスしたら自動的に /journal/new にリダイレクト
  return redirect("/journal/new");
}

export default function JournalIndex() {
  // このコンポーネントは実際には表示されない（リダイレクトされるため）
  return null;
}
