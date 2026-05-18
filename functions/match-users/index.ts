import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import type { MatchUsersRequest, MatchUsersResponse } from '../../shared/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Called by frontend when user wants to be matched.
// Creates a match_request and returns immediately.
// The actual matching happens in the daily scan (match-users-cron).
export async function matchUsers(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await req.json() as MatchUsersRequest;
    const { user_id, prompt_text } = body;

    if (!user_id) return { status: 400, jsonBody: { error: 'user_id required' } };

    // Check user has at least one interest profile
    const { data: profiles, error: profileErr } = await supabase
      .from('interest_profiles')
      .select('id')
      .eq('user_id', user_id)
      .limit(1);

    if (profileErr || !profiles?.length) {
      return { status: 400, jsonBody: { error: 'Complete at least one interest profile before matching' } };
    }

    // Cancel any existing pending request
    await supabase
      .from('match_requests')
      .update({ status: 'expired' })
      .eq('user_id', user_id)
      .eq('status', 'pending');

    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: matchReq, error } = await supabase
      .from('match_requests')
      .insert({ user_id, prompt_text: prompt_text ?? null, expires_at: expiresAt })
      .select()
      .single();

    if (error) throw error;

    const response: MatchUsersResponse = {
      match_request_id: matchReq.id,
      expires_at: matchReq.expires_at,
      message: 'Match request created. We\'ll find your group within 3 days.',
    };

    return { status: 201, jsonBody: response };
  } catch (err) {
    ctx.error('match-users error:', err);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('match-users', {
  methods: ['POST'],
  authLevel: 'function',
  handler: matchUsers,
});
