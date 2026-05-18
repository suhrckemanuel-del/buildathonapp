# Buildathon App Status

## Current Milestone

The current milestone is a demoable connection loop before UI polish:

1. Login or demo mode
2. Username onboarding
3. Film profile collection
4. Discover or AI match
5. AI match explanation
6. Group chat with generated opener
7. User sends a message
8. Safety action placeholder: leave, report, mute, block

## What Works In Demo Mode

- Demo auth stores local session/profile state.
- Onboarding saves username and film profile locally.
- Discover search returns local group options.
- Joining a demo option creates/updates a local group and opens `/match/[groupId]`.
- AI match creates a fresh local group, generated opener, and explanation from the film profile.
- `/match/[groupId]` shows matched members, AI signals, reasoning, and opener.
- Chat reads local messages, persists local sends, and updates group last-message state.
- Chat safety controls record local demo actions. Leave removes the group from the demo group list.

## Production Path

- Supabase Auth remains the source of real users.
- Supabase tables cover users, interest profiles, match requests, groups, group members, messages, and safety events.
- Azure Functions currently create match requests, search candidate groups, and create groups with AI-generated name/summary/opener.
- Next backend step: persist `MatchExplanation` server-side when `create-group` runs.
- Next frontend step: make `/match/[groupId]` fetch a production explanation when not in demo mode.

## Stable Boundaries For UI Work

- Route files stay under `app/src/app/`.
- Reusable UI stays under `app/src/components/`.
- Do not casually change these without coordinating:
  - `app/src/lib/supabase.ts`
  - `app/src/lib/api.ts`
  - `app/src/lib/database.types.ts`
  - `app/src/lib/demoAuth.ts`
  - `shared/types.ts`
- UI can freely reskin `/match/[groupId]` as long as it preserves:
  - Continue to chat
  - Back to groups
  - visible members
  - visible match signals
  - visible generated opener

## Recommended Next Build Steps

1. Add a Supabase `match_explanations` table or JSON column on `groups`.
2. Update `functions/create-group` so Claude returns explanation signals with the group name, summary, and opener.
3. Add an API/read path for production `/match/[groupId]`.
4. Improve safety flows from placeholders to modals with report reasons and target user selection.
5. Let a UI pass reskin login, onboarding, discover, match explanation, groups, chat, and profile without moving data logic.
