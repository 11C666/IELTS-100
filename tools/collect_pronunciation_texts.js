// Collects every sentence the pronunciation buttons can play, keyed by the same
// hash the page uses for clip file names. Output feeds tools/build_offline_audio.py.
//   node tools/collect_pronunciation_texts.js <output.json>
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = process.argv[2];
if (!output) throw new Error('Usage: node tools/collect_pronunciation_texts.js <output.json>');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

(async () => {
  const server = http.createServer((request, response) => {
    const file = path.join(root, decodeURIComponent(new URL(request.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  }).listen(0);
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage();
  const clips = {};
  await page.goto(base);
  for (let day = 1; day <= 100; day++) {
    await page.evaluate(n => { location.hash = `#day-${String(n).padStart(3, '0')}`; }, day);
    await page.waitForSelector('#vocabulary .pronounce-btn');
    const found = await page.evaluate(() => {
      const { splitSpeech, audioKey } = window.IELTS_PRONUNCIATION;
      const result = {};
      document.querySelectorAll('[data-pronounce]').forEach(button => {
        splitSpeech(button.dataset.pronounce).forEach(chunk => { result[audioKey(chunk)] = chunk; });
      });
      return result;
    });
    for (const [key, text] of Object.entries(found)) {
      if (clips[key] && clips[key] !== text) throw new Error(`Hash collision: ${key}`);
      clips[key] = text;
    }
  }
  await browser.close();
  server.close();
  fs.writeFileSync(output, JSON.stringify(clips, null, 0));
  console.log(`${Object.keys(clips).length} clips, ${Object.values(clips).join('').length} characters`);
})();
