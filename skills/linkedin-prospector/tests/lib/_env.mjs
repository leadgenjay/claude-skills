// Test harness: a throwaway LINKEDIN_LEADGEN_HOME, fake Supabase credentials, a mock file and an
// HTTP log. Nothing here reaches the network: requests are served from the mock or throw.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SUPABASE = 'https://test-project.supabase.co';

export function setupEnv(mocks = [], { config } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'li-lib-test-'));
  const mockFile = path.join(home, 'mock.json');
  const logFile = path.join(home, 'http.log');
  process.env.LINKEDIN_LEADGEN_HOME = home;
  process.env.LINKEDIN_LEADGEN_OFFLINE = '1';
  process.env.LINKEDIN_LEADGEN_HTTP_LOG = logFile;
  process.env.SUPABASE_URL = SUPABASE;
  process.env.SUPABASE_SERVICE_KEY = 'service-key-for-tests';
  const env = {
    home,
    mockFile,
    logFile,
    setMocks(list) {
      fs.writeFileSync(mockFile, JSON.stringify(list));
      process.env.LINKEDIN_LEADGEN_MOCK = mockFile;
    },
    noMocks() {
      delete process.env.LINKEDIN_LEADGEN_MOCK;
    },
    log() {
      if (!fs.existsSync(logFile)) return [];
      return fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    },
    needsYou() {
      const f = path.join(home, 'needs-you.md');
      return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    },
    cleanup() {
      fs.rmSync(home, { recursive: true, force: true });
    },
  };
  env.setMocks(mocks);
  if (config) fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify(config));
  return env;
}
