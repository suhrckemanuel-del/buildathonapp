# InterestMatch — UI Mocks

A social interest-matching app. Users pick one of 5 categories, fill in a short bio (all questions skippable), and an AI matches them into a small group chat that opens with an AI-generated icebreaker referencing everyone's answers.

**Core flow:** Select category → Bio questionnaire → AI matching → Group chat

---

## How to view

No build step needed. Every file is a self-contained HTML file — just open it in a browser.

**Open all v2 screens at once (PowerShell):**
```powershell
$base = "UI\mocks\"
@("v2-01-splash.html","v2-02-signin.html","v2-03-categories.html","v2-05-matching.html") |
  ForEach-Object { Start-Process ($base + $_); Start-Sleep -Milliseconds 200 }
```

**Open all original screens:**
```powershell
$base = "UI\mocks\"
@("01-splash.html","02-signup.html","03-select-interest.html",
  "04-q-films.html","04-q-music.html","04-q-sports.html",
  "04-q-gaming.html","04-q-nationalities.html","05-matching.html","06-group-chat.html") |
  ForEach-Object { Start-Process ($base + $_); Start-Sleep -Milliseconds 200 }
```

---

## Screens

### V2 Redesign (`UI/mocks/v2-*.html`)
New visual direction inspired by a card-grid aesthetic — dark theme, colorful per-category cards, bold typography, consistent header across all screens.

| File | Screen | Description |
|------|--------|-------------|
| `v2-01-splash.html` | Discovery feed | Category cards in a grid — large featured card + 2×2 grid. FAB + Interests/Matches tab nav at bottom. |
| `v2-02-signin.html` | Sign In | Wavy violet decoration, bold title, dark pill inputs, solid violet CTA, social login row (Google, Instagram, X, TikTok). |
| `v2-03-categories.html` | Pick your vibe | Tap a category card to select it (white ring indicator). "Find my people" + nav bar at bottom. |
| `v2-05-matching.html` | Finding your people | Animated radar with per-category accent rings, avatars pop in at staggered delays, progress checklist, CTA fades in at 3.6s. |

### Original Mocks (`UI/mocks/`)
Full 10-screen flow, fully wired navigation.

| File | Screen |
|------|--------|
| `01-splash.html` | Welcome / Splash |
| `02-signup.html` | Sign Up / Log In |
| `03-select-interest.html` | 5-category selection grid |
| `04-q-films.html` | Films bio questionnaire |
| `04-q-music.html` | Music bio questionnaire |
| `04-q-sports.html` | Sports bio questionnaire |
| `04-q-gaming.html` | Gaming bio questionnaire |
| `04-q-nationalities.html` | Nationalities bio questionnaire |
| `05-matching.html` | Animated matching / loading screen |
| `06-group-chat.html` | Group chat with AI icebreaker |

---

## Design system

**Theme:** Dark, mobile-first (`max-width: 430px`, `min-height: 100dvh`)

**Fonts (Google Fonts CDN):**
- `Righteous` — display headings, category names, card titles
- `Plus Jakarta Sans` — body, labels, buttons (v2 screens)
- `Poppins` — body text (original screens)

**CSS variables (every file):**
```css
:root {
  --bg:      oklch(9% 0.010 268);   /* near-black */
  --surface: oklch(13% 0.010 268);  /* card background */
  --border:  oklch(20% 0.008 268);
  --text:    oklch(96% 0.005 268);  /* near-white */
  --muted:   oklch(55% 0.005 268);
  --accent:  <per-category value>;
}
```

**Per-category accent colors:**

| Category | OKLCH | Swatch |
|----------|-------|--------|
| Films | `oklch(57% 0.22 14)` | Crimson red |
| Music | `oklch(78% 0.17 95)` | Electric yellow |
| Sports | `oklch(66% 0.20 142)` | Lime green |
| Gaming | `oklch(62% 0.22 252)` | Electric blue |
| Nationalities | `oklch(62% 0.21 302)` | Warm violet |

**Tinted surfaces:** `color-mix(in oklch, var(--accent) 14%, transparent)`

---

## Constraints

1. All files are self-contained HTML — no frameworks, no build step
2. Always use the correct per-category `--accent` OKLCH value
3. Skip buttons disable their input via JS `.skipped` class (toggles to "Unskip")
4. Chips toggle with `aria-pressed` + `.selected` class
5. Mobile-first: `max-width: 430px`, `min-height: 100dvh`
6. `touch-action: manipulation` on all interactive elements
7. `prefers-reduced-motion` respected on all animated screens

---

## Project structure

```
buildathon/
├── UI/
│   └── mocks/
│       ├── 01-splash.html
│       ├── 02-signup.html
│       ├── 03-select-interest.html
│       ├── 04-q-films.html
│       ├── 04-q-music.html
│       ├── 04-q-sports.html
│       ├── 04-q-gaming.html
│       ├── 04-q-nationalities.html
│       ├── 05-matching.html
│       ├── 06-group-chat.html
│       ├── v2-01-splash.html
│       ├── v2-02-signin.html
│       ├── v2-03-categories.html
│       └── v2-05-matching.html
└── InterestMatch-Handoff.html
```
