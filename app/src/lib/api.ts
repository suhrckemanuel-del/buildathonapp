// Thin client for Azure Functions — used by the frontend to call backend endpoints.
// All other DB operations (read messages, write messages, fetch profile) go directly
// through the supabase client in supabase.ts — no need to route through functions.

import type {
  MatchUsersRequest, MatchUsersResponse,
  SearchGroupsRequest, SearchGroupsResponse,
} from '../../../shared/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:7071/api';

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<TRes>;
}

export const api = {
  matchUsers: (body: MatchUsersRequest) =>
    post<MatchUsersRequest, MatchUsersResponse>('match-users', body),

  searchGroups: (body: SearchGroupsRequest) =>
    post<SearchGroupsRequest, SearchGroupsResponse>('search-groups', body),
};
