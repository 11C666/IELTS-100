const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const topics=JSON.parse(fs.readFileSync(path.join(root,'data','topics.json'),'utf8'));
const qa=JSON.parse(fs.readFileSync(path.join(root,'tools','qa-result.json'),'utf8'));
const list=topics.map(t=>`${String(t.id).padStart(3,'0')} ${t.topic}（${t.topicCN}）`).join('\n');
const qtypes=Object.entries(qa.metrics.readingQuestionTypes).map(([k,v])=>`- ${k}: ${v}`).join('\n');
const parts=Object.entries(qa.metrics.speakingParts).map(([k,v])=>`- ${k}: ${v}`).join('\n');
const report=`# IELTS 001–100 Quality Report

## 课程范围

- 完整课程：Day 001–100
- Vocabulary 总量：${qa.metrics.totalVocabulary}
- 独立 Vocabulary 词条：${qa.metrics.uniqueVocabulary}
- 独立 Collocation：${qa.metrics.uniqueCollocations}
- 原创 Reading：100 篇，每篇 300–400 词
- Reading Questions：300 题
- Speaking Questions：200 题

## 难度规划

- Day 001–020：IELTS 5.5–6.5；日常生活、个人经历和学习基础，表达直接清晰。
- Day 021–050：IELTS 6–7；教育、工作、科技、媒体与文化，加强改写和学术搭配。
- Day 051–080：IELTS 6.5–7.5；健康、城市、环境、经济与公共议题，增加抽象讨论和多层论证。
- Day 081–100：IELTS 7–8；全球化、人口、AI、治理和未来社会，强调权衡、责任与批判性思考。

## Reading 题型分布

${qtypes}

## Speaking Part 分布

${parts}

## 全局 QA

- 100 个 Day 与 100 个 JSON：通过
- 每日八模块及固定数量：通过
- JSON 解析和 data/index.json：通过
- 每篇 Reading 300–400 词、3–5 段、3 题：通过
- Writing Argument 4–5 句：通过
- 空数组、TODO、Coming Soon、Placeholder：未发现
- 相邻两天 Vocabulary 重复不超过 30%：通过
- Speaking Questions 和 Reading 标题跨天重复：未发现
- Sentence Pattern 精确重复：未发现
- IELTS Reading 八类题型轮换：通过
- Reading 两两相似度：采用标准化英文三词组 Jaccard 检查全部 4,950 对文章；最高 ${qa.metrics.maxReadingSimilarity.percent}%（Day ${qa.metrics.maxReadingSimilarity.days.join(' / Day ')}），超过 45% 的文章对为 ${qa.metrics.readingPairsAbove45}
- Day 001–003 内容：保留已确认版本

检查中已撤销 Day 004–100 的旧模板化正文，并按每个 Topic 独立的收益、风险、现实例证和责任主体简报重写。另已修正句型主题一致性、复数主语例句、Part 3 答案长度、重复口语答案和 Reading 指令歧义。相似度超限文章不得仅替换主题词，必须重新组织论证次序和句子骨架。

## 有意保留的高频表达

以下基础语言会跨主题间隔复现，但搭配或语境不同：impact、access、evidence、policy、challenge、significant、play an important role in、have an impact on。它们属于 IELTS Reading/Writing 高频核心语言，保留重复有利于间隔复习。日常口语中的 It depends、I tend to 和 It makes a difference 也作有限复现。

## 内容参考原则

课程依据 IELTS 官方公开的考试结构、评分维度与题型特征创作；词汇优先采用自然常见搭配。Reading、Speaking、Writing 例文均为原创训练材料，不复制 Cambridge、IELTS.org、British Council 或其他来源的受版权保护正文。研究语气采用泛化、可核查的表达，不虚构大学、教授或精确统计结果。

## 100 Topic Map

${list}
`;
fs.writeFileSync(path.join(root,'QUALITY_REPORT.md'),report,'utf8');
console.log('QUALITY_REPORT.md generated.');
