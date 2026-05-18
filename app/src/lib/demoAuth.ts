import type { FilmProfile, GroupOption, MatchExplanation, Message } from '../../../shared/types';

const DEMO_ENABLED_KEY = 'buildathon.demo.enabled';
const DEMO_USERNAME_KEY = 'buildathon.demo.username';
const DEMO_PROFILE_KEY = 'buildathon.demo.filmProfile';
const DEMO_GROUPS_KEY = 'buildathon.demo.groups';
const DEMO_MESSAGES_KEY = 'buildathon.demo.messages';
const DEMO_SAFETY_KEY = 'buildathon.demo.safetyActions';
const DEMO_MATCH_EXPLANATIONS_KEY = 'buildathon.demo.matchExplanations';

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export async function enableDemoSession() {
  storage.setItem(DEMO_ENABLED_KEY, 'true');
  storage.setItem(DEMO_USERNAME_KEY, 'demo_films');
}

export async function clearDemoSession() {
  storage.removeItem(DEMO_ENABLED_KEY);
  storage.removeItem(DEMO_USERNAME_KEY);
  storage.removeItem(DEMO_PROFILE_KEY);
  storage.removeItem(DEMO_GROUPS_KEY);
  storage.removeItem(DEMO_MESSAGES_KEY);
  storage.removeItem(DEMO_SAFETY_KEY);
  storage.removeItem(DEMO_MATCH_EXPLANATIONS_KEY);
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
  return readJson<DemoGroup[]>(DEMO_GROUPS_KEY, demoGroups);
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
