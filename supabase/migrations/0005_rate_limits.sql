-- Migration 0005: per-user rate limiting for AI-cost endpoints.
-- Addresses Sentinel audit finding F1 (HIGH) — unbounded Anthropic/OpenAI spend
-- by any authenticated user. The check_rate_limit() function is SECURITY DEFINER
-- and executable only by service_role, so Functions are the sole entry point.

create table if not exists public.api_rate_limits (
  user_id      uuid not null references public.users(id) on delete cascade,
  endpoint     text not null,
  count        int  not null default 0,
  window_start timestamptz not null default now(),
  primary key (user_id, endpoint)
);

alter table public.api_rate_limits enable row level security;

-- No client-facing policies: service-role bypasses RLS, and the table should
-- never be read or written by anon/authenticated. Default-deny is correct.

-- Atomic check-and-increment. Returns true if the call is allowed, false if
-- the user is over their quota for the current window. Resets the window
-- when it has expired.
create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_per_window int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
  v_window_start timestamptz;
begin
  insert into public.api_rate_limits (user_id, endpoint, count, window_start)
  values (p_user_id, p_endpoint, 1, v_now)
  on conflict (user_id, endpoint) do update
    set
      count = case
        when public.api_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          then 1
        else public.api_rate_limits.count + 1
      end,
      window_start = case
        when public.api_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          then v_now
        else public.api_rate_limits.window_start
      end
  returning count, window_start into v_count, v_window_start;

  return v_count <= p_max_per_window;
end;
$$;

revoke execute on function public.check_rate_limit(uuid, text, int, int) from public;
revoke execute on function public.check_rate_limit(uuid, text, int, int) from anon;
revoke execute on function public.check_rate_limit(uuid, text, int, int) from authenticated;
grant execute on function public.check_rate_limit(uuid, text, int, int) to service_role;

-- ── Defense-in-depth: explicit "no client writes" policies on groups ──
-- The `for all` service-role policy in 0004 already blocks non-service-role
-- writes via its WITH CHECK clause, but explicit per-verb deny-by-omission
-- policies make intent unambiguous and prevent accidental future widening.
create policy "No direct group inserts by users"
  on public.groups for insert
  with check (auth.role() = 'service_role');

create policy "No direct group updates by users"
  on public.groups for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "No direct group deletes by users"
  on public.groups for delete
  using (auth.role() = 'service_role');
