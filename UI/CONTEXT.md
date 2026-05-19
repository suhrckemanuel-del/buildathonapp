# InterestMatch UI — Continuation Context

## What this is
Social interest-matching app UI. Users pick a category, fill a skippable bio, AI matches them into a group chat with an AI icebreaker. All mocks are **self-contained HTML files** — no framework, no build step, open directly in browser.

**Repo:** https://github.com/suhrckemanuel-del/buildathonapp  
**Local path:** `C:\Users\maria\OneDrive\Desktop\buildathon\UI\mocks\`

---

## Current state

### V2 screens (DONE — these are the canonical design)
| File | Screen | Status |
|------|--------|--------|
| `v2-01-splash.html` | Discovery feed — category card grid | Done |
| `v2-02-signin.html` | Sign In — violet wave, pill inputs, social row | Done |
| `v2-03-categories.html` | Pick your vibe — card selection, "Find my people" | Done |
| `v2-04-events.html` | Events — mixed challenges + meetups feed, filter chips | Done |
| `v2-05-matching.html` | Matching — animated radar, progress steps, group CTA | Done |

### Original screens (NOT yet upgraded to v2 — next priority)
| File | Screen |
|------|--------|
| `04-q-films.html` | Films bio questionnaire |
| `04-q-music.html` | Music bio questionnaire |
| `04-q-sports.html` | Sports bio questionnaire |
| `04-q-gaming.html` | Gaming bio questionnaire |
| `04-q-nationalities.html` | Nationalities bio questionnaire |
| `06-group-chat.html` | Group chat with AI icebreaker |

---

## What needs to be built next

1. **Upgrade all 5 questionnaire screens** (`04-q-*.html`) to v2 style
2. **Upgrade group chat** (`06-group-chat.html`) to v2 style
3. **Wire full navigation** so clicking through from v2-01 → v2-02 → v2-03 → v2-04-q-* → v2-05 → v2-06 works end to end
4. **Micro-animations and page transitions** to make it feel like a real app

---

## Design system (apply to every file)

**Theme:** Dark, mobile-first. `max-width: 430px`, `min-height: 100dvh`  
**Fonts (Google Fonts CDN):** `Righteous` (card titles, headings) + `Plus Jakarta Sans` (body, buttons, labels)

```css
:root {
  --bg:      oklch(9% 0.010 268);   /* near-black */
  --surface: oklch(13% 0.010 268);  /* card/input background */
  --border:  oklch(20% 0.008 268);
  --text:    oklch(96% 0.005 268);  /* near-white */
  --muted:   oklch(55% 0.005 268);
  --accent:  oklch(62% 0.21 302);   /* primary violet — used for active states, CTAs */
}
```

**Per-category accent colors (use as `--accent` on category-specific screens):**
| Category | OKLCH | Usage |
|----------|-------|-------|
| Films | `oklch(57% 0.22 14)` | crimson red |
| Music | `oklch(78% 0.17 95)` | electric yellow |
| Sports | `oklch(66% 0.20 142)` | lime green |
| Gaming | `oklch(62% 0.22 252)` | electric blue |
| Nationalities | `oklch(62% 0.21 302)` | warm violet |

**Tinted surfaces:** `color-mix(in oklch, var(--accent) 14%, transparent)`

---

## V2 component patterns (copy these exactly)

### Header (identical on every screen)
```html
<header class="header">
  <button class="logo-btn" aria-label="Menu"><!-- gear SVG --></button>
  <div class="header-right">
    <button class="icon-btn" aria-label="Search"><!-- search SVG --></button>
    <button class="icon-btn" aria-label="Notifications, 9 unread">
      <!-- bell SVG -->
      <span class="badge">9</span>
    </button>
  </div>
</header>
```
CSS: `padding: 52px 20px 16px`, sticky, `z-index: 20`, `background: var(--bg)`  
Logo btn: `44px` circle, white bg, gear SVG inside in dark color  
Icon btns: `44px` circle, no border, no bg  
Badge: `oklch(62% 0.21 302)`, `18px`, `border: 2px solid var(--bg)`

### Bottom nav (3 tabs, on all screens except sign-in and matching)
```html
<nav class="bottom-nav">
  <button class="fab"><!-- plus SVG --></button>
  <div class="nav-pill-wrap" role="tablist">
    <button class="nav-pill [active]">Interests</button>
    <button class="nav-pill [active]">Events</button>
    <button class="nav-pill [active]">Matches</button>
  </div>
