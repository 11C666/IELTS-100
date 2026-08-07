const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const sources=['manual-days-061-067.js','manual-days-063-polish.js','manual-days-064-067.js','manual-days-068-073.js','manual-days-074-080.js'];
const staged={};for(const f of sources)Object.assign(staged,require(path.join(root,'content',f)));
const days=[];for(let id=61;id<=80;id++){if(!staged[id])throw new Error(`Missing staged Day ${id}`);days.push(staged[id])}
const previous=[];for(let id=4;id<=60;id++)previous.push(JSON.parse(fs.readFileSync(path.join(root,'data',`day-${String(id).padStart(3,'0')}.json`),'utf8')));
const errors=[],warnings=[],types={},readingWords={};
const tokens=s=>String(s).toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
const shingles=(s,n=3)=>{const w=tokens(s),r=new Set();for(let i=0;i<=w.length-n;i++)r.add(w.slice(i,i+n).join(' '));return r};
const jac=(a,b)=>{let x=0;for(const k of a)if(b.has(k))x++;return x/(a.size+b.size-x||1)};
const maxPair=(items,get,n=3)=>{let best={days:[],score:0};for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const score=jac(shingles(get(items[i]),n),shingles(get(items[j]),n));if(score>best.score)best={days:[items[i].id,items[j].id],score}}return best};
for(const d of days){
 for(const [k,n] of Object.entries({vocabulary:20,paraphrases:8,sentences:3,expressions:5,mistakes:3,writingIdeas:2,speaking:2}))if(!Array.isArray(d[k])||d[k].length!==n)errors.push(`Day ${d.id} ${k} expected ${n}`);
 for(const v of d.vocabulary||[])if(!v.word||!v.ipa||!v.meaning||!v.collocation||!v.collocationCN)errors.push(`Day ${d.id} incomplete vocabulary`);
 for(const p of d.paraphrases||[])if(!p.base||!Array.isArray(p.options)||p.options.length!==3||!p.note)errors.push(`Day ${d.id} incomplete paraphrase`);
 for(const s of d.sentences||[])if(!s.pattern||!s.cn||!s.example||s.pattern.includes('...')||s.cn.includes('......'))errors.push(`Day ${d.id} invalid sentence pattern`);
 for(const m of d.mistakes||[])if(!m.wrong||!m.correct||!m.why)errors.push(`Day ${d.id} incomplete mistake`);
 for(const w of d.writingIdeas||[]){if(!w.viewpoint||!w.topicSentence||!Array.isArray(w.collocations)||w.collocations.length!==4)errors.push(`Day ${d.id} writing structure`);const n=(w.argument.match(/[.!?](?:\s|$)/g)||[]).length;if(n<4||n>5)errors.push(`Day ${d.id} writing argument ${n} sentences`)}
 if(d.speaking?.[0]?.part!=='Part 2'||d.speaking?.[1]?.part!=='Part 3')errors.push(`Day ${d.id} speaking parts`);
 for(const s of d.speaking||[])if(!s.question||!s.answer||tokens(s.answer).length<70)warnings.push(`Day ${d.id} ${s.part} short answer`);
 const wc=tokens(d.reading?.paragraphs?.join(' ')).length;readingWords[d.id]=wc;if(wc<300||wc>400)errors.push(`Day ${d.id} reading ${wc} words`);
 if(!d.reading||d.reading.paragraphs.length<3||d.reading.paragraphs.length>5||d.reading.questions.length!==3)errors.push(`Day ${d.id} reading structure`);
 for(const q of d.reading?.questions||[]){types[q.type]=(types[q.type]||0)+1;if(!q.answer||!q.explanation)errors.push(`Day ${d.id} incomplete question`);if(q.type==='Multiple Choice'&&(!q.options||q.options.length!==4))errors.push(`Day ${d.id} MCQ options`)}
}
const reading=maxPair(days,d=>d.reading.paragraphs.join(' ')),writing=maxPair(days,d=>d.writingIdeas.map(x=>x.argument).join(' ')),speaking=maxPair(days,d=>d.speaking.map(x=>x.question+' '+x.answer).join(' '),2);
const combined=[...previous,...days],crossReading=maxPair(combined,d=>d.reading.paragraphs.join(' '));
for(const [name,r] of Object.entries({reading,writing,speaking,crossReading}))if(r.score>.45)errors.push(`${name} similarity ${(r.score*100).toFixed(1)}% Day ${r.days.join('/')}`);
const norm=s=>tokens(s).join(' '),dups=(key)=>{const seen=new Map(),out=[];for(const d of combined)for(const x of d[key]||[]){const value=norm(x.text||x.pattern||x.question);if(value&&seen.has(value))out.push([seen.get(value),d.id,value]);else if(value)seen.set(value,d.id)}return out};
const duplicateExpressions=dups('expressions'),duplicatePatterns=dups('sentences'),duplicateQuestions=dups('speaking');
for(const [name,list] of Object.entries({duplicateExpressions,duplicatePatterns,duplicateQuestions}))for(const x of list)if(x[0]>=61||x[1]>=61)errors.push(`${name} Day ${x[0]}/${x[1]}: ${x[2]}`);
const report={passed:!errors.length,scope:'Staged Day 061–080; Day 001–060 read-only',errors,warnings,metrics:{readingWords,questionTypes:types,readingMaxSimilarity:{days:reading.days,percent:+(reading.score*100).toFixed(2)},writingMaxSimilarity:{days:writing.days,percent:+(writing.score*100).toFixed(2)},speakingMaxSimilarity:{days:speaking.days,percent:+(speaking.score*100).toFixed(2)},crossCorpusReadingMax:{days:crossReading.days,percent:+(crossReading.score*100).toFixed(2)}}};
fs.writeFileSync(path.join(root,'tools','qa-stage-061-080.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exit(errors.length?1:0);
