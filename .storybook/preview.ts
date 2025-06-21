import type { Preview } from "@storybook/react-vite";

import "../app/tailwind.css";

// Mock Supabase client for Storybook
const mockSupabaseClient = {
  auth: {
    onAuthStateChange: () => ({
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
};

// Mock the Supabase client module
if (typeof window !== "undefined") {
  (window as any).__MOCK_SUPABASE_CLIENT__ = mockSupabaseClient;
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
