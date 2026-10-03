// Do-not-contact, enforced in code. Batch queries must also filter status <> 'do_not_contact'
// in the same query; these helpers cover single-prospect calls and setting the flag.

import { loadConfig } from './config.mjs';
import { select, update } from './db.mjs';
import { alert } from './alerts.mjs';

// Statuses at which the lead may be (or may have been) in the Aimfox campaign.
const MAYBE_IN_AIMFOX = ['pushing', 'pushed', 'push_failed', 'connect_sent', 'accepted', 'welcome_sent',
  'replied', 'meeting_booked'];

export class DoNotContactError extends Error {
  constructor(prospect) {
    super(`refused: ${prospect?.public_id ?? `prospect ${prospect?.id}`} is marked do_not_contact`);
    this.name = 'DoNotContactError';
    this.prospectId = prospect?.id ?? null;
  }
}

// Call with the row just read from li_prospects, before any network call that contacts them.
export function assertContactable(prospectRow) {
  if (!prospectRow || typeof prospectRow !== 'object') {
    throw new Error('assertContactable needs the prospect row, got nothing');
  }
  if (!('status' in prospectRow)) {
    throw new Error('assertContactable needs the row to include status');
  }
  if (prospectRow.status === 'do_not_contact') throw new DoNotContactError(prospectRow);
  return prospectRow;
}

async function attempt(fn) {
  try {
    const res = await fn();
    if (res && typeof res === 'object' && res.ok === false) {
      return { ok: false, error: res.error || res.reason || JSON.stringify(res) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Sets do_not_contact, drops their unsent drafts, then removes them from the Aimfox audience and
// blacklists them there. Aimfox failures do not undo the flag; each one writes an alert.
// opts.aimfox injects { removeFromAudience, addToBlacklist } (tests); otherwise ./aimfox.mjs.
export async function markDoNotContact(prospectId, reason, { aimfox, campaignId } = {}) {
  const [before] = await select('li_prospects', { id: prospectId, select: 'status' });
  if (!before) throw new Error(`markDoNotContact: no prospect with id ${prospectId}`);
  const [prospect] = await update('li_prospects', { id: prospectId },
    { status: 'do_not_contact', dnc_reason: reason ?? null });
  if (!prospect) throw new Error(`markDoNotContact: no prospect with id ${prospectId}`);
  await update('li_messages', { prospect_id: prospectId, status: 'draft' }, { status: 'dropped' });

  const result = { prospect, aimfoxRemoved: false, aimfoxBlacklisted: false };
  const urn = prospect.aimfox_lead_urn;
  if (!urn) {
    if (MAYBE_IN_AIMFOX.includes(before.status)) {
      await alert('dnc_aimfox_unknown',
        `${prospect.public_id} is now do_not_contact but has no Aimfox lead id, so it could not be removed `
        + 'from the campaign or blacklisted. Remove and blacklist them in Aimfox by hand.', prospectId);
    }
    return result;
  }

  const api = aimfox ?? await import('./aimfox.mjs');
  const campaign = campaignId ?? loadConfig().aimfox_campaign_id;
  if (campaign) {
    const removed = await attempt(() => api.removeFromAudience(campaign, urn));
    result.aimfoxRemoved = removed.ok;
    if (!removed.ok) {
      await alert('dnc_aimfox_remove_failed',
        `${prospect.public_id} is do_not_contact but removing them from Aimfox campaign ${campaign} failed: `
        + `${removed.error}. Remove them by hand.`, prospectId);
    }
  } else {
    await alert('dnc_aimfox_remove_failed',
      `${prospect.public_id} is do_not_contact but no aimfox_campaign_id is configured, so they were not `
      + 'removed from any campaign. Remove them by hand.', prospectId);
  }
  const blacklisted = await attempt(() => api.addToBlacklist(urn));
  result.aimfoxBlacklisted = blacklisted.ok;
  if (!blacklisted.ok) {
    await alert('dnc_aimfox_blacklist_failed',
      `${prospect.public_id} is do_not_contact but adding them to the Aimfox blacklist failed: `
      + `${blacklisted.error}. Blacklist them by hand.`, prospectId);
  }
  return result;
}
