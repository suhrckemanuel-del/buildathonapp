import { createClient } from '@supabase/supabase-js';
import type { FilmProfile, GamingProfile, InterestCategory } from '../../shared/types';

type SeedProfile =
  | { category: 'films'; data: FilmProfile; prompt: string }
  | { category: 'games'; data: GamingProfile; prompt: string };

type SeedUser = {
  email: string;
  username: string;
  profiles: SeedProfile[];
};

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY'] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'BuildathonDemo!2026';
const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

const seedUsers: SeedUser[] = [
  {
    email: 'seed.noir@buildathon.demo',
    username: 'noir_nina',
    profiles: [
      {
        category: 'films',
        data: {
          top_films: ['Mulholland Drive', 'Se7en', 'The Third Man'],
          favourite_actor: 'Tilda Swinton',
          favourite_director: 'David Fincher',
          disliked_film: 'Overexplained franchise finales',
        },
        prompt: 'Looking for people who like noir, mystery, and tense film nights.',
      },
    ],
  },
  {
    email: 'seed.scifi@buildathon.demo',
    username: 'orbit_omar',
    profiles: [
      {
        category: 'films',
        data: {
          top_films: ['Arrival', 'Blade Runner 2049', 'Interstellar'],
          favourite_actor: 'Oscar Isaac',
          favourite_director: 'Denis Villeneuve',
          disliked_film: 'Lazy time-travel plots',
        },
        prompt: 'Sci-fi films, big ideas, and cinema trips with actual conversation.',
      },
    ],
  },
  {
    email: 'seed.comfort@buildathon.demo',
    username: 'mika_movieclub',
    profiles: [
      {
        category: 'films',
        data: {
          top_films: ['Spirited Away', 'Paddington 2', 'The Grand Budapest Hotel'],
          favourite_actor: 'Saoirse Ronan',
          favourite_director: 'Hayao Miyazaki',
          disliked_film: 'Mean-spirited comedies',
        },
        prompt: 'Comfort movies, warm animation, and low-pressure watch parties.',
      },
    ],
  },
  {
    email: 'seed.arthouse@buildathon.demo',
    username: 'lena_latecuts',
    profiles: [
      {
        category: 'films',
        data: {
          top_films: ['In the Mood for Love', 'Paris, Texas', 'Portrait of a Lady on Fire'],
          favourite_actor: 'Tony Leung',
          favourite_director: 'Wong Kar-wai',
          disliked_film: 'Noisy exposition-heavy thrillers',
        },
        prompt: 'Arthouse film people for slow cinema, walks, and small screenings.',
      },
    ],
  },
  {
    email: 'seed.blockbuster@buildathon.demo',
    username: 'max_matinee',
    profiles: [
      {
        category: 'films',
        data: {
          top_films: ['Mad Max: Fury Road', 'Top Gun: Maverick', 'Mission: Impossible - Fallout'],
          favourite_actor: 'Rebecca Ferguson',
          favourite_director: 'Christopher McQuarrie',
          disliked_film: 'Action scenes with no geography',
        },
        prompt: 'Big-screen action fans who want a cinema plan, not just a feed.',
      },
    ],
  },
  {
    email: 'seed.fps@buildathon.demo',
    username: 'kai_clutch',
    profiles: [
      {
        category: 'games',
        data: {
          top_games: ['Valorant', 'Counter-Strike 2', 'Apex Legends'],
          favourite_genre: 'Tactical FPS',
          genres: ['FPS', 'Competitive', 'Team tactics'],
          recently_played: 'Valorant ranked with friends',
          shame_game: 'Still checking daily aim trainers',
        },
        prompt: 'Tactical FPS people who want comms, queue nights, and chill debriefs.',
      },
    ],
  },
  {
    email: 'seed.rpg@buildathon.demo',
    username: 'rhea_rolls',
    profiles: [
      {
        category: 'games',
        data: {
          top_games: ['Baldur\'s Gate 3', 'Elden Ring', 'Mass Effect 2'],
          favourite_genre: 'RPG',
          genres: ['RPG', 'Co-op', 'Story-rich'],
          recently_played: 'Baldur\'s Gate 3 honor mode',
          shame_game: 'Restarting character builds too often',
        },
        prompt: 'Story-rich RPG players for co-op plans and build debates.',
      },
    ],
  },
  {
    email: 'seed.cozy@buildathon.demo',
    username: 'sam_sprout',
    profiles: [
      {
        category: 'games',
        data: {
          top_games: ['Stardew Valley', 'Animal Crossing', 'Unpacking'],
          favourite_genre: 'Cozy',
          genres: ['Cozy', 'Simulation', 'Creative'],
          recently_played: 'Stardew Valley meadowlands farm',
          shame_game: 'Rearranging rooms instead of progressing',
        },
        prompt: 'Cozy gaming people for quiet Discord hangs and shared farms.',
      },
    ],
  },
  {
    email: 'seed.strategy@buildathon.demo',
    username: 'tariq_turns',
    profiles: [
      {
        category: 'games',
        data: {
          top_games: ['Civilization VI', 'Total War: Warhammer III', 'Into the Breach'],
          favourite_genre: 'Strategy',
          genres: ['Strategy', 'Tactics', 'Grand strategy'],
          recently_played: 'A too-long Civilization VI campaign',
          shame_game: 'One more turn at 2 AM',
        },
        prompt: 'Strategy players who enjoy patient games and tactical arguments.',
      },
    ],
  },
  {
    email: 'seed.mixed@buildathon.demo',
    username: 'jules_joins',
    profiles: [
      {
        category: 'films',
        data: {
          top_films: ['Dune: Part Two', 'Scott Pilgrim vs. the World', 'The Matrix'],
          favourite_actor: 'Zendaya',
          favourite_director: 'Lana Wachowski',
          disliked_film: 'Movies afraid to be weird',
        },
        prompt: 'Film fans who like stylish sci-fi, playful worlds, and group plans.',
      },
      {
        category: 'games',
        data: {
          top_games: ['Rocket League', 'Mario Kart 8 Deluxe', 'Overcooked 2'],
          favourite_genre: 'Party and sports',
          genres: ['Party', 'Sports', 'Co-op'],
          recently_played: 'Rocket League casual doubles',
          shame_game: 'Overcooked shouting matches',
        },
        prompt: 'Casual multiplayer people for quick games and no-pressure hangouts.',
      },
    ],
  },
];

