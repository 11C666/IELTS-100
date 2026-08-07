const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const manual=require(path.join(root,'content','manual-days-021-040.js'));
for(let id=21;id<=40;id++){
  if(!manual[id])throw new Error(`Missing hand-authored Day ${id}`);
  fs.writeFileSync(path.join(root,'data',`day-${String(id).padStart(3,'0')}.json`),JSON.stringify(manual[id],null,2)+'\n');
}
const all=[];
for(let id=4;id<=100;id++)all.push(JSON.parse(fs.readFileSync(path.join(root,'data',`day-${String(id).padStart(3,'0')}.json`),'utf8')));
const bundle='/* Static offline lesson data. Day 004–040 are hand-authored. */\n'+all.map(d=>`window.IELTS_DAYS[${d.id}]=${JSON.stringify(d)};`).join('\n')+'\n';
fs.writeFileSync(path.join(root,'js','generated-content.js'),bundle);
console.log('Published hand-authored Day 021–040 and rebuilt the static offline bundle.');
