const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..'),manual=require(path.join(root,'content','manual-days-041-060.js'));
for(let id=41;id<=60;id++){if(!manual[id])throw new Error(`Missing Day ${id}`);fs.writeFileSync(path.join(root,'data',`day-${String(id).padStart(3,'0')}.json`),JSON.stringify(manual[id],null,2)+'\n')}
const all=[];for(let id=4;id<=100;id++)all.push(JSON.parse(fs.readFileSync(path.join(root,'data',`day-${String(id).padStart(3,'0')}.json`),'utf8')));
fs.writeFileSync(path.join(root,'js','generated-content.js'),'/* Static offline lesson data. Day 004–060 are hand-authored. */\n'+all.map(d=>`window.IELTS_DAYS[${d.id}]=${JSON.stringify(d)};`).join('\n')+'\n');console.log('Published Day 041–060.');
