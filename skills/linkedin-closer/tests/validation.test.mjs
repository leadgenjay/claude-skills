// The draft-validation rules, applied to the 16 labelled fixture threads and to sample drafts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CLASSES, validateReply, normalizeLink, validateCommentReply, endsOnBareLink, hasPriceFigure,
  BOT_RE, STOP_RE, COMPLAINT_RE, PRICE_QUESTION_RE,
} from '../scripts/closer.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'threads.json'), 'utf8'));

test('fixture holds 16 threads, exactly 2 per class, each with a known handling', () => {
  assert.equal(fixture.threads.length, 16);
  for (const cls of CLASSES) {
    assert.equal(fixture.threads.filter((t) => t.class === cls).length, 2, `class ${cls}`);
  }
  for (const t of fixture.threads) {
    assert.ok(['send', 'price', 'escalate', 'dnc', 'skip'].includes(t.expected.handling), `${t.id} handling`);
  }
});

test('fixture includes the stop, bot and price threads with the required handling', () => {
  const lastText = (t) => t.messages[t.messages.length - 1].text;
  const find = (re) => fixture.threads.find((t) => re.test(lastText(t)));
  assert.equal(find(/stop messaging me/i).expected.handling, 'dnc');
  assert.equal(find(/is this a bot\?/i).expected.handling, 'escalate');
  assert.equal(find(/how much does it cost\?/i).expected.handling, 'price');
});

test('every good draft passes validation; price drafts carry a link and no number', () => {
  for (const t of fixture.threads) {
    const h = t.expected.handling;
    if (h === 'send' || h === 'price') {
      assert.ok(t.good_draft, `${t.id} needs a good draft`);
      assert.deepEqual(validateReply(t.good_draft, { requireLink: h === 'price', allowedLinks: [fixture.offer_link] }), [], `${t.id}: ${t.good_draft}`);
    } else {
      assert.equal(t.good_draft, null, `${t.id} (${h}) must have no reply`);
    }
  }
});

test('every bad draft is rejected by validation', () => {
  let checked = 0;
  for (const t of fixture.threads) {
    for (const bad of t.bad_drafts) {
      const problems = validateReply(bad.body, { requireLink: t.expected.handling === 'price', allowedLinks: [fixture.offer_link] });
      assert.ok(problems.length > 0, `${t.id} should reject (${bad.why}): ${bad.body}`);
      checked++;
    }
  }
  assert.ok(checked >= 8);
});

test('the code backstops recognise the stop and bot fixtures', () => {
  const byId = Object.fromEntries(fixture.threads.map((t) => [t.id, t.messages[t.messages.length - 1].text]));
  assert.ok(STOP_RE.test(byId.t07));
  assert.ok(BOT_RE.test(byId.t04));
  assert.ok(!BOT_RE.test(byId.t01) && !STOP_RE.test(byId.t01));
  const priceQuestions = fixture.threads.filter((t) => PRICE_QUESTION_RE.test(t.messages[t.messages.length - 1].text));
  assert.deepEqual(priceQuestions.map((t) => t.id), ['t03'], 'only the price thread demands the offer link');
});

test('reply rules: length, bare link, prices', () => {
  assert.deepEqual(validateReply('Sounds good. What does your week look like?'), []);
  assert.match(validateReply('x'.repeat(251)).join(), /over 250/);
  assert.deepEqual(validateReply('x'.repeat(250)), []);
  assert.match(validateReply('').join(), /empty/);
  assert.ok(endsOnBareLink('Book here https://example.com/book'));
  assert.ok(endsOnBareLink('Book here https://example.com/book.'));
  assert.ok(endsOnBareLink('example.com/book'));
  assert.ok(!endsOnBareLink('Book at https://example.com/book and tell me the time?'));
  for (const p of ['$497', 'it is 2,000 per month', '1.5k a month', '300 dollars', '€90', '99/mo', '500 monthly']) {
    assert.ok(hasPriceFigure(p), p);
  }
  for (const ok of ['30% more replies', 'we booked 12 calls last month', 'on 14 October', 'a 2 minute call']) {
    assert.ok(!hasPriceFigure(ok), ok);
  }
  assert.match(validateReply('Pricing depends on scope. Which part matters most?', { requireLink: true, allowedLinks: ['https://example.com/book'] }).join(), /needs your offer_url/);
  assert.match(validateReply('Pricing depends on scope. Which part matters most?', { requireLink: true }).join(), /both empty/);
});

