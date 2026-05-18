# Buildathon App

AI-powered social matching app. Users fill in interest profiles, AI matches them into groups of 4–6, and sends the first message.

---

## Repo Structure

```
app/          ← Expo (React Native) frontend — UI team owns this
functions/    ← Azure Functions backend — backend team owns this
shared/       ← TypeScript types shared by both sides — coordinate before changing
supabase/     ← Database migrations — run these once to set up the schema
```

---

## For the UI Team (app/)

### Setup

```bash
cd app
cp .env.example .env
# Fill in .env with the Supabase anon key (get from Manuel)
npm install
npm run web        # develop in browser
npm run ios        # iOS simulator
```

### What's already wired

| File | What it does |
|------|-------------|
| `src/lib/supabase.ts` | Supabase client — import this for all DB/auth/realtime calls |
| `src/lib/api.ts` | Azure Functions client — use `api.matchUsers()` and `api.searchGroups()` |
| `src/lib/database.types.ts` | Full TypeScript types for every DB table |
| `shared/types.ts` | Shared types for API request/response shapes |

### Key rules

- **Direct to Supabase**: reading/writing messages, fetching profiles, auth, realtime subscriptions
- **Via `api.ts`**: requesting a match (`api.matchUsers`) and searching groups (`api.searchGroups`)
- Use `EXPO_PUBLIC_` prefix for any env vars the frontend needs
- Install packages with `npx expo install <package>` not plain `npm install`

### Screens to build (Phase 1)

1. **Login screen** — Google OAuth via Supabase Auth
2. **Username setup** — shown once after first login
3. **Film profile form** — top 3 films, favourite actor, favourite director, film they dislike
4. **Groups list** — user's active groups
5. **Chat screen** — real-time messages via Supabase Realtime
6. **Group discovery** — 3 pending group options to browse and accept

---

## For the Backend Team (functions/)

### Setup

```bash
cd functions
npm install
# Edit local.settings.json — add SUPABASE_SERVICE_ROLE_KEY and ANTHROPIC_API_KEY
npm run dev        # builds TypeScript and starts Azure Functions locally on port 7071
```

Requires: [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)

```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### Functions

| Endpoint | Trigger | What it does |
|----------|---------|-------------|
| `POST /api/match-users` | Frontend call | Creates a match request for the user |
| `POST /api/create-group` | Internal (cron) | Creates a group + AI opener message for a set of user IDs |
| `POST /api/search-groups` | Frontend call | Returns 3 group options from a natural language prompt |

### Daily matching cron (to add)

The `create-group` function is internal — it needs a daily timer trigger that:
1. Fetches all pending match requests
2. Finds compatible users via pgvector cosine similarity
3. Calls `create-group` for each matched set of 4–6 users

---

## Database Setup (one-time)

Run the migration against your Supabase project:

```bash
# Install Supabase CLI
npm install -g supabase

# Apply migration
supabase db push --db-url "postgresql://postgres:[DB_PASSWORD]@db.uijpgioeqgoitfqwakqj.supabase.co:5432/postgres"
```

Or paste `supabase/migrations/0001_initial_schema.sql` directly into the Supabase SQL editor.

---

## Environment Variables

| Variable | Used by | Where to get it |
|----------|---------|-----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | app | supabase.com > Settings > API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | app | supabase.com > Settings > API |
| `EXPO_PUBLIC_API_BASE_URL` | app | Azure Functions URL after deploy |
| `SUPABASE_URL` | functions | supabase.com > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | functions | supabase.com > Settings > API (secret) |
| `ANTHROPIC_API_KEY` | functions | console.anthropic.com |
