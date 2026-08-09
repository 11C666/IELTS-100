const { chromium } = require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = `file:///${path.join(__dirname, '..', 'index.html').replace(/\\/g, '/')}`;

  await page.goto(`${base}#day-001`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });

  for (const id of ['vocabulary', 'writing', 'speaking', 'reading']) {
    const button = page.locator(`#${id} .chinese-toggle`);
    if (await button.count() !== 1 || await button.textContent() !== 'Hide Chinese') throw new Error(`${id}: default Chinese toggle is incorrect`);
  }

  await page.locator('#writing details, #speaking details').evaluateAll(items => items.forEach(item => { item.open = true; }));
  for (const id of ['vocabulary', 'writing', 'speaking', 'reading']) {
    await page.locator(`#${id} .chinese-toggle`).click();
    const result = await page.evaluate(sectionId => {
      const section = document.getElementById(sectionId);
      const chinese = [...section.querySelectorAll('.chinese-content')];
      const english = sectionId === 'vocabulary' ? section.querySelector('.vocab strong') : section.querySelector('.sentence-original, details summary, .reading h3');
      return {
        hidden: section.classList.contains('chinese-hidden') && chinese.length > 0 && chinese.every(node => getComputedStyle(node).display === 'none'),
        englishVisible: Boolean(english) && getComputedStyle(english).display !== 'none'
      };
    }, id);
    if (!result.hidden || !result.englishVisible) throw new Error(`${id}: Chinese-only hiding failed`);
  }

  const states = await page.evaluate(() => Object.fromEntries(['vocabulary', 'writing', 'speaking', 'reading'].map(id => [id, localStorage.getItem(`ieltsChineseVisible:${id}`)])));
  if (Object.values(states).some(value => value !== 'false')) throw new Error('Chinese toggle states were not stored independently');
  await page.reload({ waitUntil: 'load' });
  if (await page.locator('.study-card.chinese-hidden').count() !== 4) throw new Error('Chinese state did not survive reload');

  await page.goto(`${base}#day-050`, { waitUntil: 'load' });
  if (await page.locator('.study-card.chinese-hidden').count() !== 4) throw new Error('Chinese state did not survive Day navigation');
  await page.locator('#vocabulary .chinese-toggle').click();
  if (await page.locator('#vocabulary.chinese-hidden').count() || await page.locator('#writing.chinese-hidden').count() !== 1) throw new Error('Chinese toggles are not independent');

  await page.goto(`${base}#day-100`, { waitUntil: 'load' });
  await page.locator('#reading .chinese-toggle').click();
  if (await page.locator('#reading .sentence-original').count() === 0 || await page.locator('#questions .question').count() !== 3) throw new Error('Reading English or questions were affected');
  if (await page.locator('#speaking .speaking-listen').count() !== 2) throw new Error('Speaking pronunciation controls were affected');
  if (await page.locator('#vocabulary .pronounce-btn').count() < 40) throw new Error('Vocabulary pronunciation controls were affected');

  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error('Mobile layout overflowed');
  await page.setViewportSize({ width: 820, height: 1180 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error('iPad layout overflowed');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);

  console.log('Chinese toggle QA: PASS');
  console.log('Day 001/050/100, independent persistence, English visibility, pronunciation controls, Reading questions, mobile and iPad verified.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
