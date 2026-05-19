// Prompt-injection mitigations for user-supplied text that flows into LLM prompts.
// Two layers:
//   1. sanitizeForPrompt — strip control chars and obvious instruction markers,
//      cap length, collapse whitespace. Cheap defence; doesn't claim to defeat
//      a determined attacker.
//   2. wrapUserInput — wrap with delimited XML-style tags so the model can
//      visually separate untrusted data from instructions.

const CONTROL_CHARS = /[\x00-\x08\x0B-\x1F\x7F]/g;
// Catches common prompt-injection openers across vocabulary/spacing variants.
// Not exhaustive — the real defense is XML-tag isolation + schema validation
// of Claude's JSON output, both of which are applied at call sites. This regex
// just trims the most obvious attempts before they reach the model.
const INSTRUCTION_LIKE = /\b(ignore|disregard|override|forget|bypass|skip|cancel|clear|reset|suppress|neutralize|nullify)\b[\s\S]{0,30}\b(previous|prior|all|above|earlier|existing|current|following|original)\b[\s\S]{0,30}\b(instruction|prompt|rule|context|system|directive|constraint|task|command)s?\b/gi;

export function sanitizeForPrompt(input: string | null | undefined, maxLen = 200): string {
  if (!input) return '';
  return input
    .replace(CONTROL_CHARS, ' ')
    .replace(INSTRUCTION_LIKE, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function wrapUserInput(tag: string, value: string): string {
  // Tag is hardcoded by callers, not user-controlled; safe to inject.
  const safe = sanitizeForPrompt(value, 4000);
  return `<${tag}>${safe}</${tag}>`;
}
