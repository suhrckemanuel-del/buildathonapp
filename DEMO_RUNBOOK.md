# Demo Runbook — Tomorrow Morning

Single page. Do these in order. Don't improvise.

---

## 0. Before anything else (60 sec)

Check: are you on the same WiFi as last night (this matters — the LAN IP is baked
into the app)? If **YES**, skip to Step 1. If **NO**, jump to "If your WiFi changed".

---

## 1. Start the backend (2 terminals)

**Terminal 1 — Azure Functions:**
```bash
cd c:/Users/Manuel/Downloads/BUILDATHON/buildathonapp/functions
func start --cors "*"
```
The `--cors "*"` flag is REQUIRED — without it, the browser blocks the
cross-origin requests from the app to the Functions host. (Dev-only; in prod
this would be locked down to specific origins.)
Wait for "Worker process started" + 4 functions listed:
`embed-profile`, `letterboxd-import`, `match-users`, `search-groups`.

**Terminal 2 — Expo dev server:**
```bash
cd c:/Users/Manuel/Downloads/BUILDATHON/buildathonapp/app
npx expo start --web
```
Wait for "Web is waiting on http://localhost:8081".

---

## 2. Smoke test (60 sec, optional but recommended)

```bash
cd c:/Users/Manuel/Downloads/BUILDATHON/buildathonapp
node functions/__test/smoke.js
```

Expect: `✅ ALL CHECKS PASSED` in ~15 seconds. If this passes, **every backend
piece in your demo flow is verified working**: signup, embed, match, AI opener,
chat insert, event create, RSVP, re-match.

If it fails, look at the error and check:
- Are all 3 API keys present in `functions/local.settings.json`?
- Are all 6 migrations applied in Supabase (you should see them in dashboard → Migrations)?
- Is `func start` still running on port 7071?

---

## 3. Demo modes — pick one

### Mode A — Safest: laptop only, two browser windows (RECOMMENDED)
1. Open Chrome → `http://localhost:8081` → "Try the demo".
2. Open Chrome **incognito** → `http://localhost:8081` → real signup.
3. Both side-by-side. Drives the full flow. Zero network risk.

### Mode B — Two phones on same WiFi
**Pre-flight:** confirm both phones can reach `http://192.168.1.51:8081` in mobile browser.
If they can't, jump to "If your WiFi changed" below.
1. Phones in mobile browser → `http://192.168.1.51:8081`.
2. Each phone signs up with real email.

### Mode C — Demo mode fallback (NO backend needed)
If the Functions host dies on stage:
1. Open `http://localhost:8081` → "Try the demo".
2. Everything works without API calls. AI matches are pre-canned. Chat is
   mocked. Events work locally. **Demo mode is your safety net — practice it
   once tonight so you know the flow.**

---

## 4. The demo script (60-90 sec walkthrough)

1. **Open** → "Try the demo" (or real signup if you're brave).
2. **Username** → something memorable.
3. **Select category** → Films.
4. **Film profile** → tap "Import from Letterboxd" → username `themat` → import
   pulls Psycho/Vertigo/Eyes Wide Shut. Fill the rest manually. Save.
5. **Discover tab** → "Let AI find my group". With 4+ users in pool, you land
   in a group within a few seconds. Otherwise pending (still impressive).
6. **In the group** → AI opener pinned at top, addresses members by `@username`.
   Send 1-2 chat messages. Open the second window, see them appear.
7. **Events tab in group** → Create event "Watch *Psycho* together" → set date
   → save. Other member can RSVP.
8. **Back to Discover** → "Let AI find my group" again to show re-match works.

---

## 5. If something breaks live

| Symptom | Fast diagnosis | Fix |
|---|---|---|
| Login button does nothing | Functions host down | `func start` in Terminal 1 |
| "Unauthorized" toast | Supabase JWT expired or wrong | Sign out, sign back in |
| Letterboxd import returns empty | RSS feed has no recent 5★ | Fill films manually |
| Match returns pending forever | Fewer than 4 users in pool | Demo mode (Mode C) |
| Chat messages don't appear | Realtime websocket blocked | Refresh page — messages still load |
| Nothing loads on phone | Wrong LAN IP | See "If your WiFi changed" |

---

## If your WiFi changed

The laptop's LAN IP is baked into the app at `app/.env` line 3. If it changed:

1. Find new IP:
   ```bash
   ipconfig | grep "IPv4"
   ```
2. Edit `c:/Users/Manuel/Downloads/BUILDATHON/buildathonapp/app/.env` line 3:
   ```
   EXPO_PUBLIC_API_BASE_URL=http://<NEW_IP>:7071/api
   ```
3. Restart Expo (Ctrl+C in Terminal 2, `npx expo start --web` again).
4. Reload browser/phone.

If you're demoing from laptop only (Mode A), you can revert to `http://localhost:7071/api` — phones won't work but laptop does.

---

## What's verified working as of last night

- ✓ Signup + onboarding + Letterboxd RSS import
- ✓ OpenAI embedding (text-embedding-3-small, 1536 dims)
- ✓ Cosine-similarity matching with per-category advisory lock
- ✓ AI group creation (Claude opus 4.6, uses @usernames)
- ✓ Chat insert + RLS (the recursion bug, now fixed in migration 0006)
- ✓ Event creation + RSVP
- ✓ Re-match after being matched

## Out of scope tonight (post-demo)

- Vercel deploy (frontend) + Azure cloud deploy (backend)
- HTML mockup port (waiting on friend's mockup)
- Voyage-3 embeddings, HDBSCAN, multi-category matching
- LLM wiki / group memory features for finals
