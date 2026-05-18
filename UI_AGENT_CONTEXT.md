# UI Agent Context — Buildathon App

Hand this file to a new Claude instance. It contains everything needed to build the UI without touching the backend.

---

## What This App Is

A social matching app. Users fill in a film interest profile → AI matches them into a group of 4–6 people → AI sends the first message → group chats in real-time. Goal: eliminate the awkwardness of reaching out to strangers by matching on taste and breaking the ice automatically.

**Demo target:** iOS App Store. Build for mobile-first, test in browser.

---

## Repo

```
https://github.com/suhrckemanuel-del/buildathonapp
```

Clone and work in the `app/` folder only.

```bash
git clone https://github.com/suhrckemanuel-del/buildathonapp.git
cd buildathonapp/app
cp .env.example .env
# Ask Manuel for the .env values
npm install
npm run web   # test in browser on localhost:8082
```

---

## Tech Stack

- **Expo SDK 54** + **React Native** + **Expo Router v6** (file-based routing like Next.js)
- **TypeScript** strict mode — `@/*` alias resolves to `src/*`
- **Supabase** — database, auth, real-time chat (client at `src/lib/supabase.ts`)
- **Azure Functions** — AI matching backend (client at `src/lib/api.ts`)
- Target: **iOS** (test on web, ship to App Store)

Read https://docs.expo.dev/versions/v54.0.0/ before writing any Expo-specific code.

---

## Design System

**Dark theme throughout. No light mode.**

| Token | Value |
|---|---|
| Background | `#0f0f0f` |
| Surface (cards, inputs) | `#1a1a1a` |
| Border | `#333333` |
| Primary (buttons, active) | `#6366f1` |
| Text | `#ffffff` |
| Muted text | `#9ca3af` |
| Success | `#22c55e` |
| Unread dot | `#6366f1` |

**Typography:**
- Headings: `fontSize: 28, fontWeight: 'bold'`
- Subheadings: `fontSize: 18, fontWeight: '600'`
- Body: `fontSize: 15`
- Caption: `fontSize: 12, color: #9ca3af`

**Components:**
- Primary button: `background #6366f1, borderRadius 12, paddingVertical 16, color white, fontSize 16, fontWeight 600`
- Input: `background #1a1a1a, borderColor #333, borderWidth 1, borderRadius 8, padding 12, color white`
- Card: `background #1a1a1a, borderRadius 16, padding 16, marginBottom 12`

---

## Folder Structure

```
app/
├── src/
│   ├── app/                         ← Expo Router screens (file = route)
│   │   ├── _layout.tsx              ← root layout (auth-free for now)
│   │   ├── index.tsx                ← redirects to /(tabs)/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx          ← bottom tab navigator
│   │   │   ├── index.tsx            ← Groups list (HOME tab) ✅ built
│   │   │   └── explore.tsx          ← redirects to /discover
│   │   ├── auth/callback.tsx        ← OAuth handler
│   │   ├── onboarding/
│   │   │   ├── username.tsx         ← username setup ✅ built
│   │   │   └── film-profile.tsx     ← film interests form ✅ built
│   │   ├── chat/[groupId].tsx       ← real-time chat ✅ built
│   │   └── discover.tsx             ← group discovery ✅ built
│   ├── components/                  ← YOUR AREA — shared UI components
│   ├── hooks/                       ← custom hooks
│   ├── constants/
│   │   └── Colors.ts
│   └── lib/
│       ├── supabase.ts              ← Supabase client (DO NOT EDIT)
│       ├── api.ts                   ← Azure Functions client (DO NOT EDIT)
│       └── database.types.ts       ← DB types (DO NOT EDIT)
├── app.json                         ← Expo config
├── package.json
└── tsconfig.json
```

---

## Screens Already Built (functional, need UI polish)

### 1. Groups List — `src/app/(tabs)/index.tsx`
- Fetches user's groups from Supabase
- Real-time updates via Supabase Realtime
- Pull to refresh
- Shows group name, summary, member count, last message, unread dot
- Tap → navigates to `/chat/[groupId]`
- Empty state with "Discover groups" button
- FAB: "Find a group" → goes to Discover tab

