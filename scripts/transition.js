const { chromium } = require('/Users/owen/.workbuddy/binaries/node/workspace/node_modules/playwright-core');
const path = require('path');

const EXEC = '/Users/owen/.workbuddy/binaries/node/workspace/pw-browsers/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const ROOT = '/Users/owen/WorkBuddy/2026-10-22-11-38-25';

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);

  // 先到 intro
  await page.evaluate(() => go('home', 1));
  await page.waitForTimeout(800);

  // 触发滑到 footer，在中途抓帧（动画 620ms，抓 ~300ms 处）
  await page.evaluate(() => move(1));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ROOT, '.shots', '11-transition-intro-footer.png') });
  console.log('shot transition mid-frame');

  await browser.close();
})();
