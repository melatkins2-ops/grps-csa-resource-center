// Site check: loads each page at desktop and phone widths and fails on
// JavaScript errors, missing local files, or sideways scrolling.
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';

const BASE = process.env.SITE_URL || 'http://localhost:8000/';
const pages = readdirSync('.').filter(f => f.endsWith('.html') && !/[()]/.test(f)).sort();
const widths = [1366, 390];
const problems = [];

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  // Outside sites are not part of this check; keep the run fast and offline-safe.
  await context.route(u => !u.href.startsWith(BASE), r => r.abort());
  for (const page of pages) {
    const tab = await context.newPage();
    const found = [];
    tab.on('pageerror', e => found.push(`JavaScript error: ${e.message.split('\n')[0]}`));
    tab.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400) found.push(`Missing file (${r.status()}): ${r.url().slice(BASE.length)}`); });
    try {
      await tab.goto(BASE + page, { waitUntil: 'load', timeout: 30000 });
      await tab.waitForTimeout(1500);
      const extra = await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (extra > 1) found.push(`Page scrolls sideways by ${extra}px`);
    } catch (e) { found.push(`Could not load: ${e.message.split('\n')[0]}`); }
    for (const f of new Set(found)) problems.push(`${page} @ ${width}px: ${f}`);
    console.log(`${found.length ? '✗' : '✓'} ${page} @ ${width}px`);
    await tab.close();
  }
  await context.close();
}
await browser.close();

if (problems.length) {
  console.log('\nProblems found:\n' + problems.map(p => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log('\nAll pages passed.');
