(function () {
  'use strict';

  const synthesis = window.speechSynthesis;
  const supported = Boolean(synthesis && window.SpeechSynthesisUtterance);
  const SETTINGS_KEY = 'ieltsPronunciationV2';
  const OLD_SETTINGS_KEY = 'ieltsPronunciationV1';
  const DEFAULT_RATE = 0.9;
  // Speech engines need a short gap after cancel()/end before the next utterance;
  // starting sooner clips the beginning of the replay or drops it entirely.
  const SETTLE_MS = 300;
  const MAX_RESTARTS = 2;
  let lastStopAt = 0;
  let englishVoices = [];
  let playback = null;
  const failedVoices = new Set();
  // Bundled recordings are natural, work offline and can be amplified. Online
  // recordings and device voices are the fallbacks, in that order.
  const SOURCES = ['offline-us', 'online-uk', 'online-us', 'device'];
  const OFFLINE_AUDIO_DIR = 'audio/us/';
  const BOOSTS = [1, 1.5, 2];
  const ONLINE_START_MS = 6000;
  const ONLINE_RETRY_AFTER_MS = 60000;
  let onlineBlockedUntil = 0;
  let boostAvailable = true;
  let audioContext = null;
  let boostInput = null;
  // The sound output goes idle between clips and swallows the start of the next one,
  // most noticeably when a cached clip starts instantly. A near-silent tone wakes it
  // before playback and keeps it awake between clicks.
  const WARM_MS = 400;
  const KEEP_ALIVE_MS = 30000;
  // Short items (words, phrases) replay when clicked again; long ones toggle stop.
  const REPLAY_MAX_CHARS = 80;
  let keepAlive = null;
  let keepAliveTimer = 0;
  let outputReadyAt = 0;
  let hasSpoken = false;
  let settings = { voiceURI: '', rate: DEFAULT_RATE, source: 'offline-us', boost: 1.5 };
  try {
    // V1 settings predate the bundled voice: keep the voice and speed, not the source.
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') ||
      { ...JSON.parse(localStorage.getItem(OLD_SETTINGS_KEY) || '{}'), source: undefined };
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

  function isReplayText(text) {
    const value = String(text || '').trim();
    return value.length <= REPLAY_MAX_CHARS && splitSpeech(value).length <= 1;
  }

  function setButtonState(button, playing) {
    if (!button) return;
    button.classList.toggle('is-speaking', playing);
    button.setAttribute('aria-pressed', String(playing));
    // Replay buttons never act as a stop control, so they keep their idle label.
    if (isReplayText(button.dataset.pronounce)) return;
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
      restOutput();
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
      if (session.sourceNode) session.sourceNode.disconnect();
      session.sourceNode = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    } catch (_) { /* The element is being discarded anyway. */ }
  }

  // cyrb53: a fast synchronous hash, so a clip's file name can be derived inside the click.
  function audioKey(text) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ code, 2654435761);
      h2 = Math.imul(h2 ^ code, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }

  function isOnlineSource(source) {
    return source === 'online-uk' || source === 'online-us';
  }

  function canUseOnline() {
    return window.navigator?.onLine !== false && Date.now() >= onlineBlockedUntil;
  }

  function onlineUrl(text, source) {
    if (source === 'offline-us') return `${OFFLINE_AUDIO_DIR}${audioKey(text)}.mp3`;
    return `https://dict.youdao.com/dictvoice?type=${source === 'online-us' ? 2 : 1}&audio=${encodeURIComponent(text)}`;
  }

  function getContext() {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      if (!audioContext) audioContext = new Context();
      return audioContext;
    } catch (_) {
      return null;
    }
  }

  // Wake the sound output. Returns how long to wait before audible playback.
  function wakeOutput() {
    clearTimeout(keepAliveTimer);
    const context = getContext();
    if (!context) return 0;
    try {
      let cold = false;
      if (context.state !== 'running') {
        context.resume();
        cold = true;
      }
      if (!keepAlive) {
        const tone = context.createOscillator();
        const level = context.createGain();
        tone.frequency.value = 20;
        level.gain.value = 0.001;
        tone.connect(level).connect(context.destination);
        tone.start();
        keepAlive = tone;
        cold = true;
      }
      if (cold) outputReadyAt = Date.now() + WARM_MS;
    } catch (_) {
      return 0;
    }
    return Math.max(0, outputReadyAt - Date.now());
  }

  function restOutput() {
    clearTimeout(keepAliveTimer);
    keepAliveTimer = setTimeout(() => {
      if (playback || !keepAlive) return;
      try {
        keepAlive.stop();
        keepAlive.disconnect();
      } catch (_) { /* Already stopped. */ }
      keepAlive = null;
    }, KEEP_ALIVE_MS);
  }

  // Route the element through a shared gain stage so quiet recordings can exceed
  // volume 1. The compressor keeps boosted peaks from distorting.
  function connectBoost(session, audio) {
    const context = getContext();
    if (!context) return false;
    try {
      if (!boostInput) {
        boostInput = context.createGain();
        boostInput.connect(context.createDynamicsCompressor()).connect(context.destination);
      }
      boostInput.gain.value = settings.boost;
      session.sourceNode = context.createMediaElementSource(audio);
      session.sourceNode.connect(boostInput);
      return true;
    } catch (_) {
      return false;
    }
  }

  function createAudio(session) {
    const audio = new Audio();
    audio.preload = 'auto';
    session.boosted = false;
    const online = isOnlineSource(session.source);
    if (settings.boost > 1 && (!online || (boostAvailable && !session.boostFailed))) {
      // Web Audio only passes cross-origin sound through when the server allows CORS.
      if (online) audio.crossOrigin = 'anonymous';
      session.boosted = connectBoost(session, audio);
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
      setStatus(`${session.notice || ''}正在播放 · 再点一次${session.replay ? '重播' : '停止'}`);
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
    let notice = '在线发音暂时不可用，已改用本机音色。';
    if (session.source === 'offline-us') {
      // No bundled clip for this text (or it is not cached while offline).
      if (canUseOnline()) {
        session.source = 'online-us';
        playOnlineChunk(session);
        return;
      }
      notice = '这段内容的离线语音不可用，已改用本机音色。';
    } else {
      if (session.boosted && !timedOut) {
        // Possibly the service sent no CORS headers: replay without the volume boost.
        session.boostFailed = true;
        playOnlineChunk(session);
        return;
      }
      onlineBlockedUntil = Date.now() + ONLINE_RETRY_AFTER_MS;
    }
    if (!supported) {
      stopEnglish('语音暂时不可用，请检查网络后重试。');
      return;
    }
    // Continue from the current sentence with a device voice.
    const replacement = {
      button: session.button, chunks: session.chunks, index: session.index,
      voice: chooseVoice(), rate: session.rate, replay: session.replay,
      notice
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
    // Only the first clip of a playback can meet a sleeping output.
    const wait = session.warmed ? 0 : wakeOutput();
    session.warmed = true;
    clearTimeout(session.startTimer);
    session.startTimer = setTimeout(() => onlineFailed(session, audio, true), ONLINE_START_MS + wait);
    if (wait > 0) {
      // Claim the click for this element and let it load, but hold the sound until the output is awake.
      const primed = audio.play();
      if (primed && typeof primed.catch === 'function') primed.catch(() => {});
      audio.pause();
      session.nextTimer = setTimeout(() => startOnline(session, audio), wait);
    } else {
      startOnline(session, audio);
    }
  }

  function startOnline(session, audio) {
    if (playback !== session || session.audio !== audio) return;
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
    releaseAudio(session);
    restOutput();
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
      voice: fallback, rate: session.rate, replay: session.replay, fallbackUsed: true, notice
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
      setStatus(`${session.notice || ''}正在播放 · 再点一次${session.replay ? '重播' : '停止'}`);
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
    const online = settings.source === 'offline-us' ||
      (isOnlineSource(settings.source) && canUseOnline());
    if (!online && !supported) return false;
    stopEnglish();
    refreshVoices();
    const session = {
      button: button || null,
      chunks: splitSpeech(String(text)),
      index: 0,
      replay: isReplayText(text),
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
    // The very first speak() must stay inside the click for Safari; later ones can wait for the output.
    const wake = wakeOutput();
    const delay = Math.max(settleDelay(), hasSpoken ? wake : 0);
    hasSpoken = true;
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
    if (!boostAvailable) select.title = '在线发音不支持音量增强；离线自然发音仍然有效';
  }

  let downloading = false;

  // Fetch every bundled clip once so the service worker caches it for offline use.
  async function downloadOfflineAudio(event) {
    const button = event.currentTarget;
    if (downloading) return;
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      setStatus('当前打开方式不支持离线缓存，请通过网址访问本站后重试。', true);
      return;
    }
    downloading = true;
    button.disabled = true;
    try {
      const index = await (await fetch(`${OFFLINE_AUDIO_DIR}index.json`, { cache: 'no-cache' })).json();
      const keys = index.keys;
      let next = 0;
      let done = 0;
      let failed = 0;
      const worker = async () => {
        while (next < keys.length) {
          const key = keys[next++];
          try {
            const response = await fetch(`${OFFLINE_AUDIO_DIR}${key}.mp3`);
            if (!response.ok) throw new Error(String(response.status));
            await response.arrayBuffer();
          } catch (_) {
            failed++;
          }
          done++;
          if (done % 25 === 0 || done === keys.length) {
            setStatus(`正在下载离线语音 ${done}/${keys.length}（约 ${Math.round(index.bytes / 1048576)} MB）…`, true);
          }
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      setStatus(failed ? `离线语音下载完成，但有 ${failed} 个文件失败，请稍后再点一次补齐。` :
        '全部离线语音已下载，断网也可以播放。', true);
    } catch (_) {
      setStatus('离线语音下载失败，请检查网络后重试。', true);
    }
    downloading = false;
    button.disabled = false;
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
          <option value="offline-us">离线自然发音 · 美式（推荐）</option>
          <option value="online-uk">在线发音 · 英式</option>
          <option value="online-us">在线发音 · 美式</option>
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
        <button type="button" class="ghost audio-download">下载全部离线语音</button>
      </div>
      <p class="audio-settings-note">设置适用于全部课程，并保存在此设备。默认使用随网站提供的离线自然发音（美式），不向第三方发送内容；听过的内容会自动缓存，点“下载全部离线语音”可一次缓存全部，之后断网也能播放。选择在线发音时，朗读的英文会发送到有道词典发音服务。音量增强对离线和在线发音有效，对本机音色无效。单词和短语再点一次会从头重播，长句再点一次停止。<span class="audio-version">发音模块 v4</span></p>
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
    panel.querySelector('.audio-download').addEventListener('click', downloadOfflineAudio);
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
    if (playback && button === playback.button && !playback.replay) {
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

  // Used by tools/collect_pronunciation_texts.js so generated clips match what is played.
  window.IELTS_PRONUNCIATION = { splitSpeech, audioKey };
  window.speakEnglish = speakEnglish;
  window.stopEnglish = stopEnglish;
})();
