/* Day 001-010 quality review: reading questions and translation corrections.
   Same shape as targeted-content-fixes.js; applied by tools/publish_quality_fixes_001_010.js. */
const q = (id, index, value) => ({ id, path: ['reading', 'questions', index], value });
const t = (id, path, value) => ({ id, path, value });

module.exports = [
  // Reading questions: add Not Given items, paraphrase completion stems, state word limits.
  q(1, 1, { type: 'True / False / Not Given', prompt: 'Project-based learning leads to better examination results than traditional teaching.', answer: 'Not Given', explanation: 'Paragraph C describes project-based learning and the difficulty of assessing it, but it never compares the examination results of the two approaches.' }),
  q(1, 2, { type: 'Sentence Completion', prompt: 'Complete the sentence with ONE WORD ONLY from the passage: Critics point out that a group project can hide how much ______ each student has actually contributed.', answer: 'effort', explanation: 'Paragraph C says a group project may conceal substantial differences in individual effort.' }),
  q(2, 0, { type: 'Summary Completion', prompt: 'Complete the summary with ONE WORD ONLY from the passage: Repeating an action is not enough to make it a habit. It also has to be attached to a consistent ______, for example a certain time or location.', answer: 'cue', explanation: 'Paragraph B says a behaviour is more likely to become automatic when it is connected to a stable cue, such as a particular time or place.' }),
  q(3, 0, { type: 'Yes / No / Not Given', prompt: 'The writer believes that most users read a privacy policy before accepting it.', answer: 'Not Given', explanation: 'Paragraph B says users often do not know how much data is gathered, but the writer gives no view on whether they read privacy policies.' }),
  q(3, 1, { type: 'Summary Completion', prompt: 'Complete the summary with NO MORE THAN TWO WORDS from the passage: When a service predicts what a user wants, routine actions demand less ______.', answer: 'mental effort', explanation: 'Paragraph B says personalisation can reduce mental effort, particularly for repetitive tasks.' }),
  q(4, 0, { type: 'True / False / Not Given', prompt: 'Disagreement between parents and growing children may arise because earlier roles have stopped being suitable.', answer: 'True', explanation: 'Paragraph A says tension may simply show that roles which worked at one stage of life no longer fit the next.' }),
  q(4, 1, { type: 'Multiple Choice', prompt: 'Why may an older parent resist help?', options: ['The help is too expensive.', 'It is offered without allowing personal choice.', 'The parent does not trust any relatives.', 'The practical task is unnecessary.'], answer: 'B', explanation: 'Paragraph B says help may be resisted when it is offered as an instruction rather than a choice.' }),
  q(4, 2, { type: 'Sentence Completion', prompt: 'Complete the sentence with ONE WORD ONLY from the passage: Resentment can build when relatives rely on assumptions and their different ______ go unnoticed.', answer: 'contributions', explanation: 'Paragraph C says problems arise when these contributions remain invisible and assumptions replace explicit conversation.' }),
  q(5, 0, { type: 'Yes / No / Not Given', prompt: 'The writer believes that people who move abroad make new friends quickly.', answer: 'Not Given', explanation: 'The passage discusses what happens to existing friendships after a move; it gives no view on how quickly people form new ones.' }),
  q(5, 1, { type: 'Summary Completion', prompt: 'Complete the sentence with ONE WORD ONLY from the passage: After one friend relocates, the everyday ______ contact that classmates and colleagues take for granted disappears.', answer: 'background', explanation: 'Paragraph B says that after one person moves, this background contact vanishes.' }),
  q(5, 2, { type: 'Multiple Choice', prompt: 'What approach is associated with successful long-distance friendships?', options: ['Demanding immediate replies', 'Avoiding all scheduled calls', 'Using small, low-pressure forms of contact', 'Pretending that routines never change'], answer: 'C', explanation: 'Paragraph C describes photographs, short recordings and links sent without pressure to hold a long conversation.' }),
  q(6, 1, { type: 'True / False / Not Given', prompt: 'Observers tend to notice later behaviour that supports the opinion they have already formed.', answer: 'True', explanation: 'Paragraph B says observers select the explanation that fits their expectations, then notice later behaviour which confirms the original judgement.' }),
  q(7, 0, { type: 'True / False / Not Given', prompt: 'Most amateur astronomers eventually become professional scientists.', answer: 'Not Given', explanation: 'The passage mentions amateur astronomers and their observations, but says nothing about how many of them become professionals.' }),
  q(7, 2, { type: 'Multiple Choice', prompt: 'Why might someone keep a hobby separate from paid work?', options: ['To avoid learning new techniques', 'To protect an activity from commercial pressure', 'Because online selling is impossible', 'Because professionals never enjoy their work'], answer: 'B', explanation: 'Paragraph D explains that once customers and deadlines appear, an absorbing pastime may begin to feel like another job.' }),
  q(8, 0, { type: 'Multiple Choice', prompt: 'What does the passage say deep reading requires?', options: ['Recognising every word consciously', 'Connecting and revising information', 'Moving the eyes at maximum speed', 'Avoiding all digital formats'], answer: 'B', explanation: 'Paragraph A describes connecting a sentence with earlier information and revising an interpretation.' }),
  q(8, 1, { type: 'Sentence Completion', prompt: 'Complete the sentence with ONE WORD ONLY from the passage: To follow an argument, a reader has to keep its claims in ______ and see how they relate to one another.', answer: 'memory', explanation: 'Paragraph B says following an argument requires the reader to hold claims in memory and recognise relationships between them.' }),
  q(8, 2, { type: 'True / False / Not Given', prompt: 'Researchers agree that reading on paper leads to better understanding than reading on a screen.', answer: 'False', explanation: 'Paragraph C says researchers have not concluded that one medium is always superior.' }),
  q(9, 0, { type: 'True / False / Not Given', prompt: 'Dubbed films cost more to produce than subtitled films.', answer: 'Not Given', explanation: 'Paragraph A compares what each method does for the viewer, but the passage never mentions production costs.' }),
  q(9, 1, { type: 'Summary Completion', prompt: 'Complete the sentence with ONE WORD ONLY from the passage: Subtitles cannot include every word of the dialogue because the audience has limited ______ in which to read them.', answer: 'time', explanation: 'Paragraph C says text must be shortened because viewers need enough time to read while following the image.' }),
  q(10, 0, { type: 'True / False / Not Given', prompt: 'Before recording existed, a piece of music sounded slightly different each time it was performed.', answer: 'True', explanation: 'Paragraph A says each version differed slightly and that hearing the same performance twice was impossible.' }),
  q(10, 1, { type: 'Multiple Choice', prompt: 'How did early recording limits affect musicians?', options: ['They stopped writing melodies.', 'They altered pieces to fit the format.', 'They avoided all public performances.', 'They recorded only in different countries.'], answer: 'B', explanation: 'Paragraph B states that musicians shortened or reorganised pieces to fit the available format.' }),
  q(10, 2, { type: 'Summary Completion', prompt: 'Complete the sentence with ONE WORD ONLY from the passage: With studio techniques, a finished recording was no longer just a faithful copy of a live ______.', answer: 'performance', explanation: 'Paragraph C says the finished track became an object in its own right rather than a transparent copy of a performance.' }),

  // Translations that were literal or wrong.
  t(2, ['reading', 'titleTranslation'], '为什么规律作息能减轻脑力负担'),
  t(2, ['writingIdeas', 0, 'collocationTranslations', 1], '兼顾相互冲突的事务'),
  t(2, ['writingIdeas', 0, 'collocationTranslations', 3], '保持工作效率'),
  t(3, ['reading', 'titleTranslation'], '精心设计的便利'),
  t(3, ['writingIdeas', 1, 'collocationTranslations', 2], '养成专注使用的习惯'),
  t(4, ['reading', 'titleTranslation'], '当家人学会协商'),
  t(4, ['sentences', 1, 'exampleTranslation'], '兄弟姐妹有共同的成长经历，这往往意味着他们了解彼此的习惯。'),
  t(4, ['expressions', 0, 'exampleTranslation'], '遇到麻烦时，我姐姐总是支持我。'),
  t(5, ['writingIdeas', 1, 'collocationTranslations', 2], '接纳被孤立的学生'),
  t(6, ['sentences', 2, 'exampleTranslation'], '一个人起初可能显得拘谨，但在好友面前会变得非常健谈。'),
  t(6, ['expressions', 0, 'exampleTranslation'], '加入戏剧社让我不再那么害羞。'),
  t(6, ['expressions', 1, 'exampleTranslation'], '我会直说自己的想法，但尽量不失礼。'),
  t(6, ['expressions', 3, 'exampleTranslation'], '我十几岁时脾气很急，但现在平和多了。'),
  t(6, ['expressions', 4, 'exampleTranslation'], '随着年龄增长，我越来越能坦然做自己。'),
  t(6, ['writingIdeas', 0, 'collocationTranslations', 1], '童年早期经历'),
  t(6, ['writingIdeas', 0, 'collocationTranslations', 3], '培养社交自信'),
  t(7, ['reading', 'titleTranslation'], '业余爱好者的意外价值'),
  t(7, ['writingIdeas', 0, 'collocationTranslations', 1], '提供发挥创造力的途径'),
  t(7, ['writingIdeas', 1, 'collocationTranslations', 0], '自由玩耍'),
  t(8, ['expressions', 3, 'exampleTranslation'], '这是一本随笔集，所以可以随手挑几篇翻阅。'),
  t(9, ['writingIdeas', 0, 'collocationTranslations', 0], '让历史变得鲜活'),
  t(9, ['writingIdeas', 0, 'collocationTranslations', 1], '进行艺术加工'),
  t(9, ['writingIdeas', 0, 'collocationTranslations', 3], '查阅可靠资料'),
  t(9, ['writingIdeas', 1, 'collocationTranslations', 0], '支持本土影片制作'),
  t(9, ['writingIdeas', 1, 'collocationTranslations', 1], '呈现多元的经历'),
  t(9, ['writingIdeas', 1, 'collocationTranslations', 3], '触达国际观众'),
  t(10, ['writingIdeas', 1, 'collocationTranslations', 0], '触达全球听众')
];
