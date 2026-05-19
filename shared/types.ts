// ============================================================
// SHARED CONTRACT — imported by both app/ and functions/
// Any change here affects both sides. Coordinate before editing.
// ============================================================

export type UserId = string;
export type GroupId = string;

// ── User ────────────────────────────────────────────────────
export interface User {
  id: UserId;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

// ── Interest Profile ─────────────────────────────────────────
export type InterestCategory = 'films' | 'games' | 'sports' | 'music';

export interface FilmProfile {
  top_films: [string, string, string];   // exactly 3
  favourite_actor: string;
  favourite_director: string;
  disliked_film: string;
}

export interface GamingProfile {
  top_games: [string, string, string];   // exactly 3
  favourite_genre: string;               // single primary genre (chip select)
  genres: string[];                      // all selected genre chips
  recently_played: string;
  shame_game: string;
}

export interface SportsProfile {
  favourite_sport: string;
  favourite_team: string;
  play_or_watch: 'play' | 'watch' | 'both';
  top_athletes: string[];
}

export interface MusicProfile {
  top_artists: string[];
  favourite_genre: string;
  last_concert: string;
  comfort_album: string;
}

export type InterestProfileData = FilmProfile | GamingProfile | SportsProfile | MusicProfile;

export interface InterestProfile {
  id: string;
  user_id: UserId;
  category: InterestCategory;
  data: InterestProfileData;
  created_at: string;
  updated_at: string;
}

// ── Match Request ────────────────────────────────────────────
export type MatchRequestStatus = 'pending' | 'matched' | 'expired';

export interface MatchRequest {
  id: string;
  user_id: UserId;
  prompt_text: string | null;            // natural language search e.g. "quieter people"
  status: MatchRequestStatus;
  expires_at: string;                    // 3 days from creation
  created_at: string;
}

// ── Group ────────────────────────────────────────────────────
export interface Group {
  id: GroupId;
  name: string;
  summary: string;                       // AI-generated, shown on group card
  created_at: string;
  match_request_id: string | null;
}

export interface GroupMember {
  group_id: GroupId;
  user_id: UserId;
  joined_at: string;
}

// Group card shown to user before they accept/join
export interface GroupOption {
  group: Group;
  member_count: number;
  shared_interests: string[];            // e.g. ["Kubrick", "The Godfather"]
  preview_members: Pick<User, 'id' | 'username' | 'avatar_url'>[];
  pending_user_ids?: UserId[];           // users to create the group with when accepted
}

export interface MatchSignal {
  label: string;
  detail: string;
  strength: 'low' | 'medium' | 'high';
}

export interface MatchExplanation {
  group_id: GroupId;
  group_name: string;
  summary: string;
  matched_members: Pick<User, 'id' | 'username' | 'avatar_url'>[];
  signals: MatchSignal[];
  ai_reasoning: string;
  opener_message: string;
  created_at: string;
}

// ── Messages ─────────────────────────────────────────────────
export interface Message {
  id: string;
  group_id: GroupId;
  sender_id: UserId | null;             // null = AI opener
  content: string;
  is_ai_opener: boolean;
  created_at: string;
}

// ── Azure Function payloads ───────────────────────────────────

// POST /api/match-users
export interface MatchUsersRequest {
  user_id: UserId;
  prompt_text?: string;
}
export interface MatchUsersResponse {
  match_request_id: string;
  expires_at: string;
  message: string;
  group_id?: GroupId;
  immediate?: boolean;
}

// POST /api/embed-profile
export interface EmbedProfileRequest {
  user_id: UserId;
  category: InterestCategory;
}
export interface EmbedProfileResponse {
  ok: boolean;
  dimensions: number;
}

// POST /api/create-group  (called internally by match job, not by frontend)
export interface CreateGroupRequest {
  user_ids: UserId[];
  category: InterestCategory;
  match_request_id?: string | null;
}
export interface CreateGroupResponse {
  group_id: GroupId;
  group_name: string;
  summary: string;
  opener_message: string;
}

// POST /api/search-groups
export interface SearchGroupsRequest {
  user_id: UserId;
  prompt_text: string;
}
export interface SearchGroupsResponse {
  options: GroupOption[];
}

// POST /api/letterboxd-import
export interface LetterboxdImportRequest {
  username: string;
}
export interface LetterboxdImportResponse {
  top_films: [string, string, string];
  username_valid: boolean;
}

// ── Events ──────────────────────────────────────────────────
export type RSVPStatus = 'going' | 'maybe' | 'not_going';

export interface Event {
  id: string;
  group_id: GroupId;
  created_by: UserId;
  title: string;
  description: string | null;
  event_at: string;
  created_at: string;
}

export interface EventRSVP {
  event_id: string;
  user_id: UserId;
  status: RSVPStatus;
}
