-- Migration 0003: match_candidates RPC for embedding-based matching
-- Used by functions/match-users to find nearest pending users by cosine distance.
-- Uses pg_advisory_xact_lock to prevent two concurrent requests from grouping
-- overlapping sets of users (race condition guard).

create or replace function public.match_candidates(
  anchor_embedding vector(1536),
  match_category text,
  exclude_user_id uuid,
  max_results integer default 20
)
returns table (
  user_id uuid,
  distance float
)
language plpgsql
security definer
as $$
begin
  -- Per-category advisory lock so concurrent matches in same category serialize.
  -- Transaction-scoped: released automatically on commit/rollback.
  perform pg_advisory_xact_lock(hashtext('match:' || match_category));

  return query
  select
    mr.user_id,
    (ip.embedding <=> anchor_embedding)::float as distance
  from public.match_requests mr
  join public.interest_profiles ip
    on ip.user_id = mr.user_id
    and ip.category = match_category
  where mr.status = 'pending'
    and mr.expires_at > now()
    and mr.user_id <> exclude_user_id
    and ip.embedding is not null
  order by ip.embedding <=> anchor_embedding asc
  limit max_results;
end;
$$;

grant execute on function public.match_candidates(vector, text, uuid, integer) to service_role;
