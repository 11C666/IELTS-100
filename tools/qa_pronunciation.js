const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'pronunciation.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
const calls = { cancel: 0, speak: [], listeners: {} };
let voices = [
  { name: 'Default Chinese', lang: 'zh-CN', default: true, localService: true },
  { name: 'Local English', lang: 'en-US', default: false, localService: true },
  { name: 'Default English', lang: 'en-GB', default: true, localService: true }
];

function Utterance(text) { this.text = text; }
const synthesis = {
  getVoices: () => voices,
  cancel: () => { calls.cancel++; },
  speak: utterance => calls.speak.push(utterance),
  addEventListener: (type, handler) => { calls.listeners[type] = handler; }
};
const document = {
  listeners: {},
  addEventListener(type, handler) { this.listeners[type] = handler; },
  getElementById() { return {}; },
  querySelectorAll() { return []; },
  createElement() { return {}; }
};
function MutationObserver(callback) { this.observe = () => callback(); }
const window = { speechSynthesis: synthesis, SpeechSynthesisUtterance: Utterance };

vm.runInNewContext(source, { window, document, MutationObserver, SpeechSynthesisUtterance: Utterance, Node: { TEXT_NODE: 3 } });

const buttonA = { classList: { add() {}, remove() {} } };
const buttonB = { classList: { add() {}, remove() {} } };
if (!window.speakEnglish('curriculum', 0.9, buttonA)) throw new Error('Word playback failed');
if (!window.speakEnglish('revise the curriculum', 0.95, buttonB)) throw new Error('Collocation playback failed');
if (calls.cancel !== 2) throw new Error('Every playback must cancel the previous utterance');
if (calls.speak.length !== 2) throw new Error('Unexpected utterance count');
if (calls.speak[0].text !== 'curriculum' || calls.speak[0].rate !== 0.9) throw new Error('Word utterance is incorrect');
if (calls.speak[1].text !== 'revise the curriculum' || calls.speak[1].rate !== 0.95) throw new Error('Collocation utterance is incorrect');
if (calls.speak[1].voice.lang !== 'en-GB') throw new Error('Default English voice was not preferred');
if (!calls.listeners.voiceschanged) throw new Error('Asynchronous voice loading is not handled');
if (!html.includes('js/pronunciation.js')) throw new Error('Pronunciation script is not loaded');
if (!css.includes('.pronounce-btn')) throw new Error('Pronunciation button styles are missing');

function mockButton(text, rate, speaking = false) {
  const classes = new Set(speaking ? ['speaking-listen'] : []);
  const button = {
    dataset: {
      pronounce: text,
      rate: String(rate),
      idleLabel: speaking ? '🔊 Listen' : '',
      activeLabel: speaking ? '■ Stop' : '',
      idleAria: speaking ? 'Listen to sample answer' : '',
      activeAria: speaking ? 'Stop sample answer' : ''
    },
    disabled: false,
    textContent: speaking ? '🔊 Listen' : '🔊',
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); }
    },
    setAttribute(name, value) { if (name === 'aria-label') this.ariaLabel = value; }
  };
  button.closest = () => button;
  return button;
}

const speakingButton = mockButton('This is a complete sample answer.', 0.98, true);
document.listeners.click({ target: speakingButton });
if (calls.speak.at(-1).text !== 'This is a complete sample answer.' || calls.speak.at(-1).rate !== 0.98) throw new Error('Speaking answer playback is incorrect');
if (speakingButton.textContent !== '■ Stop' || speakingButton.ariaLabel !== 'Stop sample answer') throw new Error('Speaking play state is incorrect');
const countBeforeStop = calls.speak.length;
document.listeners.click({ target: speakingButton });
if (calls.speak.length !== countBeforeStop || speakingButton.textContent !== '🔊 Listen') throw new Error('Speaking stop toggle failed');

const vocabularyButton = mockButton('curriculum', 0.9);
document.listeners.click({ target: speakingButton });
document.listeners.click({ target: vocabularyButton });
if (calls.speak.at(-1).text !== 'curriculum' || speakingButton.textContent !== '🔊 Listen') throw new Error('Vocabulary and Speaking playback did not interrupt each other');

const expressionButton = mockButton("I've always been keen on subjects that involve problem-solving.", 0.92);
document.listeners.click({ target: expressionButton });
if (calls.speak.at(-1).text !== "I've always been keen on subjects that involve problem-solving." || calls.speak.at(-1).rate !== 0.92) throw new Error('Natural Expression example playback is incorrect');
if (calls.speak.at(-1).lang !== 'en-GB') throw new Error('Natural Expression did not use the preferred English locale');

for (const id of [1, 20, 50, 80, 100]) {
  const day = JSON.parse(fs.readFileSync(path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`), 'utf8'));
  if (day.vocabulary.length !== 20) throw new Error(`Day ${id} does not have 20 vocabulary entries`);
  if (day.vocabulary.some(item => !item.word || !item.collocation)) throw new Error(`Day ${id} has an unplayable entry`);
  if (day.speaking.length !== 2 || day.speaking.some(item => !item.answer)) throw new Error(`Day ${id} has an unplayable Speaking answer`);
  if (day.expressions.length !== 5 || day.expressions.some(item => !item.example)) throw new Error(`Day ${id} has an unplayable Natural Expression example`);
}

console.log('Pronunciation QA: PASS');
console.log('Vocabulary, Speaking and Natural Expression playback, interruption, English voice selection, async voices, and Day 001/020/050/080/100 coverage verified.');
