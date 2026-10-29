const { chromium } = require('/Users/owen/.workbuddy/binaries/node/workspace/node_modules/playwright-core');
const path = require('path');

const EXEC = '/Users/owen/.workbuddy/binaries/node/workspace/pw-browsers/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const ROOT = '/Users/owen/WorkBuddy/2026-10-22-11-38-25';

const SHOTS = [
  ['home', 0, '01-hero'],
  ['home', 1, '02-intro'],
  ['about', 0, '03-stats'],
  ['about', 1, '04-traits'],
  ['about', 2, '05-likes'],
  ['about', 3, '06-profile'],
  ['projects', 0, '07-select'],
  ['projects', 1, '08-project'],
];

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);

  for (const [sec, idx, name] of SHOTS) {
    await page.evaluate(([s, i]) => go(s, i), [sec, idx]);
    await page.waitForTimeout(800);           // 等滑页动画结束
    await page.screenshot({ path: path.join(ROOT, '.shots', `${name}.png`) });
    console.log('shot', name);
  }

  // intro 页滚到底：露出底部 footer（footer 为最低点）
  await page.evaluate(() => go('home', 1));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('#page-intro .canvas').classList.add('scrolled'));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(ROOT, '.shots', '02b-intro-footer.png') });
  console.log('shot 02b-intro-footer');

  // 弹窗
  await page.evaluate(() => go('projects', 1));
  await page.waitForTimeout(800);
  await page.click('[data-modal="desc"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ROOT, '.shots', '09-modal-desc.png') });
  console.log('shot 09-modal-desc');

  // 小视口（预览面板尺寸）
  const p2 = await browser.newPage({ viewport: { width: 430, height: 560 } });
  await p2.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'networkidle' });
  await p2.evaluate(() => document.fonts.ready);
  await p2.waitForTimeout(700);
  await p2.screenshot({ path: path.join(ROOT, '.shots', '10-small-hero.png') });
  console.log('shot 10-small-hero');

  await browser.close();
})();
