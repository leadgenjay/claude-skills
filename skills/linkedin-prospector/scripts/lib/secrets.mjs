// Refuse outbound text that carries a secret. Every validator for text that leaves the machine
// (welcome messages, DM replies, comment replies) and every push/send re-check calls this.

import { loadEnv } from './config.mjs';

const MIN_SECRET_LENGTH = 8;
// A secret is also matched after lowercasing both sides and dropping every non-alphanumeric
// character, so one written with spaces, hyphens or line breaks between characters is still
// caught. Only values that keep 12+ characters after that are compared this way, so short values
// cannot match ordinary prose. Base64, reversal and other re-encodings are out of scope.
const MIN_SQUASHED_LENGTH = 12;
const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const TOKEN_SHAPES = [
  ['an Apify token', /apify_api_/],
  ['a Supabase secret key', /sb_secret_/],
  ['an API key (sk-...)', /sk-[A-Za-z0-9]{16,}/],
  ['a JWT', /eyJ[\w-]{10,}\.[\w-]{10,}/],
];

export class SecretLeakError extends Error {
  constructor(label, problems) {
    super(`refused: ${label} contains ${problems.join(' and ')}`);
    this.name = 'SecretLeakError';
    this.problems = problems;
  }
}

// Returns what was found, as plain descriptions that never include the secret itself.
// An empty list means the text is clean.
export function findSecrets(text) {
  const s = typeof text === 'string' ? text : JSON.stringify(text ?? '');
  const problems = [];
  const squashedText = squash(s);
  for (const [key, value] of Object.entries(loadEnv())) {
    if (typeof value !== 'string') continue;
    const exact = value.length >= MIN_SECRET_LENGTH && s.includes(value);
    const squashedValue = squash(value);
    const disguised = squashedValue.length >= MIN_SQUASHED_LENGTH && squashedText.includes(squashedValue);
    if (exact || disguised) problems.push(`the value of ${key}`);
  }
  for (const [name, re] of TOKEN_SHAPES) {
    if (re.test(s)) problems.push(name);
  }
  return problems;
}

// Throws SecretLeakError when text contains a configured secret value or a token-shaped string;
// returns the text unchanged otherwise. label names the text in the error ("welcome for jane-doe").
export function assertNoSecrets(text, label = 'text') {
  const problems = findSecrets(text);
  if (problems.length) throw new SecretLeakError(label, problems);
  return text;
}
