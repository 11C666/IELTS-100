const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fixes = require(path.join(root, 'content', 'targeted-content-fixes.js'));
const days = {};
const getDay = id => days[id] ||= JSON.parse(fs.readFileSync(path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`), 'utf8'));
const readStaticDay = id => JSON.parse(fs.readFileSync(path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`), 'utf8'));

function setAt(target, parts, value) {
  let node = target;
  for (const part of parts.slice(0, -1)) {
    if (node?.[part] === undefined) throw new Error(`Missing path ${parts.join('.')}`);
    node = node[part];
  }
  const key = parts.at(-1);
  if (node?.[key] === undefined) throw new Error(`Missing field ${parts.join('.')}`);
  node[key] = value;
}

for (const fix of fixes) setAt(getDay(fix.id), fix.path, fix.value);
for (const [id, day] of Object.entries(days)) {
  fs.writeFileSync(path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`), JSON.stringify(day, null, 2) + '\n');
}

// Day 001-003 are served by content.js. Rebuild the complete Day 002-003 tail;
// never search for a semicolon because lesson text may legitimately contain one.
const contentFile = path.join(root, 'js', 'content.js');
let content = fs.readFileSync(contentFile, 'utf8');
const staticStart = content.indexOf('window.IELTS_DAYS[2]=');
if (staticStart < 0) throw new Error('Missing static Day 002 marker in content.js');
const staticTail = [1, 2, 3].map(id => `window.IELTS_DAYS[${id}]=${JSON.stringify(readStaticDay(id))};`).join('\n');
content = content.slice(0, staticStart) + staticTail + '\n/* STATIC_TRANSLATED_DAYS_001_003_END */\n';
fs.writeFileSync(contentFile, content);

// Day 004-100 are served by the offline bundle; rebuild it from the corrected JSON files.
const all = [];
for (let id = 4; id <= 100; id++) all.push(JSON.parse(fs.readFileSync(path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`), 'utf8')));
fs.writeFileSync(path.join(root, 'js', 'generated-content.js'), '/* Static offline lesson data. Day 004-100 are hand-authored. */\n' + all.map(day => `window.IELTS_DAYS[${day.id}]=${JSON.stringify(day)};`).join('\n') + '\n');

console.log(`Published ${fixes.length} authoritative targeted field updates across ${Object.keys(days).length} Days.`);