### 2. Real-time Chat — `src/app/chat/[groupId].tsx`
- Loads last 50 messages, subscribes to live inserts
- AI opener message styled differently (purple border, "✦ Icebreaker" label)
- Sender username above each message
- Text input + send button at bottom
- Auto-scrolls to latest message

### 3. Group Discovery — `src/app/discover.tsx`
- Natural language search input → calls `api.searchGroups()`
- "Let AI find my group" button → calls `api.matchUsers()`
- Shows 3 group option cards with shared interests tags
- Pending match status display

### 4. Film Profile Form — `src/app/onboarding/film-profile.tsx`
- 6 fields: 3 films, favourite actor, favourite director, disliked film
- Saves to Supabase `interest_profiles` table
- Skip option

### 5. Username Setup — `src/app/onboarding/username.tsx`
- Username input with live validation
- Uniqueness check against Supabase
- Inserts into `public.users`

---

## Database Schema (what you can read/write from frontend)

```
public.users          id, username, avatar_url
public.interest_profiles  user_id, category, data (jsonb: FilmProfile)
public.match_requests user_id, prompt_text, status, expires_at
public.groups         id, name, summary
public.group_members  group_id, user_id
public.messages       id, group_id, sender_id (null=AI), content, is_ai_opener, created_at
```

**FilmProfile shape:**
```ts
{
  top_films: [string, string, string],
  favourite_actor: string,
  favourite_director: string,
  disliked_film: string,
}
```

---

## How to Read/Write Data (frontend always uses Supabase directly)

```ts
import { supabase } from '@/lib/supabase';

// Read user's groups
const { data } = await supabase
  .from('group_members')
  .select('group_id, groups(id, name, summary)')
  .eq('user_id', userId);

// Send a message
await supabase.from('messages').insert({
  group_id,
  sender_id: userId,
  content: text,
});

// Subscribe to new messages (real-time)
supabase.channel('chat')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` }, handler)
  .subscribe();
```

## How to Call Backend (AI matching only)

```ts
import { api } from '@/lib/api';

// Request a match
await api.matchUsers({ user_id: 'uuid' });

// Search groups with natural language
await api.searchGroups({ user_id: 'uuid', prompt_text: 'quiet film nerds' });
```

---

## Your UI Tasks (priority order for demo)

### Priority 1 — Make it look good
The screens are functional but unstyled. Your job is to make them feel like a real polished app.

1. **Redesign the Groups list card** — avatar initials circle, group name bold, summary muted, last message preview, timestamp, unread indicator
2. **Redesign the Chat screen** — proper bubble layout, sender name small above bubble, AI opener as a distinct "icebreaker" card at the top
3. **Redesign the Discover screen** — group option cards should feel like Tinder-style preview cards with interest tags as pills
4. **Add a Profile tab** — simple screen showing username + film profile summary + a sign out button (3rd tab)

### Priority 2 — New components to build in `src/components/`

| Component | Props | Used in |
|---|---|---|
| `GroupCard` | name, summary, memberCount, lastMessage, hasUnread | Groups list |
| `MessageBubble` | content, isMine, senderName, isAiOpener, timestamp | Chat |
| `InterestTag` | label | Discover, Group cards |
| `AvatarCircle` | username, size | Everywhere |
| `PrimaryButton` | label, onPress, loading | Everywhere |
| `TextInput` | value, onChange, placeholder, error | Forms |

### Priority 3 — Polish
- Loading skeletons instead of spinners
- Smooth transitions between screens
- Empty states with illustrations or emoji

---

## Rules

- **Never edit** `src/lib/supabase.ts`, `src/lib/api.ts`, `src/lib/database.types.ts`
- **Never edit** `functions/` — that's the backend
- Install packages with `npx expo install <package>` not plain `npm install`
- All new components go in `src/components/`
- Keep dark theme — `#0f0f0f` background everywhere
- Test in browser with `npm run web`, target is iOS

---

## Shared Types (import from `../../shared/types.ts`)

Key types your UI will use:
- `User` — id, username, avatar_url
- `Group` — id, name, summary
- `Message` — id, group_id, sender_id, content, is_ai_opener, created_at
- `GroupOption` — group, member_count, shared_interests, preview_members
- `FilmProfile` — top_films, favourite_actor, favourite_director, disliked_film
