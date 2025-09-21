/**
 * Node modules
 */
import { createClient } from "@supabase/supabase-js";

/**
 * Configs
 */
import config from "@/configs/env.config";

export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
