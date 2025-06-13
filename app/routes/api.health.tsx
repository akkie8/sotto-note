// Health check endpoint

interface HealthCheck {
  status: string;
  timestamp: string;
  environment: string;
  checks: {
    openai_api_key: boolean;
    prompt_sotto_message: boolean;
    supabase_url: boolean;
    supabase_anon_key: boolean;
    openai_module?: boolean;
  };
  debug?: {
    openai_key_length?: number;
    prompt_length?: number;
    openai_import_error?: string;
  };
}

export const loader = async () => {
  // Basic health check endpoint to diagnose environment issues
  const health: HealthCheck = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    checks: {
      openai_api_key: !!process.env.OPENAI_API_KEY,
      prompt_sotto_message: !!process.env.PROMPT_SOTTO_MESSAGE,
      supabase_url: !!process.env.VITE_SUPABASE_URL,
      supabase_anon_key: !!process.env.VITE_SUPABASE_ANON_KEY,
    },
    // Only include detailed info in development
    ...(process.env.NODE_ENV === "development" && {
      debug: {
        openai_key_length: process.env.OPENAI_API_KEY?.length || 0,
        prompt_length: process.env.PROMPT_SOTTO_MESSAGE?.length || 0,
      },
    }),
  };

  // Test OpenAI module import
  try {
    await import("~/lib/openai.server");
    health.checks.openai_module = true;
  } catch (error) {
    health.checks.openai_module = false;
    if (process.env.NODE_ENV === "development" && health.debug) {
      health.debug.openai_import_error = (error as Error).message;
    }
  }

  return Response.json(health);
};
