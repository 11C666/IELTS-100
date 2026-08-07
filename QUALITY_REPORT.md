# Day 004–060 Manual Content Review

## Scope

- Preserved without content changes: Day 001–003
- Previously hand-rewritten and preserved: Day 004–020
- Previously hand-rewritten and preserved: Day 021–040
- Hand-rewritten in this review: Day 041–060
- Frozen and not regenerated in this review: Day 061–100
- Website UI, CSS, JSON Schema, navigation, responsive behaviour and localStorage: unchanged

## Abandoned generation logic

`tools/generate_phase2.py` was removed. It is no longer permissible to assemble Vocabulary, Sentence Patterns, Natural Expressions, Writing, Speaking or Reading from shared banks with a substituted topic.

Day 004–020 is now stored as hand-authored topic-specific material in `content/manual-days-004-020.js`. `tools/publish_manual_content.js` only serializes that material into the individual JSON files and rebuilds the offline data bundle. It does not select words, write answers, assemble arguments or construct passages.

Day 021–040 is stored in `content/manual-days-021-040.js`. Its publisher likewise performs serialization only; all Sentence Patterns, Natural Expressions, Common Mistakes, Writing arguments, Speaking answers, Reading passages and Reading questions were written topic by topic.

Day 041–060 is stored in `content/manual-days-041-060.js` and follows the same authoring boundary. Its publisher performs serialization only and does not assemble prose from shared banks.

## Topic-specific design

Each reviewed lesson has its own topic-specific learning material. In Day 021–040, the Reading passages deliberately use different organising questions—for example hidden curricula, ranking metrics, learning analytics, assessment reliability, conversational repair, common-information bias, disclosure design and exception queues—rather than a shared paragraph sequence.

- 20-item vocabulary pool tied directly to the topic;
- eight contextual paraphrase groups;
- three topic-appropriate sentence structures;
- five natural expressions used in realistic situations;
- three genuine learner errors;
- two distinct Task 2 argument chains;
- two independently written IELTS Speaking Part 1 questions and answers;
- one independently structured 300–400-word Academic Reading passage with three source-based questions.

## QA rules

`tools/qa_manual_004_020.js` checks the fixed module counts, Reading length, answer completeness, Writing argument length, known grammar defects and pairwise structural similarity. It uses word-trigram Jaccard similarity for Reading and Writing and word-bigram similarity for Speaking. Any Reading pair above 45% fails the review.

The machine checks supplement manual topic-fit review; they do not treat exact-string difference as proof of originality.

## Day 021–040 QA result

- Scoped errors: 0
- Reading length: 307–351 words
- Reading question types: 8 types in rotation
- Highest pairwise Reading similarity: 0.46%
- Highest pairwise Writing similarity: 0.71%
- Highest pairwise Speaking similarity: 3.94%
- Reading pairs above the 45% rewrite threshold: 0
- Full 100-day structural QA: PASS (0 errors)

## Day 041–060 QA result

- Scoped errors: 0
- Reading length: 303–364 words
- Reading question types: 8 types in rotation
- Highest pairwise Reading similarity: 0.33%
- Highest pairwise Writing similarity: 0.36%
- Highest pairwise Speaking similarity: 4.79%
- Reading pairs above the 45% rewrite threshold: 0
- Full 100-day structural QA: PASS (0 errors)
