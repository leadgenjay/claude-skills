// One pass at a time. acquire('run') creates <home>/run.lock with O_EXCL; a second acquire
// fails while it exists. The lock outlives the process that took it (closer run-begin takes it,
// run-end releases it), so the pid in it says nothing about whether the pass is alive, and pids get
// reused. Age is the only test: a lock older than the TTL (90 minutes by default, or
// LINKEDIN_LEADGEN_LOCK_TTL_MINUTES) is stale and is replaced with an alert. A refusal because of
// a lock older than 30 minutes also alerts, so the user hears that the loop is stuck.

import fs from 'node:fs';
import path from 'node:path';
import { ensureHome, homeDir } from './config.mjs';
import { alert } from './alerts.mjs';

export const DEFAULT_TTL_MINUTES = 90;
export const STUCK_AFTER_MINUTES = 30;

export function lockPath(name) {
  if (!/^[a-z0-9_-]+$/i.test(name)) throw new Error(`lock name must be letters, digits, - or _: ${name}`);
  return path.join(homeDir(), `${name}.lock`);
}

function ttlMinutes(given) {
  const fromEnv = Number(process.env.LINKEDIN_LEADGEN_LOCK_TTL_MINUTES);
  const ttl = given ?? (fromEnv > 0 ? fromEnv : DEFAULT_TTL_MINUTES);
  if (!(ttl > 0)) throw new Error(`lock TTL must be a number of minutes above 0, got ${ttl}`);
  return ttl;
}

function tryCreate(file) {
  ensureHome();
  try {
    const fd = fs.openSync(file, 'wx', 0o600);
    fs.writeSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    fs.closeSync(fd);
    return true;
  } catch (err) {
    if (err.code === 'EEXIST') return false;
    throw err;
  }
}

// The current holder ({ pid, startedAt }), or null when the lock is free.
export function holder(name) {
  try {
    return JSON.parse(fs.readFileSync(lockPath(name), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    return { pid: null, startedAt: null, unreadable: true };
  }
}

// Resolves true when this caller now holds the lock, false when a lock younger than the TTL
// stands. opts.ttlMinutes overrides the TTL for this call.
export async function acquire(name, { ttlMinutes: ttlGiven } = {}) {
  const ttl = ttlMinutes(ttlGiven);
  const file = lockPath(name);
  if (tryCreate(file)) return true;

  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return tryCreate(file);
    throw err;
  }
  let info = {};
  try {
    info = JSON.parse(raw);
  } catch {
    // unreadable content: judge by the file's age
  }
  const startedMs = Date.parse(info.startedAt) || fs.statSync(file).mtimeMs;
  const ageMinutes = Math.floor((Date.now() - startedMs) / 60000);

  if (ageMinutes < ttl) {
    if (ageMinutes >= STUCK_AFTER_MINUTES) {
      await alert('lock_stuck',
        `A ${name} pass has held its lock for ${ageMinutes} minutes (since ${info.startedAt ?? 'unknown'}), `
        + `so this pass did not run. It is replaced automatically after ${ttl} minutes; if nothing is `
        + `running, delete ${file}.`);
    }
    return false;
  }

  // Move the stale file aside atomically, then make sure what we moved is the stale lock and not
  // one another process created in between; if it is not, put it back and give up.
  const aside = `${file}.stale-${process.pid}-${Date.now()}`;
  try {
    fs.renameSync(file, aside);
  } catch (err) {
    if (err.code === 'ENOENT') return tryCreate(file);
    throw err;
  }
  if (fs.readFileSync(aside, 'utf8') !== raw) {
    try {
      fs.linkSync(aside, file);
    } catch {
      // someone else already holds a fresh lock; theirs stands
    }
    fs.unlinkSync(aside);
    return false;
  }
  fs.unlinkSync(aside);
  if (!tryCreate(file)) return false;
  await alert('stale_lock',
    `Replaced a ${name} lock from ${info.startedAt ?? 'an unknown time'} (${ageMinutes} minutes old, past the `
    + `${ttl}-minute limit). The pass that held it never released it; check its last output.`);
  return true;
}

// Removes the lock whoever holds it (run-end runs in a different process from run-begin).
// Returns true if a lock was removed.
export function release(name) {
  try {
    fs.unlinkSync(lockPath(name));
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}
