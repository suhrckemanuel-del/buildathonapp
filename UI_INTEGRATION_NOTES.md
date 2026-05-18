# UI + Functionality Integration Notes

## Current Demo Contract

- The app now has two auth lanes:
  - Real Supabase auth: email/password and Google OAuth.
  - Explicit demo mode: local-only profile, sample groups, and sample chat messages.
- Demo mode now supports an end-to-end connection loop:
  login/demo -> onboarding -> discover/AI match -> match explanation -> chat -> message -> safety action.
- Keep demo mode until the Supabase Auth redirect URLs and provider settings are confirmed.
- Demo data lives in `app/src/lib/demoAuth.ts`; delete or gate this file before production.
- The demo match explanation lives at `app/src/app/match/[groupId].tsx`.
  It shows a motion-style preview of matched members, AI signals, reasoning, and the generated opener.
  Keep this screen functional while redesigning it; it is the main demo proof that AI is doing understandable matching work.

## When Importing UI From Another Chat

Ask the UI chat to deliver changes as a patch against these stable boundaries:

1. Screens can change layout and styling, but should keep route files in `app/src/app/`.
2. Shared UI belongs in `app/src/components/`.
3. Do not edit these data boundary files without coordination:
   - `app/src/lib/supabase.ts`
   - `app/src/lib/api.ts`
   - `app/src/lib/database.types.ts`
   - `shared/types.ts`
4. Preserve these functional props/contracts:
   - `PrimaryButton`: `label`, `onPress`, `loading`, `disabled`
   - `FormTextInput`: React Native `TextInput` props plus `label`, `error`
   - `GroupCard`: `name`, `summary`, `memberCount`, `lastMessage`, `timestamp`, `onPress`
   - `MessageBubble`: `content`, `isMine`, `senderName`, `isAiOpener`, `timestamp`
   - Match explanation route: `/match/[groupId]`, reads `MatchExplanation` from demo storage for now.
5. If a design chat creates new screens, ask it to include route names and expected user actions, not only static visuals.

## AI Matching Explanation Contract

- `shared/types.ts` now defines:
  - `MatchSignal`: `label`, `detail`, `strength`
  - `MatchExplanation`: `group_id`, `group_name`, `summary`, `matched_members`, `signals`, `ai_reasoning`, `opener_message`, `created_at`
- In demo mode:
  - `createDemoMatchedGroup()` creates a group, AI opener, and explanation.
  - `joinDemoGroup()` creates/updates a group and explanation from a selected option.
  - `getDemoMatchExplanation(groupId)` powers `/match/[groupId]`.
- In production, the backend should eventually persist this trace when `create-group` runs.
  The Expo client should fetch it via a typed API or Supabase table/view, not recreate reasoning client-side.

## AI Backend Direction

- The AI should generate these artifacts server-side:
  - group name
  - group summary
  - AI opener message
  - match explanation signals
  - a concise reason why the group is low-pressure and compatible
- Do not claim mental-health outcomes. Use language like "social connection", "low-pressure", "shared interests", and "first-message fit".
- Store enough trace data to show why the match happened without exposing private profile details from other users.

## Auth Setup Needed In Supabase

- Add these redirect URLs in Supabase Auth URL configuration:
  - `http://localhost:8082/auth/callback`
  - `buildathon-app://auth/callback`
  - The deployed web URL when available.
- Enable the Google provider and make sure its OAuth client allows the Supabase callback URL.
- Email/password can work immediately if email confirmation is disabled; if confirmation is enabled, the app will show a check-email message.

## Chat Implementation Path

For the demo, `chat/[groupId].tsx` supports local sample messages, local send, a "Why" link back to `/match/[groupId]`, and safety placeholders.

For production:

1. Keep messages persisted in `public.messages`.
2. Insert messages from the client with `group_id`, `sender_id`, and `content`.
3. Subscribe to `postgres_changes` on `messages` filtered by `group_id`.
4. Keep Row Level Security strict:
   - Users can read messages only for groups where they are in `group_members`.
   - Users can insert messages only as their own `auth.uid()`.
5. Add typing indicators later with Supabase Realtime Broadcast or Presence instead of storing them in Postgres.

## Agent Research Notes

- OpenAI Agents SDK handoffs are useful when one agent should fully delegate to another specialist. For this app, a future backend could use a triage/matching agent that hands off to a film-taste summarizer or icebreaker writer.
- Use tracing in agent workflows so a buildathon demo can explain why a group was matched and what prompt generated the opener.
- Do not put agent orchestration in the Expo client. Keep it in Azure Functions or another backend endpoint, and keep the frontend calling typed APIs in `app/src/lib/api.ts`.

## Sources Checked

- Supabase React Native auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase OAuth redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Expo AuthSession authentication guide: https://docs.expo.dev/guides/authentication/
- Expo Router auth/protected routes: https://docs.expo.dev/router/advanced/authentication/
- Supabase Realtime Postgres changes: https://supabase.com/docs/guides/realtime/postgres-changes
- Supabase Realtime overview: https://supabase.com/docs/guides/realtime
- OpenAI Agents SDK handoffs: https://openai.github.io/openai-agents-js/guides/handoffs
