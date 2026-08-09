(function () {
  'use strict';

  const collapsibleSections = [
    'vocabulary', 'paraphrases', 'sentences', 'expressions',
    'mistakes', 'writing', 'speaking', 'reading'
  ];

  const chineseSections = {
    vocabulary: ['.cn-label', '.translation'],
    writing: ['.cn-label', '.part-translation', '.pill-translation'],
    speaking: ['.cn-label', '.part-translation', 'details > .example:first-of-type'],
    reading: ['.cn-label', '.part-translation']
  };

  function headerActions(header) {
    let actions = header.querySelector(':scope > .section-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'section-actions';
      header.append(actions);
    }
    return actions;
  }

  function makeToggle(section) {
    const header = section.querySelector(':scope > header');
    if (!header) return;
    let button = header.querySelector('.part-toggle');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'reveal part-toggle';
      headerActions(header).append(button);
    }
    button.removeAttribute('id');
    button.onclick = null;
    button.textContent = 'Hide';
    button.setAttribute('aria-expanded', 'true');
    button.addEventListener('click', () => {
      const collapsed = section.classList.toggle('part-collapsed');
      button.textContent = collapsed ? 'Show' : 'Hide';
      button.setAttribute('aria-expanded', String(!collapsed));
      if (collapsed && section.querySelector('.is-speaking')) window.speechSynthesis?.cancel();
    });
    section.dataset.partControlReady = 'true';
  }

  function chineseVisible(id) {
    try {
      return localStorage.getItem(`ieltsChineseVisible:${id}`) !== 'false';
    } catch (_) {
      return true;
    }
  }

  function saveChineseVisible(id, visible) {
    try {
      localStorage.setItem(`ieltsChineseVisible:${id}`, String(visible));
    } catch (_) {}
  }

  function markChineseContent(section, id) {
    chineseSections[id].forEach(selector => {
      section.querySelectorAll(selector).forEach(element => element.classList.add('chinese-content'));
    });
  }

  function applyChineseState(section, id, button) {
    const visible = chineseVisible(id);
    section.classList.toggle('chinese-hidden', !visible);
    const label = visible ? 'Hide Chinese' : 'Show Chinese';
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} Chinese translations in ${section.querySelector('h2')?.textContent || id}`);
  }

  function makeChineseToggle(section, id) {
    const header = section.querySelector(':scope > header');
    if (!header) return;
    let button = header.querySelector('.chinese-toggle') || header.querySelector('#toggleCN');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
    }
    button.className = 'reveal chinese-toggle';
    button.onclick = null;
    const actions = headerActions(header);
    if (button.parentElement !== actions || actions.firstElementChild !== button) actions.prepend(button);
    if (!button.dataset.chineseToggleReady) {
      button.addEventListener('click', () => {
        const visible = section.classList.contains('chinese-hidden');
        saveChineseVisible(id, visible);
        applyChineseState(section, id, button);
      });
      button.dataset.chineseToggleReady = 'true';
    }
    markChineseContent(section, id);
    applyChineseState(section, id, button);
  }

  function translationElement(text, key) {
    if (!text) return null;
    const element = document.createElement('div');
    element.className = 'part-translation';
    element.dataset.translationKey = key;
    element.lang = 'zh-CN';
    element.textContent = text;
    return element;
  }

  function insertTranslation(target, text, key) {
    if (!target || !text || target.parentElement?.querySelector(`[data-translation-key="${key}"]`)) return;
    const element = translationElement(text, key);
    if (element) target.after(element);
  }

  function renderSentencePairs(target, pairs, key) {
    if (!target || !pairs?.length) return false;
    if (target.dataset.sentencePairs === key) return true;
    const fragment = document.createDocumentFragment();
    pairs.forEach((pair, index) => {
      if (!pair?.text || !pair?.translation) return;
      const group = document.createElement('span');
      group.className = 'sentence-pair';
      const english = document.createElement('span');
      english.className = 'sentence-original';
      english.textContent = pair.text;
      const chinese = document.createElement('span');
      chinese.className = 'part-translation sentence-translation';
      chinese.lang = 'zh-CN';
      chinese.dataset.translationKey = `${key}-${index}`;
      chinese.textContent = pair.translation;
      group.append(english, chinese);
      fragment.append(group);
    });
    if (!fragment.childNodes.length) return false;
    target.replaceChildren(fragment);
    target.dataset.sentencePairs = key;
    target.classList.add('sentence-pair-list');
    return true;
  }

  function renderTranslations() {
    const match = location.hash.match(/^#day-(\d{3})/);
    const day = match && window.IELTS_DAYS?.[Number(match[1])];
    if (!day) return;

    document.querySelectorAll('#paraphrases .list-row').forEach((row, index) =>
      insertTranslation(row, day.paraphrases?.[index]?.translation, `paraphrase-${index}`)
    );
    document.querySelectorAll('#sentences .list-row').forEach((row, index) => {
      const item = day.sentences?.[index];
      insertTranslation(row.querySelector('.example'), item?.exampleTranslation || item?.translation, `sentence-${index}`);
    });
    document.querySelectorAll('#expressions .list-row').forEach((row, index) => {
      const item = day.expressions?.[index];
      insertTranslation(row.querySelector('.example'), item?.exampleTranslation || item?.translation, `expression-${index}`);
    });
    document.querySelectorAll('#writing details').forEach((details, index) => {
      const item = day.writingIdeas?.[index];
      if (!item) return;
      insertTranslation(details.querySelector('summary'), item.viewpointTranslation, `writing-viewpoint-${index}`);
      insertTranslation(details.querySelector('h3'), item.topicSentenceTranslation, `writing-topic-${index}`);
      details.querySelectorAll('.collocation-pills span').forEach((pill, pillIndex) => {
        const text = item.collocationTranslations?.[pillIndex];
        if (!text || pill.querySelector('.pill-translation')) return;
        const translation = document.createElement('small');
        translation.className = 'pill-translation';
        translation.lang = 'zh-CN';
        translation.textContent = `· ${text}`;
        pill.append(translation);
      });
      const paragraphs = details.querySelectorAll(':scope > p');
      const argument = paragraphs[paragraphs.length - 1];
      if (!renderSentencePairs(argument, item.argumentSentences, `writing-argument-${index}`)) {
        insertTranslation(argument, item.translation || item.argumentTranslation, `writing-argument-${index}`);
      }
    });
    document.querySelectorAll('#speaking details').forEach((details, index) => {
      const item = day.speaking?.[index];
      if (!item) return;
      insertTranslation(details.querySelector('summary'), item.questionTranslation, `speaking-question-${index}`);
      const paragraphs = [...details.querySelectorAll(':scope > p')];
      const answer = paragraphs[paragraphs.length - 1];
      if (!renderSentencePairs(answer, item.answerSentences, `speaking-answer-${index}`)) {
        insertTranslation(answer, item.translation || item.answerTranslation, `speaking-answer-${index}`);
      }
    });
    const reading = day.reading || {};
    insertTranslation(document.querySelector('#reading .reading h3'), reading.titleTranslation, 'reading-title');
    document.querySelectorAll('#reading .reading > p').forEach((paragraph, index) => {
      if (!renderSentencePairs(paragraph, reading.paragraphSentencePairs?.[index], `reading-paragraph-${index}`)) {
        insertTranslation(paragraph, reading.paragraphTranslations?.[index], `reading-paragraph-${index}`);
      }
    });
  }

  function enhanceSections() {
    collapsibleSections.forEach(id => {
      const section = document.getElementById(id);
      if (section && !section.dataset.partControlReady) makeToggle(section);
    });
    renderTranslations();
    Object.keys(chineseSections).forEach(id => {
      const section = document.getElementById(id);
      if (section) makeChineseToggle(section, id);
    });
  }

  const observer = new MutationObserver(enhanceSections);
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
  enhanceSections();
})();
