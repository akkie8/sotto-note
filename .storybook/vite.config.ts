import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

// Storybook用のVite設定（Remixプラグインを除外）
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "../app"),
      "@": path.resolve(__dirname, "../app"),
      // Supabaseクライアントをモックに置き換え
      "~/lib/supabase.client": path.resolve(__dirname, "./__mocks__/supabase.ts"),
      "~/lib/supabase.server": path.resolve(__dirname, "./__mocks__/supabase.ts"),
      // User storeをモックに置き換え
      "~/stores/userStore": path.resolve(__dirname, "./__mocks__/userStore.ts"),
    },
  },
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'zustand'],
  },
  define: {
    'process.env': {},
  },
});