-- Migration 0006: fix infinite recursion in group_members RLS
--
-- The original SELECT policy on group_members queries group_members itself,
-- which retriggers the same policy → Postgres aborts with
-- "infinite recursion detected in policy for relation group_members".
--
-- This breaks: chat message inserts, message reads, group listings, and any
-- frontend code that joins through group_members. Caught by smoke test.
--
-- Standard fix: a SECURITY DEFINER helper function bypasses RLS when checking
-- membership, breaking the recursion. Then every policy uses the helper.

-- ── Helper: is the calling user a member of the given group? ────────
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
  );
$$;

revoke execute on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated, service_role;

-- ── Rewrite the recursive group_members SELECT policy ────────────────
drop policy if exists "Users can see members of their groups" on public.group_members;

create policy "Users can see members of their groups"
  on public.group_members for select
  using (
    auth.uid() = user_id
    or public.is_group_member(group_id)
  );

-- ── Rewrite messages policies to use the helper (consistency + perf) ─
drop policy if exists "Group members can read messages" on public.messages;
create policy "Group members can read messages"
  on public.messages for select
  using (public.is_group_member(group_id));

drop policy if exists "Group members can send messages" on public.messages;
create policy "Group members can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_group_member(group_id)
  );

-- ── Rewrite groups SELECT policy ────────────────────────────────────
drop policy if exists "Group members can read their groups" on public.groups;
create policy "Group members can read their groups"
  on public.groups for select
  using (public.is_group_member(id));

-- ── Events + RSVPs: rewrite to use the helper too ───────────────────
drop policy if exists "Group members can read events" on public.events;
create policy "Group members can read events"
  on public.events for select
  using (public.is_group_member(group_id));

drop policy if exists "Group members can create events" on public.events;
create policy "Group members can create events"
  on public.events for insert
  with check (
    auth.uid() = created_by
    and public.is_group_member(group_id)
  );

-- event_rsvps SELECT policy joins through events → group_members. Replace
-- with a direct helper call to avoid recursion via the events policy.
drop policy if exists "Group members can read RSVPs" on public.event_rsvps;
create policy "Group members can read RSVPs"
  on public.event_rsvps for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_rsvps.event_id
        and public.is_group_member(e.group_id)
    )
  );
