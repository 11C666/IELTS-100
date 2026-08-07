const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),days=[];
for(let id=21;id<=40;id++)days.push(JSON.parse(fs.readFileSync(path.join(root,'data',`day-${String(id).padStart(3,'0')}.json`),'utf8')));
const errors=[],metrics={questionTypes:{},readingWords:{}};
const tokens=s=>s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
const shingles=(s,n=3)=>{const w=tokens(s),o=new Set();for(let i=0;i<=w.length-n;i++)o.add(w.slice(i,i+n).join(' '));return o};
const jac=(a,b)=>{let x=0;for(const k of a)if(b.has(k))x++;return x/(a.size+b.size-x||1)};
const maxPair=(get,n=3)=>{let best={days:[],score:0};for(let i=0;i<days.length;i++)for(let j=i+1;j<days.length;j++){const score=jac(shingles(get(days[i]),n),shingles(get(days[j]),n));if(score>best.score)best={days:[days[i].id,days[j].id],score}}return best};
for(const d of days){
 const req={vocabulary:20,paraphrases:8,sentences:3,expressions:5,mistakes:3,writingIdeas:2,speaking:2};for(const [k,n] of Object.entries(req))if(!Array.isArray(d[k])||d[k].length!==n)errors.push(`Day ${d.id}: ${k} expected ${n}`);
 const wc=tokens(d.reading.paragraphs.join(' ')).length;metrics.readingWords[d.id]=wc;if(wc<300||wc>400)errors.push(`Day ${d.id}: Reading ${wc} words`);
 if(d.reading.paragraphs.length<3||d.reading.paragraphs.length>5||d.reading.questions.length!==3)errors.push(`Day ${d.id}: Reading structure`);
 for(const q of d.reading.questions){metrics.questionTypes[q.type]=(metrics.questionTypes[q.type]||0)+1;if(!q.answer||!q.explanation)errors.push(`Day ${d.id}: incomplete question`)}
 for(const s of d.sentences)if(!s.pattern||!s.cn||!s.example||s.pattern.includes('...')||s.cn.includes('......'))errors.push(`Day ${d.id}: invalid sentence pattern`);
 for(const m of d.mistakes)if(!m.wrong||!m.correct||!m.why)errors.push(`Day ${d.id}: invalid mistake`);
 for(const w of d.writingIdeas){const count=(w.argument.match(/[.!?](?:\s|$)/g)||[]).length;if(count<4||count>5)errors.push(`Day ${d.id}: argument ${count} sentences`)}
 if(d.speaking[0].part!=='Part 1'||d.speaking[1].part!=='Part 2')errors.push(`Day ${d.id}: Speaking parts`);
}
const reading=maxPair(d=>d.reading.paragraphs.join(' ')),writing=maxPair(d=>d.writingIdeas.map(x=>x.argument).join(' ')),speaking=maxPair(d=>d.speaking.map(x=>x.question+' '+x.answer).join(' '),2);
for(const [name,r] of Object.entries({reading,writing,speaking}))if(r.score>.45)errors.push(`${name} similarity ${(r.score*100).toFixed(1)}% Day ${r.days.join('/')}`);
const report={passed:!errors.length,scope:'Day 021–040 only',errors,metrics:{days:days.length,readingMaxSimilarity:{days:reading.days,percent:+(reading.score*100).toFixed(2)},writingMaxSimilarity:{days:writing.days,percent:+(writing.score*100).toFixed(2)},speakingMaxSimilarity:{days:speaking.days,percent:+(speaking.score*100).toFixed(2)},...metrics}};
fs.writeFileSync(path.join(root,'tools','qa-manual-021-040.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exit(errors.length?1:0);
