const { chromium } = require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const calls = { cancel: 0, spoken: [] };
    class MockUtterance { constructor(text) { this.text = text; } }
    const mock = {
      getVoices: () => [{ name: 'British English', lang: 'en-GB', default: true, localService: true }],
      cancel: () => { calls.cancel++; },
      speak: utterance => { calls.spoken.push({ text: utterance.text, lang: utterance.lang, rate: utterance.rate }); },
      addEventListener: () => {}
    };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', { value: mock, configurable: true });
    window.__expressionSpeechCalls = calls;
  });

  const base = `file:///${path.join(__dirname, '..', 'index.html').replace(/\\/g, '/')}`;
  for (const dayId of [1, 20, 50, 80, 100]) {
    const day = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', `day-${String(dayId).padStart(3, '0')}.json`), 'utf8'));
    await page.goto(`${base}#day-${String(dayId).padStart(3, '0')}`, { waitUntil: 'load' });
    const buttons = page.locator('#expressions .expression-listen');
    if (await buttons.count() !== day.expressions.length) throw new Error(`Day ${dayId}: expected ${day.expressions.length} example buttons`);

    for (let index = 0; index < day.expressions.length; index++) {
      const state = await buttons.nth(index).evaluate(element => ({
        parent: element.parentElement?.classList.contains('example'),
        display: getComputedStyle(element).display,
        text: element.dataset.pronounce,
        hidden: getComputedStyle(element).display === 'none'
      }));
      if (!state.parent || state.display !== 'inline-grid' || state.hidden || state.text !== day.expressions[index].example) {
        throw new Error(`Day ${dayId} expression ${index + 1}: button placement or text binding failed`);
      }
    }

    await buttons.nth(0).click();
    await buttons.nth(1).click();
    const calls = await page.evaluate(() => window.__expressionSpeechCalls);
    if (calls.spoken.at(-2)?.text !== day.expressions[0].example || calls.spoken.at(-1)?.text !== day.expressions[1].example) throw new Error(`Day ${dayId}: wrong example was spoken`);
    if (calls.spoken.at(-1)?.lang !== 'en-GB' || calls.spoken.at(-1)?.rate !== 0.92) throw new Error(`Day ${dayId}: voice locale or rate is incorrect`);
    if (calls.cancel < 2) throw new Error(`Day ${dayId}: consecutive playback was not cancelled`);

    await page.locator('#expressions').evaluate(section => section.classList.add('chinese-hidden'));
    if (!await buttons.nth(0).isVisible()) throw new Error(`Day ${dayId}: Chinese hiding removed the audio button`);
    await buttons.nth(0).click();
    if ((await page.evaluate(() => window.__expressionSpeechCalls.spoken.at(-1)?.text)) !== day.expressions[0].example) throw new Error(`Day ${dayId}: playback failed while Chinese was hidden`);
  }

  for (const width of [390, 820]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1180 });
    await page.goto(`${base}#day-100`, { waitUntil: 'load' });
    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error(`${width}px layout overflowed`);
    const layout = await page.locator('#expressions .expression-listen').first().evaluate(button => ({
      parent: button.parentElement?.tagName,
      visible: getComputedStyle(button).display !== 'none',
      width: button.getBoundingClientRect().width
    }));
    if (layout.parent !== 'P' || !layout.visible || layout.width < 25) throw new Error(`${width}px expression button layout failed`);
  }

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('Natural Expression pronunciation browser QA: PASS');
  console.log('Day 001/020/050/080/100 playback binding, interruption, Chinese-hide survival, desktop/mobile/iPad layout verified.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
