import { useCallback, useEffect, useState } from "react";
import { Link } from "@remix-run/react";
import { Pause, Play, RotateCcw, Settings } from "lucide-react";

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
  const [tempSettings, setTempSettings] = useState<BreathingSettings>({
    inhaleTime: 4,
    holdInTime: 2,
    exhaleTime: 6,
    holdOutTime: 2,
    cycles: 5,
  });
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
          const cachedProfile = cache.get<{ name: string }>(
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
      const holdInTime = settings.holdInTime || 0;
      const holdOutTime = settings.holdOutTime || 0;
      switch (currentPhase) {
        case "inhale":
          if (holdInTime > 0) {
            setTimeLeft(holdInTime);
            return "hold-in";
          } else {
            setTimeLeft(settings.exhaleTime);
            return "exhale";
          }
        case "hold-in":
          setTimeLeft(settings.exhaleTime);
          return "exhale";
        case "exhale":
          if (holdOutTime > 0) {
            setTimeLeft(holdOutTime);
            return "hold-out";
          } else {
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
          }
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

  const getTimeBasedMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return "素敵な1日になりますように！";
    } else if (hour >= 12 && hour < 17) {
      return "午後も心穏やかにお過ごしください。";
    } else if (hour >= 17 && hour < 21) {
      return "夕方のひと息、お疲れさまでした。";
    } else {
      return "今夜はゆっくりとお休みください。";
    }
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

  const openSettings = () => {
    setTempSettings(settings);
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const saveSettings = () => {
    setSettings(tempSettings);
    setShowSettings(false);
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
      <div className="flex min-h-full items-center justify-center bg-wellness-bg p-4">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-wellness-primary">
            深呼吸
          </h1>
          <p className="text-wellness-textLight">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center bg-wellness-bg p-4">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-wellness-primary">
            深呼吸
          </h1>
          <p className="mb-6 text-wellness-textLight">ログインが必要です</p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-wellness-primary px-6 py-3 text-white transition-colors hover:bg-wellness-secondary"
          >
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-wellness-bg p-4">
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        {/* Header */}
        <div className="fade-in mb-12">
          <h1 className="mb-4 text-4xl font-light text-wellness-primary md:text-5xl">
            深呼吸
          </h1>
          <p className="text-lg text-wellness-textLight">
            {userName ? `${userName}さん、` : ""}
            心を落ち着けて、今この瞬間に集中しましょう
          </p>
        </div>

        {/* Main breathing circle */}
        <div className="relative mb-12">
          <div
            className={`breathing-circle mx-auto flex h-80 w-80 items-center justify-center rounded-full transition-all duration-1000 ease-in-out ${getCircleScale()} ${getCircleAnimation()}`}
          >
            <div className="text-center">
              <div className="mb-2 text-3xl font-light text-wellness-primary md:text-4xl">
                {getPhaseText(phase)}
              </div>
              {isActive && (
                <div className="text-6xl font-light text-wellness-secondary">
                  {timeLeft}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Phase description */}
        <div className="mb-8">
          <p className="text-lg font-light text-wellness-text">
            {getPhaseDescription(phase)}
          </p>
          {isActive && (
            <p className="mt-2 text-wellness-textLight">
              サイクル {currentCycle + 1} / {settings.cycles}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          {!isActive ? (
            <button
              onClick={startBreathing}
              className="flex min-w-[120px] items-center gap-2 whitespace-nowrap rounded-full bg-wellness-primary px-6 py-2.5 font-medium text-white transition-colors duration-200 hover:bg-wellness-secondary"
            >
              <Play size={18} />
              開始
            </button>
          ) : (
            <button
              onClick={pauseBreathing}
              className="flex min-w-[120px] items-center gap-2 whitespace-nowrap rounded-full bg-wellness-primary px-6 py-2.5 font-medium text-white transition-colors duration-200 hover:bg-wellness-secondary"
            >
              <Pause size={18} />
              一時停止
            </button>
          )}

          <button
            onClick={resetBreathing}
            className="flex min-w-[120px] items-center gap-2 whitespace-nowrap rounded-full bg-wellness-primary/10 px-6 py-2.5 font-medium text-wellness-primary transition-colors duration-200 hover:bg-wellness-primary/20"
          >
            <RotateCcw size={18} />
            リセット
          </button>

          <button
            onClick={openSettings}
            className="flex min-w-[120px] items-center gap-2 whitespace-nowrap rounded-full bg-wellness-primary/10 px-6 py-2.5 font-medium text-wellness-primary transition-colors duration-200 hover:bg-wellness-primary/20"
          >
            <Settings size={18} />
            設定
          </button>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="fade-in w-full max-w-md rounded-2xl bg-wellness-surface p-6 shadow-lg">
              <h3 className="mb-6 text-xl font-medium text-wellness-primary">
                呼吸設定
              </h3>
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="inhaleTime"
                    className="mb-1 block text-sm text-wellness-text"
                  >
                    吸う時間
                  </label>
                  <input
                    id="inhaleTime"
                    type="number"
                    min="1"
                    max="10"
                    value={tempSettings.inhaleTime}
                    onChange={(e) =>
                      setTempSettings((prev) => ({
                        ...prev,
                        inhaleTime: Number.parseInt(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg bg-wellness-bg px-3 py-2 text-wellness-text focus:outline-none focus:ring-2 focus:ring-wellness-primary/30"
                  />
                </div>
                <div>
                  <label
                    htmlFor="holdInTime"
                    className="mb-1 block text-sm text-wellness-text"
                  >
                    止める時間
                  </label>
                  <input
                    id="holdInTime"
                    type="number"
                    min="0"
                    max="10"
                    value={tempSettings.holdInTime}
                    onChange={(e) =>
                      setTempSettings((prev) => ({
                        ...prev,
                        holdInTime: Number.parseInt(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg bg-wellness-bg px-3 py-2 text-wellness-text focus:outline-none focus:ring-2 focus:ring-wellness-primary/30"
                  />
                </div>
                <div>
                  <label
                    htmlFor="exhaleTime"
                    className="mb-1 block text-sm text-wellness-text"
                  >
                    吐く時間
                  </label>
                  <input
                    id="exhaleTime"
                    type="number"
                    min="1"
                    max="10"
                    value={tempSettings.exhaleTime}
                    onChange={(e) =>
                      setTempSettings((prev) => ({
                        ...prev,
                        exhaleTime: Number.parseInt(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg bg-wellness-bg px-3 py-2 text-wellness-text focus:outline-none focus:ring-2 focus:ring-wellness-primary/30"
                  />
                </div>
                <div>
                  <label
                    htmlFor="holdOutTime"
                    className="mb-1 block text-sm text-wellness-text"
                  >
                    止める時間
                  </label>
                  <input
                    id="holdOutTime"
                    type="number"
                    min="0"
                    max="10"
                    value={tempSettings.holdOutTime}
                    onChange={(e) =>
                      setTempSettings((prev) => ({
                        ...prev,
                        holdOutTime: Number.parseInt(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg bg-wellness-bg px-3 py-2 text-wellness-text focus:outline-none focus:ring-2 focus:ring-wellness-primary/30"
                  />
                </div>
              </div>
              <div className="mb-6">
                <label
                  htmlFor="cycles"
                  className="mb-1 block text-sm text-wellness-text"
                >
                  サイクル数
                </label>
                <input
                  id="cycles"
                  type="number"
                  min="1"
                  max="20"
                  value={tempSettings.cycles}
                  onChange={(e) =>
                    setTempSettings((prev) => ({
                      ...prev,
                      cycles: Number.parseInt(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg bg-wellness-bg px-3 py-2 text-wellness-text focus:outline-none focus:ring-2 focus:ring-wellness-primary/30"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeSettings}
                  className="flex-1 rounded-lg bg-wellness-primary/10 px-4 py-2 text-wellness-primary transition-colors hover:bg-wellness-primary/20"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveSettings}
                  className="flex-1 rounded-lg bg-wellness-primary px-4 py-2 text-white transition-colors hover:bg-wellness-secondary"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Completion message */}
        {!isActive && currentCycle > 0 && phase !== "paused" && (
          <div className="fade-in rounded-2xl bg-wellness-surface/80 p-6 backdrop-blur-sm">
            <h3 className="mb-3 text-xl font-medium text-wellness-primary">
              おつかれさまでした！
            </h3>
            <p className="mb-3 text-wellness-text">
              {userName ? `${userName}さん、` : ""}
              {settings.cycles}
              サイクルの深呼吸が完了しました。心は落ち着きましたか？
            </p>
            <p className="font-medium text-wellness-secondary">
              {getTimeBasedMessage()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
