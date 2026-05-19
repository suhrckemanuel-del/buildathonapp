// Thin client for Azure Functions — used by the frontend to call backend endpoints.
// All other DB operations (read messages, write messages, fetch profile) go directly
// through the supabase client in supabase.ts — no need to route through functions.
//
// Every request attaches the current Supabase session JWT in Authorization;
// Functions verify the JWT server-side and derive user_id from it. The body
// no longer needs (and the server no longer trusts) a client-supplied user_id.

import { supabase } from './supabase';
import type {
  MatchUsersRequest, MatchUsersResponse,
  SearchGroupsRequest, SearchGroupsResponse,
  LetterboxdImportRequest, LetterboxdImportResponse,
  EmbedProfileRequest, EmbedProfileResponse,
} from '../../../shared/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:7071/api';

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<TRes>;
}

// Note: create-group is intentionally absent from this surface. It is invoked
// server-side by match-users; exposing it to the client would let any user
// force arbitrary user_ids into a group. See SECURITY_AUDIT.md F3.
export const api = {
  matchUsers: (body: MatchUsersRequest) =>
    post<MatchUsersRequest, MatchUsersResponse>('match-users', body),

  searchGroups: (body: SearchGroupsRequest) =>
    post<SearchGroupsRequest, SearchGroupsResponse>('search-groups', body),

  letterboxdImport: (body: LetterboxdImportRequest) =>
    post<LetterboxdImportRequest, LetterboxdImportResponse>('letterboxd-import', body),

  embedProfile: (body: EmbedProfileRequest) =>
    post<EmbedProfileRequest, EmbedProfileResponse>('embed-profile', body),
};
