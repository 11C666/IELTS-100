(function () {
  'use strict';

  const synthesis = window.speechSynthesis;
  const supported = Boolean(synthesis && window.SpeechSynthesisUtterance);
  let englishVoices = [];
  let activeButton = null;

  window.IELTS_PRONUNCIATION_SUPPORTED = supported;

  function refreshVoices() {
    if (!supported) return;
    englishVoices = synthesis.getVoices().filter(voice =>
      String(voice.lang || '').toLowerCase().startsWith('en')
    );
  }

  function chooseVoice() {
    return englishVoices.find(voice => voice.default) ||
      englishVoices.find(voice => voice.localService) ||
      englishVoices[0] || null;
  }

  function clearActiveButton() {
    if (activeButton) {
      activeButton.classList.remove('is-speaking');
      if (activeButton.dataset && activeButton.dataset.idleLabel) activeButton.textContent = activeButton.dataset.idleLabel;
      if (activeButton.dataset && activeButton.dataset.idleAria) activeButton.setAttribute('aria-label', activeButton.dataset.idleAria);
    }
    activeButton = null;
  }

  function speakEnglish(text, rate, button) {
    if (!supported || !text) return false;
    synthesis.cancel();
    clearActiveButton();
    refreshVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = chooseVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en';
    }
    utterance.rate = rate || 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    const finish = () => {
      if (!button || activeButton === button) clearActiveButton();
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    activeButton = button || null;
    if (activeButton) {
      activeButton.classList.add('is-speaking');
      if (activeButton.dataset && activeButton.dataset.activeLabel) activeButton.textContent = activeButton.dataset.activeLabel;
      if (activeButton.dataset && activeButton.dataset.activeAria) activeButton.setAttribute('aria-label', activeButton.dataset.activeAria);
    }
    synthesis.speak(utterance);
    return true;
  }

  function makeButton(text, rate) {
    const button = document.createElement('button');
    button.className = 'pronounce-btn';
    button.type = 'button';
    button.dataset.pronounce = text;
    button.dataset.rate = String(rate);
    button.setAttribute('aria-label', `Pronounce ${text}`);
    button.title = `Pronounce ${text}`;
    button.textContent = '🔊';
    button.disabled = !supported;
    return button;
  }

  function decorateVocabulary() {
    document.querySelectorAll('#vocabulary .vocab').forEach(card => {
      if (card.dataset.pronunciationReady) return;
      const word = card.querySelector('strong');
      const ipa = card.querySelector('.ipa');
      const collocation = card.querySelector('.collocation');
      if (!word || !ipa || !collocation) return;

      const wordText = word.textContent.trim();
      const collocationText = Array.from(collocation.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent)
        .join(' ')
        .trim();

      ipa.after(makeButton(wordText, 0.9));
      collocation.insertBefore(makeButton(collocationText, 0.95), collocation.querySelector('br'));
      card.dataset.pronunciationReady = 'true';
    });
  }

  function decorateSpeaking() {
    document.querySelectorAll('#speaking details').forEach(item => {
      if (item.dataset.pronunciationReady) return;
      const paragraphs = Array.from(item.children).filter(child => child.tagName === 'P');
      const answer = paragraphs[paragraphs.length - 1];
      if (!answer) return;

      const button = makeButton(answer.textContent.trim(), 0.98);
      button.classList.add('speaking-listen');
      button.textContent = '🔊 Listen';
      button.dataset.idleLabel = '🔊 Listen';
      button.dataset.activeLabel = '■ Stop';
      button.dataset.idleAria = 'Listen to sample answer';
      button.dataset.activeAria = 'Stop sample answer';
      button.setAttribute('aria-label', button.dataset.idleAria);
      button.title = 'Listen to sample answer';

      const row = document.createElement('div');
      row.className = 'speaking-audio-row';
      const label = document.createElement('strong');
      label.textContent = 'Band 7+ Sample Answer';
      row.append(label, button);
      answer.before(row);
      item.dataset.pronunciationReady = 'true';
    });
  }

  function decoratePronunciation() {
    if (activeButton && typeof document.contains === 'function' && !document.contains(activeButton)) {
      synthesis.cancel();
      clearActiveButton();
    }
    decorateVocabulary();
    decorateSpeaking();
  }

  refreshVoices();
  if (supported) {
    if (typeof synthesis.addEventListener === 'function') {
      synthesis.addEventListener('voiceschanged', refreshVoices);
    } else {
      synthesis.onvoiceschanged = refreshVoices;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-pronounce]');
    if (!button || button.disabled) return;
    if (button === activeButton && button.classList.contains('is-speaking')) {
      synthesis.cancel();
      clearActiveButton();
      return;
    }
    speakEnglish(button.dataset.pronounce, Number(button.dataset.rate), button);
  });

  const observer = new MutationObserver(decoratePronunciation);
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
  decoratePronunciation();

  window.speakEnglish = speakEnglish;
})();
