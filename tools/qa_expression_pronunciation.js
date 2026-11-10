const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.join(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function mockSpeech() {
  const voices = [
    { name: 'Chinese', voiceURI: 'chinese', lang: 'zh-CN', default: true, localService: true },
    { name: 'Legacy English', voiceURI: 'legacy', lang: 'en-GB', localService: true },
    { name: 'Microsoft Aria Online (Natural)', voiceURI: 'natural-us', lang: 'en-US', localService: false },
    { name: 'British Enhanced', voiceURI: 'enhanced-gb', lang: 'en-GB', localService: true }
  ];
  const calls = { spoken: [], current: null, cancel: 0 };
  const speech = {
    speaking: false, pending: false, paused: false,
    getVoices: () => voices,
    cancel() {
      calls.cancel++;
      const old = calls.current;
      calls.current = null;
      this.speaking = this.pending = false;
      // Reproduce delayed cancellation events from browser/OS speech engines.
      if (old) setTimeout(() => old.onerror({ error: 'interrupted' }), 20);
    },
    speak(utterance) {
      calls.current = utterance;
      calls.spoken.push({ text: utterance.text, rate: utterance.rate, lang: utterance.lang, voiceURI: utterance.voice?.voiceURI });
      if (!utterance.voice?.localService && calls.onlineFailure) {
        this.pending = true;
        if (calls.onlineFailure === 'network') setTimeout(() => utterance.onerror({ error: 'network' }), 0);
        return;
      }
      this.speaking = true;
      utterance.onstart();
    },
    resume() { this.paused = false; },
    addEventListener() {}
  };
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text; } }, configurable: true });
  Object.defineProperty(window, 'speechSynthesis', { value: speech, configurable: true });
  window.__speech = calls;
  calls.end = () => {
    const current = calls.current;
    calls.current = null;
    speech.speaking = false;
    current.onend();
  };
}

