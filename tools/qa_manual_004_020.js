const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),days=[];
for(let id=4;id<=20;id++)days.push(JSON.parse(fs.readFileSync(path.join(root,'data',`day-${String(id).padStart(3,'0')}.json`),'utf8')));
const errors=[],counts={questions:{},readingWords:{}};
const tokens=s=>s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
const shingles=(s,n=3)=>{const w=tokens(s),o=new Set();for(let i=0;i<=w.length-n;i++)o.add(w.slice(i,i+n).join(' '));return o};
const jac=(a,b)=>{let x=0;for(const k of a)if(b.has(k))x++;return x/(a.size+b.size-x||1)};
const maxPair=(items,get,n=3)=>{let best={days:[],score:0};for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const s=jac(shingles(get(items[i]),n),shingles(get(items[j]),n));if(s>best.score)best={days:[items[i].id,items[j].id],score:s}}return best};
for(const d of days){
 const required={vocabulary:20,paraphrases:8,sentences:3,expressions:5,mistakes:3,writingIdeas:2,speaking:2};
 for(const [k,n] of Object.entries(required))if(!Array.isArray(d[k])||d[k].length!==n)errors.push(`Day ${d.id} ${k} expected ${n}`);
 const wc=tokens(d.reading.paragraphs.join(' ')).length;counts.readingWords[d.id]=wc;if(wc<300||wc>400)errors.push(`Day ${d.id} Reading ${wc} words`);
 if(d.reading.paragraphs.length<3||d.reading.paragraphs.length>5||d.reading.questions.length!==3)errors.push(`Day ${d.id} Reading structure`);
 for(const q of d.reading.questions){counts.questions[q.type]=(counts.questions[q.type]||0)+1;if(!q.answer||!q.explanation)errors.push(`Day ${d.id} incomplete Reading answer`)}
 for(const w of d.vocabulary)if(!w.word||!w.ipa||!w.meaning||!w.collocation||!w.collocationCN)errors.push(`Day ${d.id} incomplete vocabulary`);
 for(const s of d.sentences)if(!s.pattern||!s.cn||!s.example||s.pattern.includes('...'))errors.push(`Day ${d.id} incomplete Sentence Pattern`);
 for(const m of d.mistakes)if(!m.wrong||!m.correct||!m.why)errors.push(`Day ${d.id} incomplete Common Mistake`);
 for(const w of d.writingIdeas){const n=(w.argument.match(/[.!?](?:\s|$)/g)||[]).length;if(n<4||n>5)errors.push(`Day ${d.id} Writing argument ${n} sentences`)}
 if(/family relationships has|reading habits is|films and cinema has|sports and fitness influences|what role does hobbies/i.test(JSON.stringify(d)))errors.push(`Day ${d.id} known grammar/template defect`);
}
const reading=maxPair(days,d=>d.reading.paragraphs.join(' '),3),writing=maxPair(days,d=>d.writingIdeas.map(x=>x.argument).join(' '),3),speaking=maxPair(days,d=>d.speaking.map(x=>x.question+' '+x.answer).join(' '),2);
if(reading.score>.45)errors.push(`Reading similarity ${(reading.score*100).toFixed(1)}% Day ${reading.days.join('/')}`);
if(writing.score>.45)errors.push(`Writing similarity ${(writing.score*100).toFixed(1)}% Day ${writing.days.join('/')}`);
if(speaking.score>.45)errors.push(`Speaking structural similarity ${(speaking.score*100).toFixed(1)}% Day ${speaking.days.join('/')}`);
const report={passed:!errors.length,scope:'Day 004–020 only',errors,metrics:{days:days.length,readingMaxSimilarity:{days:reading.days,percent:+(reading.score*100).toFixed(2)},writingMaxSimilarity:{days:writing.days,percent:+(writing.score*100).toFixed(2)},speakingMaxSimilarity:{days:speaking.days,percent:+(speaking.score*100).toFixed(2)},readingQuestionTypes:counts.questions,readingWords:counts.readingWords}};
fs.writeFileSync(path.join(root,'tools','qa-manual-004-020.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));process.exit(errors.length?1:0);
