import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { EmbedProfileRequest, EmbedProfileResponse } from '../../shared/types';
import { embedProfileInternal } from './internal';
import { verifyCaller } from '../_shared/auth';
import { checkRateLimit } from '../_shared/rateLimit';

export async function embedProfile(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const verified = await verifyCaller(req);
    if (!verified.ok) return verified.response;
    const user_id = verified.caller.userId;

    // 30 calls/hour: 1 OpenAI embedding call per invocation.
    const rl = await checkRateLimit(user_id, 'embed-profile', 30, 3600);
    if (!rl.ok) return rl.response;

    const body = (await req.json().catch(() => ({}))) as Partial<EmbedProfileRequest>;
    const { category } = body;
    if (!category || (category !== 'films' && category !== 'games')) {
      return { status: 400, jsonBody: { error: 'category required (films|games)' } };
    }

    const { dimensions } = await embedProfileInternal(user_id, category);
    const response: EmbedProfileResponse = { ok: true, dimensions };
    return { status: 200, jsonBody: response };
  } catch (err) {
    // Log full error internally; do NOT echo upstream provider error text to the client.
    ctx.error('embed-profile error:', err);
    return { status: 500, jsonBody: { error: 'Embedding generation failed. Please try again.' } };
  }
}

app.http('embed-profile', {
  methods: ['POST'],
  authLevel: 'function',
  handler: embedProfile,
});
