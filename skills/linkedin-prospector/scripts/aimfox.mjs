#!/usr/bin/env node
// Thin agent-friendly Aimfox CLI. JSON stdout, diagnostics stderr; authoring is dry by default.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from './lib/config.mjs';
import { authoringAccounts, listCampaigns, readAuthoringCampaign, createWelcomeCampaign, AimfoxRefusal } from './lib/aimfox.mjs';
import { parseAuthoringArgs } from './lib/aimfox-command.mjs';

const projection = (row, keys) => Object.fromEntries(keys.filter((k) => Object.hasOwn(row, k)).map((k) => [k, row[k]]));
// Only known primitive fields are public. Never expose account objects or provider error bodies.
const primitiveProjection = (row, keys) => Object.fromEntries(Object.entries(projection(row, keys))
  .filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v)));
const campaignView = (c) => ({ ...primitiveProjection(c, ['id', 'name', 'state', 'type', 'outreach_type', 'uses_connection_note', 'inmail_optimization']),
  ...(Array.isArray(c.flows) ? { flows: c.flows.map((f) => ({ ...primitiveProjection(f, ['id', 'type']),
    note_blank: f.template === null, message_count: Array.isArray(f.flow_message_templates) ? f.flow_message_templates.length : null })) } : {}) });

export async function main(args) {
  const [command, ...rest] = args;
  if (!command || command === '--help' || command === 'help') {
    return { status: 'help', commands: ['accounts', 'campaigns', 'campaign --campaign ID', 'create-campaign [--name NAME] [--campaign ID] [--account ID] [--json-file FILE] [--apply]'],
      exit_codes: { success: 0, failure_or_unproven: 1, invalid_or_refused: 2 } };
  }
  const parsed = command === 'create-campaign' || command === 'campaign' ? parseAuthoringArgs(rest, { standalone: true }) : null;
  if (!['accounts', 'campaigns', 'campaign', 'create-campaign'].includes(command)) throw new AimfoxRefusal('Unknown command; use --help');
  if ((command === 'accounts' || command === 'campaigns') && rest.length) throw new AimfoxRefusal(`${command} accepts no arguments`);
  if (command === 'campaign' && (!parsed.options.campaign || rest.length !== 2 || rest[0] !== '--campaign')) throw new AimfoxRefusal('usage: campaign --campaign ID');
  loadEnv();
  if (command === 'accounts') return { status: 'ok', accounts: (await authoringAccounts()).map((a) => primitiveProjection(a, ['id', 'full_name', 'state', 'workspace_id'])) };
  if (command === 'campaigns') return { status: 'ok', campaigns: (await listCampaigns()).map(campaignView) };
  if (command === 'campaign') return { status: 'ok', campaign: campaignView(await readAuthoringCampaign(parsed.options.campaign)) };
  return createWelcomeCampaign(parsed.options, { apply: parsed.apply });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((result) => process.stdout.write(`${JSON.stringify(result)}\n`), (e) => {
    process.stderr.write(`${e instanceof AimfoxRefusal ? 'Refused' : 'Error'}: ${e.message}\n`);
    process.exitCode = e instanceof AimfoxRefusal ? 2 : 1;
  });
}
