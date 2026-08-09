const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function removeMarkedBlocks(source, start, end) {
  let output = source;
  while (true) {
    const from = output.indexOf(start);
    if (from < 0) return output.trimEnd();
    const to = output.indexOf(end, from);
    if (to < 0) throw new Error(`Unclosed generated block: ${start}`);
    output = `${output.slice(0, from)}${output.slice(to + end.length)}`;
  }
}

function sync(targetName, firstDay, lastDay, start, end) {
  const target = path.join(root, 'js', targetName);
  let source = fs.readFileSync(target, 'utf8');
  source = removeMarkedBlocks(source, '/* STATIC_DAY_001_SYNC_START */', '/* STATIC_DAY_001_SYNC_END */');
  source = removeMarkedBlocks(source, start, end);
  const assignments = [];
  for (let id = firstDay; id <= lastDay; id += 1) {
    const file = path.join(root, 'data', `day-${String(id).padStart(3, '0')}.json`);
    const day = JSON.parse(fs.readFileSync(file, 'utf8'));
    assignments.push(`window.IELTS_DAYS[${id}]=${JSON.stringify(day)};`);
  }
  fs.writeFileSync(target, `${source}\n\n${start}\n${assignments.join('\n')}\n${end}\n`, 'utf8');
}

sync('content.js', 1, 3, '/* STATIC_TRANSLATED_DAYS_001_003_START */', '/* STATIC_TRANSLATED_DAYS_001_003_END */');
sync('generated-content.js', 4, 100, '/* STATIC_TRANSLATED_DAYS_004_100_START */', '/* STATIC_TRANSLATED_DAYS_004_100_END */');
console.log('Synced all 100 Day JSON files into the existing file:// Day data objects.');