async function findUserIdByEmail(email: string): Promise<string | null> {
  const pageSize = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < pageSize) return null;
  }
  throw new Error('Could not scan all auth users; increase pagination limit in seed script.');
}

async function ensureAuthUser(seed: SeedUser): Promise<string> {
  const existingId = await findUserIdByEmail(seed.email);
  if (existingId) return existingId;

  const { data, error } = await supabase.auth.admin.createUser({
    email: seed.email,
    password: demoPassword,
    email_confirm: true,
    user_metadata: { username: seed.username, seeded_for: 'buildathon-judge-demo' },
  });

  if (error) throw error;
  if (!data.user?.id) throw new Error(`No user id returned for ${seed.email}`);
  return data.user.id;
}

async function upsertPublicUser(userId: string, seed: SeedUser): Promise<void> {
  const { error } = await supabase.from('users').upsert(
    {
      id: userId,
      username: seed.username,
      avatar_url: null,
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

async function upsertProfile(userId: string, profile: SeedProfile): Promise<void> {
  const { error } = await supabase.from('interest_profiles').upsert(
    {
      user_id: userId,
      category: profile.category,
      data: profile.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,category' },
  );
  if (error) throw error;
}

async function ensurePendingMatchRequest(
  userId: string,
  category: InterestCategory,
  promptText: string,
): Promise<'inserted' | 'refreshed'> {
  const { data: pending, error: selectErr } = await supabase
    .from('match_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .limit(1);

  if (selectErr) throw selectErr;

  const prompt_text = `[seed:${category}] ${promptText}`;

  if (pending?.length) {
    const { error: updateErr } = await supabase
      .from('match_requests')
      .update({ prompt_text, expires_at: expiresAt })
      .eq('user_id', userId)
      .eq('status', 'pending');
    if (updateErr) throw updateErr;
    return 'refreshed';
  }

  const { error: insertErr } = await supabase.from('match_requests').insert({
    user_id: userId,
    prompt_text,
    expires_at: expiresAt,
    status: 'pending',
  });
  if (insertErr) throw insertErr;
  return 'inserted';
}

async function main(): Promise<void> {
  const { embedProfileInternal } = await import('../embed-profile/internal');
  let profileCount = 0;
  let embeddingCount = 0;
  let insertedRequests = 0;
  let refreshedRequests = 0;
  const categories = new Map<InterestCategory, number>();

  for (const seed of seedUsers) {
    const userId = await ensureAuthUser(seed);
    await upsertPublicUser(userId, seed);

    for (const profile of seed.profiles) {
      await upsertProfile(userId, profile);
      profileCount += 1;
      categories.set(profile.category, (categories.get(profile.category) ?? 0) + 1);

      const result = await embedProfileInternal(userId, profile.category);
      if (result.dimensions === 1536) embeddingCount += 1;

      const requestState = await ensurePendingMatchRequest(userId, profile.category, profile.prompt);
      if (requestState === 'inserted') insertedRequests += 1;
      else refreshedRequests += 1;
    }

    console.log(`Seeded ${seed.username} (${seed.email})`);
  }

  console.log('\nBuildathon judge seed complete');
  console.log(`Users: ${seedUsers.length}`);
  console.log(`Profiles: ${profileCount}`);
  console.log(`Embeddings generated: ${embeddingCount}`);
  console.log(`Pending requests inserted: ${insertedRequests}`);
  console.log(`Pending requests refreshed: ${refreshedRequests}`);
  console.log(
    `Category coverage: ${Array.from(categories.entries())
      .map(([category, count]) => `${category}=${count}`)
      .join(', ')}`,
  );
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
