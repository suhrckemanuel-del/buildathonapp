// Per-user rate limiting for AI-cost endpoints. Backed by the
// public.check_rate_limit() RPC in migration 0005 (atomic check-and-increment).
//
// Usage at the top of a Function, after verifyCaller():
//
//   const rl = await checkRateLimit(userId, 'search-groups', 10, 3600);
//   if (!rl.ok) return rl.response;
//
// Fail-open: if the RPC errors (DB down, migration missing), we log and allow
// the request. The alternative — failing closed — would make a DB hiccup take
// the whole app down. For this app's traffic profile the trade-off is correct.

import type { HttpResponseInit } from '@azure/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type RateLimitResult =
  | { ok: true }
  | { ok: false; response: HttpResponseInit };

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxPerWindow: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_max_per_window: maxPerWindow,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.warn(`[rateLimit] RPC error for ${endpoint}, failing open:`, error.message);
    return { ok: true };
  }

  if (data === false) {
    return {
      ok: false,
      response: {
        status: 429,
        jsonBody: {
          error: `Rate limit exceeded for ${endpoint}. Try again later.`,
        },
        headers: { 'Retry-After': String(windowSeconds) },
      },
    };
  }

  return { ok: true };
}
