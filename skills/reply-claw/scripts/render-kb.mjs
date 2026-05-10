#!/usr/bin/env node
// Convert wizard-state.json → KB markdown files in tenants/{slug}/kb/
// Usage: node render-kb.mjs --slug=<slug>

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const SCRIPT_DIR = dirname(decodeURIComponent(import.meta.url.replace('file://', '')));
const SKILL_DIR = resolve(SCRIPT_DIR, '..');

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function renderHandlebars(template, data) {
  let output = template;

  output = output.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, key) => {
    const keys = key.split('.');
    let val = data;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        return '';
      }
    }
    return String(val || '');
  });

  output = output.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, varName, inner) => {
    const arr = data[varName];
    if (!Array.isArray(arr)) return '';
    return arr.map((item, idx) => {
      const ctx = { ...data, [varName]: item, '@last': idx === arr.length - 1, 'this': item };
      return renderHandlebars(inner, ctx);
    }).join('');
  });

  output = output.replace(
    /\{\{#if\s+([a-zA-Z0-9_.]+)\}\}([\s\S]*?)\{\{(?:else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (match, cond, ifBody, elseBody) => {
      const keys = cond.split('.');
      let val = data;
      for (const k of keys) {
        if (val && typeof val === 'object' && k in val) {
          val = val[k];
        } else {
          val = undefined;
          break;
        }
      }
      const isTruthy = val && val !== 'false' && val !== '0' && val !== false && val !== 0;
      return isTruthy ? renderHandlebars(ifBody, data) : (elseBody ? renderHandlebars(elseBody, data) : '');
    }
  );

  return output;
}

const args = process.argv.slice(2);
let slug = null;

for (const arg of args) {
  if (arg.startsWith('--slug=')) {
    slug = arg.split('=')[1];
  }
}

if (!slug) {
  console.error('Error: --slug required');
  process.exit(1);
}

const stateFile = resolve(SKILL_DIR, 'tenants', slug, 'wizard-state.json');
let state;
try {
  state = JSON.parse(readFileSync(stateFile, 'utf8'));
} catch (e) {
  console.error(`Error: Cannot read state file: ${stateFile}`);
  process.exit(1);
}

const answers = state.answers || {};
const kbBaseDir = resolve(SKILL_DIR, 'tenants', slug, 'kb');
const templatesDir = resolve(SKILL_DIR, 'templates', 'kb');

mkdirSync(kbBaseDir, { recursive: true });

const renderCtx = {
  tenant_slug: answers.tenant_slug || slug,
  tenant_display_name: answers.tenant_display_name || '',
  company_pitch: answers.kb?.company_pitch || '',
  icp_description: answers.kb?.icp_description || '',
  headline_outcome: answers.kb?.headline_outcome || '',
  differentiators: answers.kb?.differentiators || [],
  pricing_posture: answers.kb?.pricing_posture || '',
  post_reply_pricing: answers.kb?.post_reply_pricing || '',
  faqs: answers.kb?.faqs || [],
  objections: answers.kb?.objections || [],
  personas: answers.personas || [],
  booking_links: answers.booking_links || [],
};

// Render standard KB files
const standardFiles = ['company-facts.md', 'pricing-posture.md'];
for (const filename of standardFiles) {
  const templatePath = resolve(templatesDir, `${filename}.template`);
  try {
    const template = readFileSync(templatePath, 'utf8');
    const content = renderHandlebars(template, renderCtx);
    const outputPath = resolve(kbBaseDir, filename);
    writeFileSync(outputPath, content);
  } catch (e) {
    // template not found, skip
  }
}

// Render FAQ files
const faqDir = resolve(kbBaseDir, 'faq');
mkdirSync(faqDir, { recursive: true });
if (Array.isArray(renderCtx.faqs)) {
  for (const faq of renderCtx.faqs) {
    const filename = `${slugify(faq.question || '')}.md`;
    const content = `# ${faq.question || 'FAQ'}\n\n${faq.answer || ''}\n`;
    writeFileSync(resolve(faqDir, filename), content);
  }
}

// Render objection files
const objDir = resolve(kbBaseDir, 'objections');
mkdirSync(objDir, { recursive: true });
if (Array.isArray(renderCtx.objections)) {
  for (const obj of renderCtx.objections) {
    const filename = `${slugify(obj.objection || '')}.md`;
    const content = `# Objection: ${obj.objection || 'Unknown'}\n\n${obj.response || ''}\n`;
    writeFileSync(resolve(objDir, filename), content);
  }
}

// Render booking handoff per persona
const sharedDir = resolve(kbBaseDir, 'shared');
mkdirSync(sharedDir, { recursive: true });

if (Array.isArray(renderCtx.personas)) {
  for (const persona of renderCtx.personas) {
    if (persona.auto_send_eligible) {
      const firstName = persona.first_name || persona.name || 'user';
      const filename = `booking-handoff-${slugify(firstName)}.md`;
      const ctx = { ...renderCtx, persona };

      // Try template, fallback to generated content
      const templatePath = resolve(templatesDir, 'booking-handoff.md.template');
      let content;
      try {
        const template = readFileSync(templatePath, 'utf8');
        content = renderHandlebars(template, ctx);
      } catch (e) {
        content = `# Booking Handoff for ${firstName}\n\nBooking link:\n${persona.booking_url || 'TBD'}\n`;
      }
      writeFileSync(resolve(kbBaseDir, filename), content);
    }
  }
}

// Render booking links master file
const bookingLinksCtx = { ...renderCtx };
const bookingTemplatePath = resolve(templatesDir, 'booking-links.md.template');
try {
  const template = readFileSync(bookingTemplatePath, 'utf8');
  const content = renderHandlebars(template, bookingLinksCtx);
  writeFileSync(resolve(sharedDir, 'booking-links.md'), content);
} catch (e) {
  // fallback
  const lines = ['# Booking Links', ''];
  if (Array.isArray(renderCtx.booking_links)) {
    for (const link of renderCtx.booking_links) {
      lines.push(`- **${link.account_key} / ${link.persona_slug}**: ${link.url}`);
    }
  }
  writeFileSync(resolve(sharedDir, 'booking-links.md'), lines.join('\n') + '\n');
}

console.log(JSON.stringify({
  ok: true,
  kb_dir: kbBaseDir,
  files_created: [
    'company-facts.md',
    'pricing-posture.md',
    'faq/*',
    'objections/*',
    'booking-handoff-*.md',
    'shared/booking-links.md',
  ],
}));
