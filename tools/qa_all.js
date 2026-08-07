const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const ctx={window:{}};vm.createContext(ctx);
for(const f of ['content.js','generated-content.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',f),'utf8'),ctx);
const days=ctx.window.IELTS_DAYS,topics=ctx.window.IELTS_TOPICS,index=JSON.parse(fs.readFileSync(path.join(root,'data','index.json'),'utf8'));
const errors=[],warnings=[],dist={},parts={};
const global={vocab:new Map(),coll:new Map(),patterns:new Map(),expressions:new Map(),speaking:new Map(),reading:new Map()};
const readingTexts=[];
const add=(map,key,id)=>{key=String(key).toLowerCase().trim();if(!map.has(key))map.set(key,[]);map.get(key).push(id)};
const sentenceCount=s=>(String(s).match(/[.!?](?:\s|$)/g)||[]).length;
for(let i=1;i<=100;i++){
 const d=days[i];if(!d){errors.push(`Missing Day ${i}`);continue}
 const expected={vocabulary:20,paraphrases:8,sentences:3,expressions:5,mistakes:3,writingIdeas:2,speaking:2};
 for(const [k,n] of Object.entries(expected))if(!Array.isArray(d[k])||d[k].length!==n)errors.push(`Day ${i} ${k}: expected ${n}`);
 if(!d.reading||d.reading.paragraphs.length<3||d.reading.paragraphs.length>5||d.reading.questions.length!==3)errors.push(`Day ${i} reading structure`);
 const words=d.reading.paragraphs.join(' ').trim().split(/\s+/).length;if(words<300||words>400)errors.push(`Day ${i} reading words=${words}`);
 for(const q of d.reading.questions){dist[q.type]=(dist[q.type]||0)+1;if(!q.answer||!q.explanation)errors.push(`Day ${i} incomplete reading question`)}
 for(const w of d.vocabulary){if(!w.word||!w.ipa||!w.meaning||!w.collocation||!w.collocationCN)errors.push(`Day ${i} incomplete vocabulary`);if(w.ipa.includes('*')||w.ipa.includes('pronunciation varies'))warnings.push(`Day ${i} IPA review: ${w.word}`);add(global.vocab,w.word,i);add(global.coll,w.collocation,i)}
 for(const s of d.sentences){if(s.pattern.includes('...')||s.cn.includes('...'))errors.push(`Day ${i} placeholder in sentence`);add(global.patterns,s.pattern,i)}
 for(const e of d.expressions)add(global.expressions,e.text,i);
 for(const m of d.mistakes)if(!m.wrong||!m.correct||!m.why)errors.push(`Day ${i} incomplete mistake`);
 for(const w of d.writingIdeas){const n=sentenceCount(w.argument);if(n<4||n>5)errors.push(`Day ${i} argument sentences=${n}`);if(w.collocations.length<4)errors.push(`Day ${i} writing collocations`)}
 for(const s of d.speaking){parts[s.part]=(parts[s.part]||0)+1;add(global.speaking,s.question,i);const wc=s.answer.split(/\s+/).length;if(s.part==='Part 1'&&(wc<50||wc>90))warnings.push(`Day ${i} Part 1 words=${wc}`);if(s.part==='Part 2'&&(wc<100||wc>150))warnings.push(`Day ${i} Part 2 words=${wc}`);if(s.part==='Part 3'&&(wc<80||wc>130))warnings.push(`Day ${i} Part 3 words=${wc}`)}
 add(global.reading,d.reading.title,i);
 readingTexts.push({id:i,text:d.reading.paragraphs.join(' ')});
 const raw=JSON.stringify(d);if(/TODO|Coming Soon|Placeholder|Lorem ipsum/i.test(raw))errors.push(`Day ${i} placeholder text`);
 const file=path.join(root,'data',`day-${String(i).padStart(3,'0')}.json`);if(!fs.existsSync(file))errors.push(`Missing JSON ${i}`);else try{JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){errors.push(`Invalid JSON ${i}`)}
 if(i>1){const prev=new Set(days[i-1].vocabulary.map(x=>x.word.toLowerCase()));const repeat=d.vocabulary.filter(x=>prev.has(x.word.toLowerCase())).length;if(repeat>6)errors.push(`Day ${i} adjacent vocab repeats=${repeat}`)}
}
if(topics.length!==100)errors.push(`Topic count=${topics.length}`);
if(index.publishedDays.length!==100||index.dataFiles.length!==100)errors.push('Index incomplete');
for(const [name,map] of Object.entries(global))for(const [text,ids] of map)if((name==='patterns'||name==='expressions'||name==='speaking'||name==='reading')&&ids.length>5)warnings.push(`${name} repeated ${ids.length} times: ${text}`);
function shingles(text,n=3){const words=text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);const out=new Set();for(let i=0;i<=words.length-n;i++)out.add(words.slice(i,i+n).join(' '));return out}
function jaccard(a,b){let hit=0;for(const x of a)if(b.has(x))hit++;return hit/(a.size+b.size-hit||1)}
const shingleSets=readingTexts.map(x=>({id:x.id,set:shingles(x.text)}));let maxReadingSimilarity={days:[],score:0},overLimit=[];
for(let i=0;i<shingleSets.length;i++)for(let j=i+1;j<shingleSets.length;j++){const score=jaccard(shingleSets[i].set,shingleSets[j].set);if(score>maxReadingSimilarity.score)maxReadingSimilarity={days:[shingleSets[i].id,shingleSets[j].id],score};if(score>.45)overLimit.push({days:[shingleSets[i].id,shingleSets[j].id],score})}
if(overLimit.length)errors.push(`${overLimit.length} Reading pairs exceed 45% similarity; max Day ${maxReadingSimilarity.days.join('/')} ${(maxReadingSimilarity.score*100).toFixed(1)}%`);
const result={passed:errors.length===0,errors,warnings,metrics:{days:Object.keys(days).length,topics:topics.length,totalVocabulary:Object.values(days).reduce((n,d)=>n+d.vocabulary.length,0),uniqueVocabulary:global.vocab.size,uniqueCollocations:global.coll.size,readingQuestionTypes:dist,speakingParts:parts,duplicateSentencePatterns:[...global.patterns.values()].filter(x=>x.length>1).length,duplicateExpressions:[...global.expressions.values()].filter(x=>x.length>1).length,duplicateSpeakingQuestions:[...global.speaking.values()].filter(x=>x.length>1).length,duplicateReadingTitles:[...global.reading.values()].filter(x=>x.length>1).length,maxReadingSimilarity:{days:maxReadingSimilarity.days,percent:+(maxReadingSimilarity.score*100).toFixed(2)},readingPairsAbove45:overLimit.length}};
fs.writeFileSync(path.join(root,'tools','qa-result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.metrics,null,2));console.log(`Errors: ${errors.length}; Warnings: ${warnings.length}; PASS=${result.passed}`);if(errors.length)console.log(errors.slice(0,30).join('\n'));if(warnings.length)console.log('Warnings sample:\n'+warnings.slice(0,20).join('\n'));process.exit(errors.length?1:0);
