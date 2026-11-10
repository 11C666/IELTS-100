const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'pronunciation.js'), 'utf8');
const legacy = { name: 'Legacy British', voiceURI: 'legacy', lang: 'en-GB', localService: true };
const natural = { name: 'English Natural', voiceURI: 'natural', lang: 'en-US', localService: true };
const remote = { name: 'Microsoft Aria Online (Natural)', voiceURI: 'aria-online', lang: 'en-US', localService: false };

function harness({ voices = [legacy, natural], saved = {}, storageBlocked = false, unsupported = false, online = true } = {}) {
  let clock = 0, timerId = 0, observer;
  const timers = new Map();
  const calls = { cancel: 0, spoken: [], resumes: 0 };
  const events = {}, windowEvents = {}, voiceEvents = {}, writes = [];
  const status = { textContent: '' }, panel = { open: false };
  const synthesis = {
    speaking: false, pending: false, paused: false,
    getVoices: () => voices,
    cancel() {
      calls.cancel++;
      this.speaking = this.pending = false;
      if (this.cancelCallback) this.cancelCallback();
    },
    resume() { calls.resumes++; this.paused = false; },
    speak(utterance) { calls.spoken.push(utterance); this.pending = true; },
    addEventListener(type, handler) { voiceEvents[type] = handler; }
  };
  const document = {
    hidden: false,
    contains(button) { return !button.removed; },
    addEventListener(type, handler) { events[type] = handler; },
    getElementById(id) { return id === 'pronunciation-status' ? status : id === 'pronunciation-settings' ? panel : null; },
    querySelector() { return null; }, querySelectorAll() { return []; }
  };
  const window = {
    navigator: { onLine: online },
    speechSynthesis: unsupported ? null : synthesis,
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    addEventListener(type, handler) { windowEvents[type] = handler; }
  };
  const localStorage = {
    getItem() { if (storageBlocked) throw Error('blocked'); return JSON.stringify(saved); },
    setItem(key, value) { if (storageBlocked) throw Error('blocked'); writes.push({key, value: JSON.parse(value)}); }
  };
  vm.runInNewContext(source, {
    window, document, localStorage,
    MutationObserver: class { constructor(callback) { observer = callback; } observe() {} },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { at: clock + delay, fn }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  return {
    window, document, synthesis, events, windowEvents, calls, status, panel, timers, writes,
    mutate: () => observer(),
    voices(value) { voices = value; voiceEvents.voiceschanged(); },
    tick(ms) {
      const target = clock + ms;
      while (true) {
        const next = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        clock = next[1].at; timers.delete(next[0]); next[1].fn();
      }
      clock = target;
    },
    start(utterance = calls.spoken.at(-1)) {
      synthesis.pending = false; synthesis.speaking = true; utterance.onstart();
    },
    end(utterance = calls.spoken.at(-1)) {
      synthesis.pending = synthesis.speaking = false; utterance.onend();
    },
    click(button) { events.click({ target: { closest: () => button } }); }
  };
}
function button(text = 'curriculum', rate = 0.9) {
  const classes = new Set();
  return {
    dataset: { pronounce: text, rate: String(rate), idleLabel: 'Listen', activeLabel: 'Stop', idleAria: 'Listen', activeAria: 'Stop' },
    classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }, contains: name => classes.has(name) },
    setAttribute(name, value) { this[name] = value; },
    disabled: false
  };
}

