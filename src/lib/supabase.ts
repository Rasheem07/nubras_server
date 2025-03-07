import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://npflzgewiauusweatkoc.supabase.co",
  process.env.SUPABASE_API_KEY // Use Service Role Key for server-side operations
);
