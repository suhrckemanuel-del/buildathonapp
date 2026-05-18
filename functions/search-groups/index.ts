import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import type { SearchGroupsRequest, SearchGroupsResponse, GroupOption } from '../../shared/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Called by frontend when user submits a natural language group search prompt.
// Returns up to 3 group options the user can choose to join.
export async function searchGroups(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await req.json() as SearchGroupsRequest;
    const { user_id, prompt_text } = body;

    if (!user_id || !prompt_text) {
      return { status: 400, jsonBody: { error: 'user_id and prompt_text required' } };
    }

    // Get the requesting user's interest profiles
    const { data: myProfiles } = await supabase
      .from('interest_profiles')
      .select('category, data')
      .eq('user_id', user_id);

    if (!myProfiles?.length) {
      return { status: 400, jsonBody: { error: 'Complete at least one interest profile first' } };
    }

    // Ask Claude to interpret the natural language prompt into filter criteria
    const interpretResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: 'You interpret group search prompts for a film/interest social app. Output ONLY valid JSON.',
      messages: [{
        role: 'user',
        content: `User search prompt: "${prompt_text}"
User's own film interests: ${JSON.stringify(myProfiles)}

Extract search intent as JSON with keys:
- preferred_films: string[] (specific films or directors mentioned, empty if none)
- vibe: "social" | "quiet" | "any"
- category: "films" | "any"`,
      }],
    });

    const interpretText = interpretResponse.content[0].type === 'text' ? interpretResponse.content[0].text : '{}';
    let filters: Record<string, unknown>;
    try {
      filters = JSON.parse(interpretText);
    } catch {
      filters = { vibe: 'any', preferred_films: [], category: 'any' };
    }

    // Find pending match requests (excluding the user's own) that haven't been matched yet
    // and share at least one interest category with the user
    const { data: candidates } = await supabase
      .from('match_requests')
      .select(`
        id,
        user_id,
        users!inner(id, username, avatar_url),
        interest_profiles!inner(category, data)
      `)
      .eq('status', 'pending')
      .neq('user_id', user_id)
      .gt('expires_at', new Date().toISOString())
      .limit(50);

    if (!candidates?.length) {
      return { status: 200, jsonBody: { options: [] } as SearchGroupsResponse };
    }

    // Ask Claude to select the 3 best matches from candidates given the prompt
    const selectionResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'You select the best group matches for a social matching app. Output ONLY valid JSON.',
      messages: [{
        role: 'user',
        content: `The user wants: "${prompt_text}"
Interpreted filters: ${JSON.stringify(filters)}
User's own interests: ${JSON.stringify(myProfiles)}

Candidate users (up to 50): ${JSON.stringify(candidates.slice(0, 20))}

Select up to 3 groups of 3-5 candidates (we add the user to make 4-6) that best match the prompt.
Output JSON array of objects: [{ user_ids: string[], shared_interests: string[], reason: string }]`,
      }],
    });

    const selectionText = selectionResponse.content[0].type === 'text' ? selectionResponse.content[0].text : '[]';
    let selections: Array<{ user_ids: string[]; shared_interests: string[]; reason: string }>;
    try {
      selections = JSON.parse(selectionText);
    } catch {
      selections = [];
    }

    // Build GroupOption previews (not yet creating groups — user picks first)
    const options: GroupOption[] = await Promise.all(
      selections.slice(0, 3).map(async (sel) => {
        const allUserIds = [...sel.user_ids, user_id];
        const { data: members } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', allUserIds);

        return {
          group: {
            id: '',                        // not created yet
            name: sel.reason,
            summary: `${sel.shared_interests.join(', ')}`,
            created_at: new Date().toISOString(),
            match_request_id: null,
          },
          member_count: allUserIds.length,
          shared_interests: sel.shared_interests,
          preview_members: (members ?? []).slice(0, 3),
          _pending_user_ids: allUserIds,   // frontend passes this back when user confirms
        } as GroupOption & { _pending_user_ids: string[] };
      })
    );

    return { status: 200, jsonBody: { options } as SearchGroupsResponse };
  } catch (err) {
    ctx.error('search-groups error:', err);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('search-groups', {
  methods: ['POST'],
  authLevel: 'function',
  handler: searchGroups,
});
