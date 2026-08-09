const { chromium } = require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = `file:///${path.join(__dirname, '..', 'index.html').replace(/\\/g, '/')}`;
  const results = [];
  const firstDay = Number(process.argv[2] || 1);
  const lastDay = Number(process.argv[3] || 100);
  for (let id = firstDay; id <= lastDay; id += 1) {
    const label = `Day ${String(id).padStart(3, '0')}`;
    await page.goto(`${base}#day-${String(id).padStart(3, '0')}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('.sentence-pair').length > 0);
    await page.locator('#writing details, #speaking details').evaluateAll(items => items.forEach(item => { item.open = true; }));
    const check = await page.evaluate(() => ({
      paraphrases: document.querySelectorAll('#paraphrases .part-translation').length,
      sentences: document.querySelectorAll('#sentences .part-translation').length,
      expressions: document.querySelectorAll('#expressions .part-translation').length,
      writingPairs: document.querySelectorAll('#writing .sentence-pair').length,
      speakingPairs: document.querySelectorAll('#speaking .sentence-pair').length,
      readingPairs: document.querySelectorAll('#reading .reading .sentence-pair').length,
      duplicateWhole: document.querySelectorAll('#writing details > .part-translation[data-translation-key^="writing-argument-"],#speaking details > .part-translation[data-translation-key^="speaking-answer-"],#reading .reading > .part-translation[data-translation-key^="reading-paragraph-"]').length,
      readingQuestionChinese: [...document.querySelectorAll('#questions *')].some(node => /[\u3400-\u9fff]/.test(node.textContent)),
      invalid: /undefined|null|\[object Object\]/.test(document.body.textContent),
      controls: [...document.querySelectorAll('.study-card > header .reveal')].filter(button => button.textContent === 'Hide').length,
      listen: document.querySelectorAll('#speaking .speaking-listen').length
    }));
    if (check.paraphrases !== 8 || check.sentences !== 3 || check.expressions !== 5 || !check.writingPairs || !check.speakingPairs || !check.readingPairs || check.duplicateWhole || check.readingQuestionChinese || check.invalid || check.controls < 8 || check.listen !== 2) {
      throw new Error(`${label}: ${JSON.stringify(check)}`);
    }
    results.push(`${label} — PASS`);
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log(results.join('\n'));
  console.log(`Translation page QA: ${results.length}/${lastDay - firstDay + 1} PASS`);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
