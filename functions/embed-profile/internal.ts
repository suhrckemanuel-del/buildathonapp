import { createClient } from '@supabase/supabase-js';
import type {
  FilmProfile,
  GamingProfile,
  InterestCategory,
  UserId,
} from '../../shared/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export function serializeProfile(
  category: InterestCategory,
  data: FilmProfile | GamingProfile,
): string {
  if (category === 'films') {
    const f = data as FilmProfile;
    return `Top films: ${f.top_films.join(', ')} | Actor: ${f.favourite_actor} | Director: ${f.favourite_director} | Disliked: ${f.disliked_film}`;
  }
  const g = data as GamingProfile;
  const genres = (g.genres ?? []).join(', ') || g.favourite_genre;
  return `Top games: ${g.top_games.join(', ')} | Genres: ${genres} | Recently played: ${g.recently_played} | Shame game: ${g.shame_game}`;
}

// Reads the profile row, calls OpenAI embeddings, writes the vector back.
// Throws on any failure — callers decide whether to swallow.
export async function embedProfileInternal(
  user_id: UserId,
  category: InterestCategory,
): Promise<{ dimensions: number }> {
  const { data: profile, error: profileErr } = await supabase
    .from('interest_profiles')
    .select('id, data')
    .eq('user_id', user_id)
    .eq('category', category)
    .maybeSingle();

  if (profileErr) throw profileErr;
  if (!profile) throw new Error('Profile not found');

  const text = serializeProfile(category, profile.data as FilmProfile | GamingProfile);

  const openaiRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    throw new Error(`OpenAI error ${openaiRes.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await openaiRes.json()) as { data: Array<{ embedding: number[] }> };
  const embedding = json.data?.[0]?.embedding;
  if (!embedding || embedding.length !== 1536) {
    throw new Error(`Unexpected embedding shape: length ${embedding?.length}`);
  }

  const { error: updateErr } = await supabase
    .from('interest_profiles')
    .update({
      embedding: embedding as unknown as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  if (updateErr) throw updateErr;

  return { dimensions: 1536 };
}
