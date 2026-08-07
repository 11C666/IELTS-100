const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),manual={};
for(const file of ['manual-days-061-067.js','manual-days-063-polish.js','manual-days-064-067.js','manual-days-068-073.js','manual-days-074-080.js'])Object.assign(manual,require(path.join(root,'content',file)));
for(let id=61;id<=80;id++){
  if(!manual[id])throw new Error(`Missing reviewed Day ${id}`);
  fs.writeFileSync(path.join(root,'data',`day-${String(id).padStart(3,'0')}.json`),JSON.stringify(manual[id],null,2)+'\n');
}
const all=[];for(let id=4;id<=100;id++)all.push(JSON.parse(fs.readFileSync(path.join(root,'data',`day-${String(id).padStart(3,'0')}.json`),'utf8')));
fs.writeFileSync(path.join(root,'js','generated-content.js'),'/* Static offline lesson data. Day 004–080 are hand-authored. */\n'+all.map(d=>`window.IELTS_DAYS[${d.id}]=${JSON.stringify(d)};`).join('\n')+'\n');
console.log('Published reviewed Day 061–080 and rebuilt the offline bundle.');
