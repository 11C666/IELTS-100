const { chromium } = require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const base = process.argv[2] || 'http://127.0.0.1:8765/';
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`${base}data/index.json`, { waitUntil: 'networkidle' });
  await page.evaluate(() => caches.open('ielts-mastery-v1').then(cache => cache.put('./stale-test', new Response('old'))));
  await page.goto(`${base}#day-001`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('.part-translation').length >= 30);
  await page.waitForFunction(() => window.IELTS_DAYS?.[1]?.speaking?.[0]?.translation);

  await page.locator('#writing details, #speaking details').evaluateAll(items => items.forEach(item => { item.open = true; }));
  await page.locator('#showAnswers').click();

  const result = await page.evaluate(async () => {
    const sectionIds = ['paraphrases', 'sentences', 'expressions', 'writing', 'speaking', 'reading'];
    const sections = Object.fromEntries(sectionIds.map(id => {
      const elements = [...document.querySelectorAll(`#${id} .part-translation`)];
      return [id, {
        count: elements.length,
        visible: elements.filter(element => {
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
        }).length,
        text: elements.map(element => element.textContent.trim()).filter(Boolean)
      }];
    }));
    const cacheNames = await caches.keys();
    return {
      sections,
      cacheNames,
      mergedTranslation: window.IELTS_DAYS[1].writingIdeas[0].translation,
      hasWritingViewpoint: document.body.textContent.includes('教育能够促进社会流动。'),
      hasWritingTopic: document.body.textContent.includes('普惠的教育能帮助弱势背景的人改善长期发展前景。'),
      hasInvalidText: /undefined|null|\[object Object\]/.test(document.body.textContent),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });

  for (const [id, section] of Object.entries(result.sections)) {
    if (!section.count || !section.visible || section.text.some(text => !text)) throw new Error(`${id} translations are missing or hidden`);
  }
  if (!result.hasWritingViewpoint || !result.hasWritingTopic || !result.mergedTranslation) throw new Error('Writing translations did not reach the DOM/data model');
  if (!result.cacheNames.includes('ielts-mastery-v2') || result.cacheNames.includes('ielts-mastery-v1')) throw new Error(`Cache migration failed: ${result.cacheNames.join(', ')}`);
  if (result.hasInvalidText) throw new Error('Invalid fallback text appeared in the page');
  if (result.overflow) throw new Error('Desktop page has horizontal overflow');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (mobileOverflow) throw new Error('Mobile page has horizontal overflow');
  if (errors.length) throw new Error(`Browser console errors: ${errors.join(' | ')}`);

  console.log('Day 001 browser DOM QA: PASS');
  console.log(JSON.stringify({ cacheNames: result.cacheNames, sections: Object.fromEntries(Object.entries(result.sections).map(([id, value]) => [id, { count: value.count, visible: value.visible }])) }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
