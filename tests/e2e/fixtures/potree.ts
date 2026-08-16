import { test as base, expect } from '@playwright/test';
import { PotreeViewerPage } from '../pages/viewer-page';

// Test fixtures shared by Potree example specs: a ready Page Object plus
// automatic capture of anything that indicates the page is broken — uncaught
// page errors, meaningful console errors, and failed network requests. Listeners
// are attached during fixture setup, before the spec navigates, so nothing
// emitted on load is missed.

// A successful load emits only info-level logs; these substrings are the known
// non-fatal ones potree/its libs print, filtered so a real console.error still
// fails the test.
const CONSOLE_ALLOWLIST = [
  'shader compile duration',
  'Potree ',
  'initializing three.js',
  'VR not supported',
];

// Failed requests are reported with their URL (below). Ignore browser-internal
// or benign ones so only genuine missing/broken resources fail the test.
const REQUEST_ALLOWLIST = ['favicon.ico', 'net::ERR_ABORTED'];

function matches(text: string, list: string[]): boolean {
  return list.some((entry) => text.includes(entry));
}

interface PotreeFixtures {
  /** Aggregated evidence that the page misbehaved: page errors, console errors,
   *  and failed network requests (each with its URL). Empty means healthy. */
  runtimeErrors: string[];
  viewerPage: PotreeViewerPage;
}

export const test = base.extend<PotreeFixtures>({
  runtimeErrors: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      // The browser's generic "Failed to load resource" line has no URL; the
      // response/requestfailed handlers below report those precisely instead.
      if (text.includes('Failed to load resource')) return;
      if (matches(text, CONSOLE_ALLOWLIST)) return;
      errors.push(`console.error: ${text}`);
    });

    page.on('pageerror', (err) => {
      errors.push(`pageerror: ${err.message}`);
    });

    page.on('response', (res) => {
      const status = res.status();
      if (status >= 400 && !matches(res.url(), REQUEST_ALLOWLIST)) {
        errors.push(`request ${status}: ${res.url()}`);
      }
    });

    page.on('requestfailed', (req) => {
      const reason = req.failure()?.errorText ?? 'failed';
      const line = `${reason} ${req.url()}`;
      if (!matches(line, REQUEST_ALLOWLIST)) {
        errors.push(`request failed (${reason}): ${req.url()}`);
      }
    });

    await use(errors);
  },
  viewerPage: async ({ page }, use) => {
    await use(new PotreeViewerPage(page));
  },
});

export { expect };
