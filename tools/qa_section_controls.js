const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'js', 'section-controls.js'), 'utf8');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'data', 'schema.json'), 'utf8'));
const day1 = JSON.parse(fs.readFileSync(path.join(root, 'data', 'day-001.json'), 'utf8'));
const day2 = JSON.parse(fs.readFileSync(path.join(root, 'data', 'day-002.json'), 'utf8'));

const sections = ['vocabulary', 'paraphrases', 'sentences', 'expressions', 'mistakes', 'writing', 'speaking', 'reading'];
for (const section of sections) {
  if (!source.includes(`'${section}'`)) throw new Error(`Missing independent control for ${section}`);
}
if (!source.includes("section.classList.toggle('part-collapsed')")) throw new Error('Part-level toggle logic is missing');
if (!source.includes("button.textContent = collapsed ? 'Show' : 'Hide'")) throw new Error('Hide/Show label logic is missing');
for (const section of ['vocabulary', 'writing', 'speaking', 'reading']) {
  if (!source.includes(`${section}:`)) throw new Error(`Missing Chinese toggle configuration for ${section}`);
}
if (!source.includes('ieltsChineseVisible:')) throw new Error('Chinese visibility persistence is missing');
if (!source.includes("classList.toggle('chinese-hidden'")) throw new Error('Independent Chinese visibility class is missing');
if (!source.includes('if (!target || !text')) throw new Error('Optional translation guard is missing');
if (!html.includes('js/section-controls.js')) throw new Error('Section control script is not loaded');
if (!css.includes('.study-card.part-collapsed>:not(header)')) throw new Error('Collapsed Part styling is missing');
if (!css.includes('.part-translation')) throw new Error('Translation styling is missing');
if (!css.includes('.chinese-hidden .chinese-content{display:none!important}')) throw new Error('Chinese-only hiding rule is missing');

if (!schema.properties.speaking.items.properties.questionTranslation) throw new Error('Speaking translation schema is missing');
if (!schema.properties.reading.properties.paragraphTranslations) throw new Error('Reading translation schema is missing');
if (!day1.paraphrases.every(item => item.translation)) throw new Error('Day 001 Paraphrases translations are incomplete');
if (!day1.sentences.every(item => item.exampleTranslation || item.translation)) throw new Error('Day 001 Sentence translations are incomplete');
if (!day1.expressions.every(item => item.exampleTranslation || item.translation)) throw new Error('Day 001 Natural Expression translations are incomplete');
if (!day1.writingIdeas.every(item => item.viewpointTranslation && item.topicSentenceTranslation && (item.translation || item.argumentTranslation))) throw new Error('Day 001 Writing translations are incomplete');
if (!day1.writingIdeas.every(item => item.collocationTranslations?.length === item.collocations.length)) throw new Error('Day 001 collocation-label translations are incomplete');
if (!day1.writingIdeas.every(item => item.argumentSentences?.length && item.argumentSentences.every(pair => pair.text && pair.translation))) throw new Error('Day 001 Writing sentence pairs are incomplete');
if (!day1.speaking.every(item => item.questionTranslation && item.translation)) throw new Error('Day 001 Speaking translation example is incomplete');
if (!day1.speaking.every(item => item.answerSentences?.length && item.answerSentences.every(pair => pair.text && pair.translation))) throw new Error('Day 001 Speaking sentence pairs are incomplete');
if (!day1.reading.titleTranslation || !day1.reading.paragraphTranslations || day1.reading.paragraphTranslations.length !== day1.reading.paragraphs.length) throw new Error('Day 001 Reading passage translations are incomplete');
if (!day1.reading.paragraphSentencePairs?.length || day1.reading.paragraphSentencePairs.length !== day1.reading.paragraphs.length || !day1.reading.paragraphSentencePairs.every(paragraph => paragraph.length && paragraph.every(pair => pair.text && pair.translation))) throw new Error('Day 001 Reading sentence pairs are incomplete');
if (day1.reading.questions.some(item => item.promptTranslation || item.optionsTranslations || item.explanationTranslation)) throw new Error('Reading questions must remain English-only');

function findInvalid(value, path = 'day-001') {
  if (value === null || value === undefined) throw new Error(`Invalid null/undefined value at ${path}`);
  if (Array.isArray(value)) value.forEach((item, index) => findInvalid(item, `${path}[${index}]`));
  else if (typeof value === 'object') Object.entries(value).forEach(([key, item]) => findInvalid(item, `${path}.${key}`));
}
findInvalid(day1);

// Legacy data remains valid when optional translation fields are absent.
if (day2.speaking.some(item => Object.prototype.hasOwnProperty.call(item, 'translation'))) throw new Error('Legacy-data fixture unexpectedly contains translations');
for (const id of [1, 2, 100]) JSON.parse(fs.readFileSync(path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`), 'utf8'));

console.log('Section controls/translation QA: PASS');
console.log('All requested Day 001 translations, optional-field guards, and legacy-data compatibility verified.');
