#!/usr/bin/env node
// Render tenant config and env files from wizard state.
// Usage: node render-config.mjs --slug=<slug>

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const SCRIPT_DIR = dirname(decodeURIComponent(import.meta.url.replace('file://', '')));
const SKILL_DIR = resolve(SCRIPT_DIR, '..');

function renderHandlebars(template, data) {
  let output = template;

  // Process {{#unless @last}},{{/unless}} — only when @last is defined in scope
  // (i.e., inside an {{#each}} iteration; the top-level pass leaves these untouched
  // so the each handler's recursive call resolves them correctly)
  output = output.replace(/\{\{#unless\s+(@\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, cond, body) => {
    if (!(cond in data)) return match; // not in scope — leave for inner pass
    const val = data[cond];
    return val ? '' : body;
  });

  // Process {{#each}} blocks iteratively from innermost to outermost
  // Keep repeating until no more {{#each}} blocks are found
  let iterations = 0;
  while (output.includes('{{#each') && iterations < 100) {
    iterations++;
    let found = false;

    output = output.replace(/\{\{#each\s+([a-zA-Z0-9_.]+)\}\}((?:(?!\{\{#each|\{\{\/each\}\})[\s\S])*)\{\{\/each\}\}/g, (match, varPath, inner) => {
      found = true;
      const keys = varPath.split('.');
      let arr = data;
      for (const k of keys) {
        if (arr && typeof arr === 'object' && k in arr) {
          arr = arr[k];
        } else {
          arr = undefined;
          break;
        }
      }
      if (!Array.isArray(arr)) return '';
      return arr.map((item, idx) => {
        const itemAsObj = (item !== null && typeof item === 'object') ? item : {};
        const ctx = { ...data, ...itemAsObj, '@last': idx === arr.length - 1, 'this': item };
        return renderHandlebars(inner, ctx);
      }).join('');
    });

    if (!found) break;
  }

  // {{#if cond}}...{{else}}...{{/if}}
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

  // Simple variable substitution {{var}} or {{var.nested.key}}
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
    // Return the value as-is; 0 and false are valid and should be rendered
    return val !== null && val !== undefined ? String(val) : '';
  });

  return output;
}

const args = process.argv.slice(2);
let slug = null;

for (const arg of args) {
  if (arg.startsWith('--slug=')) slug = arg.split('=')[1];
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
const configDir = resolve(SKILL_DIR, 'tenants', slug);
mkdirSync(configDir, { recursive: true });

const templateFile = resolve(SKILL_DIR, 'templates', 'tenant-config.json.template');
let template;
try {
  template = readFileSync(templateFile, 'utf8');
} catch (e) {
  console.error(`Error: Cannot read template: ${templateFile}`);
  process.exit(1);
}

// Prepare render context
const renderCtx = {
  tenant_slug: answers.tenant_slug || slug,
  tenant_display_name: answers.tenant_display_name || '',
  schema_version: 1,
  bison: answers.bison || { base_url: '', workspaces: [] },
  personas: answers.personas || [],
  kb: answers.kb || {},
  booking_links: answers.booking_links || [],
  turso: answers.turso || { db_url: '' },
  telegram: answers.telegram || { bot_token_env: '', chat_id_env: '' },
  nanoclaw: answers.nanoclaw || { ssh_alias: 'zeus', container: '', group_folder: '', env_conf_path: '', skill_install_path: '' },
  preferences: Object.assign({
    daily_auto_send_cap: 30,
    confidence_floor: 0.7,
    dry_run: 0,
    max_per_cycle: 10,
    classify_model: 'claude-haiku-4-5-20251001',
    draft_model: 'claude-opus-4-1-20250805'
  }, answers.preferences || {}),
};

// Render config JSON
const configContent = renderHandlebars(template, renderCtx);
let config;
try {
  config = JSON.parse(configContent);
} catch (e) {
  console.error(`Error: Invalid JSON in rendered config: ${e.message}`);
  process.exit(1);
}

const configPath = resolve(configDir, 'config.json');
writeFileSync(configPath, JSON.stringify(config, null, 2));

// Generate tenant.env (RC_* config only — secrets come from user .env at deploy time)
// IMPORTANT: do NOT write ${VAR} placeholders here; they break `set -u` sourcing.
const envLines = [];
envLines.push('# Tenant runtime config (generated by render-config.mjs)');
envLines.push('# Secrets (TURSO_DB_TOKEN, ANTHROPIC_API_KEY, EMAIL_BISON_*, TELEGRAM_BOT_TOKEN)');
envLines.push('# come from your project .env at deploy time, not from this file.');
envLines.push('');
envLines.push(`RC_TENANT_SLUG=${config.tenant_slug}`);
envLines.push(`RC_BISON_BASE_URL=${config.bison?.base_url || ''}`);
envLines.push(`RC_DAILY_AUTO_SEND_CAP=${config.preferences?.daily_auto_send_cap ?? 30}`);
envLines.push(`RC_CONFIDENCE_FLOOR=${config.preferences?.confidence_floor ?? 0.7}`);
envLines.push(`RC_DRY_RUN=${config.preferences?.dry_run ? 1 : 0}`);
envLines.push(`RC_MAX_PER_CYCLE=${config.preferences?.max_per_cycle ?? 20}`);
envLines.push(`RC_CLASSIFY_MODEL=${config.preferences?.classify_model || 'claude-haiku-4-5-20251001'}`);
envLines.push(`RC_DRAFT_MODEL=${config.preferences?.draft_model || 'claude-sonnet-4-6'}`);
envLines.push(`RC_TELEGRAM_BOT_TOKEN_ENV=${config.telegram?.bot_token_env || 'TELEGRAM_BOT_TOKEN'}`);
envLines.push(`RC_TELEGRAM_CHAT_ID=${config.telegram?.chat_id || ''}`);
envLines.push(`RC_TELEGRAM_CHAT_JID=${config.telegram?.chat_jid || ''}`);
envLines.push(`RC_TURSO_URL_ENV=${config.turso?.url_env || 'TURSO_DB_URL'}`);
envLines.push(`RC_TURSO_TOKEN_ENV=${config.turso?.token_env || 'TURSO_DB_TOKEN'}`);
envLines.push(`RC_NANOCLAW_SSH_ALIAS=${config.nanoclaw?.ssh_alias || 'zeus'}`);
envLines.push(`RC_NANOCLAW_CONTAINER=${config.nanoclaw?.container_name || config.nanoclaw?.container || ''}`);
envLines.push(`RC_NANOCLAW_GROUP_FOLDER=${config.nanoclaw?.group_folder || ''}`);
envLines.push(`RC_NANOCLAW_ENV_CONF_PATH=${config.nanoclaw?.env_conf_path || ''}`);
envLines.push(`RC_NANOCLAW_SKILL_INSTALL_PATH=${config.nanoclaw?.skill_install_path || ''}`);

const envPath = resolve(configDir, 'tenant.env');
writeFileSync(envPath, envLines.join('\n') + '\n');

console.log(JSON.stringify({
  ok: true,
  config_path: configPath,
  env_path: envPath,
}));
