const { chromium } = require('/Users/owen/.workbuddy/binaries/node/workspace/node_modules/playwright-core');
const path = require('path');

const EXEC = '/Users/owen/.workbuddy/binaries/node/workspace/pw-browsers/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const ROOT = '/Users/owen/WorkBuddy/2026-10-22-11-38-25';

// [selector, expectedX, expectedY, expectedW, expectedH]
const CHECKS = [
  ['#page-hero .hero-title .tc:first-child', -37, 389, 152, 192],
  ['#page-hero .nav button:nth-child(1)', 795, 807, 138, 63],
  ['#page-intro .intro-h', 111, 290, 380, 88],
  ['#page-intro .p1', 111, 405, 797, 50],
  ['#page-intro .p3', 111, 559, 711, 50],
  ['#page-stats .side button:nth-child(1)', 96, 105, 145, 60],
  ['#page-stats .side button:nth-child(2)', 96, 189, 157, 60],
  ['#page-stats .side button:nth-child(4)', 96, 353, 185, 60],
  ['#page-stats .info-name', 932, 102, 248, 69],
  ['#page-stats .info-ip', 939, 169, 215, 30],
  ['#page-stats .rule', 939, 205, 400, 2],
  ['#page-stats .facts', 939, 228, 401, 120],
  ['#page-stats .t1', 934, 372, 155, 39],
  ['#page-stats .t4', 1068, 422, 188, 39],
  ['#page-stats .blurb', 931, 486, 402, 66],
  ['#page-traits .tr1', 1014, 105, 267, 117],
  ['#page-traits .tr3', 979, 437, 414, 117],
  ['#page-likes .info-name', 939, 102, 280, 69],
  ['#page-profile .contact', 939, 230, 401, 119],
  ['#page-profile .pill-sm', 945, 701, 191, 59],
  ['#page-profile .pill-lg', 1145, 701, 191, 59],
  ['#page-projects .sel-title', 571, 171, 297, 60],
  ['#page-projects .chick', 563, 287, 313, 276],
  ['#page-project .basic-h', 1159, 145, 226, 54],
  ['#page-project .chick-pencil', 417, 147, 605, 605],
];

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  // 页面化模型：解除屏幕位移/隐藏，让所有屏的坐标都回到设计位（1440×900 画布内）
  await page.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '.screen{transform:none !important; visibility:visible !important}';
    document.head.appendChild(st);
  });

  const rows = [];
  for (const [sel, ex, ey, ew, eh] of CHECKS) {
    const got = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const cv = el.closest('.canvas').getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return [r.left - cv.left, r.top - cv.top, r.width, r.height];
    }, sel);
    if (!got) { rows.push([sel, 'MISSING']); continue; }
    const dx = Math.round(got[0] - ex);
    const dy = Math.round(got[1] - ey);
    const dw = Math.round(got[2] - ew);
    const dh = Math.round(got[3] - eh);
    const flag = (Math.abs(dx) > 4 || Math.abs(dy) > 4 || Math.abs(dw) > 6 || Math.abs(dh) > 6) ? '  <<<' : '';
    rows.push([sel.padEnd(32), `x ${got[0].toFixed(0).padStart(5)} (Δ${String(dx).padStart(4)})  y ${got[1].toFixed(0).padStart(4)} (Δ${String(dy).padStart(4)})  w ${got[2].toFixed(0).padStart(4)}  h ${got[3].toFixed(0).padStart(4)}${flag}`]);
  }
  rows.forEach((r) => console.log(r.join(' ')));
  await browser.close();
})();
