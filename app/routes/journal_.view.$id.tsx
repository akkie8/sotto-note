import { useEffect, useState } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useNavigate, useParams } from "@remix-run/react";
import { ArrowLeft, Bot, Calendar, Clock, Edit } from "lucide-react";

import { getOptionalUser } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { supabase } from "~/lib/supabase.client";
import { moodColors } from "../moodColors";

type JournalEntry = {
  id: string;
  content: string;
  mood: string;
  timestamp: number;
  date: string;
  user_id: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Try to get server-side user but don't require it
  const { user } = await getOptionalUser(request);

  return json({
    serverUser: user,
  });
}

// 時間帯に応じた背景グラデーション
function getTimeGradient(timestamp: number) {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) {
    return "from-yellow-50 to-orange-50"; // 朝
  } else if (hour >= 12 && hour < 17) {
    return "from-blue-50 to-cyan-50"; // 昼
  } else {
    return "from-purple-50 to-pink-50"; // 夜
  }
}

export default function JournalView() {
  const { serverUser } = useLoaderData<typeof loader>();
  const params = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(serverUser);

  useEffect(() => {
    const fetchEntry = async () => {
      try {
        // Check auth on client side
        const {
          data: { user: clientUser },
        } = await supabase.auth.getUser();
        setUser(clientUser);

        if (!clientUser) {
          navigate("/");
          return;
        }

        const entryId = params.id;
        if (!entryId) {
          navigate("/");
          return;
        }

        // Check cache first
        const cachedEntry = cache.get<JournalEntry>(
          CACHE_KEYS.JOURNAL_ENTRY(entryId)
        );

        if (cachedEntry) {
          setEntry(cachedEntry);
          setLoading(false);
          return;
        }

        // Fetch from database
        const { data, error } = await supabase
          .from("journals")
          .select("*")
          .eq("id", entryId)
          .eq("user_id", clientUser.id)
          .single();

        if (error || !data) {
          console.error("Error fetching entry:", error);
          navigate("/");
          return;
        }

        setEntry(data);
        // Cache the entry
        cache.set(CACHE_KEYS.JOURNAL_ENTRY(entryId), data, 10 * 60 * 1000);
      } catch (error) {
        console.error("Error:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [params.id, navigate, serverUser]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (!entry) {
    return null;
  }

  const timeGradient = getTimeGradient(entry.timestamp);
  const mood = moodColors[entry.mood as keyof typeof moodColors];

  return (
    <div className="min-h-screen bg-transparent">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">戻る</span>
          </button>
          <div className="flex items-center gap-2">
            <Link
              to={`/journal/${entry.id}`}
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
              title="編集"
            >
              <Edit size={18} />
            </Link>
            <Link
              to={`/counseling/${entry.id}`}
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
              title="AIに相談"
            >
              <Bot size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div
          className={`rounded-2xl bg-gradient-to-br ${timeGradient} p-6 shadow-sm`}
        >
          {/* 日付と時間 */}
          <div className="mb-4 flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{entry.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>
                {new Date(entry.timestamp).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* 気分 */}
          <div className="mb-6">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${
                mood?.color || "bg-gray-100 text-gray-600"
              }`}
            >
              {mood?.label || entry.mood}
            </span>
          </div>

          {/* 内容 */}
          <div className="prose prose-gray max-w-none">
            <p className="whitespace-pre-wrap leading-relaxed text-gray-800">
              {entry.content}
            </p>
          </div>
        </div>

        {/* アクションエリア */}
        <div className="mt-8 space-y-3">
          <Link
            to={`/counseling/${entry.id}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-3 text-white transition-colors hover:bg-gray-700"
          >
            <Bot size={18} />
            <span>AIに相談する</span>
          </Link>
          <Link
            to={`/journal/${entry.id}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Edit size={18} />
            <span>編集する</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
