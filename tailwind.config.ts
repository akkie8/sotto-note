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
          bg: "#F8FAF7", // 生成り系
          accent: "#A7F3D0", // ミント
          accent2: "#C7D2FE", // ラベンダー
          accent3: "#FDE68A", // パステルイエロー
          accent4: "#FBCFE8", // ピンク
          accent5: "#BAE6FD", // 水色
          text: "#374151", // やさしいグレー
        },
      },
      borderRadius: {
        xl: "1.5rem",
        "3xl": "2rem",
        full: "9999px",
      },
      boxShadow: {
        soft: "0 4px 24px 0 rgba(167, 243, 208, 0.10)",
        gentle: "0 2px 16px 0 rgba(199, 210, 254, 0.10)",
      },
      backgroundImage: {
        "wellness-gradient":
          "linear-gradient(135deg, #F8FAF7 0%, #BAE6FD 100%)",
      },
      transitionTimingFunction: {
        gentle: "cubic-bezier(0.4, 0.0, 0.2, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
