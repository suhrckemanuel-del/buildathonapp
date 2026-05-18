import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import type { CreateGroupRequest, CreateGroupResponse, FilmProfile } from '../../shared/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Internal function — called by the daily match-cron job, not directly by frontend.
export async function createGroup(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await req.json() as CreateGroupRequest;
    const { user_ids, category } = body;

    if (!user_ids?.length || user_ids.length < 4 || user_ids.length > 6) {
      return { status: 400, jsonBody: { error: 'Groups must have 4–6 members' } };
    }

    // Fetch all interest profiles for the group
    const { data: profiles, error: profileErr } = await supabase
      .from('interest_profiles')
      .select('user_id, data')
      .in('user_id', user_ids)
      .eq('category', category);

    if (profileErr || !profiles?.length) throw profileErr ?? new Error('No profiles found');

    // Build a structured summary for Claude
    const profileSummaries = profiles.map((p) => {
      const film = p.data as FilmProfile;
      return `- Top films: ${film.top_films.join(', ')} | Actor: ${film.favourite_actor} | Director: ${film.favourite_director} | Disliked: ${film.disliked_film}`;
    }).join('\n');

    // Ask Claude to generate a group name, summary, and opening message
    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You create warm, specific group names and opening messages for film-interest social groups.
Be specific about the shared tastes — avoid generic phrases like "movie lovers".
Output ONLY valid JSON with keys: group_name, summary, opener_message.`,
      messages: [{
        role: 'user',
        content: `These ${user_ids.length} people have been matched based on film interests:\n${profileSummaries}\n\nGenerate a group_name (max 5 words), summary (1 sentence, shown on group card), and opener_message (2–3 sentences that reference specific shared interests and invites everyone to say hi).`,
      }],
    });

    const text = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '{}';
    const { group_name, summary, opener_message } = JSON.parse(text);

    // Create the group
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({ name: group_name, summary })
      .select()
      .single();

    if (groupErr) throw groupErr;

    // Add all members
    const memberInserts = user_ids.map((uid) => ({ group_id: group.id, user_id: uid }));
    const { error: membersErr } = await supabase.from('group_members').insert(memberInserts);
    if (membersErr) throw membersErr;

    // Insert AI opener message (sender_id null = AI)
    const { error: msgErr } = await supabase.from('messages').insert({
      group_id: group.id,
      sender_id: null,
      content: opener_message,
      is_ai_opener: true,
    });
    if (msgErr) throw msgErr;

    const response: CreateGroupResponse = {
      group_id: group.id,
      group_name,
      summary,
      opener_message,
    };

    return { status: 201, jsonBody: response };
  } catch (err) {
    ctx.error('create-group error:', err);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('create-group', {
  methods: ['POST'],
  authLevel: 'function',
  handler: createGroup,
});
