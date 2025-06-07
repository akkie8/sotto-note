import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Zen Kaku Gothic New"',
          '"Noto Sans JP"',
          '"Inter"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        wellness: {
          primary: "#5f6598", // メインカラー - 深い青紫
          secondary: "#6f5f95", // セカンダリカラー - 紫
          tertiary: "#7d5886", // ターシアリーカラー - ピンク紫
          quaternary: "#8e6074", // クォータナリーカラー - モーブ
          accent: "#9d6d6a", // アクセントカラー - ダスティローズ
          bg: "#f8f9fc", // 明るい背景
          surface: "#ffffff", // カード背景
          text: "#2d2d2d", // テキスト
          textLight: "#6b7280", // 薄いテキスト
        },
      },
      borderRadius: {
        xl: "1.5rem",
        "3xl": "2rem",
        full: "9999px",
      },
      boxShadow: {
        soft: "0 4px 24px 0 rgba(95, 101, 152, 0.10)",
        gentle: "0 2px 16px 0 rgba(111, 95, 149, 0.10)",
      },
      backgroundImage: {
        "wellness-gradient":
          "linear-gradient(135deg, #f8f9fc 0%, #e8eaf6 50%, #f0f2ff 100%)",
        "primary-gradient": "linear-gradient(135deg, #5f6598 0%, #6f5f95 100%)",
        "secondary-gradient":
          "linear-gradient(135deg, #7d5886 0%, #8e6074 100%)",
        "accent-gradient": "linear-gradient(135deg, #8e6074 0%, #9d6d6a 100%)",
      },
      transitionTimingFunction: {
        gentle: "cubic-bezier(0.4, 0.0, 0.2, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
