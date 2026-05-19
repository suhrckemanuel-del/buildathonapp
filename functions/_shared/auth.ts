// Shared caller-identity verification for Azure Functions.
// Every public endpoint should call verifyCaller() and use the returned
// userId, NOT a user_id from the request body. Public browser-callable
// functions use authLevel: 'anonymous'; this Supabase JWT check is the
// actual user authentication boundary.

import type { HttpRequest, HttpResponseInit } from '@azure/functions';
import { createClient } from '@supabase/supabase-js';

// Service-role client is used only to call auth.getUser(jwt) on incoming
// requests. The JWT itself is verified against Supabase's signing key.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type VerifiedCaller = { userId: string };

export type VerifyResult =
  | { ok: true; caller: VerifiedCaller }
  | { ok: false; response: HttpResponseInit };

const UNAUTH: HttpResponseInit = {
  status: 401,
  jsonBody: { error: 'Unauthorized — missing or invalid session' },
};

export async function verifyCaller(req: HttpRequest): Promise<VerifyResult> {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false, response: UNAUTH };

  const jwt = match[1].trim();
  if (!jwt) return { ok: false, response: UNAUTH };

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user?.id) return { ok: false, response: UNAUTH };

  return { ok: true, caller: { userId: data.user.id } };
}
