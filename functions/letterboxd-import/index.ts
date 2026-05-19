import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { LetterboxdImportRequest, LetterboxdImportResponse } from '../../shared/types';
import { verifyCaller } from '../_shared/auth';

// Public Letterboxd RSS — no auth, no Cloudflare challenge (the /films/rated/5/
// HTML page is gated by Cloudflare Turnstile, but the RSS endpoint isn't).
// Includes the user's recent activity with structured rating + title fields.
const LETTERBOXD_URL = (username: string) =>
  `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;

export async function letterboxdImport(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const verified = await verifyCaller(req);
    if (!verified.ok) return verified.response;

    const body = await req.json() as LetterboxdImportRequest;
    const username = (body?.username ?? '').trim().toLowerCase();

    if (!username || !/^[a-z0-9_-]{2,30}$/i.test(username)) {
      return { status: 400, jsonBody: { error: 'Invalid Letterboxd username' } };
    }

    // 5s timeout + abort on excessive response size — bounds the cost of an
    // attacker steering us at a slow or large upstream.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(LETTERBOXD_URL(username), {
        headers: { 'User-Agent': 'Mozilla/5.0 InterestMatchBot/1.0' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 404) {
      return { status: 404, jsonBody: { error: 'Letterboxd profile not found' } };
    }
    if (!res.ok) {
      return { status: 502, jsonBody: { error: "Couldn't reach Letterboxd — fill in manually" } };
    }

    // Cap response size at 1MB — Letterboxd pages are ~200-400KB; anything
    // larger is either an attack or an upstream incident.
    const MAX_BYTES = 1_000_000;
    const reader = res.body?.getReader();
    if (!reader) {
      return { status: 502, jsonBody: { error: "Couldn't read Letterboxd response" } };
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        return { status: 502, jsonBody: { error: 'Letterboxd response too large' } };
      }
      chunks.push(value);
    }
    const xml = new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));

    // Parse each <item>, keep only those with memberRating == 5.0, extract filmTitle.
    // Regex is fine here — Letterboxd RSS is tightly structured and we're not
    // pulling user-controlled HTML out of it (just the title field).
    const films: string[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null && films.length < 3) {
      const item = match[1];
      const ratingMatch = item.match(/<letterboxd:memberRating>([\d.]+)<\/letterboxd:memberRating>/);
      if (!ratingMatch || parseFloat(ratingMatch[1]) < 5) continue;
      const titleMatch = item.match(/<letterboxd:filmTitle>([^<]+)<\/letterboxd:filmTitle>/);
      const title = titleMatch?.[1]?.trim();
      if (title && !films.includes(title)) films.push(title);
    }

    if (films.length === 0) {
      return {
        status: 200,
        jsonBody: {
          top_films: ['', '', ''],
          username_valid: true,
        } as LetterboxdImportResponse,
      };
    }

    while (films.length < 3) films.push('');

    const response: LetterboxdImportResponse = {
      top_films: [films[0], films[1], films[2]],
      username_valid: true,
    };
    return { status: 200, jsonBody: response };
  } catch (err) {
    ctx.error('letterboxd-import error:', err);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('letterboxd-import', {
  methods: ['POST'],
  authLevel: 'function',
  handler: letterboxdImport,
});
