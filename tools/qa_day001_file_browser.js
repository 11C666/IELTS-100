const { chromium } = require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
  });

  const fileUrl = `file:///${path.join(__dirname, '..', 'index.html').replace(/\\/g, '/')}#day-001`;
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('.part-translation').length >= 30);
  await page.locator('#writing details, #speaking details').evaluateAll(items => items.forEach(item => { item.open = true; }));
  await page.locator('#showAnswers').click();

  const result = await page.evaluate(() => {
    const ids = ['paraphrases', 'sentences', 'expressions', 'writing', 'speaking', 'reading'];
    const sections = Object.fromEntries(ids.map(id => {
      const nodes = [...document.querySelectorAll(`#${id} .part-translation`)];
      return [id, {
        count: nodes.length,
        visible: nodes.filter(node => {
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
        }).length
      }];
    }));
    return {
      sections,
      speakingQuestion: document.body.textContent.includes('你在学校最喜欢哪一门学科？'),
      speakingAnswer: document.body.textContent.includes('我最喜欢的可能是历史。'),
      staticDataMerged: Boolean(window.IELTS_DAYS?.[1]?.speaking?.[0]?.translation),
      pillTranslations: [...document.querySelectorAll('.pill-translation')].filter(node => getComputedStyle(node).display !== 'none').length,
      writingPairs: document.querySelectorAll('#writing .sentence-pair').length,
      speakingPairs: document.querySelectorAll('#speaking .sentence-pair').length,
      readingPairs: document.querySelectorAll('#reading .reading .sentence-pair').length,
      expectedWritingPairs: window.IELTS_DAYS[1].writingIdeas.reduce((sum, item) => sum + item.argumentSentences.length, 0),
      expectedSpeakingPairs: window.IELTS_DAYS[1].speaking.reduce((sum, item) => sum + item.answerSentences.length, 0),
      expectedReadingPairs: window.IELTS_DAYS[1].reading.paragraphSentencePairs.reduce((sum, paragraph) => sum + paragraph.length, 0),
      duplicateWholeTranslations: document.querySelectorAll(
        '#writing details > .part-translation[data-translation-key^="writing-argument-"], ' +
        '#speaking details > .part-translation[data-translation-key^="speaking-answer-"], ' +
        '#reading .reading > .part-translation[data-translation-key^="reading-paragraph-"]'
      ).length,
      englishUnchanged: [
        ...[...document.querySelectorAll('#writing details')].map((details, index) =>
          [...details.querySelectorAll(':scope > p:last-of-type .sentence-original')].map(node => node.textContent).join(' ') === window.IELTS_DAYS[1].writingIdeas[index].argument
        ),
        ...[...document.querySelectorAll('#speaking details')].map((details, index) =>
          [...details.querySelectorAll(':scope > p:last-of-type .sentence-original')].map(node => node.textContent).join(' ') === window.IELTS_DAYS[1].speaking[index].answer
        ),
        ...[...document.querySelectorAll('#reading .reading > p')].map((paragraph, index) =>
          [...paragraph.querySelectorAll('.sentence-original')].map(node => node.textContent).join(' ') === window.IELTS_DAYS[1].reading.paragraphs[index]
        )
      ].every(Boolean),
      readingQuestionChinese: [...document.querySelectorAll('#questions *')].some(node => /[\u3400-\u9fff]/.test(node.textContent)),
      keyPhrasesVisible: document.body.textContent.includes('发挥关键作用') && document.body.textContent.includes('打破贫困循环'),
      invalidText: /undefined|null|\[object Object\]/.test(document.body.textContent),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });

  for (const [id, values] of Object.entries(result.sections)) {
    if (!values.count || values.visible !== values.count) throw new Error(`${id} translations are missing or hidden`);
  }
  if (!result.speakingQuestion || !result.speakingAnswer || !result.staticDataMerged) throw new Error('Speaking translation is absent from the file:// page');
  if (result.pillTranslations !== 8 || !result.keyPhrasesVisible) throw new Error('Writing collocation-label translations are absent from the file:// page');
  if (result.writingPairs !== result.expectedWritingPairs || result.speakingPairs !== result.expectedSpeakingPairs || result.readingPairs !== result.expectedReadingPairs) throw new Error('Sentence-by-sentence rendering is incomplete');
  if (result.duplicateWholeTranslations !== 0) throw new Error('A legacy whole-paragraph translation is duplicated below sentence pairs');
  if (!result.englishUnchanged) throw new Error('Rendered English differs from the original Day 001 data');
  if (result.readingQuestionChinese) throw new Error('Reading questions contain Chinese text');
  if (result.invalidText) throw new Error('Invalid fallback text is visible');
  if (result.overflow) throw new Error('Desktop layout overflowed');
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error('Mobile layout overflowed');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);

  console.log('Day 001 file:// browser DOM QA: PASS');
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
