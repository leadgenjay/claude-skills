#!/usr/bin/env node
// reply-claw setup wizard — 10-phase interactive state machine with resume support.
// Usage: node wizard.mjs [--slug=<slug>] [--phase=<N>] [--resume] [--save-answer <key> <value>] [--advance] [--print-phase] [--finalize]

import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import * as readline from 'node:readline';

const SCRIPT_DIR = dirname(decodeURIComponent(import.meta.url.replace('file://', '')));
const SKILL_DIR = resolve(SCRIPT_DIR, '..');
const PHASES = [
  { number: 1, title: 'Tenant Identity', file: 'interview/01-tenant-identity.md' },
  { number: 2, title: 'Bison Workspaces', file: 'interview/02-bison-workspaces.md' },
  { number: 3, title: 'Personas', file: 'interview/03-personas.md' },
  { number: 4, title: 'KB Positioning', file: 'interview/04-kb-positioning.md' },
  { number: 5, title: 'KB FAQs', file: 'interview/05-kb-faqs.md' },
  { number: 6, title: 'KB Objections', file: 'interview/06-kb-objections.md' },
  { number: 7, title: 'Booking Links', file: 'interview/07-booking-links.md' },
  { number: 8, title: 'AI Keys', file: 'interview/08-ai-keys.md' },
  { number: 9, title: 'State Keys', file: 'interview/09-state-keys.md' },
  { number: 10, title: 'Telegram Bot', file: 'interview/10-telegram.md' },
  { number: 11, title: 'Nanoclaw Access', file: 'interview/11-nanoclaw-access.md' },
  { number: 12, title: 'Preferences', file: 'interview/12-preferences.md' },
];

function getStateFile(slug) {
  return resolve(SKILL_DIR, 'tenants', slug, 'wizard-state.json');
}

function loadState(slug) {
  try {
    const stateFile = getStateFile(slug);
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveState(slug, state) {
  const stateFile = getStateFile(slug);
  const dir = dirname(stateFile);
  mkdirSync(dir, { recursive: true });

  // Atomic write via temp file
  const tmpFile = `${stateFile}.tmp.${process.pid}`;
  writeFileSync(tmpFile, JSON.stringify(state, null, 2));
  // Node.js fs.renameSync is atomic on POSIX
  renameSync(tmpFile, stateFile);
}

function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

async function main() {
  const args = process.argv.slice(2);
  let slug = null;
  let phase = null;
  let action = 'print-state'; // default: print current state
  let saveKey = null;
  let saveValue = null;

  for (const arg of args) {
    if (arg.startsWith('--slug=')) slug = arg.split('=')[1];
    if (arg.startsWith('--phase=')) phase = parseInt(arg.split('=')[1], 10);
    if (arg === '--resume') action = 'resume';
    if (arg === '--advance') action = 'advance';
    if (arg === '--print-phase') action = 'print-phase';
    if (arg === '--finalize') action = 'finalize';
    if (arg === '--save-answer') {
      action = 'save-answer';
      saveKey = args[args.indexOf(arg) + 1];
      saveValue = args[args.indexOf(arg) + 2];
    }
  }

  if (!slug) {
    console.error('Error: --slug required');
    process.exit(1);
  }

  // Initialize or load state
  let state = loadState(slug);
  if (!state) {
    state = {
      tenant_slug: slug,
      current_phase: 1,
      answers: {},
      last_updated: new Date().toISOString(),
      version: 1,
    };
  }

  // Handle actions
  if (action === 'save-answer') {
    if (!saveKey || !saveValue) {
      console.error('Error: --save-answer requires key and value');
      process.exit(1);
    }
    setNestedValue(state.answers, saveKey, saveValue);
    state.last_updated = new Date().toISOString();
    try {
      saveState(slug, state);
    } catch (e) {
      console.error(`Error saving state: ${e.message}`);
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, key: saveKey }));
  } else if (action === 'advance') {
    if (state.current_phase < PHASES.length) {
      state.current_phase++;
    }
    state.last_updated = new Date().toISOString();
    try {
      saveState(slug, state);
    } catch (e) {
      console.error(`Error saving state: ${e.message}`);
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, phase: state.current_phase }));
  } else if (action === 'print-phase') {
    const phaseInfo = PHASES[state.current_phase - 1];
    if (!phaseInfo) {
      console.error(`Error: invalid phase ${state.current_phase}`);
      process.exit(1);
    }
    const phaseFile = resolve(SKILL_DIR, phaseInfo.file);
    try {
      const content = readFileSync(phaseFile, 'utf8');
      console.log(JSON.stringify({
        ok: true,
        phase: state.current_phase,
        title: phaseInfo.title,
        content,
      }));
    } catch (e) {
      console.error(`Error reading phase file: ${e.message}`);
      process.exit(1);
    }
  } else if (action === 'finalize') {
    // Validate all required fields are present
    const required = [
      'tenant_slug',
      'tenant_display_name',
      'bison.workspaces',
      'personas',
      'kb.company_pitch',
      'kb.icp_description',
      'kb.headline_outcome',
      'kb.differentiators',
      'kb.pricing_posture',
      'kb.post_reply_pricing',
      'kb.faqs',
      'kb.objections',
      'booking_links',
    ];

    const missing = [];
    for (const field of required) {
      const keys = field.split('.');
      let val = state.answers;
      for (const key of keys) {
        if (val && typeof val === 'object' && key in val) {
          val = val[key];
        } else {
          val = undefined;
          break;
        }
      }
      if (!val || (Array.isArray(val) && val.length === 0)) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      console.error(`Error: missing required fields: ${missing.join(', ')}`);
      process.exit(1);
    }

    console.log(JSON.stringify({ ok: true, state }));
  } else {
    // Default: print current state
    console.log(JSON.stringify(state, null, 2));
  }
}

main().catch(e => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
