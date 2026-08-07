const fs = require('fs');
const path = require('path');
global.window = global;
require(path.join(__dirname, '..', 'js', 'content.js'));
const generated = path.join(__dirname, '..', 'js', 'generated-content.js');
if (fs.existsSync(generated)) require(generated);
const out = path.join(__dirname, '..', 'data');
fs.writeFileSync(path.join(out, 'topics.json'), JSON.stringify(global.IELTS_TOPICS, null, 2) + '\n');
Object.values(global.IELTS_DAYS).forEach(day => {
  const name = `day-${String(day.id).padStart(3, '0')}.json`;
  fs.writeFileSync(path.join(out, name), JSON.stringify(day, null, 2) + '\n');
});
console.log(`Exported ${Object.keys(global.IELTS_DAYS).length} lessons and ${global.IELTS_TOPICS.length} topics.`);
