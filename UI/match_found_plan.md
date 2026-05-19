# Plan: Build 'Match Found' Mockup (v2-06-match-found.html)

Here is the transcription of the audio plan for the new screen, along with actionable instructions to build it.

## Transcription
"Uh hey guys. I have a plan for the uh, match found screen, so this is what happens right after the um radar animation finishes. So the title should be match found, and there should be a group photo or avatars of the people you matched with in a sort of overlapping circle arrangement. Below that, I want the AI icebreaker, maybe styled as a chat bubble or a distinct card, asking a fun question related to the interest. And finally, a big primary button that says Join Group Chat, and maybe a secondary outline button that says Skip or Keep Searching. And this should be a V2 screen, so let's call it `v2-06-match-found.html` and it should use the same dark theme and neon accents as the other V2 screens."

## Instructions for Implementation

Please create a new self-contained HTML file for the match found screen, adhering strictly to the V2 design system and constraints listed in `CONTEXT.md`.

### [NEW] `v2-06-match-found.html`

- **Structure**:
  - Standard V2 header (gear icon, search, notifications).
  - Main content area with a success/celebration vibe.
  - No bottom nav (as matching screens typically exclude it to focus on the immediate action).

- **UI Elements**:
  - **Title**: "Match Found!" (Using `Righteous` font).
  - **Avatars**: 3-4 avatar images in an overlapping horizontal row (e.g., using negative margin and borders to separate them visually). You can use generic SVG user icons or placeholder avatars.
  - **AI Icebreaker**: A tinted surface card or chat bubble (`color-mix(in oklch, var(--accent) 14%, transparent)`) featuring a robot icon and a playful question based on an interest (e.g., "What's the most controversial opinion you have about open-world games?").
  - **Actions**:
    - Primary CTA button: "Join Group Chat" (`.btn-primary` with `var(--accent)` background).
    - Secondary action: "Keep Searching" (Outline button or subtle text button).

- **Design System & Constraints**:
  - Dark mobile-first theme (`max-width: 430px`, `min-height: 100dvh`, `var(--bg)` background).
  - `touch-action: manipulation` on all buttons.
  - Use one of the category accents for the neon glow/accents (e.g., Gaming electric blue `oklch(62% 0.22 252)` or the default violet `oklch(62% 0.21 302)`).
