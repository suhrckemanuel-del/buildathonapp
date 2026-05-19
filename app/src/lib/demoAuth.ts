import type {
  FilmProfile,
  GamingProfile,
  GroupOption,
  MatchExplanation,
  Message,
  MusicProfile,
  RSVPStatus,
  SportsProfile,
} from '../../../shared/types';

const DEMO_ENABLED_KEY = 'buildathon.demo.enabled';
const DEMO_USERNAME_KEY = 'buildathon.demo.username';
const DEMO_PROFILE_KEY = 'buildathon.demo.filmProfile';
const DEMO_GAMING_PROFILE_KEY = 'buildathon.demo.gamingProfile';
const DEMO_SPORTS_PROFILE_KEY = 'buildathon.demo.sportsProfile';
const DEMO_MUSIC_PROFILE_KEY = 'buildathon.demo.musicProfile';
const DEMO_SELECTED_CATEGORIES_KEY = 'buildathon.demo.selectedCategories';
const DEMO_GROUPS_KEY = 'buildathon.demo.groups';
const DEMO_MESSAGES_KEY = 'buildathon.demo.messages';
const DEMO_SAFETY_KEY = 'buildathon.demo.safetyActions';
const DEMO_MATCH_EXPLANATIONS_KEY = 'buildathon.demo.matchExplanations';
const DEMO_EVENTS_KEY = 'buildathon.demo.events';
const DEMO_EVENT_RSVPS_KEY = 'buildathon.demo.eventRsvps';

export type DemoCategory = 'films' | 'games' | 'sports' | 'music';
export type DemoMatchCategory = DemoCategory | 'mixed';

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export async function enableDemoSession() {
  storage.setItem(DEMO_ENABLED_KEY, 'true');
  storage.setItem(DEMO_USERNAME_KEY, 'demo_films');
}

export async function clearDemoSession() {
  storage.removeItem(DEMO_ENABLED_KEY);
  storage.removeItem(DEMO_USERNAME_KEY);
  storage.removeItem(DEMO_PROFILE_KEY);
  storage.removeItem(DEMO_GAMING_PROFILE_KEY);
  storage.removeItem(DEMO_SPORTS_PROFILE_KEY);
  storage.removeItem(DEMO_MUSIC_PROFILE_KEY);
  storage.removeItem(DEMO_SELECTED_CATEGORIES_KEY);
  storage.removeItem(DEMO_GROUPS_KEY);
  storage.removeItem(DEMO_MESSAGES_KEY);
  storage.removeItem(DEMO_SAFETY_KEY);
  storage.removeItem(DEMO_MATCH_EXPLANATIONS_KEY);
  storage.removeItem(DEMO_EVENTS_KEY);
  storage.removeItem(DEMO_EVENT_RSVPS_KEY);
}

export async function isDemoSession() {
  return storage.getItem(DEMO_ENABLED_KEY) === 'true';
}

export async function getDemoUsername() {
  return storage.getItem(DEMO_USERNAME_KEY) ?? 'demo_films';
}

export async function saveDemoUsername(username: string) {
  storage.setItem(DEMO_USERNAME_KEY, username);
}

export async function getDemoFilmProfile(): Promise<FilmProfile | null> {
  const raw = storage.getItem(DEMO_PROFILE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FilmProfile;
  } catch {
    return null;
  }
}

export async function saveDemoFilmProfile(profile: FilmProfile) {
  storage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));
}

export async function getDemoSportsProfile(): Promise<SportsProfile | null> {
  const raw = storage.getItem(DEMO_SPORTS_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SportsProfile;
  } catch {
    return null;
  }
}

export async function saveDemoSportsProfile(profile: SportsProfile) {
  storage.setItem(DEMO_SPORTS_PROFILE_KEY, JSON.stringify(profile));
}

export async function getDemoMusicProfile(): Promise<MusicProfile | null> {
  const raw = storage.getItem(DEMO_MUSIC_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MusicProfile;
  } catch {
    return null;
  }
}

export async function saveDemoMusicProfile(profile: MusicProfile) {
  storage.setItem(DEMO_MUSIC_PROFILE_KEY, JSON.stringify(profile));
}

const CATEGORY_ORDER: DemoCategory[] = ['films', 'games', 'sports', 'music'];

const CATEGORY_ROUTES: Record<DemoCategory, string> = {
  films: '/onboarding/film-profile',
  games: '/onboarding/gaming-profile',
  sports: '/onboarding/sports-profile',
  music: '/onboarding/music-profile',
};

export async function getSelectedDemoCategories(): Promise<DemoCategory[]> {
  const raw = storage.getItem(DEMO_SELECTED_CATEGORIES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is DemoCategory =>
      v === 'films' || v === 'games' || v === 'sports' || v === 'music',
    );
  } catch {
    return [];
  }
}

export async function saveSelectedDemoCategories(categories: DemoCategory[]) {
  const ordered = CATEGORY_ORDER.filter((c) => categories.includes(c));
  storage.setItem(DEMO_SELECTED_CATEGORIES_KEY, JSON.stringify(ordered));
}

export function getCategoryRoute(category: DemoCategory): string {
  return CATEGORY_ROUTES[category];
}

export async function getNextOnboardingRoute(currentCategory: DemoCategory): Promise<string | null> {
  const selected = await getSelectedDemoCategories();
  if (selected.length === 0) return null;
  const idx = selected.indexOf(currentCategory);
  if (idx < 0) return null;
  const next = selected[idx + 1];
  if (!next) return null;
  return CATEGORY_ROUTES[next];
}

export async function proceedAfterProfileSave(currentCategory: DemoCategory): Promise<string> {
  const nextRoute = await getNextOnboardingRoute(currentCategory);
  if (nextRoute) return nextRoute;
  const { groupId, category } = await createDemoMatchedGroup();
  return `/match/searching?groupId=${groupId}&category=${category}`;
}

