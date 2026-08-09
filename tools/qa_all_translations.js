const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const han = /[\u3400-\u9fff]/;
const results = [];
const firstDay = Number(process.argv[2] || 1);
const lastDay = Number(process.argv[3] || 100);

function completePairs(pairs) {
  return Array.isArray(pairs) && pairs.length > 0 && pairs.every(pair => pair && pair.text && pair.translation);
}

for (let id = firstDay; id <= lastDay; id += 1) {
  const label = `Day ${String(id).padStart(3, '0')}`;
  const file = path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`);
  if (!fs.existsSync(file)) throw new Error(`${label}: missing JSON file`);
  const day = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];
  if (!day.paraphrases?.every(item => item.translation)) errors.push('Paraphrases');
  if (!day.sentences?.every(item => item.exampleTranslation)) errors.push('High-score Sentences');
  if (!day.expressions?.every(item => item.exampleTranslation)) errors.push('Natural Expressions');
  if (!day.writingIdeas?.every(item => item.viewpointTranslation && item.topicSentenceTranslation && item.collocationTranslations?.length === item.collocations.length && completePairs(item.argumentSentences) && item.argumentSentences.map(pair => pair.text).join(' ') === item.argument)) errors.push('Writing');
  if (!day.speaking?.every(item => item.questionTranslation && completePairs(item.answerSentences) && item.answerSentences.map(pair => pair.text).join(' ') === item.answer)) errors.push('Speaking');
  if (!day.reading?.titleTranslation || day.reading.paragraphSentencePairs?.length !== day.reading.paragraphs.length || !day.reading.paragraphSentencePairs.every((pairs, index) => completePairs(pairs) && pairs.map(pair => pair.text).join(' ') === day.reading.paragraphs[index])) errors.push('Reading');
  if (day.reading?.questions?.some(question => han.test(JSON.stringify(question)) || Object.keys(question).some(key => /translation/i.test(key)))) errors.push('Reading Questions not English-only');
  if (/undefined|null|\[object Object\]/.test(JSON.stringify(day))) errors.push('invalid value');
  if (errors.length) throw new Error(`${label}: ${errors.join(', ')}`);
  results.push(`${label} — PASS`);
}

console.log(results.join('\n'));
console.log(`Translation data QA: ${results.length}/${lastDay - firstDay + 1} PASS`);
