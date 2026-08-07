const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const dataFile = id => path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`);
const read = id => JSON.parse(fs.readFileSync(dataFile(id), 'utf8'));
const stable = value => JSON.stringify(value, Object.keys(value || {}).sort());
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const norm = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const before = {};
for (let id = 1; id <= 100; id++) before[id] = read(id);

const vocab = Object.assign(
  {},
  require(path.join(root, 'content', 'vocab-revision-021-030.js')),
  require(path.join(root, 'content', 'vocab-revision-031-040.js')),
  require(path.join(root, 'content', 'vocab-revision-041-050.js')),
  require(path.join(root, 'content', 'vocab-revision-051-060.js'))
);
const facts = require(path.join(root, 'content', 'manual-days-081-100-fact-corrections.js'));

for (let id = 21; id <= 60; id++) {
  if (!Array.isArray(vocab[id]) || vocab[id].length !== 20) throw new Error(`Day ${id}: expected 20 vocabulary entries`);
  for (const [index, entry] of vocab[id].entries()) {
    for (const key of ['word', 'ipa', 'meaning', 'collocation', 'collocationCN']) {
      if (!entry[key] || typeof entry[key] !== 'string') throw new Error(`Day ${id} vocabulary ${index + 1}: missing ${key}`);
    }
  }
  if (new Set(vocab[id].map(x => norm(x.word))).size !== 20) throw new Error(`Day ${id}: duplicate headword within day`);
  if (new Set(vocab[id].map(x => norm(x.collocation))).size !== 20) throw new Error(`Day ${id}: duplicate collocation within day`);
}

const allowedQuestionChanges = new Set([
  '89:1:prompt', '89:1:explanation',
  '91:0:prompt', '91:0:explanation'
]);
for (let id = 81; id <= 100; id++) {
  const oldDay = before[id];
  const newDay = facts[id];
  if (!newDay) throw new Error(`Missing fact-reviewed Day ${id}`);
  const oldFrozen = JSON.parse(JSON.stringify(oldDay));
  const newFrozen = JSON.parse(JSON.stringify(newDay));
  delete oldFrozen.reading.paragraphs;
  delete newFrozen.reading.paragraphs;
  oldFrozen.reading.questions.forEach((q, qi) => {
    for (const key of ['prompt', 'explanation']) if (allowedQuestionChanges.has(`${id}:${qi}:${key}`)) delete q[key];
  });
  newFrozen.reading.questions.forEach((q, qi) => {
    for (const key of ['prompt', 'explanation']) if (allowedQuestionChanges.has(`${id}:${qi}:${key}`)) delete q[key];
  });
  if (hash(oldFrozen) !== hash(newFrozen)) throw new Error(`Day ${id}: change outside approved Reading scope`);
}

for (let id = 21; id <= 60; id++) {
  const day = before[id];
  day.vocabulary = vocab[id];
  fs.writeFileSync(dataFile(id), JSON.stringify(day, null, 2) + '\n');
}
for (let id = 81; id <= 100; id++) fs.writeFileSync(dataFile(id), JSON.stringify(facts[id], null, 2) + '\n');

const all = [];
for (let id = 4; id <= 100; id++) all.push(read(id));
fs.writeFileSync(
  path.join(root, 'js', 'generated-content.js'),
  '/* Static offline lesson data. Day 004–100 are hand-authored. */\n' +
    all.map(day => `window.IELTS_DAYS[${day.id}]=${JSON.stringify(day)};`).join('\n') + '\n'
);

const after = {};
for (let id = 1; id <= 100; id++) after[id] = read(id);
for (let id = 21; id <= 60; id++) {
  const a = JSON.parse(JSON.stringify(before[id]));
  const b = JSON.parse(JSON.stringify(after[id]));
  delete a.vocabulary;
  delete b.vocabulary;
  if (hash(a) !== hash(b)) throw new Error(`Day ${id}: frozen non-vocabulary content changed`);
}
for (let id = 1; id <= 20; id++) if (hash(before[id]) !== hash(after[id])) throw new Error(`Frozen Day ${id} changed`);
for (let id = 61; id <= 80; id++) if (hash(before[id]) !== hash(after[id])) throw new Error(`Frozen Day ${id} changed`);

const revised = [];
for (let id = 21; id <= 60; id++) revised.push(...after[id].vocabulary);
const uniqueWords = new Set(revised.map(x => norm(x.word))).size;
const uniqueCollocations = new Set(revised.map(x => norm(x.collocation))).size;
console.log(JSON.stringify({
  revisedDays: 40,
  entries: revised.length,
  uniqueWords,
  wordRepeatRate: +(100 * (1 - uniqueWords / revised.length)).toFixed(2),
  uniqueCollocations,
  collocationRepeatRate: +(100 * (1 - uniqueCollocations / revised.length)).toFixed(2)
}, null, 2));