async function isCategorySaved(category: DemoCategory): Promise<boolean> {
  if (category === 'films') return (await getDemoFilmProfile()) !== null;
  if (category === 'games') return (await getDemoGamingProfile()) !== null;
  if (category === 'sports') return (await getDemoSportsProfile()) !== null;
  return (await getDemoMusicProfile()) !== null;
}

export async function getResumeRoute(): Promise<string> {
  const selected = await getSelectedDemoCategories();
  if (selected.length === 0) return '/onboarding/select-category';
  for (const cat of selected) {
    if (!(await isCategorySaved(cat))) return CATEGORY_ROUTES[cat];
  }
  return '/(tabs)';
}

export async function resetDemoOnboarding() {
  await clearDemoSession();
  await enableDemoSession();
}

const memoryStorage = new Map<string, string>();

const storage = {
  getItem: (key: string) => {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    return memoryStorage.get(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
    memoryStorage.set(key, value);
  },
  removeItem: (key: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
    memoryStorage.delete(key);
  },
};

export const demoGroups = [
  {
    id: 'demo-noir',
    name: 'Late Night Noir',
    summary: 'A quiet circle for moody thrillers, sharp dialogue, and black-and-white rewatches.',
    memberCount: 5,
    lastMessage: 'Tonight feels like a Chinatown night.',
    lastMessageAt: new Date().toISOString(),
    category: 'films',
  },
  {
    id: 'demo-auteurs',
    name: 'Auteur Club',
    summary: 'People who care a little too much about directors, camera movement, and endings.',
    memberCount: 4,
    lastMessage: 'Who gets the first Kubrick pick?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
    category: 'films',
  },
] satisfies DemoGroup[];

export const demoGroupOptions = [
  {
    group: {
      id: 'demo-noir',
      name: 'Late Night Noir',
      summary: 'Slow-burn thrillers, old Hollywood, and people who like a thoughtful first message.',
      created_at: new Date().toISOString(),
      match_request_id: null,
    },
    member_count: 5,
    shared_interests: ['Noir', 'Mystery', 'Kubrick'],
    preview_members: [
      { id: 'demo-member-1', username: 'marta_frames', avatar_url: null },
      { id: 'demo-member-2', username: 'slow_zoom', avatar_url: null },
    ],
  },
  {
    group: {
      id: 'demo-auteurs',
      name: 'Auteur Club',
      summary: 'For people who can happily spend twenty minutes comparing final shots.',
      created_at: new Date().toISOString(),
      match_request_id: null,
    },
    member_count: 4,
    shared_interests: ['Auteurs', 'Cinema history', 'Long takes'],
    preview_members: [
      { id: 'demo-member-3', username: 'cut_to_black', avatar_url: null },
      { id: 'demo-member-4', username: 'film_grain', avatar_url: null },
    ],
  },
  {
    group: {
      id: 'demo-comfort',
      name: 'Comfort Rewatchers',
      summary: 'Warm, low-pressure film chat around favorites, nostalgia, and weekend watchlists.',
      created_at: new Date().toISOString(),
      match_request_id: null,
    },
    member_count: 6,
    shared_interests: ['Rewatches', 'Actors', 'Easy chat'],
    preview_members: [
      { id: 'demo-member-5', username: 'popcornlogic', avatar_url: null },
      { id: 'demo-member-6', username: 'scene_stealer', avatar_url: null },
    ],
  },
] satisfies GroupOption[];

type DemoGroup = {
  id: string;
  name: string;
  summary: string;
  memberCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  category?: DemoMatchCategory;
};

type DemoSafetyAction = {
  id: string;
  group_id: string;
  action: 'leave' | 'report' | 'mute' | 'block';
  note?: string;
  created_at: string;
};

export async function getDemoGroups(): Promise<DemoGroup[]> {
  // First read seeds both film and gaming groups so the Groups list reflects
  // whichever category the user picked during onboarding (and shows both if
  // they've added multiple).
  const stored = storage.getItem(DEMO_GROUPS_KEY);
  if (!stored) {
    const seeded = [...demoGroups, ...demoGamingGroups];
    storage.setItem(DEMO_GROUPS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return readJson<DemoGroup[]>(DEMO_GROUPS_KEY, [...demoGroups, ...demoGamingGroups]);
}

export async function joinDemoGroup(option: GroupOption): Promise<string> {
  const groupId = option.group.id || `demo-joined-${Date.now()}`;
  const group: DemoGroup = {
    id: groupId,
    name: option.group.name,
    summary: option.group.summary,
    memberCount: option.member_count,
    lastMessage: null,
    lastMessageAt: null,
  };

  await upsertDemoGroup(group);
  ensureDemoMessages(groupId, group.name);
  writeDemoMatchExplanation(groupId, createExplanationForOption(option));
  return groupId;
}

export async function createDemoMatchedGroup(): Promise<{
  groupId: string;
  category: DemoMatchCategory;
}> {
  const filmProfile = await getDemoFilmProfile();
  const gamingProfile = await getDemoGamingProfile();
  const sportsProfile = await getDemoSportsProfile();
  const musicProfile = await getDemoMusicProfile();
  const username = await getDemoUsername();

  const hasFilm = !!filmProfile && filmProfile.top_films?.some((f) => f && f.trim().length > 0);
  const hasGaming = !!gamingProfile && gamingProfile.top_games?.some((g) => g && g.trim().length > 0);
  const hasSports = !!sportsProfile && !!sportsProfile.favourite_sport?.trim();
  const hasMusic =
    !!musicProfile &&
    (!!musicProfile.favourite_genre?.trim() ||
      (musicProfile.top_artists?.some((a) => a && a.trim().length > 0) ?? false));

  const filledCount = [hasFilm, hasGaming, hasSports, hasMusic].filter(Boolean).length;

  const category: DemoMatchCategory =
    filledCount > 1
      ? 'mixed'
      : hasGaming
        ? 'games'
        : hasSports
          ? 'sports'
          : hasMusic
            ? 'music'
            : 'films';

  const seedSource = [
    ...(filmProfile?.top_films ?? []),
    filmProfile?.favourite_director ?? '',
    filmProfile?.favourite_actor ?? '',
    filmProfile?.disliked_film ?? '',
    ...(gamingProfile?.top_games ?? []),
    gamingProfile?.favourite_genre ?? '',
    gamingProfile?.recently_played ?? '',
    gamingProfile?.shame_game ?? '',
    sportsProfile?.favourite_sport ?? '',
    sportsProfile?.favourite_team ?? '',
    sportsProfile?.play_or_watch ?? '',
    ...(sportsProfile?.top_athletes ?? []),
    ...(musicProfile?.top_artists ?? []),
    musicProfile?.favourite_genre ?? '',
    musicProfile?.last_concert ?? '',
    musicProfile?.comfort_album ?? '',
  ]
    .filter(Boolean)
    .join('|');

  const seed =
    Array.from(seedSource || 'fallback').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
  const pick = <T>(bank: T[], offset = 0): T => bank[(seed + offset) % bank.length];

  const groupId = `demo-match-${seed.toString(36).slice(0, 6)}`;

  const prefixBank = [
    'Late Night',
    'Fresh',
    'Mostly Quiet',
    'Recommended',
    'Heavy Rotation',
    'Off-Topic',
    'After Hours',
  ];
  const filmSuffixBank = ['Film Circle', 'Reel Talk', 'Frame by Frame', 'Cinephile Corner'];
  const gameSuffixBank = ['Lobby', 'Squad', 'Discord Drop-In', 'Couch & Cup'];
  const sportsSuffixBank = ['Bench', 'Match Day Crew', 'Sideline Club', 'Locker Room'];
  const musicSuffixBank = ['Rotation', 'Listening Room', 'Mixtape Club', 'B-Sides'];
  const mixedSuffixBank = ['Crossover Crew', 'Mixed Tastes', 'Sundays In'];

  const suffixBank =
    category === 'films'
      ? filmSuffixBank
      : category === 'games'
        ? gameSuffixBank
        : category === 'sports'
          ? sportsSuffixBank
          : category === 'music'
            ? musicSuffixBank
            : mixedSuffixBank;

  const prefix = pick(prefixBank, 0);
  const suffix = pick(suffixBank, 1);
  const name = `${prefix} ${suffix}`;

  const topFilm = filmProfile?.top_films?.[0]?.trim() || 'a film you keep coming back to';
  const secondFilm = filmProfile?.top_films?.[1]?.trim() || '';
  const thirdFilm = filmProfile?.top_films?.[2]?.trim() || '';
  const director = filmProfile?.favourite_director?.trim() || 'a director you trust';
  const actor = filmProfile?.favourite_actor?.trim() || 'a performance you remember';
  const dislikedFilm = filmProfile?.disliked_film?.trim() || '';
  const topGame = gamingProfile?.top_games?.[0]?.trim() || 'a game you keep reinstalling';
  const secondGame = gamingProfile?.top_games?.[1]?.trim() || '';
  const genre = gamingProfile?.favourite_genre?.trim() || 'your usual genre';
  const recent = gamingProfile?.recently_played?.trim() || topGame;
  const shameGame = gamingProfile?.shame_game?.trim() || '';
  const sport = sportsProfile?.favourite_sport?.trim() || 'your sport';
  const team = sportsProfile?.favourite_team?.trim() || 'a team you defend';
  const athlete = sportsProfile?.top_athletes?.[0]?.trim() || 'a player you watch closely';
  const secondAthlete = sportsProfile?.top_athletes?.[1]?.trim() || '';
  const playOrWatch = sportsProfile?.play_or_watch ?? 'watch';
  const topArtist = musicProfile?.top_artists?.[0]?.trim() || 'an artist on heavy rotation';
  const secondArtist = musicProfile?.top_artists?.[1]?.trim() || '';
  const musicGenre = musicProfile?.favourite_genre?.trim() || 'your usual genre';
  const lastConcert = musicProfile?.last_concert?.trim() || 'a recent gig';
  const comfortAlbum = musicProfile?.comfort_album?.trim() || 'a record you keep returning to';
  const filmFlavor = secondFilm || actor;
  const gameFlavor = secondGame || recent;
  const sportFlavor = secondAthlete || team;
  const musicFlavor = secondArtist || comfortAlbum;

  const filmSummaryBank = [
    `Small group around ${topFilm} and the kind of films ${director} keeps making.`,
    `A reading-the-credits kind of circle. Anchored on ${topFilm} and a soft spot for ${actor}.`,
    `Five people who agree ${topFilm} earned its rewatches. Low pressure, specific picks.`,
    `Built around ${director} energy — ${topFilm} on rotation, no homework assigned.`,
  ];
  const gameSummaryBank = [
    `${genre} regulars who keep ending up in ${topGame} when no one suggests anything else.`,
    `Small squad around ${topGame} and the rest of the ${genre} backlog.`,
    `People who play ${recent} more than they admit. ${genre} first, everything else after.`,
    `${topGame} as the anchor. Honest about queue times, not precious about ranks.`,
  ];
  const sportsSummaryBank = [
    `${sport} regulars who follow ${team} and still argue about ${athlete}.`,
    `Built around ${sport} — half ${playOrWatch === 'play' ? 'players' : playOrWatch === 'watch' ? 'watchers' : 'players and watchers'}, all opinions.`,
    `Small bench of ${sport} fans. ${team} comes up more than it should.`,
    `${athlete} talk, ${team} loyalty, ${sport} as the connective tissue.`,
  ];
  const musicSummaryBank = [
    `${musicGenre} listeners who keep cycling back to ${topArtist} and records like ${comfortAlbum}.`,
    `Small group built around ${topArtist} and the rest of the ${musicGenre} rotation.`,
    `People who treat ${comfortAlbum} as required listening. ${musicGenre} first.`,
    `${topArtist} on heavy play and a soft spot for shows like ${lastConcert}.`,
  ];
  const mixedSummaryBank = [
    `Half ${topFilm} talk, half ${topGame} downtime. The kind of group that drifts between both.`,
    `${topFilm} on the screen, ${topGame} on the second monitor. Mixed but not scattered.`,
    `For people who treat ${director} films and ${genre} sessions as the same hobby.`,
    `Built for crossover energy: ${topFilm}, ${topGame}, and whatever fills the gap between.`,
  ];
  const summaryBank =
    category === 'films'
      ? filmSummaryBank
      : category === 'games'
        ? gameSummaryBank
        : category === 'sports'
          ? sportsSummaryBank
          : category === 'music'
            ? musicSummaryBank
            : mixedSummaryBank;
  const summary = pick(summaryBank, 2);

  const filmOpenerBank = [
    `Matched you around ${topFilm} and a soft spot for ${director}. First question: what's the last film you genuinely thought about after the credits?`,
    `${topFilm} kept showing up across this group plus a few ${director} picks. What scene from a recent watch would you put on for someone who has never seen it?`,
    `Anchor here is ${topFilm} and ${actor} came up more than once. What film are you quietly recommending right now?`,
    `Grouped you around ${topFilm} and ${director}. What's one film you almost put on tonight and why did you skip it?`,
    secondFilm
      ? `${topFilm} and ${secondFilm} both pulled this group together. Which of the two would you actually rewatch tonight, and what would you pair it with?`
      : `Matched on ${topFilm} and ${director}. What's a film you only love because of one specific scene?`,
    dislikedFilm
      ? `Group anchors on ${topFilm} — and you're not the only one who bounced off ${dislikedFilm}. What's a film you wanted to like and couldn't?`
      : `${topFilm} with a ${director} undercurrent. What's a film you'd put on at 1am with no warning?`,
    thirdFilm
      ? `${topFilm}, ${secondFilm || actor}, ${thirdFilm} all came up across the group. Pick one and tell us why it stuck.`
      : `Anchored on ${topFilm} and ${actor}. What's a film you only watched because someone you trust told you to?`,
  ];
  const gameOpenerBank = [
    `${topGame} and a steady ${genre} habit showed up across the group. What's the game you keep going back to even when something newer is sitting in your library?`,
    `Matched on ${genre} and ${topGame}. What role or playstyle do you actually want vs. the one you end up with?`,
    `${recent} and ${topGame} both came up here. What's one game you'd defend and one you've given up on?`,
    `Anchored on ${topGame} and ${genre} sessions. What's installed but unplayed in your backlog right now?`,
    secondGame
      ? `${topGame} and ${secondGame} both anchor this group. Which one would you boot up tonight, and which are you waiting on a sale for?`
      : `${topGame} on rotation here. What's a ${genre} game you can quote from?`,
    shameGame
      ? `Group leans ${genre} — and ${shameGame} is allowed at this table. What's a game you wouldn't bring up at a dinner party but log hours into?`
      : `Anchored on ${topGame}. What's the last time a game actually surprised you?`,
    `${recent} keeps showing up. What's one mechanic, build or moment from ${topGame} you'd recommend to a friend without spoiling it?`,
  ];
  const sportsOpenerBank = [
    `Matched on ${sport} and a shared eye on ${team}. First question: which match this season is still living rent-free in your head?`,
    `${team} loyalty and ${athlete} chat showed up across the group. What's a hot take you'd defend on a Sunday?`,
    `Anchored on ${sport} — half the group ${playOrWatch === 'play' ? 'plays' : 'watches'}. What got you into ${sport} in the first place?`,
    `${athlete} kept coming up. If you had to pick one player to build a team around, who is it and why?`,
    secondAthlete
      ? `${athlete} and ${secondAthlete} both showed up across this group. Who's the better player and who's the better teammate?`
      : `Group rides for ${team}. What's a moment from ${sport} you can describe in one sentence and still get goosebumps?`,
    playOrWatch === 'play'
      ? `Group's heavy on people who actually play ${sport}. What's the position you ended up in vs. the one you wanted?`
      : `${team} faithful. Who's a player not on your team that you secretly respect?`,
    `${athlete} and ${team} keep coming up. What's a result from this season you're still annoyed about?`,
  ];
  const musicOpenerBank = [
    `${topArtist} kept showing up across the group plus a few ${musicGenre} threads. What album have you played most this month?`,
    `Anchored on ${musicGenre} and ${comfortAlbum}. What's a record you press play on without thinking?`,
    `${lastConcert} and ${topArtist} both came up here. What's the best show you've been to and what made it stick?`,
    `Matched on ${musicGenre} — ${topArtist} on rotation. What's an artist you discovered recently that's worth the queue?`,
    secondArtist
      ? `${topArtist} and ${secondArtist} both anchor this group. Which one are you putting on a road trip playlist and why?`
      : `Group circles around ${topArtist}. What's a song you've put on three times today?`,
    `${comfortAlbum} is the kind of record that keeps coming up here. What's an album you've played all the way through this year?`,
    `${musicGenre} and ${lastConcert} both showed up. What's the next show you'd actually pay to see?`,
  ];
  const mixedOpenerBank = [
    `Half the group came in on ${topFilm} and half on ${topGame}. What's a scene or a game you'd actually defend out loud?`,
    `Matched on a mix — ${topFilm} on the film side and ${topGame} on the gaming side. What's the last thing you finished and actually thought about afterward?`,
    `${director} films and ${genre} sessions both showed up here. What's one film or one game you'd recommend without overselling it?`,
    `Crossover group: ${topFilm}, ${topGame} and a habit of recommending things quietly. What's on your list this week?`,
    hasSports && hasFilm
      ? `${topFilm} on one side, ${sport} matches on the other. What's the more honest weekend ritual for you?`
      : `Cross-taste group. Pick one of: a film, a game, an album, a match. What's the one thing on your week you wouldn't skip?`,
    hasMusic && hasGaming
      ? `${topGame} sessions and ${topArtist} on the headphones — both anchored this group. What pairs best together in your routine?`
      : `Group is mixed on purpose. What's something you keep returning to that you can't really explain to people?`,
    `Anchors here are ${topFilm} and ${topGame}${hasSports ? `, with ${sport} threaded through` : ''}${hasMusic ? `, and ${topArtist} on the side` : ''}. What's a recommendation you've quietly been sitting on?`,
  ];
  const openerBank =
    category === 'films'
      ? filmOpenerBank
      : category === 'games'
        ? gameOpenerBank
        : category === 'sports'
          ? sportsOpenerBank
          : category === 'music'
            ? musicOpenerBank
            : mixedOpenerBank;
  const opener = pick(openerBank, 3);

  const filmMembers = [
    { id: 'demo-member-1', username: 'marta_frames', avatar_url: null },
    { id: 'demo-member-3', username: 'cut_to_black', avatar_url: null },
    { id: 'demo-member-6', username: 'scene_stealer', avatar_url: null },
    { id: 'demo-member-2', username: 'slow_zoom', avatar_url: null },
    { id: 'demo-member-4', username: 'film_grain', avatar_url: null },
  ];
  const gameMembers = [
    { id: 'demo-gaming-member-1', username: 'headshot_haiku', avatar_url: null },
    { id: 'demo-gaming-member-2', username: 'smoke_check', avatar_url: null },
    { id: 'demo-gaming-member-3', username: 'rune_reader', avatar_url: null },
    { id: 'demo-gaming-member-5', username: 'spaghetti_lobby', avatar_url: null },
    { id: 'demo-gaming-member-4', username: 'lvl_one_party', avatar_url: null },
  ];
  const sportsMembers = [
    { id: 'demo-sports-member-1', username: 'box_to_box', avatar_url: null },
    { id: 'demo-sports-member-2', username: 'second_yellow', avatar_url: null },
    { id: 'demo-sports-member-3', username: 'late_winner', avatar_url: null },
    { id: 'demo-sports-member-4', username: 'press_high', avatar_url: null },
    { id: 'demo-sports-member-5', username: 'side_volley', avatar_url: null },
  ];
  const musicMembers = [
    { id: 'demo-music-member-1', username: 'side_a_only', avatar_url: null },
    { id: 'demo-music-member-2', username: 'slow_fader', avatar_url: null },
    { id: 'demo-music-member-3', username: 'broken_record', avatar_url: null },
    { id: 'demo-music-member-4', username: 'pre_chorus', avatar_url: null },
    { id: 'demo-music-member-5', username: 'crate_digger', avatar_url: null },
  ];
  const memberPool =
    category === 'films'
      ? filmMembers
      : category === 'games'
        ? gameMembers
        : category === 'sports'
          ? sportsMembers
          : category === 'music'
            ? musicMembers
            : [filmMembers[0], gameMembers[0], sportsMembers[0], musicMembers[0], filmMembers[1]];

  const matched_members = [
    { id: DEMO_USER_ID, username, avatar_url: null as string | null },
    ...memberPool.slice(0, 4),
  ];

  const anchorPick =
    category === 'games'
      ? topGame
      : category === 'sports'
        ? `${sport} and ${team}`
        : category === 'music'
          ? `${topArtist} and ${musicGenre}`
          : topFilm;
  const complementPick =
    category === 'games'
      ? genre
      : category === 'sports'
        ? athlete
        : category === 'music'
          ? comfortAlbum
          : director;
  const adjacentPick =
    category === 'games'
      ? recent
      : category === 'sports'
        ? `${playOrWatch === 'play' ? 'playing' : playOrWatch === 'watch' ? 'watching' : 'doing both'} ${sport}`
        : category === 'music'
          ? lastConcert
          : actor;

  const tasteSignalBank = [
    `${anchorPick} and adjacent picks showed up more than once across the group.`,
    `Overlap is specific, not generic — ${anchorPick} anchors it.`,
    `Shared taste here is narrow on purpose: ${anchorPick} keeps recurring.`,
  ];
  const fitSignalBank = [
    `The group leans toward specific recommendations over broad takes.`,
    `Conversation tends to start with a scene, a build, or a mechanic — not a star rating.`,
    `Low-pressure energy: people share things they actually return to.`,
  ];
  const complementSignalBank = [
    `${complementPick} gives common ground without making everyone identical.`,
    `${adjacentPick} appears as a thread — close enough to discuss, different enough to compare.`,
    `Picks rhyme more than they repeat, which keeps the chat moving.`,
  ];

  const signals = [
    {
      label: 'Taste overlap',
      detail: pick(tasteSignalBank, 4),
      strength: 'high' as const,
    },
    {
      label: 'Conversation fit',
      detail: pick(fitSignalBank, 5),
      strength: 'high' as const,
    },
    {
      label: 'Complementary picks',
      detail: pick(complementSignalBank, 6),
      strength: 'medium' as const,
    },
  ];

  const group: DemoGroup = {
    id: groupId,
    name,
    summary,
    memberCount: matched_members.length,
    lastMessage: opener,
    lastMessageAt: new Date().toISOString(),
    category,
  };

  await upsertDemoGroup(group);
  writeDemoMessages(groupId, [
    {
      id: `${groupId}-opener`,
      group_id: groupId,
      sender_id: null,
      content: opener,
      is_ai_opener: true,
      created_at: new Date().toISOString(),
    },
  ]);
  const reasoningBank = [
    `The matching agent looked for shared language across ${filledCount > 1 ? 'your profiles' : 'the profile'}, compatible discussion energy, and enough variety for a first chat that does not feel forced.`,
    `Matched on specific overlap — ${anchorPick} as the anchor — and on tone: people who recommend things instead of ranking them.`,
    `Grouping prioritised taste density over taste breadth. Five people who actually return to ${anchorPick}, with ${complementPick} as the secondary thread.`,
    `The signals that mattered were ${anchorPick}, ${complementPick}, and a habit of describing what hooked them rather than what scored.`,
  ];
  const reasoning = pick(reasoningBank, 7);

  writeDemoMatchExplanation(groupId, {
    group_id: groupId,
    group_name: group.name,
    summary: group.summary,
    matched_members,
    signals,
    ai_reasoning: reasoning,
    opener_message: opener,
    created_at: new Date().toISOString(),
  });

  return { groupId, category };
}

export async function getDemoMatchExplanation(groupId: string): Promise<MatchExplanation | null> {
  const explanations = readJson<Record<string, MatchExplanation>>(DEMO_MATCH_EXPLANATIONS_KEY, {});
  if (explanations[groupId]) return explanations[groupId];

  const option = demoGroupOptions.find((item) => item.group.id === groupId);
  if (!option) return null;

  const explanation = createExplanationForOption(option);
  writeDemoMatchExplanation(groupId, explanation);
  return explanation;
}

export async function appendDemoMessage(groupId: string, content: string): Promise<Message> {
  const message: Message = {
    id: `demo-${Date.now()}`,
    group_id: groupId,
    sender_id: DEMO_USER_ID,
    content,
    is_ai_opener: false,
    created_at: new Date().toISOString(),
  };
  const messages = getDemoMessages(groupId);
  writeDemoMessages(groupId, [...messages, message]);

  const groups = await getDemoGroups();
  storage.setItem(
    DEMO_GROUPS_KEY,
    JSON.stringify(
      groups.map((group) =>
        group.id === groupId
          ? { ...group, lastMessage: content, lastMessageAt: message.created_at }
          : group,
      ),
    ),
  );

  return message;
}

export async function leaveDemoGroup(groupId: string) {
  const groups = await getDemoGroups();
  storage.setItem(DEMO_GROUPS_KEY, JSON.stringify(groups.filter((group) => group.id !== groupId)));
  await recordDemoSafetyAction(groupId, 'leave');
}

export async function recordDemoSafetyAction(
  groupId: string,
  action: DemoSafetyAction['action'],
  note?: string,
) {
  const actions = readJson<DemoSafetyAction[]>(DEMO_SAFETY_KEY, []);
  actions.push({
    id: `demo-safety-${Date.now()}`,
    group_id: groupId,
    action,
    note,
    created_at: new Date().toISOString(),
  });
  storage.setItem(DEMO_SAFETY_KEY, JSON.stringify(actions));
}

export function getDemoMessages(groupId: string) {
  const stored = readJson<Record<string, Message[]>>(DEMO_MESSAGES_KEY, {});
  if (stored[groupId]) return stored[groupId];

  const groupName = demoGroups.find((group) => group.id === groupId)?.name ?? 'Demo Group';

  return [
    {
      id: `${groupId}-opener`,
      group_id: groupId,
      sender_id: null,
      content: `I matched you because everyone in ${groupName} has a soft spot for films with atmosphere. What's a scene you'd put on for someone before they've even read the synopsis?`,
      is_ai_opener: true,
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      id: `${groupId}-one`,
      group_id: groupId,
      sender_id: 'demo-member-1',
      sender_username: 'marta_frames',
      content: 'I always start with the scene that tells you the rules of the world.',
      is_ai_opener: false,
      created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    },
    {
      id: `${groupId}-two`,
      group_id: groupId,
      sender_id: DEMO_USER_ID,
      sender_username: 'demo_films',
      content: 'That is a good prompt. I would pick something with a strong opening shot.',
      is_ai_opener: false,
      created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    },
  ] satisfies Array<Message & { sender_username?: string }>;
}

function ensureDemoMessages(groupId: string, groupName: string) {
  const stored = readJson<Record<string, Message[]>>(DEMO_MESSAGES_KEY, {});
  if (stored[groupId]) return;

  stored[groupId] = [
    {
      id: `${groupId}-opener`,
      group_id: groupId,
      sender_id: null,
      content: `I matched this group for a low-pressure film chat. First question for ${groupName}: what is an easy movie recommendation when someone wants atmosphere without homework?`,
      is_ai_opener: true,
      created_at: new Date().toISOString(),
    },
  ];
  storage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(stored));
}

function writeDemoMessages(groupId: string, messages: Message[]) {
  const stored = readJson<Record<string, Message[]>>(DEMO_MESSAGES_KEY, {});
  stored[groupId] = messages;
  storage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(stored));
}

function writeDemoMatchExplanation(groupId: string, explanation: MatchExplanation) {
  const explanations = readJson<Record<string, MatchExplanation>>(DEMO_MATCH_EXPLANATIONS_KEY, {});
  explanations[groupId] = explanation;
  storage.setItem(DEMO_MATCH_EXPLANATIONS_KEY, JSON.stringify(explanations));
}

function createExplanationForOption(option: GroupOption): MatchExplanation {
  const opener = `I matched this group around ${option.shared_interests.join(', ')}. What's one specific pick you'd use to explain your taste to a stranger?`;

  return {
    group_id: option.group.id,
    group_name: option.group.name,
    summary: option.group.summary,
    matched_members: [
      { id: DEMO_USER_ID, username: 'demo_films', avatar_url: null },
      ...option.preview_members,
      { id: 'demo-member-anchor', username: 'quiet_take', avatar_url: null },
    ].slice(0, option.member_count),
    signals: [
      {
        label: 'Shared interests',
        detail: option.shared_interests.join(', '),
        strength: 'high',
      },
      {
        label: 'Group size',
        detail: `${option.member_count} people keeps the chat small enough to enter casually.`,
        strength: 'medium',
      },
      {
        label: 'First-message potential',
        detail: 'The shared tags are specific enough for an opener that is not generic.',
        strength: 'high',
      },
    ],
    ai_reasoning:
      'The matching agent compared profile signals, grouped people with overlapping language, and selected a small circle where a first message can be specific but still easy to answer.',
    opener_message: opener,
    created_at: new Date().toISOString(),
  };
}

async function upsertDemoGroup(group: DemoGroup) {
  const groups = await getDemoGroups();
  const withoutExisting = groups.filter((item) => item.id !== group.id);
  storage.setItem(DEMO_GROUPS_KEY, JSON.stringify([group, ...withoutExisting]));
}

function readJson<T>(key: string, fallback: T): T {
  const raw = storage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── Gaming demo data ────────────────────────────────────────────

export async function getDemoGamingProfile(): Promise<GamingProfile | null> {
  const raw = storage.getItem(DEMO_GAMING_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GamingProfile;
  } catch {
    return null;
  }
}

export async function saveDemoGamingProfile(profile: GamingProfile) {
  storage.setItem(DEMO_GAMING_PROFILE_KEY, JSON.stringify(profile));
}

export const demoGamingGroups = [
  {
    id: 'demo-fps-crew',
    name: 'FPS Crew #42',
    summary: 'Valorant mains, CS veterans, and one apologetic COD player.',
    memberCount: 4,
    lastMessage: 'Anyone down for ranked tonight?',
    lastMessageAt: new Date().toISOString(),
    category: 'games',
  },
  {
    id: 'demo-rpg-nerds',
    name: 'RPG Depth Dive',
    summary: 'For people who read every item description and never skip dialogue.',
    memberCount: 5,
    lastMessage: "Baldur's Gate 3 or Elden Ring first?",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    category: 'games',
  },
] satisfies DemoGroup[];

export const demoGamingGroupOptions: GroupOption[] = [
  {
    group: {
      id: 'demo-fps-crew',
      name: 'FPS Crew #42',
      summary: 'Tactical shooters and ranked grinders who actually call shots.',
      created_at: new Date().toISOString(),
      match_request_id: null,
    },
    member_count: 4,
    shared_interests: ['Valorant', 'Tactical FPS', 'Ranked'],
    preview_members: [
      { id: 'demo-gaming-member-1', username: 'headshot_haiku', avatar_url: null },
      { id: 'demo-gaming-member-2', username: 'smoke_check', avatar_url: null },
    ],
  },
  {
    group: {
      id: 'demo-rpg-nerds',
      name: 'RPG Depth Dive',
      summary: 'Slow burners who love builds, lore, and dialogue trees.',
      created_at: new Date().toISOString(),
      match_request_id: null,
    },
    member_count: 5,
    shared_interests: ['CRPGs', 'Soulslikes', 'Worldbuilding'],
    preview_members: [
      { id: 'demo-gaming-member-3', username: 'rune_reader', avatar_url: null },
      { id: 'demo-gaming-member-4', username: 'lvl_one_party', avatar_url: null },
    ],
  },
  {
    group: {
      id: 'demo-couch-coop',
      name: 'Couch Co-op Club',
      summary: 'Local multiplayer, party games, and weeknight low-stakes fun.',
      created_at: new Date().toISOString(),
      match_request_id: null,
    },
    member_count: 5,
    shared_interests: ['Co-op', 'Indie', 'Party games'],
    preview_members: [
      { id: 'demo-gaming-member-5', username: 'spaghetti_lobby', avatar_url: null },
      { id: 'demo-gaming-member-6', username: 'two_buttons', avatar_url: null },
    ],
  },
];

// Seed messages for gaming demo groups (first read only)
function ensureGamingMessages() {
  const stored = readJson<Record<string, Message[]>>(DEMO_MESSAGES_KEY, {});
  let changed = false;

  if (!stored['demo-fps-crew']) {
    stored['demo-fps-crew'] = [
      {
        id: 'demo-fps-crew-opener',
        group_id: 'demo-fps-crew',
        sender_id: null,
        content:
          "I matched you all around tactical FPS — Valorant and CS came up across the group. Quick prompt: what's the role you actually want to play vs. the one you usually get stuck with?",
        is_ai_opener: true,
        created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      } as Message,
      {
        id: 'demo-fps-crew-1',
        group_id: 'demo-fps-crew',
        sender_id: 'demo-gaming-member-1',
        content: 'Sentinel by choice, duelist by team pressure.',
        is_ai_opener: false,
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      } as Message,
    ];
    changed = true;
  }

  if (!stored['demo-rpg-nerds']) {
    stored['demo-rpg-nerds'] = [
      {
        id: 'demo-rpg-nerds-opener',
        group_id: 'demo-rpg-nerds',
        sender_id: null,
        content:
          "Matched on slow, deep RPGs — BG3, Elden Ring, Disco Elysium kept showing up. First question: do you reload to fix dialogue choices, or live with them?",
        is_ai_opener: true,
        created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      } as Message,
    ];
    changed = true;
  }

  if (changed) storage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(stored));
}

// Run once at import time
ensureGamingMessages();

// ── Events demo data ────────────────────────────────────────────

export type DemoEvent = {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_at: string;
  created_at: string;
};

export type DemoEventWithMeta = {
  id: string;
  group_id: string;
  group_name: string;
  created_by: string;
  title: string;
  description: string | null;
  event_at: string;
  rsvps: { going: number; maybe: number; not_going: number; mine: RSVPStatus | null };
};

const seedEvents: DemoEvent[] = [
  {
    id: 'demo-event-1',
    group_id: 'demo-noir',
    created_by: DEMO_USER_ID,
    title: 'Chinatown rewatch night',
    description: "We vote on the cut — theatrical or director's.",
    event_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-event-2',
    group_id: 'demo-auteurs',
    created_by: 'demo-member-3',
    title: 'Kubrick marathon bracket',
    description: 'Vote on which Kubrick film we watch first.',
    event_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-event-3',
    group_id: 'demo-fps-crew',
    created_by: 'demo-gaming-member-1',
    title: 'Ranked session — Saturday',
    description: 'Warm up starts at 7, ranked from 8.',
    event_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    created_at: new Date().toISOString(),
  },
];

const seedRsvps: Record<string, { user_id: string; status: RSVPStatus }[]> = {
  'demo-event-1': [
    { user_id: DEMO_USER_ID, status: 'going' },
    { user_id: 'demo-member-1', status: 'going' },
    { user_id: 'demo-member-2', status: 'going' },
    { user_id: 'demo-member-5', status: 'maybe' },
  ],
  'demo-event-2': [
    { user_id: 'demo-member-3', status: 'going' },
    { user_id: 'demo-member-4', status: 'going' },
    { user_id: DEMO_USER_ID, status: 'maybe' },
    { user_id: 'demo-member-6', status: 'maybe' },
  ],
  'demo-event-3': [
    { user_id: 'demo-gaming-member-1', status: 'going' },
    { user_id: 'demo-gaming-member-2', status: 'going' },
    { user_id: 'demo-gaming-member-3', status: 'going' },
    { user_id: DEMO_USER_ID, status: 'going' },
  ],
};

function ensureSeedEvents() {
  const stored = storage.getItem(DEMO_EVENTS_KEY);
  if (!stored) storage.setItem(DEMO_EVENTS_KEY, JSON.stringify(seedEvents));
  const storedR = storage.getItem(DEMO_EVENT_RSVPS_KEY);
  if (!storedR) storage.setItem(DEMO_EVENT_RSVPS_KEY, JSON.stringify(seedRsvps));
}
ensureSeedEvents();

export async function getDemoEvents(): Promise<DemoEvent[]> {
  return readJson<DemoEvent[]>(DEMO_EVENTS_KEY, seedEvents);
}

const allGroupNameLookup = (): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const g of demoGroups) map[g.id] = g.name;
  for (const g of demoGamingGroups) map[g.id] = g.name;
  // include any user-joined demo groups too
  const stored = readJson<DemoGroup[]>(DEMO_GROUPS_KEY, []);
  for (const g of stored) map[g.id] = g.name;
  return map;
};

