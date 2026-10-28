const { createClient } = require('@supabase/supabase-js');

// Each request gets its own client: signing in must never change another user's session.
function createSupabaseClient() {
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Set SUPABASE_URL and SUPABASE_KEY in .env (use an anon or publishable key)');
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

module.exports = { createSupabaseClient };
