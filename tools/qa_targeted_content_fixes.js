const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const fixes = require(path.join(root, 'content', 'targeted-content-fixes.js'));
const read = id => JSON.parse(fs.readFileSync(path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`), 'utf8'));
const getAt = (target, parts) => parts.reduce((node, part) => node?.[part], target);

for (const fix of fixes) {
  const actual = getAt(read(fix.id), fix.path);
  if (actual !== fix.value) throw new Error(`Day ${fix.id} mismatch at ${fix.path.join('.')}`);
}

const forbidden = [
  '指导复习', '首选帐户无法容纳', '公共职位在技术上', '通过疲劳而不是真正的同意',
  '位置对于映射运行', '公共专业档案', '私人账户应保留在招聘流程之外', '位置数据的来世',
  '医疗访问和宗教出席', '门口的存在是通过它的能力', '行人的暴露情况', '扩大队伍比长期维持'
];
const checkedDays = [...new Set(fixes.map(fix => fix.id))];
const corpus = checkedDays.map(id => fs.readFileSync(path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`), 'utf8')).join('\n');
for (const phrase of forbidden) if (corpus.includes(phrase)) throw new Error(`Known error remains: ${phrase}`);

const generatedContext = { window: { IELTS_DAYS: {} } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js', 'generated-content.js'), 'utf8'), generatedContext);
for (const fix of fixes.filter(fix => fix.id >= 4)) {
  if (getAt(generatedContext.window.IELTS_DAYS[fix.id], fix.path) !== fix.value) throw new Error(`Offline bundle mismatch: Day ${fix.id} ${fix.path.join('.')}`);
}
const contentContext = { window: { IELTS_DAYS: {} } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js', 'content.js'), 'utf8'), contentContext);
for (const fix of fixes.filter(fix => fix.id <= 3)) {
  if (getAt(contentContext.window.IELTS_DAYS[fix.id], fix.path) !== fix.value) throw new Error(`content.js mismatch: Day ${fix.id} ${fix.path.join('.')}`);
}

for (const id of checkedDays) {
  const day = read(id);
  for (const idea of day.writingIdeas || []) {
    if (idea.argumentSentences?.map(x => x.text).join(' ') !== idea.argument) throw new Error(`Day ${id}: Writing sentence alignment failed`);
  }
  for (const answer of day.speaking || []) {
    if (answer.answerSentences?.map(x => x.text).join(' ') !== answer.answer) throw new Error(`Day ${id}: Speaking sentence alignment failed`);
  }
  for (let index = 0; index < (day.reading?.paragraphs || []).length; index++) {
    const joined = day.reading.paragraphSentencePairs?.[index]?.map(x => x.text).join(' ');
    if (joined !== day.reading.paragraphs[index]) throw new Error(`Day ${id}: Reading paragraph ${index + 1} alignment failed`);
  }
}

console.log(`Targeted content QA: PASS (${fixes.length} field updates; 36 approved checklist items).`);
console.log(`Checked authoritative source, ${checkedDays.length} Day JSON files, content.js, offline bundle, known-error removal and sentence alignment.`);
