-- Migration 0004: security hardening pass
-- Addresses Sentinel audit findings F5, F6, F7, F11.
-- Safe to re-run: drop policy if exists / revoke if exists guards used where supported.

-- ── F5: interest_profiles — split 'for all' policy, add WITH CHECK on writes ──
drop policy if exists "Users can manage own interest profiles" on public.interest_profiles;

create policy "Users can read interest profiles"
  on public.interest_profiles for select
  using (true);

create policy "Users can insert own interest profiles"
  on public.interest_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own interest profiles"
  on public.interest_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own interest profiles"
  on public.interest_profiles for delete
  using (auth.uid() = user_id);

-- Note: the original schema also had "Users can read all interest profiles"
-- as a separate select policy. Dropping it here in case it overlaps; the
-- new "Users can read interest profiles" above preserves the read-all behavior.
drop policy if exists "Users can read all interest profiles" on public.interest_profiles;

-- ── F6: match_requests — split 'for all', no client UPDATE (service-role only) ──
drop policy if exists "Users can manage own match requests" on public.match_requests;

create policy "Users can insert own match requests"
  on public.match_requests for insert
  with check (auth.uid() = user_id);

create policy "Users can select own match requests"
  on public.match_requests for select
  using (auth.uid() = user_id);

create policy "Users can delete own match requests"
  on public.match_requests for delete
  using (auth.uid() = user_id);

-- Intentionally NO update policy for users: status transitions (pending →
-- matched / expired) are mutations of business state and must go through
-- service-role Functions.

-- ── F7: groups — explicit service-role write policy (defense in depth) ──
-- Reads stay open to group members via the existing "Group members can read
-- their groups" select policy. This policy makes intent explicit so a future
-- developer cannot accidentally widen write access.
create policy "Service role can manage groups"
  on public.groups for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ── F6 (LOW): users update policy — add WITH CHECK so id cannot be repointed ──
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── F11: lock down match_candidates RPC to service-role only ──
-- Supabase's default behavior grants execute on public functions to anon and
-- authenticated; revoke explicitly so only the service-role Function can use it.
revoke execute on function public.match_candidates(vector, text, uuid, integer) from public;
revoke execute on function public.match_candidates(vector, text, uuid, integer) from anon;
revoke execute on function public.match_candidates(vector, text, uuid, integer) from authenticated;
grant execute on function public.match_candidates(vector, text, uuid, integer) to service_role;
