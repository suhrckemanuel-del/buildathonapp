-- Enable pgvector for AI-powered matching
create extension if not exists vector;

-- ── Users ────────────────────────────────────────────────────
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  created_at  timestamptz default now() not null
);

alter table public.users enable row level security;

create policy "Users can read all profiles"
  on public.users for select using (true);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert with check (auth.uid() = id);

-- ── Interest Profiles ─────────────────────────────────────────
create table public.interest_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  category    text not null check (category in ('films', 'sports', 'games', 'nationality')),
  data        jsonb not null,
  embedding   vector(1536),              -- OpenAI/Claude embedding of data for similarity search
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  unique(user_id, category)
);

alter table public.interest_profiles enable row level security;

create policy "Users can read all interest profiles"
  on public.interest_profiles for select using (true);

create policy "Users can manage own interest profiles"
  on public.interest_profiles for all using (auth.uid() = user_id);

-- ── Match Requests ────────────────────────────────────────────
create table public.match_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  prompt_text text,
  status      text not null default 'pending' check (status in ('pending', 'matched', 'expired')),
  expires_at  timestamptz not null default (now() + interval '3 days'),
  created_at  timestamptz default now() not null
);

alter table public.match_requests enable row level security;

create policy "Users can manage own match requests"
  on public.match_requests for all using (auth.uid() = user_id);

-- ── Groups ────────────────────────────────────────────────────
create table public.groups (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  summary           text not null,      -- AI-generated, shown on group card
  match_request_id  uuid references public.match_requests(id),
  created_at        timestamptz default now() not null
);

alter table public.groups enable row level security;

-- ── Group Members ─────────────────────────────────────────────
create table public.group_members (
  group_id    uuid not null references public.groups(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  joined_at   timestamptz default now() not null,
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

-- groups RLS defined here (after group_members exists)
create policy "Group members can read their groups"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
    )
  );

create policy "Users can see members of their groups"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
    )
  );

create policy "Service role can manage group members"
  on public.group_members for all
  using (auth.role() = 'service_role');

create policy "Users can leave their groups"
  on public.group_members for delete
  using (auth.uid() = user_id);

-- ── Messages ──────────────────────────────────────────────────
create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups(id) on delete cascade,
  sender_id     uuid references public.users(id) on delete set null,
  content       text not null,
  is_ai_opener  boolean default false not null,
  created_at    timestamptz default now() not null
);

alter table public.messages enable row level security;

create policy "Group members can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = messages.group_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "Group members can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.group_members
      where group_members.group_id = messages.group_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "Service role can insert AI messages"
  on public.messages for insert
  with check (auth.role() = 'service_role');

-- Safety actions
create table public.safety_events (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid not null references public.users(id) on delete cascade,
  group_id       uuid references public.groups(id) on delete set null,
  target_user_id uuid references public.users(id) on delete set null,
  action         text not null check (action in ('leave', 'report', 'mute', 'block')),
  note           text,
  created_at     timestamptz default now() not null
);

alter table public.safety_events enable row level security;

create policy "Users can create own safety events"
  on public.safety_events for insert
  with check (auth.uid() = actor_user_id);

create policy "Users can read own safety events"
  on public.safety_events for select
  using (auth.uid() = actor_user_id);

-- ── Realtime ──────────────────────────────────────────────────
-- Enable realtime on messages so clients get live updates
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.group_members;

-- ── Indexes ───────────────────────────────────────────────────
create index on public.messages (group_id, created_at);
create index on public.interest_profiles using ivfflat (embedding vector_cosine_ops);
create index on public.match_requests (status, expires_at);
create index on public.safety_events (actor_user_id, created_at);
