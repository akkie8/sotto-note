import { useCallback, useEffect, useState } from "react";
import { Link } from "@remix-run/react";
import { Home, Pause, Play, RotateCcw, Settings } from "lucide-react";

import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { supabase } from "../lib/supabase.client";

type BreathingPhase = "inhale" | "hold-in" | "exhale" | "hold-out" | "paused";

interface BreathingSettings {
  inhaleTime: number;
  holdInTime: number;
  exhaleTime: number;
  holdOutTime: number;
  cycles: number;
}

export default function Breathing() {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<BreathingPhase>("paused");
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [userName, setUserName] = useState("");
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BreathingSettings>({
    inhaleTime: 4,
    holdInTime: 2,
    exhaleTime: 6,
    holdOutTime: 2,
    cycles: 5,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user: clientUser },
        } = await supabase.auth.getUser();
        setUser(clientUser);

        if (clientUser) {
          // Check cache first
          const cachedProfile = cache.get(
            CACHE_KEYS.USER_PROFILE(clientUser.id)
          );

          if (cachedProfile?.name) {
            setUserName(cachedProfile.name);
          } else {
            const { data, error } = await supabase
              .from("profiles")
              .select("name")
              .eq("user_id", clientUser.id)
              .single();
            if (!error && data?.name) {
              setUserName(data.name);
              // Cache the profile
              cache.set(
                CACHE_KEYS.USER_PROFILE(clientUser.id),
                data,
                10 * 60 * 1000
              );
            }
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const getPhaseText = (currentPhase: BreathingPhase) => {
    switch (currentPhase) {
      case "inhale":
        return "吸って";
      case "hold-in":
        return "止めて";
      case "exhale":
        return "吐いて";
      case "hold-out":
        return "止めて";
      default:
        return "準備はいいですか？";
    }
  };

  const getPhaseDescription = (currentPhase: BreathingPhase) => {
    switch (currentPhase) {
      case "inhale":
        return "ゆっくりと鼻から息を吸い込みます";
      case "hold-in":
        return "息を止めて、心を落ち着けます";
      case "exhale":
        return "ゆっくりと口から息を吐き出します";
      case "hold-out":
        return "息を止めて、リラックスします";
      default:
        return "深呼吸を始めて、心を整えましょう";
    }
  };

  const nextPhase = useCallback(() => {
    setPhase((currentPhase) => {
      switch (currentPhase) {
        case "inhale":
          setTimeLeft(settings.holdInTime);
          return "hold-in";
        case "hold-in":
          setTimeLeft(settings.exhaleTime);
          return "exhale";
        case "exhale":
          setTimeLeft(settings.holdOutTime);
          return "hold-out";
        case "hold-out":
          setCurrentCycle((prev) => {
            const newCycle = prev + 1;
            if (newCycle >= settings.cycles) {
              setIsActive(false);
              setTimeLeft(0);
              return 0;
            }
            setTimeLeft(settings.inhaleTime);
            return newCycle;
          });
          return "inhale";
        default:
          return currentPhase;
      }
    });
  }, [settings]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            nextPhase();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, nextPhase]);

  const startBreathing = () => {
    setIsActive(true);
    setPhase("inhale");
    setTimeLeft(settings.inhaleTime);
    setCurrentCycle(0);
  };

  const pauseBreathing = () => {
    setIsActive(false);
  };

  const resetBreathing = () => {
    setIsActive(false);
    setPhase("paused");
    setTimeLeft(0);
    setCurrentCycle(0);
  };

  const getCircleScale = () => {
    if (phase === "inhale") return "scale-110";
    if (phase === "exhale") return "scale-75";
    return "scale-100";
  };

  const getCircleAnimation = () => {
    if (phase === "inhale") return "breathe-in";
    if (phase === "exhale") return "breathe-out";
    return "";
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-emerald-800">深呼吸</h1>
          <p className="text-emerald-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-emerald-800">深呼吸</h1>
          <p className="mb-6 text-emerald-600">ログインが必要です</p>
          <Link
            to="/about"
            className="inline-block rounded-lg bg-emerald-600 px-6 py-3 text-white transition-colors hover:bg-emerald-700"
          >
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      {/* Header */}
      <div className="fixed left-0 right-0 top-0 z-20 p-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-emerald-700 shadow-sm backdrop-blur-sm transition-colors duration-200 hover:bg-white/90"
        >
          <Home size={18} />
          <span>ホームに戻る</span>
        </Link>
      </div>

      {/* Background organic shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="organic-blob absolute left-20 top-20 h-64 w-64 bg-emerald-200/20"></div>
        <div
          className="organic-blob absolute bottom-20 right-20 h-80 w-80 bg-teal-200/20"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="organic-blob absolute left-1/4 top-1/2 h-48 w-48 bg-cyan-200/20"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        {/* Header */}
        <div className="fade-in mb-12">
          <h1 className="mb-4 text-4xl font-light text-emerald-800 md:text-5xl">
            深呼吸
          </h1>
          <p className="text-lg text-emerald-600">
            {userName ? `${userName}さん、` : ""}
            心を落ち着けて、今この瞬間に集中しましょう
          </p>
        </div>

        {/* Main breathing circle */}
        <div className="relative mb-12">
          <div
            className={`breathing-circle mx-auto flex h-80 w-80 items-center justify-center rounded-full transition-all duration-1000 ease-in-out ${getCircleScale()} ${getCircleAnimation()} border-4 border-emerald-300/30`}
          >
            <div className="text-center">
              <div className="mb-2 text-3xl font-light text-emerald-800 md:text-4xl">
                {getPhaseText(phase)}
              </div>
              {isActive && (
                <div className="text-6xl font-light text-emerald-700">
                  {timeLeft}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Phase description */}
        <div className="mb-8">
          <p className="text-lg font-light text-emerald-700">
            {getPhaseDescription(phase)}
          </p>
          {isActive && (
            <p className="mt-2 text-emerald-600">
              サイクル {currentCycle + 1} / {settings.cycles}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          {!isActive ? (
            <button
              onClick={startBreathing}
              className="flex min-w-[120px] items-center gap-2 whitespace-nowrap rounded-full bg-emerald-500 px-6 py-2.5 font-medium text-white transition-colors duration-200 hover:bg-emerald-600"
            >
              <Play size={18} />
              開始
            </button>
          ) : (
            <button
              onClick={pauseBreathing}
              className="flex min-w-[120px] items-center gap-2 whitespace-nowrap rounded-full bg-emerald-500 px-6 py-2.5 font-medium text-white transition-colors duration-200 hover:bg-emerald-600"
            >
              <Pause size={18} />
              一時停止
            </button>
          )}

          <button
            onClick={resetBreathing}
            className="flex min-w-[120px] items-center gap-2 whitespace-nowrap rounded-full bg-emerald-100 px-6 py-2.5 font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-200"
          >
            <RotateCcw size={18} />
            リセット
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex min-w-[120px] items-center gap-2 whitespace-nowrap rounded-full bg-emerald-100 px-6 py-2.5 font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-200"
          >
            <Settings size={18} />
            設定
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="fade-in rounded-2xl border border-emerald-200/50 bg-white/80 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-xl font-medium text-emerald-800">
              呼吸設定
            </h3>
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label
                  htmlFor="inhaleTime"
                  className="mb-1 block text-sm text-emerald-700"
                >
                  吸う時間
                </label>
                <input
                  id="inhaleTime"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.inhaleTime}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      inhaleTime: Number.parseInt(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label
                  htmlFor="holdInTime"
                  className="mb-1 block text-sm text-emerald-700"
                >
                  止める時間
                </label>
                <input
                  id="holdInTime"
                  type="number"
                  min="0"
                  max="10"
                  value={settings.holdInTime}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      holdInTime: Number.parseInt(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label
                  htmlFor="exhaleTime"
                  className="mb-1 block text-sm text-emerald-700"
                >
                  吐く時間
                </label>
                <input
                  id="exhaleTime"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.exhaleTime}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      exhaleTime: Number.parseInt(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label
                  htmlFor="holdOutTime"
                  className="mb-1 block text-sm text-emerald-700"
                >
                  止める時間
                </label>
                <input
                  id="holdOutTime"
                  type="number"
                  min="0"
                  max="10"
                  value={settings.holdOutTime}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      holdOutTime: Number.parseInt(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>
            <div className="mb-4">
              <label
                htmlFor="cycles"
                className="mb-1 block text-sm text-emerald-700"
              >
                サイクル数
              </label>
              <input
                id="cycles"
                type="number"
                min="1"
                max="20"
                value={settings.cycles}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    cycles: Number.parseInt(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>
        )}

        {/* Completion message */}
        {!isActive && currentCycle > 0 && phase !== "paused" && (
          <div className="fade-in rounded-2xl border border-emerald-200/50 bg-emerald-100/80 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-xl font-medium text-emerald-800">
              お疲れさまでした
            </h3>
            <p className="text-emerald-700">
              {userName ? `${userName}さん、` : ""}
              {settings.cycles}
              サイクルの深呼吸が完了しました。心は落ち着きましたか？
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