</nav>
```
Active pill: `background: oklch(62% 0.21 302)`, white text  
Inactive pill: `color: var(--muted)`  
Font size: `12px`, weight `700`  
Nav links: Interests → `v2-01-splash.html`, Events → `v2-04-events.html`, Matches → `v2-05-matching.html`

### Cards
```css
.card {
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  touch-action: manipulation;
}
/* gradient background per category + ::after blob decoration */
.card-gaming { background: linear-gradient(145deg, oklch(18% 0.16 252), oklch(36% 0.22 252)); }
.card-gaming::after { /* 120px circle, oklch(62% 0.22 252 / 0.18), right:-20px bottom:-20px */ }
/* same pattern for films/music/sports/nationalities */
```

### CTA button (primary)
```css
.btn-primary {
  width: 100%; padding: 17px 0; border-radius: 100px; border: none;
  background: oklch(62% 0.21 302); /* violet */
  font-family: 'Plus Jakarta Sans'; font-size: 15px; font-weight: 800;
  color: white; touch-action: manipulation;
}
```

### Questionnaire skip pattern (must work exactly this way)
```js
// Skip button disables input, adds .skipped class, toggles to "Unskip"
skipBtn.addEventListener('click', () => {
  const skipped = input.classList.toggle('skipped');
  input.disabled = skipped;
  skipBtn.textContent = skipped ? 'Unskip' : 'Skip';
});
```

### Chips (interest tags)
```html
<button class="chip" aria-pressed="false">Action</button>
```
```js
chip.addEventListener('click', () => {
  const pressed = chip.getAttribute('aria-pressed') === 'true';
  chip.setAttribute('aria-pressed', !pressed);
  chip.classList.toggle('selected', !pressed);
});
```

---

## Hard constraints (never violate)

1. Self-contained HTML only — no frameworks, no build step
2. Always use correct per-category OKLCH accent for each screen
3. `touch-action: manipulation` on all interactive elements
4. `prefers-reduced-motion` support on all animated screens
5. Mobile-first: `max-width: 430px`, `min-height: 100dvh`
6. **No gradient text** on body copy
7. **No side-stripe borders** (no `border-left` as decoration)
8. **No identical card grids** — vary card sizes
9. Chips use `aria-pressed` + `.selected` class
10. Skip buttons use `.skipped` class + `input.disabled = true`

---

## Questionnaire screens — what each one has

All share this structure: header → progress bar (50%) → category badge → questions with skip buttons → CTA "Find my [category] people" → `v2-05-matching.html`

| File | Questions |
|------|-----------|
| `04-q-films.html` | Fav film now · Top 3 actors · Controversial take · Fav genres (chips) |
| `04-q-music.html` | Fav song now · Fav 3 artists · Secret genre (chips + free text) |
| `04-q-sports.html` | Casual team sport (chips) · Club sports (textarea) · Sports to watch (chips) |
| `04-q-gaming.html` | Fav genre (chips) · Recent game (textarea) · "Shame Card" game you're bad at |
| `04-q-nationalities.html` | Country (input) · City (input) · Languages (chips) · Privacy note card |

---

## Group chat screen — what it has

File: `06-group-chat.html`  
- Header: back button, group avatar (gaming icon), "FPS Crew #42", member names
- Pinned AI icebreaker banner (tinted accent bg, robot icon, references all 3 bios)
- Messages: Jordan → Sasha → Maya (self = right-aligned blue bubble)
- Typing indicator (3 animated dots)
- Input bar: attach icon, auto-resizing textarea, send button

---

## Navigation flow (final wired state)
```
v2-01-splash → v2-02-signin → v2-03-categories
v2-03-categories → v2-04-q-[category].html (5 options)
v2-04-q-*.html → v2-05-matching
v2-05-matching → v2-06-group-chat
Bottom nav: Interests↔Events↔Matches on all main screens
```

---

## Asking the user before building
Before starting work, confirm:
- Should the upgraded questionnaire files be named `v2-04-q-films.html` etc. (new files) or overwrite the originals?
- Should page transitions be CSS-only (opacity/translate) or JS-driven?
