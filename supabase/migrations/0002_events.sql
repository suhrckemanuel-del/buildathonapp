-- Events + RSVPs
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups(id) on delete cascade,
  created_by  uuid not null references public.users(id),
  title       text not null,
  description text,
  event_at    timestamptz not null,
  created_at  timestamptz default now() not null
);

create table public.event_rsvps (
  event_id  uuid not null references public.events(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  status    text not null default 'going' check (status in ('going', 'maybe', 'not_going')),
  primary key (event_id, user_id)
);

create index events_group_id_idx on public.events (group_id, event_at desc);

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

create policy "Group members can read events"
  on public.events for select using (
    exists (
      select 1 from public.group_members
      where group_id = events.group_id and user_id = auth.uid()
    )
  );

create policy "Group members can create events"
  on public.events for insert with check (
    auth.uid() = created_by and
    exists (
      select 1 from public.group_members
      where group_id = events.group_id and user_id = auth.uid()
    )
  );

create policy "Creator can update own events"
  on public.events for update using (auth.uid() = created_by);

create policy "Creator can delete own events"
  on public.events for delete using (auth.uid() = created_by);

create policy "Group members can read RSVPs"
  on public.event_rsvps for select using (
    exists (
      select 1 from public.events e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = event_rsvps.event_id and gm.user_id = auth.uid()
    )
  );

create policy "Members RSVP for themselves"
  on public.event_rsvps for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