test('comment replies are engagement only', () => {
  assert.deepEqual(validateCommentReply('Love this point, Sam. What made you switch?'), []);
  assert.match(validateCommentReply('Great one, details at example.com/book').join(), /link/);
  assert.match(validateCommentReply('Great question, DM me and I will explain').join(), /engagement only/);
  assert.match(validateCommentReply('Thanks! Book a call and we can dig in?').join(), /engagement only/);
  assert.match(validateCommentReply('It costs $99').join(), /price/);
  assert.match(validateCommentReply('see my page', { forbiddenLinks: ['see my page'] }).join(), /link/);
  assert.ok(COMPLAINT_RE.test('This company is a scam, I never received my refund'));
  assert.ok(!COMPLAINT_RE.test('Great post, thanks for sharing'));
});

const BOOK = 'https://example.com/book';
const allow = { allowedLinks: [BOOK, 'https://example.com/pricing'] };

test('reply links: only offer_url or booking_link, compared by host and path', () => {
  const ok = (link) => `Grab a time at ${link} and tell me when you booked?`;
  assert.deepEqual(validateReply(ok('https://example.com/book'), allow), []);
  assert.deepEqual(validateReply(ok('https://www.Example.com/book/'), allow), [], 'www, case and a trailing slash do not matter');
  assert.deepEqual(validateReply(ok('example.com/book'), allow), [], 'scheme optional');
  for (const bad of [
    'https://example.com.evil.io/book',  // lookalike: the real domain as a subdomain
    'https://examp1e.com/book',          // lookalike: digit for letter
    'https://example.co/book',           // lookalike: another TLD
    'https://example.com/other',         // right host, wrong path
    'https://their-site.io/demo',        // a link quoted back from the thread
    'jaynotes.dev',
    'growth.xyz/free',
  ]) {
    assert.match(validateReply(ok(bad), allow).join(), /not your offer_url or booking_link/, bad);
  }
  assert.match(validateReply('My notes are at growthhacks dot com, want them?', allow).join(), /spells out a domain/);
  assert.match(validateReply('See growthhacks [dot] com, want it?', allow).join(), /spells out a domain/);
  assert.match(validateReply(ok(BOOK), { allowedLinks: [] }).join(), /not your offer_url/, 'no allowlist means no links');
  assert.equal(normalizeLink('HTTPS://WWW.Example.com/Book/'), 'example.com/Book');
});

test('comment replies refuse every link and domain form', () => {
  for (const bad of ['Check jaynotes.dev for more', 'growth.xyz has the template', 'look up growthhacks dot com',
    'see growthhacks(dot)com', 'https://example.com/book', 'www.example.com']) {
    assert.match(validateCommentReply(bad).join(), /link or domain/, bad);
  }
  assert.deepEqual(validateCommentReply('Agreed. The hard part is the list. What did you try first?'), [], 'sentence breaks are not domains');
});

test('the new price forms are refused', () => {
  for (const p of ['₹5000 to start', '¥300', '2k to start', 'about 1.5K', 'it is 1500 total', 'five hundred dollars',
    'a few thousand a month', 'two grand per month']) {
    assert.ok(hasPriceFigure(p), p);
    assert.match(validateReply(`${p}, does that work?`).join(), /price/, p);
  }
  for (const ok of ['a 20 minute call', 'top 10 posts', 'hundreds of agencies like yours']) assert.ok(!hasPriceFigure(ok), ok);
});
