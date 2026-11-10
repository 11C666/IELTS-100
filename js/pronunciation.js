(function () {
  'use strict';

  const synthesis = window.speechSynthesis;
  const supported = Boolean(synthesis && window.SpeechSynthesisUtterance);
  const SETTINGS_KEY = 'ieltsPronunciationV1';
  const DEFAULT_RATE = 0.9;
  let englishVoices = [];
  let playback = null;
  let settings = { voiceURI: '', rate: DEFAULT_RATE };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (typeof saved.voiceURI === 'string') settings.voiceURI = saved.voiceURI;
    if ([0.8, 0.9, 1].includes(saved.rate)) settings.rate = saved.rate;
  } catch (_) { /* Playback also works when storage is unavailable. */ }

  window.IELTS_PRONUNCIATION_SUPPORTED = supported;

  function refreshVoices() {
    if (!supported) return;
    englishVoices = synthesis.getVoices().filter(voice =>
      /^en(?:[-_]|$)/i.test(String(voice.lang || ''))
    );
    updateVoiceOptions();
  }

  function voiceScore(voice) {
    // Prefer enhanced/natural voices over legacy local voices, then British English.
    const name = String(voice.name || '');
    const quality = /natural|neural|premium|enhanced|\(advanced\)/i.test(name) ? 100 :
      /google|microsoft.*online/i.test(name) ? 80 : 0;
    return quality + (/^en[-_]gb$/i.test(voice.lang) ? 10 : 0) +
      (voice.default ? 2 : 0) + (voice.localService ? 1 : 0);
  }

  function chooseVoice() {
    const localVoices = englishVoices.filter(voice => voice.localService);
    const available = window.navigator?.onLine === false && localVoices.length ? localVoices : englishVoices;
    return available.find(voice => voice.voiceURI === settings.voiceURI) ||
      [...available].sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
  }

  function setStatus(message, reveal = false) {
    const status = document.getElementById('pronunciation-status');
    if (status && status.textContent !== message) status.textContent = message;
    if (reveal) {
      const panel = document.getElementById('pronunciation-settings');
      if (panel) panel.open = true;
    }
  }

  function setButtonState(button, playing) {
    if (!button) return;
    button.classList.toggle('is-speaking', playing);
    button.setAttribute('aria-pressed', String(playing));
    button.textContent = playing ? button.dataset.activeLabel : button.dataset.idleLabel;
    button.setAttribute('aria-label', playing ? button.dataset.activeAria : button.dataset.idleAria);
  }

  function clearTimers(session) {
    clearTimeout(session.nextTimer);
    clearTimeout(session.startTimer);
    clearTimeout(session.endTimer);
  }

  function stopEnglish(message = '') {
    const previous = playback;
    // Invalidate before cancel(): some engines dispatch the old error/end immediately.
    playback = null;
    if (previous) {
      clearTimers(previous);
      setButtonState(previous.button, false);
    }
    if (supported && (previous || synthesis.speaking || synthesis.pending || synthesis.paused)) {
      synthesis.cancel();
    }
    setStatus(message, Boolean(message));
  }

  function finish(session, message = '') {
    if (playback !== session) return;
    playback = null;
    clearTimers(session);
    setButtonState(session.button, false);
    setStatus(message);
  }

  function splitSpeech(text) {
    // Keep punctuation and every word, but stay below mobile/Chrome long-utterance limits.
    const chunks = [];
    let chunk = '';
    for (const word of text.match(/\S+/g) || []) {
      if (chunk && chunk.length + word.length + 1 > 180) {
        chunks.push(chunk);
        chunk = '';
      }
      chunk += (chunk ? ' ' : '') + word;
      if (/[.!?]["”’']?$/.test(word)) {
        chunks.push(chunk);
        chunk = '';
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  }

  function speakChunk(session) {
    if (playback !== session) return;
    const utterance = new window.SpeechSynthesisUtterance(session.chunks[session.index]);
    // A strong reference is needed until onend, especially on Safari/iOS.
    session.utterance = utterance;
    utterance.voice = session.voice;
    utterance.lang = session.voice ? session.voice.lang : 'en-GB';
    utterance.rate = session.rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    const started = () => {
      if (playback !== session || session.utterance !== utterance) return;
      clearTimeout(session.startTimer);
      setStatus('正在播放 · 再点一次停止');
    };
    utterance.onstart = started;
    utterance.onboundary = started;
    utterance.onend = () => {
      if (playback !== session || session.utterance !== utterance) return;
      clearTimers(session);
      session.index++;
      if (session.index < session.chunks.length) speakChunk(session);
      else finish(session);
    };
    utterance.onerror = event => {
      if (playback !== session || session.utterance !== utterance) return;
      const message = event.error === 'not-allowed' ?
        '浏览器未允许播放，请再点一次发音按钮。' :
        '语音播放失败，请重新点击从头播放，或在发音设置中切换英语音色。';
      stopEnglish(message);
    };
    session.startTimer = setTimeout(() => {
      if (playback === session && session.utterance === utterance) {
        stopEnglish('语音未能启动，请重新点击，或在发音设置中切换英语音色。');
      }
    }, 5000);
    session.endTimer = setTimeout(() => {
      if (playback === session && session.utterance === utterance) {
        stopEnglish('语音播放中断，请重新点击从头播放。');
      }
    }, Math.max(25000, utterance.text.split(/\s+/).length * 1000 / session.rate + 10000));
    try {
      if (synthesis.paused) synthesis.resume();
      synthesis.speak(utterance);
    } catch (_) {
      stopEnglish('语音播放失败，请重新点击，或切换英语音色。');
    }
  }

  function speakEnglish(text, rate, button) {
    if (!supported || !String(text || '').trim()) return false;
    const replacing = Boolean(playback || synthesis.speaking || synthesis.pending || synthesis.paused);
    stopEnglish();
    refreshVoices();
    const session = {
      button: button || null,
      chunks: splitSpeech(String(text)),
      index: 0,
      voice: chooseVoice(),
      rate: Number.isFinite(rate) && rate >= 0.65 && rate <= 1.1 ? rate : settings.rate
    };
    playback = session;
    setButtonState(session.button, true);
    setStatus('正在准备语音…');
    // Let cancellation settle before replacing speech; idle first clicks stay synchronous.
    if (replacing) session.nextTimer = setTimeout(() => speakChunk(session), 120);
    else speakChunk(session);
    return true;
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
  }

  function updateVoiceOptions() {
    const select = document.getElementById('pronunciation-voice');
    if (!select) return;
    const choices = [{ value: '', label: '自动选择自然英语音色' },
      ...[...englishVoices].sort((a, b) => voiceScore(b) - voiceScore(a)).map(voice => ({
        value: voice.voiceURI, label: `${voice.name} (${voice.lang})`
      }))];
    const signature = JSON.stringify(choices);
    if (select.dataset.choices !== signature) {
      select.replaceChildren(...choices.map(choice => {
        const option = document.createElement('option');
        option.value = choice.value;
        option.textContent = choice.label;
        return option;
      }));
      select.dataset.choices = signature;
    }
    select.value = englishVoices.some(voice => voice.voiceURI === settings.voiceURI) ? settings.voiceURI : '';
  }

  function decorateSettings() {
    const header = document.querySelector('.day-header');
    if (!header || document.getElementById('pronunciation-settings')) return;
    const panel = document.createElement('details');
    panel.id = 'pronunciation-settings';
    panel.className = 'audio-settings';
    panel.innerHTML = `<summary>发音设置 / Audio settings</summary>
      <div class="audio-settings-controls">
        <label>英语音色 <select id="pronunciation-voice" aria-label="英语音色"></select></label>
        <label>语速 <select id="pronunciation-rate" aria-label="发音语速">
          <option value="0.8">0.8× · 慢速</option>
          <option value="0.9">0.9× · 舒适（默认）</option>
          <option value="1">1.0× · 标准</option>
        </select></label>
        <button type="button" class="ghost audio-preview">试听音色</button>
      </div>
      <p class="audio-settings-note">设置适用于全部课程的单词、搭配、例句和口语答案，并保存在此设备。可用音色由设备提供；增强音色通常更自然，在线音色需要网络。</p>
      <p id="pronunciation-status" role="status" aria-live="polite"></p>`;
    header.after(panel);
    const voiceSelect = panel.querySelector('#pronunciation-voice');
    const rateSelect = panel.querySelector('#pronunciation-rate');
    voiceSelect.disabled = rateSelect.disabled = !supported;
    rateSelect.value = String(settings.rate);
    voiceSelect.addEventListener('change', () => {
      stopEnglish();
      settings.voiceURI = voiceSelect.value;
      saveSettings();
    });
    rateSelect.addEventListener('change', () => {
      stopEnglish();
      settings.rate = Number(rateSelect.value);
      saveSettings();
      document.querySelectorAll('[data-pronounce]').forEach(button => {
        button.dataset.rate = String(settings.rate);
      });
    });
    const preview = panel.querySelector('.audio-preview');
    preview.dataset.pronounce = 'Hello! Let’s practise English together, at a comfortable and natural pace.';
    preview.dataset.rate = String(settings.rate);
    preview.dataset.idleLabel = '试听音色';
    preview.dataset.activeLabel = '■ 停止试听';
    preview.dataset.idleAria = '试听英语音色';
    preview.dataset.activeAria = '停止试听';
    preview.setAttribute('aria-pressed', 'false');
    preview.disabled = !supported;
    updateVoiceOptions();
    if (!supported) setStatus('当前浏览器不支持语音播放，请使用 Safari、Chrome 或 Edge。', true);
  }

  function makeButton(text) {
    const button = document.createElement('button');
    button.className = 'pronounce-btn';
    button.type = 'button';
    button.dataset.pronounce = text;
    button.dataset.rate = String(settings.rate);
    button.dataset.idleLabel = '🔊';
    button.dataset.activeLabel = '■';
    button.dataset.idleAria = `Pronounce ${text}`;
    button.dataset.activeAria = 'Stop pronunciation';
    button.setAttribute('aria-label', button.dataset.idleAria);
    button.setAttribute('aria-pressed', 'false');
    button.title = `Pronounce ${text}`;
    button.textContent = button.dataset.idleLabel;
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

      ipa.after(makeButton(wordText));
      collocation.insertBefore(makeButton(collocationText), collocation.querySelector('br'));
      card.dataset.pronunciationReady = 'true';
    });
  }

  function decorateSpeaking() {
    document.querySelectorAll('#speaking details').forEach(item => {
      if (item.dataset.pronunciationReady) return;
      const paragraphs = Array.from(item.children).filter(child => child.tagName === 'P');
      const answer = paragraphs[paragraphs.length - 1];
      if (!answer) return;

      const button = makeButton(answer.textContent.trim());
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

  function decorateExpressions() {
    document.querySelectorAll('#expressions .list-row').forEach(item => {
      if (item.dataset.pronunciationReady) return;
      const example = item.querySelector(':scope > .example');
      if (!example) return;
      const text = example.textContent.trim();
      if (!text) return;

      const button = makeButton(text);
      button.classList.add('expression-listen');
      button.dataset.idleLabel = '🔊';
      button.dataset.activeLabel = '■';
      button.dataset.idleAria = 'Listen to English example';
      button.dataset.activeAria = 'Stop English example';
      button.textContent = button.dataset.idleLabel;
      button.setAttribute('aria-label', button.dataset.idleAria);
      button.title = 'Listen to English example';
      example.classList.add('expression-example');
      example.append(' ', button);
      item.dataset.pronunciationReady = 'true';
    });
  }

  function decoratePronunciation() {
    if (playback && playback.button && !document.contains(playback.button)) stopEnglish();
    decorateSettings();
    decorateVocabulary();
    decorateExpressions();
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
    if (playback && button === playback.button) {
      stopEnglish();
      return;
    }
    speakEnglish(button.dataset.pronounce, Number(button.dataset.rate), button);
  });

  window.addEventListener('pagehide', () => stopEnglish());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopEnglish();
  });

  const observer = new MutationObserver(decoratePronunciation);
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
  decoratePronunciation();

  window.speakEnglish = speakEnglish;
  window.stopEnglish = stopEnglish;
})();
