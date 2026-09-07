// Ad-hoc visual check. Playwright is deliberately NOT a dependency: it would
// add a browser download to every CI run for something only used by hand.
//
//   npm i --no-save playwright
//   npx serve out -p 4325 &
//   node scripts/shot.mjs
//
// In this sandbox Chromium is preinstalled at the path below.

import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errs = [];
const p = await b.newPage({ viewport: { width: 1194, height: 834 } });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:4325/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);

// Skip to the flag to unlock the explorer.
await p.getByRole('button', { name: /Skip to the flag/i }).click();
await p.waitForTimeout(900);
await p.screenshot({ path: '/tmp/explorer.png', fullPage: true });

// Try a pairing that should be refused.
await p.locator('select').nth(0).selectOption('tyreLife');
await p.locator('select').nth(2).selectOption('lap');
await p.waitForTimeout(400);
const refusal = await p.locator('text=That pairing will not answer').count();
await p.screenshot({ path: '/tmp/refusal.png', fullPage: true });

console.log('explorer visible after flag:', await p.locator('text=Ask your own question').count() > 0);
console.log('refusal shown for tyre-age-by-lap:', refusal > 0);
console.log('page errors:', errs.length ? errs : 'none');
await b.close();
