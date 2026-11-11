// Applies content/quality-fixes-001-010.js to data/day-XXX.json, makes paragraph
// references use letters (the page labels paragraphs A, B, C...), then rebuilds
// the offline bundles through the targeted-fixes publisher.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const file = id => path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`);
const fixes = require(path.join(root, 'content', 'quality-fixes-001-010.js'));
const days = {};
for (let id = 1; id <= 100; id++) days[id] = JSON.parse(fs.readFileSync(file(id), 'utf8'));

for (const fix of fixes) {
  let node = days[fix.id];
  for (const part of fix.path.slice(0, -1)) node = node[part];
  const key = fix.path.at(-1);
  if (node?.[key] === undefined) throw new Error(`Day ${fix.id}: missing ${fix.path.join('.')}`);
  node[key] = fix.value;
}

let renamed = 0;
const letter = text => text.replace(/\bParagraph ([1-5])\b/g, (_, n) => {
  renamed++;
  return `Paragraph ${'ABCDE'[n - 1]}`;
});
for (const day of Object.values(days)) {
  for (const question of day.reading.questions) {
    question.prompt = letter(question.prompt);
    question.explanation = letter(question.explanation);
  }
}

for (const [id, day] of Object.entries(days)) fs.writeFileSync(file(id), JSON.stringify(day, null, 2) + '\n');
console.log(`Applied ${fixes.length} fixes; relabelled ${renamed} paragraph references.`);
execFileSync(process.execPath, [path.join(__dirname, 'publish_targeted_content_fixes.js')], { stdio: 'inherit' });