(async () => {
  let serveLegacyWorker = false;
  const legacyPronunciation = 'window.__legacyPronunciation = true;';
  const legacyWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8').replace('ielts-mastery-v4', 'ielts-mastery-v3');
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    if (serveLegacyWorker && file === path.join(root, 'js', 'pronunciation.js')) { res.end(legacyPronunciation); return; }
    if (serveLegacyWorker && file === path.join(root, 'service-worker.js')) { res.end(legacyWorker); return; }
    fs.readFile(file, (error, content) => {
      if (error) res.writeHead(404).end(); else res.end(content);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : fs.existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}) });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.addInitScript(mockSpeech);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/#day-001`);
    await page.locator('#pronunciation-settings').waitFor();
    await page.locator('#pronunciation-settings > summary').click();
    const voiceOptions = await page.locator('#pronunciation-voice option').allTextContents();
    assert.equal(voiceOptions.length, 4, 'Only English voices plus automatic mode');
    await page.locator('.audio-preview').click();
    assert.equal(await page.evaluate(() => window.__speech.spoken.at(-1).voiceURI), 'enhanced-gb');
    await page.locator('.audio-preview').click();
    await page.locator('#pronunciation-voice').selectOption('legacy');
    await page.locator('#pronunciation-rate').selectOption('0.8');
    await page.locator('#vocabulary [data-pronounce]').first().click();
    assert.equal(await page.evaluate(() => window.__speech.spoken.at(-1).voiceURI), 'legacy');
    assert.equal(await page.evaluate(() => window.__speech.spoken.at(-1).rate), 0.8);
    await page.reload();
    await page.locator('#pronunciation-settings').waitFor();
    assert.equal(await page.locator('#pronunciation-rate').inputValue(), '0.8');
    assert.equal(await page.locator('#pronunciation-voice').inputValue(), 'legacy');
    await page.locator('#pronunciation-settings > summary').click();
    await page.locator('#pronunciation-voice').selectOption('');
    await page.locator('#pronunciation-rate').selectOption('0.9');

    // Reproduce the reported Edge Aria Online timeout and verify one complete local replay.
    await page.evaluate(() => { window.__speech.onlineFailure = 'stall'; });
    await page.locator('#pronunciation-voice').selectOption('natural-us');
    await page.locator('.audio-preview').click();
    assert.equal(await page.evaluate(() => window.__speech.current.voice.voiceURI), 'natural-us');
    await page.waitForFunction(() => window.__speech.current?.voice.voiceURI === 'enhanced-gb', { timeout: 15000 });
    assert.match(await page.locator('#pronunciation-status').textContent(), /在线音色无法播放.*本地/);
    assert.equal(await page.locator('#pronunciation-voice').inputValue(), 'enhanced-gb');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ieltsPronunciationV1')).voiceURI), 'enhanced-gb');
    assert.equal(await page.evaluate(() => window.__speech.current.text), 'Hello!');
    await page.locator('.audio-preview').click();
    // Manual re-selection can retry the online voice, but a network error also falls back.
    await page.evaluate(() => { window.__speech.onlineFailure = 'network'; });
    await page.locator('#pronunciation-voice').selectOption('natural-us');
    await page.locator('.audio-preview').click();
    await page.waitForFunction(() => window.__speech.current?.voice.voiceURI === 'enhanced-gb');
    await page.locator('.audio-preview').click();
    await page.locator('#pronunciation-voice').selectOption('');

    // Every existing audio button must bind only the full English source, including translated lessons.
    for (let id = 1; id <= 100; id++) {
      await page.evaluate(id => { location.hash = `day-${String(id).padStart(3, '0')}`; }, id);
      await page.waitForFunction(id => document.querySelector('.day-header .eyebrow')?.textContent.startsWith(`DAY ${String(id).padStart(3, '0')}`) && document.querySelectorAll('#speaking .speaking-listen').length === 2, id);
      const bindingErrors = await page.evaluate(id => {
        const d = window.IELTS_DAYS[id];
        const actual = selector => [...document.querySelectorAll(selector)].map(b => b.dataset.pronounce);
        const pairs = [
          [actual('#vocabulary [data-pronounce]'), d.vocabulary.flatMap(v => [v.word, v.collocation])],
          [actual('#expressions [data-pronounce]'), d.expressions.map(e => e.example)],
          [actual('#speaking [data-pronounce]'), d.speaking.map(s => s.answer)]
        ];
        return pairs.filter(([a, b]) => JSON.stringify(a) !== JSON.stringify(b)).length;
      }, id);
      assert.equal(bindingErrors, 0, `Day ${id}: full English audio bindings`);
      if (![1, 20, 50, 80, 100].includes(id)) continue;
      const buttons = page.locator('#expressions .expression-listen');
      await buttons.nth(0).click();
      await buttons.nth(1).click();
      await page.waitForFunction(() => window.__speech.spoken.at(-1).text === window.IELTS_DAYS[Number(location.hash.slice(-3))].expressions[1].example);
      assert.equal(await buttons.nth(0).getAttribute('aria-pressed'), 'false');
      assert.equal(await buttons.nth(1).getAttribute('aria-pressed'), 'true');
      await buttons.nth(1).click();
      await page.locator('#expressions').evaluate(s => s.classList.add('chinese-hidden'));
      assert.equal(await buttons.nth(0).isVisible(), true);
    }

    await page.locator('#speaking details').first().evaluate(d => { d.open = true; });
    const answer = page.locator('#speaking .speaking-listen').first();
    await answer.click();
    const spokenAnswer = await page.evaluate(() => {
      const pieces = [];
      while (window.__speech.current) {
        pieces.push(window.__speech.current.text);
        window.__speech.end();
      }
      return pieces.join(' ');
    });
    const expected = await answer.getAttribute('data-pronounce');
    assert.equal(spokenAnswer, expected.replace(/\s+/g, ' '));
    assert.equal(await answer.getAttribute('aria-pressed'), 'false');
    await answer.click();
    await page.locator('#speaking .part-toggle').click();
    assert.equal(await answer.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => window.__speech.current), null);

    const firstWord = page.locator('#vocabulary [data-pronounce]').first();
    await firstWord.click();
    await page.evaluate(() => { window.__speech.current.onerror({ error: 'not-allowed' }); });
    assert.equal(await page.locator('#pronunciation-settings').getAttribute('open'), '');
    assert.match(await page.locator('#pronunciation-status').textContent(), /浏览器未允许播放/);
    await firstWord.click();
    await page.evaluate(() => { location.hash = 'home'; });
    await page.locator('.hero').waitFor();
    assert.equal(await page.evaluate(() => window.__speech.current), null);

    for (const width of [390, 820, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/#day-001`);
      if (await page.locator('#pronunciation-settings').getAttribute('open') === null) {
        await page.locator('#pronunciation-settings > summary').click();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `${width}px horizontal overflow`);
      assert.equal(await page.locator('.audio-preview').isVisible(), true);
      const b = page.locator('#expressions .expression-listen').first();
      assert.equal(await b.isVisible(), true);
      if (width === 390) {
        assert.ok((await b.boundingBox()).width >= 44);
        await page.screenshot({ path: '/tmp/ielts-pronunciation-mobile.png', fullPage: false });
      }
    }
    assert.deepEqual(errors, []);
    await context.close();

    // Real service-worker lifecycle: an existing v3 installation must receive the v4 app cache.
    serveLegacyWorker = true;
    const pwaContext = await browser.newContext();
    await pwaContext.addInitScript(() => {
      sessionStorage.setItem('qaPwaLoads', String(Number(sessionStorage.getItem('qaPwaLoads') || 0) + 1));
    });
    const pwa = await pwaContext.newPage();
    await pwa.goto(`${base}/#day-001`);
    await pwa.waitForFunction(async () => navigator.serviceWorker.controller && (await caches.keys()).includes('ielts-mastery-v3'));
    await pwa.waitForFunction(() => Number(sessionStorage.getItem('qaPwaLoads')) >= 2 && document.readyState === 'complete');
    assert.equal(await pwa.locator('#pronunciation-settings').count(), 0, 'Existing installation should start with old speech code');
    serveLegacyWorker = false;
    await pwa.evaluate(() => { navigator.serviceWorker.ready.then(registration => registration.update()); });
    await pwa.waitForFunction(async () => {
      const keys = await caches.keys();
      return keys.includes('ielts-mastery-v4') && !keys.includes('ielts-mastery-v3');
    });
    await pwa.waitForFunction(async () => {
      const response = await caches.match('./js/pronunciation.js');
      return response && (await response.text()).includes('function splitSpeech');
    });
    await pwaContext.setOffline(true);
    await pwa.reload();
    await pwa.locator('#pronunciation-settings').waitFor();
    await pwaContext.close();
    console.log('Pronunciation browser QA: PASS (4,700 full English bindings, natural voice ranking, settings persistence, Edge Aria timeout/network failure and local fallback, rapid switching, complete answer playback, stop/collapse/navigation, errors, mobile/tablet/desktop and v3→v4 offline cache upgrade)');

    // Probe the real browser engine separately; mocks cannot verify audio quality or audibility.
    const native = await browser.newPage();
    await native.goto(`${base}/#day-001`);
    await native.waitForTimeout(500);
    console.log('Native browser English voices:', await native.evaluate(() => speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang)).map(v => ({ name: v.name, lang: v.lang }))));
    await native.locator('#vocabulary [data-pronounce]').first().click();
    await native.waitForFunction(() => !document.querySelector('#vocabulary .is-speaking'));
    console.log('Native browser playback result:', await native.locator('#pronunciation-status').textContent() || 'completed');
    await native.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
