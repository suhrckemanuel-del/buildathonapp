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
export type InterestCategory = 'films'; // extend: 'sports' | 'games' | 'nationality'

export interface FilmProfile {
  top_films: [string, string, string];   // exactly 3
  favourite_actor: string;
  favourite_director: string;
  disliked_film: string;
}

export interface InterestProfile {
  id: string;
  user_id: UserId;
  category: InterestCategory;
  data: FilmProfile;                     // union as more categories added
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