export async function getDemoEventsWithMeta(): Promise<DemoEventWithMeta[]> {
  const events = await getDemoEvents();
  const rsvps = readJson<Record<string, { user_id: string; status: RSVPStatus }[]>>(
    DEMO_EVENT_RSVPS_KEY,
    seedRsvps,
  );
  const groupNames = allGroupNameLookup();

  return events
    .slice()
    .sort((a, b) => new Date(a.event_at).getTime() - new Date(b.event_at).getTime())
    .map((e) => {
      const list = rsvps[e.id] ?? [];
      const counts = { going: 0, maybe: 0, not_going: 0 };
      let mine: RSVPStatus | null = null;
      for (const r of list) {
        counts[r.status] += 1;
        if (r.user_id === DEMO_USER_ID) mine = r.status;
      }
      return {
        id: e.id,
        group_id: e.group_id,
        group_name: groupNames[e.group_id] ?? 'Group',
        created_by: e.created_by,
        title: e.title,
        description: e.description,
        event_at: e.event_at,
        rsvps: { ...counts, mine },
      };
    });
}

export async function setDemoRSVP(eventId: string, status: RSVPStatus) {
  const rsvps = readJson<Record<string, { user_id: string; status: RSVPStatus }[]>>(
    DEMO_EVENT_RSVPS_KEY,
    seedRsvps,
  );
  const list = rsvps[eventId] ?? [];
  const withoutMe = list.filter((r) => r.user_id !== DEMO_USER_ID);
  withoutMe.push({ user_id: DEMO_USER_ID, status });
  rsvps[eventId] = withoutMe;
  storage.setItem(DEMO_EVENT_RSVPS_KEY, JSON.stringify(rsvps));
}

export async function addDemoEvent(input: {
  group_id: string;
  title: string;
  description: string | null;
  event_at: string;
}): Promise<DemoEvent> {
  const events = await getDemoEvents();
  const event: DemoEvent = {
    id: `demo-event-${Date.now()}`,
    group_id: input.group_id,
    created_by: DEMO_USER_ID,
    title: input.title,
    description: input.description,
    event_at: input.event_at,
    created_at: new Date().toISOString(),
  };
  storage.setItem(DEMO_EVENTS_KEY, JSON.stringify([...events, event]));
  await setDemoRSVP(event.id, 'going');
  return event;
}
