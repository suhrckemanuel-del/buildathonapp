import type {
  FilmProfile,
  GamingProfile,
  GroupOption,
  MatchExplanation,
  Message,
  RSVPStatus,
} from '../../../shared/types';

const DEMO_ENABLED_KEY = 'buildathon.demo.enabled';
const DEMO_USERNAME_KEY = 'buildathon.demo.username';
const DEMO_PROFILE_KEY = 'buildathon.demo.filmProfile';
const DEMO_GAMING_PROFILE_KEY = 'buildathon.demo.gamingProfile';
const DEMO_GROUPS_KEY = 'buildathon.demo.groups';
const DEMO_MESSAGES_KEY = 'buildathon.demo.messages';
const DEMO_SAFETY_KEY = 'buildathon.demo.safetyActions';
const DEMO_MATCH_EXPLANATIONS_KEY = 'buildathon.demo.matchExplanations';
const DEMO_EVENTS_KEY = 'buildathon.demo.events';
const DEMO_EVENT_RSVPS_KEY = 'buildathon.demo.eventRsvps';

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
  },
  {
    id: 'demo-auteurs',
    name: 'Auteur Club',
    summary: 'People who care a little too much about directors, camera movement, and endings.',
    memberCount: 4,
    lastMessage: 'Who gets the first Kubrick pick?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
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

export async function createDemoMatchedGroup(): Promise<string> {
  const profile = await getDemoFilmProfile();
  const username = await getDemoUsername();
  const groupId = 'demo-fresh-match';
  const topFilm = profile?.top_films[0] ?? 'a favorite film';
  const director = profile?.favourite_director ?? 'thoughtful directors';
  const actor = profile?.favourite_actor ?? 'memorable performances';

  const group: DemoGroup = {
    id: groupId,
    name: 'Fresh Film Circle',
    summary: `A low-pressure group for ${topFilm}, ${director}, and easy first conversations.`,
    memberCount: 5,
    lastMessage: `Welcome ${username}. Start anywhere: favorite scene, favorite actor, or a weekend pick.`,
    lastMessageAt: new Date().toISOString(),
  };
  const opener = `I matched you around ${topFilm}, ${director}, and ${actor}. To keep this low-pressure: share one scene you would recommend, or just say what kind of film night you are in the mood for.`;

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
  writeDemoMatchExplanation(groupId, {
    group_id: groupId,
    group_name: group.name,
    summary: group.summary,
    matched_members: [
      { id: DEMO_USER_ID, username, avatar_url: null },
      { id: 'demo-member-1', username: 'marta_frames', avatar_url: null },
      { id: 'demo-member-3', username: 'cut_to_black', avatar_url: null },
      { id: 'demo-member-6', username: 'scene_stealer', avatar_url: null },
      { id: 'demo-member-2', username: 'slow_zoom', avatar_url: null },
    ],
    signals: [
      {
        label: 'Taste overlap',
        detail: `${topFilm} and nearby atmospheric picks appeared across the group.`,
        strength: 'high',
      },
      {
        label: 'Conversation fit',
        detail: `The group leans toward specific scenes, directors, and low-pressure recommendations.`,
        strength: 'high',
      },
      {
        label: 'Complementary picks',
        detail: `${director} and ${actor} create enough common ground without making everyone identical.`,
        strength: 'medium',
      },
    ],
    ai_reasoning:
      'The matching agent looked for shared film language, compatible discussion energy, and enough variety for a first chat that does not feel forced.',
    opener_message: opener,
    created_at: new Date().toISOString(),
  });

  return groupId;
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
      content: `I matched you because everyone here has a soft spot for films with atmosphere. Start with this: what scene from ${groupName} energy would you show someone first?`,
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
  const opener = `I matched this group around ${option.shared_interests.join(', ')}. Start small: what is one film, scene, or actor you would use to explain your taste?`;

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
  },
  {
    id: 'demo-rpg-nerds',
    name: 'RPG Depth Dive',
    summary: 'For people who read every item description and never skip dialogue.',
    memberCount: 5,
    lastMessage: "Baldur's Gate 3 or Elden Ring first?",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
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
