(function () {
  'use strict';

  const synthesis = window.speechSynthesis;
  const supported = Boolean(synthesis && window.SpeechSynthesisUtterance);
  const SETTINGS_KEY = 'ieltsPronunciationV1';
  const DEFAULT_RATE = 0.9;
  // Speech engines need a short gap after cancel()/end before the next utterance;
  // starting sooner clips the beginning of the replay or drops it entirely.
  const SETTLE_MS = 300;
  const MAX_RESTARTS = 2;
  let lastStopAt = 0;
  let englishVoices = [];
  let playback = null;
  const failedVoices = new Set();
  // Online recordings sound natural and can be amplified; device voices are the offline fallback.
  const SOURCES = ['online-uk', 'online-us', 'device'];
  const BOOSTS = [1, 1.5, 2];
  const ONLINE_START_MS = 6000;
  const ONLINE_RETRY_AFTER_MS = 60000;
  let onlineBlockedUntil = 0;
  let boostAvailable = true;
  let audioContext = null;
  let settings = { voiceURI: '', rate: DEFAULT_RATE, source: 'online-uk', boost: 1.5 };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (typeof saved.voiceURI === 'string') settings.voiceURI = saved.voiceURI;
    if ([0.8, 0.9, 1].includes(saved.rate)) settings.rate = saved.rate;
    if (SOURCES.includes(saved.source)) settings.source = saved.source;
    if (BOOSTS.includes(saved.boost)) settings.boost = saved.boost;
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
    const name = `${voice.name || ''} ${voice.voiceURI || ''}`;
    const quality = /natural|neural|premium|enhanced|\(advanced\)/i.test(name) ? 100 :
      /google|microsoft.*online/i.test(name) ? 80 : 0;
    return quality + (/^en[-_]gb$/i.test(voice.lang) ? 10 : 0) +
      (voice.default ? 2 : 0) + (isLocalVoice(voice) ? 1 : 0);
  }

  function isLocalVoice(voice) {
    return voice.localService === true && !/online/i.test(`${voice.name || ''} ${voice.voiceURI || ''}`);
  }

  function voiceKey(voice) {
    return voice.voiceURI || `${voice.lang}:${voice.name}`;
  }

  function sortedVoices(voices) {
    return [...voices].sort((a, b) => voiceScore(b) - voiceScore(a));
  }

  function chooseVoice() {
    const available = englishVoices.filter(voice => !failedVoices.has(voiceKey(voice)));
    const localVoices = sortedVoices(available.filter(isLocalVoice));
    const requested = available.find(voice => voice.voiceURI === settings.voiceURI);
    const offline = window.navigator?.onLine === false;
    if (requested && (isLocalVoice(requested) || !offline)) return requested;
    // Edge may list Online (Natural) voices that its speech service cannot start.
    // Installed English voices are the reliable default; online voices remain selectable.
    return localVoices[0] || (!offline && sortedVoices(available)[0]) || null;
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
      releaseAudio(previous);
      setButtonState(previous.button, false);
    }
    if (supported && (previous || synthesis.speaking || synthesis.pending || synthesis.paused)) {
      synthesis.cancel();
      lastStopAt = Date.now();
    }
    setStatus(message, Boolean(message));
  }

  function releaseAudio(session) {
    const audio = session.audio;
    if (!audio) return;
    session.audio = null;
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    } catch (_) { /* The element is being discarded anyway. */ }
  }

  function onlineUrl(text, source) {
    return `https://dict.youdao.com/dictvoice?type=${source === 'online-us' ? 2 : 1}&audio=${encodeURIComponent(text)}`;
  }

  // Route the element through a gain stage so quiet recordings can exceed volume 1.
  // The compressor keeps boosted peaks from distorting.
  function connectBoost(audio) {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return false;
      if (!audioContext) audioContext = new Context();
      if (audioContext.state === 'suspended') audioContext.resume();
      const gain = audioContext.createGain();
      gain.gain.value = settings.boost;
      const compressor = audioContext.createDynamicsCompressor();
      audioContext.createMediaElementSource(audio).connect(gain).connect(compressor).connect(audioContext.destination);
      return true;
    } catch (_) {
      return false;
    }
  }

  function createAudio(session) {
    const audio = new Audio();
    audio.preload = 'auto';
    session.boosted = false;
    if (settings.boost > 1 && boostAvailable && !session.boostFailed) {
      // Web Audio only passes cross-origin sound through when the server allows CORS.
      audio.crossOrigin = 'anonymous';
      session.boosted = connectBoost(audio);
      if (!session.boosted) audio.removeAttribute('crossorigin');
    }
    audio.addEventListener('playing', () => {
      if (playback !== session || session.audio !== audio) return;
      clearTimeout(session.startTimer);
      if (session.boostFailed && boostAvailable) {
        // Plain playback works where boosted playback failed: the service sends no CORS headers.
        boostAvailable = false;
        updateBoostOption();
      }
      setStatus(`${session.notice || ''}正在播放 · 再点一次停止`);
    });
    audio.addEventListener('ended', () => {
      if (playback !== session || session.audio !== audio) return;
      session.index++;
      if (session.index < session.chunks.length) playOnlineChunk(session);
      else finish(session);
    });
    audio.addEventListener('error', () => onlineFailed(session, audio));
    return audio;
  }

  function onlineFailed(session, audio, timedOut = false) {
    if (playback !== session || session.audio !== audio) return;
    clearTimers(session);
    releaseAudio(session);
    if (session.boosted && !timedOut) {
      // Possibly the service sent no CORS headers: replay without the volume boost.
      session.boostFailed = true;
      playOnlineChunk(session);
      return;
    }
    onlineBlockedUntil = Date.now() + ONLINE_RETRY_AFTER_MS;
    if (!supported) {
      stopEnglish('在线发音暂时不可用，请检查网络后重试。');
      return;
    }
    // Continue from the current sentence with a device voice.
    const replacement = {
      button: session.button, chunks: session.chunks, index: session.index,
      voice: chooseVoice(), rate: session.rate,
      notice: '在线发音暂时不可用，已改用本地音色。'
    };
    playback = replacement;
    setStatus(replacement.notice, true);
    speakChunk(replacement);
  }

  function playOnlineChunk(session) {
    if (playback !== session) return;
    if (!session.audio) session.audio = createAudio(session);
    const audio = session.audio;
    audio.src = onlineUrl(session.chunks[session.index], session.source);
    // playbackRate resets when a new source loads.
    audio.defaultPlaybackRate = audio.playbackRate = session.rate;
    clearTimeout(session.startTimer);
    session.startTimer = setTimeout(() => onlineFailed(session, audio, true), ONLINE_START_MS);
    const started = audio.play();
    if (started && typeof started.catch === 'function') {
      started.catch(error => {
        if (playback !== session || session.audio !== audio) return;
        if (error && error.name === 'NotAllowedError') {
          stopEnglish('浏览器未允许播放，请直接点击发音按钮重试，并检查此网站的声音权限。');
        } else if (!error || error.name !== 'AbortError') {
          onlineFailed(session, audio);
        }
      });
    }
  }

  function settleDelay() {
    return Math.max(0, SETTLE_MS - (Date.now() - lastStopAt));
  }

  // Replay the current chunk after the engine has settled. Used when a stale
  // cancel() swallows a freshly queued utterance (common on repeat clicks).
  function restartChunk(session) {
    if (playback !== session) return false;
    if ((session.restarts || 0) >= MAX_RESTARTS) return false;
    session.restarts = (session.restarts || 0) + 1;
    clearTimers(session);
    session.utterance = null;
    if (synthesis.speaking || synthesis.pending) synthesis.cancel();
    lastStopAt = Date.now();
    session.nextTimer = setTimeout(() => speakChunk(session), SETTLE_MS);
    return true;
  }

  function finish(session, message = session.notice || '') {
    if (playback !== session) return;
    playback = null;
    lastStopAt = Date.now();
    clearTimers(session);
    setButtonState(session.button, false);
    setStatus(message, Boolean(message));
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

  function recoverPlayback(session, message) {
    if (playback !== session) return;
    if (session.voice) failedVoices.add(voiceKey(session.voice));
    const localVoices = sortedVoices(englishVoices.filter(voice =>
      isLocalVoice(voice) && !failedVoices.has(voiceKey(voice))
    ));
    const fallback = localVoices[0];
    if (session.fallbackUsed || !fallback) {
      if (!fallback && (!session.voice || !isLocalVoice(session.voice))) {
        message = '英语语音未能播放，当前设备没有其他可用的本地英语音色。请在系统设置中安装英语语音，或更换浏览器后重试。';
      }
      stopEnglish(message);
      return;
    }
    const notice = `${session.voice && !isLocalVoice(session.voice) ? '在线音色' : '原音色'}无法播放，已切换为本地英语音色：${fallback.name}。`;
    // Use a new session so late callbacks from the failed voice cannot cancel the retry.
    const replacement = {
      button: session.button, chunks: session.chunks, index: 0,
      voice: fallback, rate: session.rate, fallbackUsed: true, notice
    };
    stopEnglish();
    if (settings.voiceURI) {
      settings.voiceURI = fallback.voiceURI;
      saveSettings();
    }
    updateVoiceOptions();
    playback = replacement;
    setButtonState(replacement.button, true);
    setStatus(`${notice}正在从头重播…`, true);
    replacement.nextTimer = setTimeout(() => speakChunk(replacement), SETTLE_MS);
  }

  function speakChunk(session) {
    if (playback !== session) return;
    // The engine can still be flushing the previous playback even after its end
    // event; queueing behind it would clip or drop this utterance.
    if (session.index === 0 && (synthesis.speaking || synthesis.pending) && restartChunk(session)) return;
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
      setStatus(`${session.notice || ''}正在播放 · 再点一次停止`);
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
      if (event.error === 'not-allowed') {
        stopEnglish('浏览器未允许播放，请直接点击发音按钮重试，并检查此网站的声音权限。');
      } else if (event.error === 'interrupted' || event.error === 'canceled') {
        // Not user-initiated (that path clears `playback` first): a late cancel
        // from the previous playback hit this utterance, so replay it.
        if (restartChunk(session)) return;
        stopEnglish('语音播放被中断，请重新点击从头播放。');
      } else {
        recoverPlayback(session, '语音播放失败，请重新点击从头播放，或切换其他本地英语音色。');
      }
    };
    session.startTimer = setTimeout(() => {
      if (playback === session && session.utterance === utterance) {
        recoverPlayback(session, '语音未能启动，请重新点击，或切换其他本地英语音色。');
      }
    }, session.voice && !isLocalVoice(session.voice) ? 10000 : 5000);
    session.endTimer = setTimeout(() => {
      if (playback === session && session.utterance === utterance) {
        stopEnglish('语音播放中断，请重新点击从头播放。');
      }
    }, Math.max(25000, utterance.text.split(/\s+/).length * 1000 / session.rate + 10000));
    try {
      if (synthesis.paused) synthesis.resume();
      synthesis.speak(utterance);
    } catch (_) {
      recoverPlayback(session, '语音播放失败，请重新点击，或切换其他本地英语音色。');
    }
  }

  function speakEnglish(text, rate, button) {
    if (!String(text || '').trim()) return false;
    const online = settings.source !== 'device' && window.navigator?.onLine !== false &&
      Date.now() >= onlineBlockedUntil;
    if (!online && !supported) return false;
    stopEnglish();
    refreshVoices();
    const session = {
      button: button || null,
      chunks: splitSpeech(String(text)),
      index: 0,
      voice: chooseVoice(),
      source: settings.source,
      rate: Number.isFinite(rate) && rate >= 0.65 && rate <= 1.1 ? rate : settings.rate
    };
    playback = session;
    setButtonState(session.button, true);
    setStatus('正在准备语音…');
    if (online) {
      playOnlineChunk(session);
      return true;
    }
    // Let the previous playback settle before speaking again; idle first clicks stay
    // synchronous so the browser still sees them as a direct user gesture.
    const delay = settleDelay();
    if (delay > 0) session.nextTimer = setTimeout(() => speakChunk(session), delay);
    else speakChunk(session);
    return true;
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
  }

  function updateBoostOption() {
    const select = document.getElementById('pronunciation-boost');
    if (!select) return;
    select.disabled = !boostAvailable;
    if (!boostAvailable) select.title = '当前在线发音不支持音量增强';
  }

  function updateVoiceOptions() {
    const select = document.getElementById('pronunciation-voice');
    if (!select) return;
    const choices = [{ value: '', label: '自动选择（优先本地英语音色）' },
      ...[...englishVoices].sort((a, b) => voiceScore(b) - voiceScore(a)).map(voice => ({
        value: voice.voiceURI, label: `${voice.name} (${voice.lang}) · ${isLocalVoice(voice) ? '本地' : '在线，需联网'}`
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
        <label>发音来源 <select id="pronunciation-source" aria-label="发音来源">
          <option value="online-uk">在线自然发音 · 英式（推荐）</option>
          <option value="online-us">在线自然发音 · 美式</option>
          <option value="device">本机音色（可离线）</option>
        </select></label>
        <label>音量增强 <select id="pronunciation-boost" aria-label="在线发音音量增强">
          <option value="1">1× · 原始音量</option>
          <option value="1.5">1.5× · 增强（默认）</option>
          <option value="2">2× · 最大</option>
        </select></label>
        <label>本机音色 <select id="pronunciation-voice" aria-label="本机英语音色"></select></label>
        <label>语速 <select id="pronunciation-rate" aria-label="发音语速">
          <option value="0.8">0.8× · 慢速</option>
          <option value="0.9">0.9× · 舒适（默认）</option>
          <option value="1">1.0× · 标准</option>
        </select></label>
        <button type="button" class="ghost audio-preview">试听音色</button>
      </div>
      <p class="audio-settings-note">设置适用于全部课程，并保存在此设备。默认使用在线自然发音（需要联网，朗读的英文会发送到有道词典发音服务）；离线或在线发音不可用时自动改用本机音色。音量增强只对在线发音有效。</p>
      <p id="pronunciation-status" role="status" aria-live="polite"></p>`;
    header.after(panel);
    const voiceSelect = panel.querySelector('#pronunciation-voice');
    const rateSelect = panel.querySelector('#pronunciation-rate');
    voiceSelect.disabled = !supported;
    const sourceSelect = panel.querySelector('#pronunciation-source');
    const boostSelect = panel.querySelector('#pronunciation-boost');
    sourceSelect.value = settings.source;
    boostSelect.value = String(settings.boost);
    sourceSelect.addEventListener('change', () => {
      stopEnglish();
      settings.source = sourceSelect.value;
      onlineBlockedUntil = 0;
      saveSettings();
    });
    boostSelect.addEventListener('change', () => {
      stopEnglish();
      settings.boost = Number(boostSelect.value);
      saveSettings();
    });
    updateBoostOption();
    rateSelect.value = String(settings.rate);
    voiceSelect.addEventListener('change', () => {
      stopEnglish();
      settings.voiceURI = voiceSelect.value;
      const chosen = englishVoices.find(voice => voice.voiceURI === settings.voiceURI);
      if (chosen) failedVoices.delete(voiceKey(chosen));
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
    updateVoiceOptions();
    if (!supported) setStatus('当前浏览器没有本机英语音色，只能使用在线发音。', true);
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
