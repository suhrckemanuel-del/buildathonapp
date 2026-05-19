import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createClient } from '@supabase/supabase-js';
import type {
  InterestCategory,
  MatchUsersRequest,
  MatchUsersResponse,
} from '../../shared/types';
import { createGroupCore } from '../create-group/index';
import { embedProfileInternal } from '../embed-profile/internal';
import { verifyCaller } from '../_shared/auth';
import { checkRateLimit } from '../_shared/rateLimit';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Diversity floor: reject any candidate closer than this — likely a duplicate profile.
const MIN_DISTANCE = 0.05;
// Group sizing (excluding the requesting user).
const MIN_NEIGHBOURS = 3;
const MAX_NEIGHBOURS = 5;

export async function matchUsers(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const verified = await verifyCaller(req);
    if (!verified.ok) return verified.response;
    const user_id = verified.caller.userId;

    // 20 calls/hour: each invocation may trigger an OpenAI embed + a Claude call.
    const rl = await checkRateLimit(user_id, 'match-users', 20, 3600);
    if (!rl.ok) return rl.response;

    const body = (await req.json().catch(() => ({}))) as Partial<MatchUsersRequest>;
    const { prompt_text } = body;

    // Pick the user's primary interest profile — prefer films, fall back to whatever they have.
    const { data: profiles, error: profileErr } = await supabase
      .from('interest_profiles')
      .select('id, category, embedding')
      .eq('user_id', user_id);

    if (profileErr) throw profileErr;
    if (!profiles?.length) {
      return {
        status: 400,
        jsonBody: { error: 'Complete at least one interest profile before matching' },
      };
    }

    const primary = profiles.find((p) => p.category === 'films') ?? profiles[0];
    const category = primary.category as InterestCategory;

    // Cancel any existing pending request, then insert a fresh one
    await supabase
      .from('match_requests')
      .update({ status: 'expired' })
      .eq('user_id', user_id)
      .eq('status', 'pending');

    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: matchReq, error: insertErr } = await supabase
      .from('match_requests')
      .insert({ user_id, prompt_text: prompt_text ?? null, expires_at: expiresAt })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Ensure we have an embedding to query with — lazy embed fallback
    let anchorEmbedding = primary.embedding as unknown as number[] | null;

    if (!anchorEmbedding) {
      try {
        await embedProfileInternal(user_id, category);
        const { data: refreshed } = await supabase
          .from('interest_profiles')
          .select('embedding')
          .eq('id', primary.id)
          .maybeSingle();
        anchorEmbedding = (refreshed?.embedding as unknown as number[] | null) ?? null;
      } catch (embedErr) {
        ctx.warn('match-users embed fallback failed:', embedErr);
      }
    }

    const baseResponse: MatchUsersResponse = {
      match_request_id: matchReq.id,
      expires_at: matchReq.expires_at,
      message: "Match request created. We'll find your group within 3 days.",
    };

    if (!anchorEmbedding) {
      // No embedding available, can't do nearest-neighbour — leave as pending
      return { status: 201, jsonBody: baseResponse };
    }

    // pgvector cosine distance via RPC (the RPC also takes a per-category advisory lock)
    const { data: candidates, error: rpcErr } = await supabase.rpc('match_candidates', {
      anchor_embedding: anchorEmbedding as unknown as string,
      match_category: category,
      exclude_user_id: user_id,
      max_results: 20,
    });

    if (rpcErr) {
      ctx.warn('match_candidates RPC failed, returning pending:', rpcErr);
      return { status: 201, jsonBody: baseResponse };
    }

    const filtered = (candidates ?? []).filter(
      (c: { user_id: string; distance: number }) => c.distance >= MIN_DISTANCE,
    );

    if (filtered.length < MIN_NEIGHBOURS) {
      return { status: 201, jsonBody: baseResponse };
    }

    const neighbourIds = filtered
      .slice(0, MAX_NEIGHBOURS)
      .map((c: { user_id: string }) => c.user_id);

    const groupUserIds = [user_id, ...neighbourIds].slice(0, 6);

    try {
      const created = await createGroupCore({
        user_ids: groupUserIds,
        category,
        match_request_id: matchReq.id,
      });

      const response: MatchUsersResponse = {
        match_request_id: matchReq.id,
        expires_at: matchReq.expires_at,
        message: 'Matched! Opening your new group.',
        group_id: created.group_id,
        immediate: true,
      };
      return { status: 201, jsonBody: response };
    } catch (groupErr) {
      ctx.error('inline createGroup failed, leaving as pending:', groupErr);
      return { status: 201, jsonBody: baseResponse };
    }
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