// First click must speak synchronously (mobile user activation), without canceling an idle engine.
{
  const h = harness(), b = button();
  h.click(b);
  assert.equal(h.calls.cancel, 0);
  assert.equal(h.calls.spoken.length, 1);
  assert.equal(h.calls.spoken[0].voice.voiceURI, 'natural');
  assert.equal(h.calls.spoken[0].rate, 0.9);
  assert.equal(h.calls.spoken[0].pitch, 1);
  assert.equal(b['aria-pressed'], 'true');
  h.start(); h.end();
  assert.equal(b.textContent, 'Listen');
  assert.equal(h.timers.size, 0);
}
// User choice beats automatic ranking; delayed voice lists are refreshed without restarting speech.
{
  const h = harness({ saved: { voiceURI: 'legacy', rate: 0.8 } });
  h.window.speakEnglish('Hello.');
  assert.equal(h.calls.spoken[0].voice.voiceURI, 'legacy');
  assert.equal(h.calls.spoken[0].rate, 0.8);
  h.window.stopEnglish();
  const empty = harness({ voices: [] });
  empty.window.speakEnglish('Hello.');
  assert.equal(empty.calls.spoken[0].lang, 'en-GB');
  empty.voices([natural]);
  assert.equal(empty.calls.spoken.length, 1);
  empty.end(); empty.window.speakEnglish('Hello again.');
  assert.equal(empty.calls.spoken[1].voice.voiceURI, 'natural');
}
{
  const h = harness({ online: false, voices: [legacy, remote] });
  h.window.speakEnglish('Hello.');
  assert.equal(h.calls.spoken[0].voice.voiceURI, 'legacy', 'Offline mode must use an installed local voice');
}
// A canceled utterance's asynchronous callbacks must not clear or advance the new playback.
{
  const h = harness(), a = button('First answer.'), b = button('Second answer.');
  h.click(a); const old = h.calls.spoken[0];
  h.synthesis.cancelCallback = () => old.onerror({ error: 'interrupted' });
  h.click(b);
  assert.equal(h.calls.spoken.length, 1, 'Wait for cancel to settle');
  assert.equal(a.textContent, 'Listen');
  assert.equal(b.textContent, 'Stop');
  old.onend(); old.onerror({ error: 'canceled' });
  h.tick(120);
  assert.equal(h.calls.spoken[1].text, 'Second answer.');
  assert.equal(b.textContent, 'Stop');
  h.start(); h.end();
  h.click(a); h.tick(120);
  assert.equal(h.calls.spoken.at(-1).text, 'First answer.');
  old.onend();
  assert.equal(a.textContent, 'Stop', 'Old callback must not clear a replay of the same button');
  h.window.stopEnglish();
}
// Rapid switching and stop during the cancellation delay cannot resurrect queued playback.
{
  const h = harness(), a = button('First.'), b = button('Second.'), c = button('Third.');
  h.click(a); h.click(b); h.click(c); h.tick(120);
  assert.deepEqual(h.calls.spoken.map(x => x.text), ['First.', 'Third.']);
  h.click(b); h.click(b); h.tick(1000);
  assert.equal(h.calls.spoken.length, 2);
  assert.equal(b['aria-pressed'], 'false');
  assert.equal(h.timers.size, 0);
}
// Automatic mode prioritizes a working local voice over an unverified online listing.
{
  const h = harness({ voices: [remote, legacy] });
  h.window.speakEnglish('Hello.');
  assert.equal(h.calls.spoken[0].voice.voiceURI, 'legacy');
  const mislabeled = harness({ voices: [{ ...remote, localService: true }, legacy] });
  mislabeled.window.speakEnglish('Hello.');
  assert.equal(mislabeled.calls.spoken[0].voice.voiceURI, 'legacy', 'Online names must not be treated as installed local voices');
  const enhanced = { ...legacy, name: 'Daniel', voiceURI: 'com.apple.voice.enhanced.en-GB.Daniel' };
  const apple = harness({ voices: [legacy, enhanced] });
  apple.window.speakEnglish('Hello.');
  assert.equal(apple.calls.spoken[0].voice.voiceURI, enhanced.voiceURI);
}
// Reproduce Edge's listed Aria Online voice never starting, then fall back from the beginning.
{
  const h = harness({ voices: [remote, legacy], saved: { voiceURI: remote.voiceURI, rate: 0.8 } });
  const b = button('First sentence. Second sentence.', 0.8);
  h.click(b);
  const old = h.calls.spoken[0];
  assert.equal(old.voice.voiceURI, remote.voiceURI);
  h.tick(9999);
  assert.equal(h.calls.spoken.length, 1, 'Allow slow online voice startup');
  h.tick(1);
  assert.match(h.status.textContent, /在线音色无法播放.*本地/);
  assert.equal(h.panel.open, true);
  h.tick(120);
  assert.equal(h.calls.spoken[1].voice.voiceURI, legacy.voiceURI);
  assert.equal(h.calls.spoken[1].text, 'First sentence.');
  assert.equal(h.calls.spoken[1].rate, 0.8);
  assert.equal(h.writes.at(-1).value.voiceURI, legacy.voiceURI);
  old.onend(); old.onerror({ error: 'network' });
  assert.equal(b.textContent, 'Stop', 'Late failed-voice events must not clear fallback');
  h.start(); h.end();
  assert.equal(h.calls.spoken.at(-1).text, 'Second sentence.');
  h.start(); h.end();
  assert.equal(b.textContent, 'Listen');
  assert.match(h.status.textContent, /已切换为本地/);
  h.click(b);
  assert.equal(h.calls.spoken.at(-1).voice.voiceURI, legacy.voiceURI, 'Next click must retain local fallback');
  h.window.stopEnglish();
}
// A network error after part of an answer must replay the entire answer, never only the last half.
{
  const h = harness({ voices: [remote, legacy], saved: { voiceURI: remote.voiceURI } });
  const b = button('First sentence. Second sentence.');
  h.click(b); h.start(); h.end(); h.start();
  h.calls.spoken.at(-1).onerror({ error: 'network' });
  h.tick(120);
  assert.equal(h.calls.spoken.at(-1).text, 'First sentence.');
  assert.equal(h.calls.spoken.at(-1).voice.voiceURI, legacy.voiceURI);
  h.start(); h.end(); h.start(); h.end();
  assert.deepEqual(h.calls.spoken.slice(-2).map(x => x.text), ['First sentence.', 'Second sentence.']);
  assert.equal(h.timers.size, 0);
}
// Stop during a fallback delay cannot resurrect playback; each request retries at most once.
{
  const h = harness({ voices: [remote, legacy, natural], saved: { voiceURI: remote.voiceURI } });
  const b = button();
  h.click(b); h.calls.spoken.at(-1).onerror({ error: 'network' });
  h.click(b); h.tick(120);
  assert.equal(h.calls.spoken.length, 1);
  h.click(b); h.calls.spoken.at(-1).onerror({ error: 'synthesis-failed' });
  h.tick(120);
  const count = h.calls.spoken.length;
  h.calls.spoken.at(-1).onerror({ error: 'synthesis-failed' });
  h.tick(10000);
  assert.equal(h.calls.spoken.length, count, 'Never retry indefinitely');
  assert.equal(b.textContent, 'Listen');
  assert.equal(h.timers.size, 0);
}
// Missing local voices and blocked permissions produce actionable errors, not futile retries.
{
  const h = harness({ voices: [remote], saved: { voiceURI: remote.voiceURI } }), b = button();
  h.click(b); h.tick(10000);
  assert.equal(h.calls.spoken.length, 1);
  assert.match(h.status.textContent, /安装英语语音/);
  assert.equal(b.textContent, 'Listen');
  const blocked = harness({ voices: [remote, legacy], saved: { voiceURI: remote.voiceURI } });
  blocked.click(b); blocked.calls.spoken[0].onerror({ error: 'not-allowed' }); blocked.tick(10000);
  assert.equal(blocked.calls.spoken.length, 1);
  assert.match(blocked.status.textContent, /声音权限/);
}
// Slow but successful online startup must not be canceled by the watchdog.
{
  const h = harness({ voices: [remote, legacy], saved: { voiceURI: remote.voiceURI } });
  h.window.speakEnglish('Hello.'); h.tick(8000); h.start(); h.tick(3000);
  assert.equal(h.calls.spoken.length, 1);
  h.end();
  assert.equal(h.timers.size, 0);
}
// Local failures, missing starts and lost end events still terminate with a useful message.
{
  const h = harness({ voices: [legacy] }), b = button();
  h.click(b); h.tick(5000);
  assert.equal(b.textContent, 'Listen');
  assert.match(h.status.textContent, /未能启动/);
  assert.equal(h.panel.open, true);
  h.click(b); h.start(); h.tick(25000);
  assert.match(h.status.textContent, /播放中断/);
  assert.equal(h.timers.size, 0);
  h.synthesis.speak = () => { throw Error('engine failure'); };
  h.click(b);
  assert.equal(b.textContent, 'Listen');
  assert.match(h.status.textContent, /语音/);
}
// Navigation, backgrounding and explicit stop cancel the entire answer, not just its current sentence.
for (const action of ['removed', 'hidden', 'pagehide', 'stop']) {
  const h = harness(), b = button('First sentence. Second sentence.');
  h.click(b); const old = h.calls.spoken[0];
  if (action === 'removed') { b.removed = true; h.mutate(); }
  if (action === 'hidden') { h.document.hidden = true; h.events.visibilitychange(); }
  if (action === 'pagehide') h.windowEvents.pagehide();
  if (action === 'stop') h.window.stopEnglish();
  old.onend(); h.tick(1000);
  assert.equal(h.calls.spoken.length, 1);
  assert.equal(b.textContent, 'Listen');
  assert.equal(h.timers.size, 0);
}
{
  const h = harness({ storageBlocked: true });
  h.synthesis.paused = true;
  h.window.speakEnglish('Hello.'); h.tick(120);
  assert.equal(h.calls.resumes, 1);
  assert.equal(h.calls.spoken[0].rate, 0.9);
  assert.equal(harness({ unsupported: true }).window.speakEnglish('Hello.'), false);
}
// All 4,700 existing lesson clips preserve every word, in order, through all chunk boundaries.
let clips = 0;
for (let id = 1; id <= 100; id++) {
  const day = JSON.parse(fs.readFileSync(path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`), 'utf8'));
  const texts = [...day.vocabulary.flatMap(x => [x.word, x.collocation]), ...day.expressions.map(x => x.example), ...day.speaking.map(x => x.answer)];
  for (const text of texts) {
    const h = harness();
    assert.equal(h.window.speakEnglish(text), true);
    let position = 0;
    while (position < h.calls.spoken.length) {
      const utterance = h.calls.spoken[position++];
      assert.ok(utterance.text.length <= 180, `Day ${id}: chunk too long`);
      h.start(utterance); h.end(utterance);
    }
    assert.equal(h.calls.spoken.map(x => x.text).join(' '), text.trim().replace(/\s+/g, ' '), `Day ${id}: speech omitted or repeated words`);
    assert.equal(h.timers.size, 0);
    clips++;
  }
}
console.log(`Pronunciation QA: PASS (${clips} clips across 100 days; natural voice preference, mobile first click, Edge online voice failure, bounded local fallback, cancellation races, replay, timeouts, complete long answers and lifecycle cleanup)`);
