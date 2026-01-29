// Article TTS Player with Play/Pause/Stop controls
// Supports ElevenLabs premium TTS with fallback to browser voices
(function() {
  'use strict';

  // Hide preloader after load (same logic as main script.js)
  function hidePreloader() {
    const preloader = document.querySelector('[data-preaload]');
    document.body.classList.add('loaded');
    if (preloader) {
      preloader.classList.add('loaded');
    }
    window.scrollTo(0, 0);
  }

  // Run preloader hide on load
  window.addEventListener('load', hidePreloader);

  // Helper to get current language with legacy key fallback
  function getSavedLanguage() {
    return localStorage.getItem('mindbalance-language') || localStorage.getItem('mindbalance_language') || 'en';
  }
  
  // Translation helper
  function getTranslation(key, fallback) {
    if (window.translations) {
      const lang = getSavedLanguage();
      const langMap = { en: 'en', es: 'es', fr: 'fr', zh: 'zh', hi: 'hi', ko: 'ko' };
      const langKey = langMap[lang] || 'en';
      if (window.translations[langKey] && window.translations[langKey][key]) {
        return window.translations[langKey][key];
      }
    }
    return fallback;
  }

  // TTS Engine State
  let ttsEngine = localStorage.getItem('tts-engine') || 'elevenlabs'; // 'elevenlabs' or 'browser'
  let selectedVoice = localStorage.getItem('tts-voice') || 'rachel';
  let elevenLabsAvailable = false;
  let currentAudio = null; // For ElevenLabs audio playback
  let audioCache = {}; // Cache generated audio by paragraph index
  
  // Browser TTS State
  let speechSynthesis = window.speechSynthesis;
  let currentUtterance = null;
  let isPlaying = false;
  let isPaused = false;
  let currentParagraphIndex = 0;
  let paragraphs = [];
  let playbackSpeed = parseFloat(localStorage.getItem('tts-speed') || '1.0');
  let playbackVolume = parseFloat(localStorage.getItem('tts-volume') || '1.0');
  let isMuted = false;
  let autoScrollEnabled = localStorage.getItem('tts-autoscroll') !== 'false';
  let ttsTimeRemaining = 0;
  let isGeneratingAudio = false;

  // Check if ElevenLabs API is available
  async function checkElevenLabsAvailability() {
    try {
      console.log('Checking ElevenLabs availability...');
      const response = await fetch('/api/tts/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('ElevenLabs health check response:', data);
        elevenLabsAvailable = data.available === true;
        
        if (elevenLabsAvailable) {
          console.log('ElevenLabs is available - premium TTS enabled');
          // Restore user's preferred engine if ElevenLabs is available
          const savedEngine = localStorage.getItem('tts-engine');
          if (savedEngine === 'elevenlabs' || !savedEngine) {
            ttsEngine = 'elevenlabs';
          }
        } else {
          console.log('ElevenLabs API key not configured on server');
          ttsEngine = 'browser';
          localStorage.setItem('tts-engine', 'browser');
        }
      } else {
        console.warn('ElevenLabs health check failed with status:', response.status);
        elevenLabsAvailable = false;
        ttsEngine = 'browser';
        localStorage.setItem('tts-engine', 'browser');
      }
    } catch (e) {
      console.warn('ElevenLabs not available, using browser TTS. Error:', e.message);
      elevenLabsAvailable = false;
      ttsEngine = 'browser';
      localStorage.setItem('tts-engine', 'browser');
    }
    updateVoiceSelector();
  }

  // Fetch available voices from ElevenLabs
  async function fetchElevenLabsVoices() {
    try {
      const response = await fetch('/api/tts/voices');
      if (response.ok) {
        const data = await response.json();
        return data.voices || [];
      }
    } catch (e) {
      console.error('Failed to fetch voices:', e);
    }
    return [];
  }

  // Update voice selector UI
  async function updateVoiceSelector() {
    const voiceSelect = document.getElementById('ttsVoiceSelect');
    const engineToggle = document.getElementById('ttsEngineToggle');
    
    if (engineToggle) {
      engineToggle.textContent = ttsEngine === 'elevenlabs' ? '🎙️ Premium' : '🔊 Browser';
      engineToggle.title = ttsEngine === 'elevenlabs' 
        ? getTranslation('tts_premium_voice', 'Premium AI Voice (ElevenLabs)')
        : getTranslation('tts_browser_voice', 'Browser Voice');
    }
    
    if (!voiceSelect) return;
    
    voiceSelect.innerHTML = '';
    
    if (ttsEngine === 'elevenlabs' && elevenLabsAvailable) {
      const voices = await fetchElevenLabsVoices();
      voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = voice.name;
        if (voice.id === selectedVoice) option.selected = true;
        voiceSelect.appendChild(option);
      });
      voiceSelect.disabled = false;
    } else {
      // Show browser voices
      const browserVoices = speechSynthesis ? speechSynthesis.getVoices() : [];
      if (browserVoices.length === 0) {
        const option = document.createElement('option');
        option.textContent = getTranslation('tts_default_voice', 'Default Voice');
        voiceSelect.appendChild(option);
      } else {
        browserVoices.slice(0, 10).forEach((voice, i) => {
          const option = document.createElement('option');
          option.value = i.toString();
          option.textContent = `${voice.name} (${voice.lang})`;
          voiceSelect.appendChild(option);
        });
      }
    }
  }

  // Get all readable content
  function getArticleContent() {
    const contentArea = document.querySelector('.article-content');
    if (!contentArea) return [];
    
    const elements = contentArea.querySelectorAll('h2, h3, p, li');
    return Array.from(elements).map(el => el.textContent.trim()).filter(text => text.length > 0);
  }

  // Highlight current paragraph being read and auto-scroll
  function highlightParagraph(index) {
    const elements = document.querySelectorAll('.article-content h2, .article-content h3, .article-content p, .article-content li');
    elements.forEach((el, i) => {
      el.classList.toggle('tts-reading', i === index);
      // Restore original content when no longer reading
      if (i !== index && el.dataset.originalHtml) {
        el.innerHTML = el.dataset.originalHtml;
        delete el.dataset.originalHtml;
      }
    });
    
    // Wrap words in spans for word-level highlighting (browser TTS only)
    if (ttsEngine === 'browser' && elements[index]) {
      const el = elements[index];
      if (!el.dataset.originalHtml) {
        el.dataset.originalHtml = el.innerHTML;
        wrapWordsInSpans(el);
      }
    }
    
    // Auto-scroll to keep current paragraph in view
    if (autoScrollEnabled && elements[index]) {
      const el = elements[index];
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Only scroll if element is not in the middle portion of viewport
      if (rect.top < 100 || rect.bottom > viewportHeight - 100) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
  
  // Wrap each word in a span for word-level TTS tracking
  function wrapWordsInSpans(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    
    textNodes.forEach(node => {
      const text = node.textContent;
      if (!text.trim()) return;
      
      const fragment = document.createDocumentFragment();
      const words = text.split(/(\s+)/);
      
      words.forEach(word => {
        if (word.match(/^\s+$/)) {
          fragment.appendChild(document.createTextNode(word));
        } else if (word) {
          const span = document.createElement('span');
          span.className = 'tts-word';
          span.textContent = word;
          fragment.appendChild(span);
        }
      });
      
      node.parentNode.replaceChild(fragment, node);
    });
  }
  
  // Highlight current word being spoken
  function highlightWord(charIndex) {
    const elements = document.querySelectorAll('.article-content h2, .article-content h3, .article-content p, .article-content li');
    const currentEl = elements[currentParagraphIndex];
    if (!currentEl) return;
    
    // Clear previous word highlight
    document.querySelectorAll('.tts-current-word').forEach(el => {
      el.classList.remove('tts-current-word');
    });
    
    // Find the word at the current character index using cumulative text
    const wordSpans = currentEl.querySelectorAll('.tts-word');
    const fullText = paragraphs[currentParagraphIndex] || '';
    let charCount = 0;
    
    for (const span of wordSpans) {
      const word = span.textContent;
      const wordStart = fullText.indexOf(word, charCount);
      if (wordStart === -1) {
        charCount += word.length + 1;
        continue;
      }
      const wordEnd = wordStart + word.length;
      
      if (charIndex >= wordStart && charIndex < wordEnd) {
        span.classList.add('tts-current-word');
        break;
      }
      charCount = wordEnd;
    }
  }

  // Clear all highlights
  function clearHighlights() {
    document.querySelectorAll('.tts-reading').forEach(el => {
      el.classList.remove('tts-reading');
      // Restore original content
      if (el.dataset.originalHtml) {
        el.innerHTML = el.dataset.originalHtml;
        delete el.dataset.originalHtml;
      }
    });
    // Clear any word highlights
    document.querySelectorAll('.tts-current-word').forEach(el => {
      el.classList.remove('tts-current-word');
    });
  }

  // Update player UI
  function updatePlayerUI() {
    const playBtn = document.getElementById('ttsPlayBtn');
    const pauseBtn = document.getElementById('ttsPauseBtn');
    const stopBtn = document.getElementById('ttsStopBtn');
    const statusText = document.getElementById('ttsStatus');
    const progressBar = document.getElementById('ttsProgressFill');

    if (playBtn) {
      playBtn.style.display = (isPlaying && !isPaused) ? 'none' : 'flex';
      playBtn.setAttribute('aria-pressed', isPlaying && !isPaused ? 'true' : 'false');
    }
    if (pauseBtn) {
      pauseBtn.style.display = (isPlaying && !isPaused) ? 'flex' : 'none';
    }
    if (stopBtn) {
      stopBtn.disabled = !isPlaying && !isPaused;
    }

    if (statusText) {
      if (isPlaying && !isPaused) {
        // Show time remaining during playback
        const timeRemaining = calculateTimeRemaining();
        statusText.textContent = timeRemaining;
        statusText.removeAttribute('data-translate');
      } else if (isPaused) {
        statusText.textContent = getTranslation('tts_paused', 'Paused');
        statusText.setAttribute('data-translate', 'tts_paused');
      } else {
        statusText.textContent = getTranslation('tts_ready', 'Ready to play');
        statusText.setAttribute('data-translate', 'tts_ready');
      }
    }

    if (progressBar && paragraphs.length > 0) {
      const progress = ((currentParagraphIndex) / paragraphs.length) * 100;
      progressBar.style.width = progress + '%';
    }
    
    // Update TTS time remaining
    updateTTSTimeRemaining();
    
    // Update volume UI
    updateVolumeUI();
    
    // Update auto-scroll toggle
    const autoScrollBtn = document.getElementById('ttsAutoScrollBtn');
    if (autoScrollBtn) {
      autoScrollBtn.classList.toggle('active', autoScrollEnabled);
    }
  }
  
  // Calculate time remaining as formatted string
  function calculateTimeRemaining() {
    if (paragraphs.length === 0) return '--:--';
    
    // Calculate remaining text length
    let remainingChars = 0;
    for (let i = currentParagraphIndex; i < paragraphs.length; i++) {
      remainingChars += paragraphs[i].length;
    }
    
    // Estimate: ~15 characters per second at 1x speed, adjusted for playback speed
    const charsPerSecond = 15 * playbackSpeed;
    const remainingSeconds = Math.ceil(remainingChars / charsPerSecond);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
  }
  
  // Calculate and update TTS time remaining
  function updateTTSTimeRemaining() {
    const ttsTimeDisplay = document.getElementById('ttsTimeRemaining');
    if (!ttsTimeDisplay || paragraphs.length === 0) return;
    
    const timeRemaining = calculateTimeRemaining();
    ttsTimeDisplay.textContent = timeRemaining.replace(' remaining', '');
  }
  
  // Update volume UI
  function updateVolumeUI() {
    const volumeSlider = document.getElementById('ttsVolumeSlider');
    const volumeIcon = document.getElementById('ttsVolumeIcon');
    const volumeValue = document.getElementById('ttsVolumeValue');
    
    if (volumeSlider) {
      volumeSlider.value = isMuted ? 0 : playbackVolume * 100;
    }
    
    if (volumeValue) {
      volumeValue.textContent = isMuted ? '0%' : Math.round(playbackVolume * 100) + '%';
    }
    
    if (volumeIcon) {
      if (isMuted || playbackVolume === 0) {
        volumeIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
      } else if (playbackVolume < 0.5) {
        volumeIcon.innerHTML = '<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>';
      } else {
        volumeIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
      }
    }
  }

  // Get user's selected language for TTS
  function getUserLanguage() {
    const savedLang = getSavedLanguage();
    const langMap = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'zh': 'zh-CN',
      'hi': 'hi-IN',
      'ko': 'ko-KR'
    };
    return langMap[savedLang] || 'en-US';
  }

  // Voice cache for reliable TTS language selection
  let cachedVoices = [];
  
  // Load voices (handles async voice loading in some browsers)
  function loadVoices() {
    cachedVoices = speechSynthesis.getVoices();
  }
  
  // Initialize voice loading
  if (speechSynthesis) {
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // Find best voice for language
  function findVoiceForLanguage(lang) {
    const voices = cachedVoices.length ? cachedVoices : speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Try exact match first
    let voice = voices.find(v => v.lang === lang);
    if (voice) return voice;

    // Try language prefix match (e.g., 'en' matches 'en-GB')
    const langPrefix = lang.split('-')[0];
    voice = voices.find(v => v.lang.startsWith(langPrefix));
    if (voice) return voice;

    // Fallback to first available
    return voices[0];
  }

  // Generate audio using ElevenLabs API
  async function generateElevenLabsAudio(text) {
    const userLang = getSavedLanguage();
    
    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: selectedVoice,
          language: userLang
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'TTS generation failed');
      }
      
      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (e) {
      console.error('ElevenLabs TTS error:', e);
      throw e;
    }
  }

  // Speak a single paragraph using ElevenLabs
  async function speakParagraphElevenLabs(index) {
    if (index >= paragraphs.length) {
      stopSpeech();
      return;
    }

    currentParagraphIndex = index;
    highlightParagraph(index);
    updatePlayerUI();
    
    const text = paragraphs[index];
    
    // Check cache first
    let audioUrl = audioCache[index];
    
    if (!audioUrl) {
      // Show generating status
      const statusText = document.getElementById('ttsStatus');
      if (statusText) {
        statusText.textContent = getTranslation('tts_generating', 'Generating audio...');
      }
      isGeneratingAudio = true;
      
      try {
        audioUrl = await generateElevenLabsAudio(text);
        audioCache[index] = audioUrl;
      } catch (e) {
        // Fallback to browser TTS on error
        console.warn('Falling back to browser TTS:', e.message);
        ttsEngine = 'browser';
        localStorage.setItem('tts-engine', 'browser');
        elevenLabsAvailable = false;
        updateVoiceSelector();
        speakParagraphBrowser(index);
        return;
      }
      
      isGeneratingAudio = false;
    }
    
    // Stop any current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    
    // Play the audio
    currentAudio = new Audio(audioUrl);
    currentAudio.volume = isMuted ? 0 : playbackVolume;
    currentAudio.playbackRate = playbackSpeed;
    
    currentAudio.onended = () => {
      if (isPlaying && !isPaused) {
        speakParagraphElevenLabs(index + 1);
      }
    };
    
    currentAudio.onerror = (e) => {
      console.error('Audio playback error:', e);
      // Try next paragraph or stop
      if (isPlaying && !isPaused && index + 1 < paragraphs.length) {
        speakParagraphElevenLabs(index + 1);
      } else {
        stopSpeech();
      }
    };
    
    try {
      await currentAudio.play();
      updatePlayerUI();
    } catch (e) {
      console.error('Failed to play audio:', e);
    }
  }

  // Speak a single paragraph using browser TTS
  function speakParagraphBrowser(index) {
    if (index >= paragraphs.length) {
      stopSpeech();
      return;
    }

    currentParagraphIndex = index;
    highlightParagraph(index);
    updatePlayerUI();

    const userLang = getUserLanguage();
    currentUtterance = new SpeechSynthesisUtterance(paragraphs[index]);
    currentUtterance.lang = userLang;
    currentUtterance.rate = playbackSpeed;
    currentUtterance.pitch = 1;
    currentUtterance.volume = isMuted ? 0 : playbackVolume;

    // Try to set a voice that matches the user's language
    const voice = findVoiceForLanguage(userLang);
    if (voice) {
      currentUtterance.voice = voice;
    }

    currentUtterance.onend = () => {
      if (isPlaying && !isPaused) {
        speakParagraphBrowser(index + 1);
      }
    };

    currentUtterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('TTS Error:', e.error);
      }
    };
    
    // Word-by-word tracking using boundary events
    currentUtterance.onboundary = (event) => {
      if (event.name === 'word') {
        highlightWord(event.charIndex);
      }
    };

    speechSynthesis.speak(currentUtterance);
  }

  // Speak a single paragraph (routes to correct engine)
  function speakParagraph(index) {
    if (ttsEngine === 'elevenlabs' && elevenLabsAvailable) {
      speakParagraphElevenLabs(index);
    } else {
      speakParagraphBrowser(index);
    }
  }

  // Play/Resume
  function playSpeech() {
    // Handle ElevenLabs audio resume
    if (ttsEngine === 'elevenlabs' && elevenLabsAvailable) {
      if (isPaused && currentAudio) {
        currentAudio.play();
        isPaused = false;
        isPlaying = true;
        updatePlayerUI();
        return;
      }
      
      paragraphs = getArticleContent();
      if (paragraphs.length === 0) return;
      
      // Clear cache when starting fresh
      audioCache = {};
      isPlaying = true;
      isPaused = false;
      currentParagraphIndex = 0;
      
      speakParagraphElevenLabs(0);
      updatePlayerUI();
      return;
    }
    
    // Browser TTS
    if (!speechSynthesis) {
      alert(getTranslation('tts_not_supported', 'Text-to-speech is not supported in your browser.'));
      return;
    }

    if (isPaused) {
      speechSynthesis.resume();
      isPaused = false;
      isPlaying = true;
      updatePlayerUI();
      return;
    }

    paragraphs = getArticleContent();
    if (paragraphs.length === 0) return;

    isPlaying = true;
    isPaused = false;
    currentParagraphIndex = 0;
    
    speakParagraphBrowser(0);
    updatePlayerUI();
  }

  // Pause
  function pauseSpeech() {
    if (ttsEngine === 'elevenlabs' && currentAudio) {
      currentAudio.pause();
      isPaused = true;
      updatePlayerUI();
      return;
    }
    
    if (speechSynthesis && isPlaying) {
      speechSynthesis.pause();
      isPaused = true;
      updatePlayerUI();
    }
  }

  // Stop
  function stopSpeech() {
    // Stop ElevenLabs audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    
    // Stop browser TTS
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
    
    isPlaying = false;
    isPaused = false;
    currentParagraphIndex = 0;
    isGeneratingAudio = false;
    clearHighlights();
    updatePlayerUI();
    
    const progressBar = document.getElementById('ttsProgressFill');
    if (progressBar) progressBar.style.width = '0%';
  }

  // Change speed
  function changeSpeed(speed) {
    playbackSpeed = speed;
    localStorage.setItem('tts-speed', speed.toString());
    const speedDisplay = document.getElementById('ttsSpeedDisplay');
    if (speedDisplay) {
      speedDisplay.textContent = speed + 'x';
    }
    
    // Update ElevenLabs audio playback rate
    if (currentAudio) {
      currentAudio.playbackRate = speed;
    }
    
    // If currently playing with browser TTS, restart current paragraph with new speed
    if (ttsEngine === 'browser' && isPlaying && !isPaused) {
      speechSynthesis.cancel();
      speakParagraph(currentParagraphIndex);
    }
    
    updateTTSTimeRemaining();
  }
  
  // Change volume
  function changeVolume(volume) {
    playbackVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('tts-volume', playbackVolume.toString());
    isMuted = false;
    
    // Update ElevenLabs audio volume
    if (currentAudio) {
      currentAudio.volume = playbackVolume;
    }
    
    // Update current utterance volume if playing
    if (currentUtterance) {
      currentUtterance.volume = playbackVolume;
    }
    
    updateVolumeUI();
  }
  
  // Toggle mute
  function toggleMute() {
    isMuted = !isMuted;
    
    // Update ElevenLabs audio volume
    if (currentAudio) {
      currentAudio.volume = isMuted ? 0 : playbackVolume;
    }
    
    // If currently playing with browser TTS, restart with new volume
    if (ttsEngine === 'browser' && isPlaying && !isPaused) {
      speechSynthesis.cancel();
      speakParagraph(currentParagraphIndex);
    }
    
    updateVolumeUI();
  }
  
  // Toggle TTS engine
  function toggleEngine() {
    if (!elevenLabsAvailable) {
      alert(getTranslation('tts_premium_unavailable', 'Premium voice is not available. Using browser voice.'));
      return;
    }
    
    // Stop current playback
    stopSpeech();
    
    // Toggle engine
    ttsEngine = ttsEngine === 'elevenlabs' ? 'browser' : 'elevenlabs';
    localStorage.setItem('tts-engine', ttsEngine);
    
    // Clear cache when switching engines
    audioCache = {};
    
    updateVoiceSelector();
  }
  
  // Change voice
  function changeVoice(voiceId) {
    selectedVoice = voiceId;
    localStorage.setItem('tts-voice', voiceId);
    
    // Clear cache when changing voice
    audioCache = {};
  }
  
  // Toggle auto-scroll
  function toggleAutoScroll() {
    autoScrollEnabled = !autoScrollEnabled;
    localStorage.setItem('tts-autoscroll', autoScrollEnabled.toString());
    updatePlayerUI();
  }

  // Skip forward/backward
  function skipForward() {
    if (paragraphs.length === 0) return;
    const newIndex = Math.min(currentParagraphIndex + 1, paragraphs.length - 1);
    if (isPlaying) {
      speechSynthesis.cancel();
      speakParagraph(newIndex);
    } else {
      currentParagraphIndex = newIndex;
      highlightParagraph(newIndex);
      updatePlayerUI();
    }
  }

  function skipBackward() {
    if (paragraphs.length === 0) return;
    const newIndex = Math.max(currentParagraphIndex - 1, 0);
    if (isPlaying) {
      speechSynthesis.cancel();
      speakParagraph(newIndex);
    } else {
      currentParagraphIndex = newIndex;
      highlightParagraph(newIndex);
      updatePlayerUI();
    }
  }

  // Initialize player
  function initPlayer() {
    const playBtn = document.getElementById('ttsPlayBtn');
    const pauseBtn = document.getElementById('ttsPauseBtn');
    const stopBtn = document.getElementById('ttsStopBtn');
    const skipBackBtn = document.getElementById('ttsSkipBack');
    const skipForwardBtn = document.getElementById('ttsSkipForward');
    const speedSelect = document.getElementById('ttsSpeedSelect');
    const volumeSlider = document.getElementById('ttsVolumeSlider');
    const volumeBtn = document.getElementById('ttsVolumeBtn');
    const autoScrollBtn = document.getElementById('ttsAutoScrollBtn');
    const voiceSelect = document.getElementById('ttsVoiceSelect');
    const engineToggle = document.getElementById('ttsEngineToggle');

    if (playBtn) playBtn.addEventListener('click', playSpeech);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseSpeech);
    if (stopBtn) stopBtn.addEventListener('click', stopSpeech);
    if (skipBackBtn) skipBackBtn.addEventListener('click', skipBackward);
    if (skipForwardBtn) skipForwardBtn.addEventListener('click', skipForward);
    
    if (speedSelect) {
      // Restore saved speed
      speedSelect.value = playbackSpeed.toString();
      speedSelect.addEventListener('change', (e) => {
        changeSpeed(parseFloat(e.target.value));
      });
    }
    
    // Volume controls
    if (volumeSlider) {
      volumeSlider.value = playbackVolume * 100;
      volumeSlider.addEventListener('input', (e) => {
        changeVolume(parseInt(e.target.value) / 100);
      });
    }
    
    if (volumeBtn) {
      volumeBtn.addEventListener('click', toggleMute);
    }
    
    // Auto-scroll toggle
    if (autoScrollBtn) {
      autoScrollBtn.addEventListener('click', toggleAutoScroll);
    }
    
    // Voice selector
    if (voiceSelect) {
      voiceSelect.addEventListener('change', (e) => {
        changeVoice(e.target.value);
      });
    }
    
    // Engine toggle (Premium vs Browser)
    if (engineToggle) {
      engineToggle.addEventListener('click', toggleEngine);
    }
    
    // Check ElevenLabs availability on init
    checkElevenLabsAvailability();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only if not in an input/textarea/select
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      
      if (e.key === ' ' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        if (isPlaying && !isPaused) {
          pauseSpeech();
        } else {
          playSpeech();
        }
      } else if (e.key === 'Escape') {
        stopSpeech();
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        skipForward();
      } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        skipBackward();
      } else if (e.key === 'ArrowUp' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        // Volume up (only when TTS player is in view)
        const player = document.querySelector('.article-tts-player');
        if (player && isElementInViewport(player)) {
          e.preventDefault();
          changeVolume(playbackVolume + 0.1);
        }
      } else if (e.key === 'ArrowDown' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        // Volume down (only when TTS player is in view)
        const player = document.querySelector('.article-tts-player');
        if (player && isElementInViewport(player)) {
          e.preventDefault();
          changeVolume(playbackVolume - 0.1);
        }
      } else if (e.key.toLowerCase() === 'm') {
        // Mute toggle
        toggleMute();
      }
    });

    // Stop speech when leaving page
    window.addEventListener('beforeunload', stopSpeech);
    
    // Initialize paragraphs for time estimate
    paragraphs = getArticleContent();

    updatePlayerUI();
  }
  
  // Helper: check if element is in viewport
  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Table of Contents - Enhanced with all features
  function initTableOfContents() {
    const toc = document.querySelector('.article-toc');
    const tocToggle = document.querySelector('.article-toc__toggle');
    const tocProgressBar = document.querySelector('.article-toc__progress-bar');
    const tocLinks = document.querySelectorAll('.article-toc__pill');
    const articleContent = document.querySelector('.article-content');
    const tocNav = document.querySelector('.article-toc__nav');
    const tocHeader = document.querySelector('.article-toc__header');
    
    if (!toc || !tocLinks.length) return;
    
    // Get article slug for localStorage keys
    const articleSlug = window.location.pathname.split('/').pop().replace('.html', '');
    
    // Section data with word counts and reading times
    const sections = [];
    let completedSections = new Set();
    let bookmarkedSections = JSON.parse(localStorage.getItem(`toc-bookmarks-${articleSlug}`) || '[]');
    let lastReadSection = localStorage.getItem(`toc-lastread-${articleSlug}`);
    
    // Calculate word count for a section
    function getSectionWordCount(sectionEl) {
      if (!sectionEl) return 0;
      // Find the enclosing section container
      const sectionContainer = sectionEl.closest('section');
      if (sectionContainer) {
        // Get all text content from the section
        const text = sectionContainer.textContent || '';
        return text.split(/\s+/).filter(w => w.length > 0).length;
      }
      // Fallback: count words in parent element
      const parent = sectionEl.parentElement;
      if (parent) {
        const text = parent.textContent || '';
        return Math.max(50, text.split(/\s+/).filter(w => w.length > 0).length / 2);
      }
      return 100; // Default estimate
    }
    
    // Build section data
    tocLinks.forEach((link, index) => {
      const targetId = link.getAttribute('href').slice(1);
      const sectionEl = document.getElementById(targetId);
      if (sectionEl) {
        const sectionContainer = sectionEl.closest('section') || sectionEl.parentElement;
        const wordCount = getSectionWordCount(sectionEl);
        const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 WPM
        const firstPara = sectionContainer?.querySelector('p');
        const preview = firstPara ? firstPara.textContent.slice(0, 120) + '...' : '';
        
        sections.push({
          id: targetId,
          element: sectionEl,
          link: link,
          index: index,
          wordCount: wordCount,
          readingTime: readingTime,
          preview: preview
        });
      }
    });
    
    // === ADD READING TIME BADGES ===
    sections.forEach(section => {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'article-toc__time';
      timeSpan.textContent = `${section.readingTime}m`;
      timeSpan.title = `${section.readingTime} min read`;
      section.link.appendChild(timeSpan);
    });
    
    // === ADD CHECKMARKS FOR COMPLETED SECTIONS ===
    sections.forEach(section => {
      const checkSpan = document.createElement('span');
      checkSpan.className = 'article-toc__check';
      checkSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
      section.link.appendChild(checkSpan);
    });
    
    // === ADD SECTION PREVIEWS ===
    sections.forEach(section => {
      if (section.preview && window.innerWidth > 900) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'article-toc__preview';
        previewDiv.textContent = section.preview;
        section.link.style.position = 'relative';
        section.link.appendChild(previewDiv);
      }
    });
    
    // === ADD BOOKMARK BUTTONS ===
    sections.forEach(section => {
      const bookmarkBtn = document.createElement('button');
      bookmarkBtn.className = 'article-toc__bookmark';
      const isBookmarked = bookmarkedSections.includes(section.id);
      if (isBookmarked) {
        bookmarkBtn.classList.add('bookmarked');
      }
      bookmarkBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
      bookmarkBtn.title = isBookmarked ? 'Remove bookmark' : 'Bookmark this section';
      bookmarkBtn.setAttribute('aria-pressed', isBookmarked);
      bookmarkBtn.setAttribute('aria-label', `Bookmark ${section.link.querySelector('.article-toc__text')?.textContent || 'section'}`);
      bookmarkBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark(section.id, bookmarkBtn);
      });
      section.link.appendChild(bookmarkBtn);
    });
    
    function toggleBookmark(sectionId, btn) {
      const idx = bookmarkedSections.indexOf(sectionId);
      if (idx > -1) {
        bookmarkedSections.splice(idx, 1);
        btn.classList.remove('bookmarked');
        btn.setAttribute('aria-pressed', 'false');
        btn.title = 'Bookmark this section';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
      } else {
        bookmarkedSections.push(sectionId);
        btn.classList.add('bookmarked');
        btn.setAttribute('aria-pressed', 'true');
        btn.title = 'Remove bookmark';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
      }
      localStorage.setItem(`toc-bookmarks-${articleSlug}`, JSON.stringify(bookmarkedSections));
    }
    
    // === CREATE ENHANCED CONTENT CONTAINER ===
    const enhancedContent = document.createElement('div');
    enhancedContent.className = 'article-toc__enhanced';
    
    // === ADD MINIMAP ===
    const minimap = document.createElement('div');
    minimap.className = 'article-toc__minimap';
    sections.forEach((section, idx) => {
      const bar = document.createElement('div');
      bar.className = 'article-toc__minimap-section';
      bar.style.flex = `${Math.max(section.wordCount, 50) / 50}`;
      bar.title = section.link.querySelector('.article-toc__text')?.textContent || `Section ${idx + 1}`;
      bar.addEventListener('click', () => {
        section.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      const marker = document.createElement('div');
      marker.className = 'article-toc__minimap-marker';
      marker.style.width = '0%';
      bar.appendChild(marker);
      minimap.appendChild(bar);
    });
    enhancedContent.appendChild(minimap);
    
    // === ADD RESUME READING PROMPT ===
    let resumeDiv = null;
    if (lastReadSection && sections.find(s => s.id === lastReadSection)) {
      resumeDiv = document.createElement('div');
      resumeDiv.className = 'article-toc__resume visible';
      const sectionName = sections.find(s => s.id === lastReadSection)?.link.querySelector('.article-toc__text')?.textContent || 'your last section';
      resumeDiv.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z"/></svg>
        <span class="article-toc__resume-text">Resume at <strong>${sectionName}</strong></span>
        <button class="article-toc__resume-dismiss" aria-label="Dismiss">&times;</button>
      `;
      resumeDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.article-toc__resume-dismiss')) {
          const target = document.getElementById(lastReadSection);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          resumeDiv.remove();
        }
      });
      resumeDiv.querySelector('.article-toc__resume-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        resumeDiv.remove();
      });
      enhancedContent.appendChild(resumeDiv);
    }
    
    // Insert enhanced content after header
    if (tocHeader) {
      tocHeader.after(enhancedContent);
    } else {
      tocNav.insertBefore(enhancedContent, tocNav.firstChild);
    }
    
    // === ADD JUMP BUTTONS ===
    const jumpBtns = document.createElement('div');
    jumpBtns.className = 'article-toc__jump-btns';
    jumpBtns.innerHTML = `
      <button class="article-toc__jump-btn" data-jump="top">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
        Top
      </button>
      <button class="article-toc__jump-btn" data-jump="bottom">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
        Bottom
      </button>
    `;
    tocNav.appendChild(jumpBtns);
    
    jumpBtns.querySelector('[data-jump="top"]').addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    jumpBtns.querySelector('[data-jump="bottom"]').addEventListener('click', () => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    });
    
    // === ADD SCROLL POSITION INDICATOR ===
    const positionIndicator = document.createElement('div');
    positionIndicator.className = 'article-toc__position-indicator';
    tocNav.insertBefore(positionIndicator, tocNav.firstChild);
    
    // === ADD SWIPE INDICATOR FOR MOBILE ===
    const swipeIndicator = document.createElement('div');
    swipeIndicator.className = 'article-toc__swipe-indicator';
    toc.insertBefore(swipeIndicator, toc.firstChild);
    
    // Create floating show button for when TOC is hidden
    let showBtn = document.querySelector('.article-toc-show-btn');
    if (!showBtn) {
      showBtn = document.createElement('button');
      showBtn.className = 'article-toc-show-btn';
      showBtn.innerHTML = '<i class="fas fa-list-ul"></i> <span>Show Contents</span>';
      showBtn.setAttribute('aria-label', 'Show table of contents');
      showBtn.setAttribute('title', 'Show Table of Contents');
      document.body.appendChild(showBtn);
    }
    
    // Get the article layout container
    const articleLayout = document.querySelector('.article-layout');
    
    // Toggle collapse functionality - hide/show TOC
    const toggleTOC = (hide) => {
      if (hide) {
        toc.classList.add('collapsed');
        if (articleLayout) articleLayout.classList.add('toc-hidden');
        showBtn.classList.add('visible');
        localStorage.setItem('toc-collapsed', 'true');
      } else {
        toc.classList.remove('collapsed');
        if (articleLayout) articleLayout.classList.remove('toc-hidden');
        showBtn.classList.remove('visible');
        localStorage.setItem('toc-collapsed', 'false');
      }
    };
    
    if (tocToggle) {
      tocToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleTOC(true); // Hide TOC
      });
    }
    
    showBtn.addEventListener('click', () => {
      toggleTOC(false); // Show TOC
    });
    
    // Restore saved state
    const savedCollapsed = localStorage.getItem('toc-collapsed');
    if (savedCollapsed === 'true') {
      toggleTOC(true);
    }
    
    // Smooth scroll on link click
    tocLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').slice(1);
        const target = document.getElementById(targetId);
        if (target) {
          tocLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.focus();
        }
      });
    });
    
    // === KEYBOARD NAVIGATION ===
    toc.addEventListener('keydown', (e) => {
      const focusedLink = document.activeElement;
      if (!focusedLink.classList.contains('article-toc__pill')) return;
      
      const currentIndex = Array.from(tocLinks).indexOf(focusedLink);
      let nextIndex = currentIndex;
      
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        nextIndex = Math.min(currentIndex + 1, tocLinks.length - 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        nextIndex = Math.max(currentIndex - 1, 0);
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = tocLinks.length - 1;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        focusedLink.click();
        return;
      }
      
      if (nextIndex !== currentIndex) {
        tocLinks[nextIndex].focus();
      }
    });
    
    // Active section tracking and all updates
    function updateTocState() {
      if (!articleContent) return;
      
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Update TOC progress bar
      if (tocProgressBar) {
        const progress = Math.min((scrollTop / docHeight) * 100, 100);
        tocProgressBar.style.width = progress + '%';
      }
      
      // Find active section
      let activeSection = null;
      let activeIndex = -1;
      const offset = 150;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const rect = section.element.getBoundingClientRect();
        if (rect.top <= offset) {
          activeSection = section;
          activeIndex = i;
          break;
        }
      }
      
      // If at very top of page, set first section as active
      if (activeIndex === -1 && sections.length > 0) {
        activeSection = sections[0];
        activeIndex = 0;
      }
      
      // Update section classes
      sections.forEach((section, idx) => {
        section.link.classList.remove('active', 'completed');
        if (idx === activeIndex) {
          section.link.classList.add('active');
        } else if (idx < activeIndex) {
          section.link.classList.add('completed');
          completedSections.add(section.id);
        }
      });
      
      // Save last read section (only if not at the very top)
      if (activeSection && scrollTop > 100) {
        localStorage.setItem(`toc-lastread-${articleSlug}`, activeSection.id);
      }
      
      // Update minimap
      const minimapBars = minimap.querySelectorAll('.article-toc__minimap-section');
      minimapBars.forEach((bar, idx) => {
        bar.classList.remove('active', 'completed');
        const marker = bar.querySelector('.article-toc__minimap-marker');
        
        if (idx === activeIndex) {
          bar.classList.add('active');
          if (marker && sections[idx]) {
            const sectionRect = sections[idx].element.getBoundingClientRect();
            const nextSection = sections[idx + 1];
            let sectionHeight = 500; // Default
            if (nextSection) {
              sectionHeight = Math.max(100, nextSection.element.getBoundingClientRect().top - sectionRect.top);
            }
            const progressInSection = Math.min(100, Math.max(0, ((offset - sectionRect.top) / sectionHeight) * 100));
            marker.style.width = progressInSection + '%';
          }
        } else if (idx < activeIndex) {
          bar.classList.add('completed');
          if (marker) marker.style.width = '100%';
        } else {
          if (marker) marker.style.width = '0%';
        }
      });
      
      // Update position indicator
      if (activeSection && positionIndicator && tocNav) {
        const linkRect = activeSection.link.getBoundingClientRect();
        const navRect = tocNav.getBoundingClientRect();
        const topOffset = linkRect.top - navRect.top;
        positionIndicator.style.top = topOffset + 'px';
        positionIndicator.style.height = linkRect.height + 'px';
        positionIndicator.style.opacity = '1';
      }
    }
    
    // Throttled scroll handler
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateTocState();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    
    // Initial state
    updateTocState();
    
    // Mobile TOC functionality
    initMobileToc(toc, tocLinks);
  }
  
  // Mobile TOC - Toggle button, bottom sheet, and swipe gestures
  function initMobileToc(toc, tocLinks) {
    if (!toc) return;
    
    // Create mobile toggle button
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-toc-toggle';
    mobileToggle.setAttribute('aria-label', 'Toggle table of contents');
    mobileToggle.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;
    document.body.appendChild(mobileToggle);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'mobile-toc-overlay';
    document.body.appendChild(overlay);
    
    // Create close button for mobile TOC
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mobile-toc-close';
    closeBtn.setAttribute('aria-label', 'Close table of contents');
    closeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    toc.insertBefore(closeBtn, toc.firstChild);
    
    let isOpen = false;
    
    function openMobileToc() {
      isOpen = true;
      toc.classList.add('mobile-visible');
      overlay.classList.add('visible');
      mobileToggle.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      // Focus first link for accessibility
      setTimeout(() => {
        const firstLink = toc.querySelector('.article-toc__pill');
        if (firstLink) firstLink.focus();
      }, 300);
    }
    
    function closeMobileToc() {
      isOpen = false;
      toc.classList.remove('mobile-visible');
      overlay.classList.remove('visible');
      mobileToggle.classList.remove('active');
      document.body.style.overflow = '';
      mobileToggle.focus();
    }
    
    // Toggle button click
    mobileToggle.addEventListener('click', () => {
      if (isOpen) {
        closeMobileToc();
      } else {
        openMobileToc();
      }
    });
    
    // Close button click
    closeBtn.addEventListener('click', closeMobileToc);
    
    // Overlay click
    overlay.addEventListener('click', closeMobileToc);
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeMobileToc();
      }
    });
    
    // Close when clicking a TOC link on mobile
    tocLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 900 && isOpen) {
          closeMobileToc();
        }
      });
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && isOpen) {
        closeMobileToc();
      }
    });
    
    // === SWIPE GESTURE SUPPORT ===
    let touchStartY = 0;
    let touchCurrentY = 0;
    let isDragging = false;
    
    toc.addEventListener('touchstart', (e) => {
      if (window.innerWidth > 900) return;
      const swipeIndicator = toc.querySelector('.article-toc__swipe-indicator');
      if (swipeIndicator && swipeIndicator.contains(e.target)) {
        touchStartY = e.touches[0].clientY;
        isDragging = true;
      }
    }, { passive: true });
    
    toc.addEventListener('touchmove', (e) => {
      if (!isDragging || window.innerWidth > 900) return;
      touchCurrentY = e.touches[0].clientY;
      const diff = touchCurrentY - touchStartY;
      
      // Only allow dragging down
      if (diff > 0) {
        toc.style.transform = `translateY(${diff}px)`;
        toc.style.transition = 'none';
      }
    }, { passive: true });
    
    toc.addEventListener('touchend', () => {
      if (!isDragging || window.innerWidth > 900) return;
      isDragging = false;
      
      const diff = touchCurrentY - touchStartY;
      toc.style.transition = '';
      toc.style.transform = '';
      
      // If dragged down more than 100px, close the TOC
      if (diff > 100) {
        closeMobileToc();
      }
    }, { passive: true });
    
    // Also allow swipe down anywhere on the TOC header area
    const tocHeader = toc.querySelector('.article-toc__header');
    if (tocHeader) {
      tocHeader.addEventListener('touchstart', (e) => {
        if (window.innerWidth > 900) return;
        touchStartY = e.touches[0].clientY;
        isDragging = true;
      }, { passive: true });
    }
  }

  // Reading progress for article
  function initReadingProgress() {
    const progressBar = document.querySelector('.article-reading-progress__fill');
    if (!progressBar) return;

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min((scrollTop / docHeight) * 100, 100);
      progressBar.style.width = progress + '%';
    }, { passive: true });
  }

  // Mini Floating TTS Player
  function initMiniPlayer() {
    const miniPlayer = document.createElement('div');
    miniPlayer.className = 'tts-mini-player';
    miniPlayer.id = 'ttsMiniPlayer';

    const playBtn = document.createElement('button');
    playBtn.className = 'tts-mini-player__btn tts-mini-player__btn--play';
    playBtn.id = 'miniPlayBtn';
    playBtn.title = getTranslation('tts_play', 'Play');
    const playIcon = document.createElement('i');
    playIcon.className = 'fas fa-play';
    playBtn.appendChild(playIcon);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'tts-mini-player__info';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'tts-mini-player__title';
    titleSpan.textContent = getTranslation('tts_listening', 'Listening to article');
    const statusSpan = document.createElement('span');
    statusSpan.className = 'tts-mini-player__status';
    statusSpan.id = 'miniStatus';
    statusSpan.textContent = getTranslation('tts_ready', 'Ready');
    infoDiv.appendChild(titleSpan);
    infoDiv.appendChild(statusSpan);

    const progressDiv = document.createElement('div');
    progressDiv.className = 'tts-mini-player__progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'tts-mini-player__progress-fill';
    progressFill.id = 'miniProgressFill';
    progressDiv.appendChild(progressFill);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tts-mini-player__close';
    closeBtn.id = 'miniCloseBtn';
    closeBtn.title = getTranslation('tts_close', 'Close');
    const closeIcon = document.createElement('i');
    closeIcon.className = 'fas fa-times';
    closeBtn.appendChild(closeIcon);

    miniPlayer.appendChild(playBtn);
    miniPlayer.appendChild(infoDiv);
    miniPlayer.appendChild(progressDiv);
    miniPlayer.appendChild(closeBtn);

    document.body.appendChild(miniPlayer);
    
    const mainPlayer = document.querySelector('.article-tts-player');
    let miniVisible = false;
    
    // Show mini player when main player is out of view and audio is playing
    function updateMiniPlayerVisibility() {
      if (!mainPlayer) return;
      
      const rect = mainPlayer.getBoundingClientRect();
      const isMainPlayerVisible = rect.bottom > 0 && rect.top < window.innerHeight;
      
      if (isPlaying && !isMainPlayerVisible) {
        if (!miniVisible) {
          miniPlayer.classList.add('visible');
          miniVisible = true;
        }
      } else {
        if (miniVisible) {
          miniPlayer.classList.remove('visible');
          miniVisible = false;
        }
      }
    }
    
    window.addEventListener('scroll', updateMiniPlayerVisibility, { passive: true });
    
    // Mini player controls
    const miniPlayBtn = document.getElementById('miniPlayBtn');
    const miniCloseBtn = document.getElementById('miniCloseBtn');
    
    miniPlayBtn.addEventListener('click', () => {
      if (isPlaying && !isPaused) {
        pauseSpeech();
        miniPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
      } else {
        playSpeech();
        miniPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
      }
    });
    
    miniCloseBtn.addEventListener('click', () => {
      stopSpeech();
      miniPlayer.classList.remove('visible');
      miniVisible = false;
    });
    
    // Update mini player UI
    const originalUpdatePlayerUI = updatePlayerUI;
    updatePlayerUI = function() {
      originalUpdatePlayerUI();
      
      const miniStatus = document.getElementById('miniStatus');
      const miniProgressFill = document.getElementById('miniProgressFill');
      
      if (miniStatus) {
        if (isPlaying && !isPaused) {
          miniStatus.textContent = getTranslation('tts_playing', 'Playing...');
          miniPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else if (isPaused) {
          miniStatus.textContent = getTranslation('tts_paused', 'Paused');
          miniPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
          miniStatus.textContent = getTranslation('tts_ready', 'Ready');
          miniPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
      }
      
      if (miniProgressFill && paragraphs.length > 0) {
        const progress = ((currentParagraphIndex) / paragraphs.length) * 100;
        miniProgressFill.style.width = progress + '%';
      }
      
      updateMiniPlayerVisibility();
    };
  }
  
  // Sleep Timer
  let sleepTimerTimeout = null;
  let sleepTimerMinutes = 0;
  
  function initSleepTimer() {
    const timerContainer = document.querySelector('.sleep-timer-container');
    if (!timerContainer) return;
    
    const timerBtn = timerContainer.querySelector('.sleep-timer-btn');
    const dropdown = timerContainer.querySelector('.sleep-timer-dropdown');
    
    if (!timerBtn || !dropdown) return;
    
    timerBtn.addEventListener('click', () => {
      dropdown.classList.toggle('visible');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!timerContainer.contains(e.target)) {
        dropdown.classList.remove('visible');
      }
    });
    
    // Timer options
    const options = dropdown.querySelectorAll('.sleep-timer-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        const minutes = parseInt(option.dataset.minutes, 10);
        setSleepTimer(minutes);
        dropdown.classList.remove('visible');
        
        options.forEach(o => o.classList.remove('active'));
        if (minutes > 0) {
          option.classList.add('active');
          timerBtn.classList.add('active');
        } else {
          timerBtn.classList.remove('active');
        }
      });
    });
  }
  
  function setSleepTimer(minutes) {
    if (sleepTimerTimeout) {
      clearTimeout(sleepTimerTimeout);
      sleepTimerTimeout = null;
    }
    
    sleepTimerMinutes = minutes;
    
    if (minutes > 0) {
      sleepTimerTimeout = setTimeout(() => {
        stopSpeech();
        sleepTimerMinutes = 0;
        const timerBtn = document.querySelector('.sleep-timer-btn');
        if (timerBtn) timerBtn.classList.remove('active');
      }, minutes * 60 * 1000);
    }
  }
  
  // Keyboard Shortcuts Overlay
  function initKeyboardShortcuts() {
    const overlay = document.createElement('div');
    overlay.className = 'keyboard-shortcuts-overlay';
    overlay.id = 'keyboardShortcutsOverlay';
    overlay.innerHTML = `
      <div class="keyboard-shortcuts-modal">
        <h3><i class="fas fa-keyboard"></i> ${getTranslation('keyboard_shortcuts', 'Keyboard Shortcuts')}</h3>
        <ul class="keyboard-shortcuts-list">
          <li><span>${getTranslation('tts_play_pause', 'Play/Pause')}</span> <kbd>Space</kbd></li>
          <li><span>${getTranslation('tts_stop', 'Stop')}</span> <kbd>Esc</kbd></li>
          <li><span>${getTranslation('tts_skip_forward', 'Next Paragraph')}</span> <kbd>Ctrl + →</kbd></li>
          <li><span>${getTranslation('tts_skip_backward', 'Previous Paragraph')}</span> <kbd>Ctrl + ←</kbd></li>
          <li><span>${getTranslation('tts_speed_up', 'Speed Up')}</span> <kbd>↑</kbd></li>
          <li><span>${getTranslation('tts_slow_down', 'Slow Down')}</span> <kbd>↓</kbd></li>
          <li><span>${getTranslation('tts_mute', 'Mute')}</span> <kbd>M</kbd></li>
          <li><span>${getTranslation('keyboard_shortcuts', 'Show Shortcuts')}</span> <kbd>?</kbd></li>
        </ul>
        <button class="keyboard-shortcuts-close">${getTranslation('close', 'Close')}</button>
      </div>
    `;
    document.body.appendChild(overlay);
    
    overlay.querySelector('.keyboard-shortcuts-close').addEventListener('click', () => {
      overlay.classList.remove('visible');
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('visible');
      }
    });
    
    // Show on ? key
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
        overlay.classList.add('visible');
      }
    });
    
    // Add help button to player
    const helpBtn = document.getElementById('ttsHelpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        overlay.classList.add('visible');
      });
    }
  }
  
  // Notes Panel
  function initNotesPanel() {
    const notesPanel = document.createElement('div');
    notesPanel.className = 'article-notes-panel';
    notesPanel.id = 'articleNotesPanel';
    
    const articleId = window.location.pathname.replace(/[^a-z0-9]/gi, '-');
    const storageKey = 'article-notes-' + articleId;
    const savedNotes = localStorage.getItem(storageKey) || '';
    
    notesPanel.innerHTML = `
      <div class="notes-panel__header">
        <span class="notes-panel__title"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M19 3H4.99c-1.11 0-1.98.9-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z"/></svg> ${getTranslation('my_notes', 'My Notes')}</span>
        <button class="notes-panel__close" id="notesPanelClose"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
      </div>
      <div class="notes-panel__content">
        <textarea class="notes-textarea" id="articleNotesTextarea" placeholder="${getTranslation('notes_placeholder', 'Write your notes here...')}">${escapeHtml(savedNotes)}</textarea>
        <div class="notes-save-status" id="notesSaveStatus">${getTranslation('notes_auto_save', 'Notes are saved automatically')}</div>
        <div class="notes-panel__actions">
          <button class="notes-panel__btn notes-panel__btn--clear" id="notesClearBtn">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> Clear
          </button>
          <button class="notes-panel__btn notes-panel__btn--export" id="notesExportBtn">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Export
          </button>
        </div>
      </div>
    `;
    
    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    document.body.appendChild(notesPanel);
    
    const closeBtn = document.getElementById('notesPanelClose');
    const textarea = document.getElementById('articleNotesTextarea');
    const saveStatus = document.getElementById('notesSaveStatus');
    
    closeBtn.addEventListener('click', () => {
      notesPanel.classList.remove('visible');
    });
    
    // Auto-save notes
    let saveTimeout;
    textarea.addEventListener('input', () => {
      saveStatus.textContent = getTranslation('notes_saving', 'Saving...');
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        localStorage.setItem(storageKey, textarea.value);
        saveStatus.textContent = getTranslation('notes_saved', 'Saved!');
        setTimeout(() => {
          saveStatus.textContent = getTranslation('notes_auto_save', 'Notes are saved automatically');
        }, 2000);
      }, 500);
    });
    
    // Toggle notes panel
    const notesBtn = document.getElementById('notesBtn');
    if (notesBtn) {
      notesBtn.addEventListener('click', () => {
        notesPanel.classList.toggle('visible');
      });
    }
    
    // Clear notes
    const clearBtn = document.getElementById('notesClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all notes for this article?')) {
          textarea.value = '';
          localStorage.removeItem(storageKey);
          saveStatus.textContent = 'Notes cleared';
          setTimeout(() => {
            saveStatus.textContent = getTranslation('notes_auto_save', 'Notes are saved automatically');
          }, 2000);
        }
      });
    }
    
    // Export notes
    const exportBtn = document.getElementById('notesExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const notes = textarea.value;
        if (!notes.trim()) {
          alert('No notes to export');
          return;
        }
        
        const articleTitle = document.querySelector('.article-title')?.textContent || 'Article Notes';
        const blob = new Blob([`# ${articleTitle}\n\n${notes}`], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${articleTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-notes.md`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }
  
  // Download Audio
  async function initDownloadAudio() {
    const downloadBtn = document.getElementById('ttsDownloadBtn');
    if (!downloadBtn) return;
    
    downloadBtn.addEventListener('click', async () => {
      if (!elevenLabsAvailable || ttsEngine !== 'elevenlabs') {
        alert(getTranslation('download_premium_only', 'Audio download is only available with premium voice.'));
        return;
      }
      
      downloadBtn.classList.add('downloading');
      downloadBtn.disabled = true;
      
      try {
        const content = getArticleContent();
        const fullText = content.slice(0, 20).join(' '); // First 20 paragraphs for demo
        
        const response = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: fullText,
            voice: selectedVoice,
            language: getUserLanguage()
          })
        });
        
        if (!response.ok) {
          throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'article-audio.mp3';
        a.click();
        URL.revokeObjectURL(url);
        
      } catch (e) {
        alert(getTranslation('download_failed', 'Failed to download audio. Please try again.'));
      }
      
      downloadBtn.classList.remove('downloading');
      downloadBtn.disabled = false;
    });
  }

  // Init
  function init() {
    initPlayer();
    initTableOfContents();
    initReadingProgress();
    initReadingControls();
    initTimeRemaining();
    initTextHighlight();
    initBookmark();
    initLanguageChangeListener();
    initMiniPlayer();
    initSleepTimer();
    initKeyboardShortcuts();
    initNotesPanel();
    initDownloadAudio();
    trackArticleRead();
  }
  
  // Track article read for streak calculation
  function trackArticleRead() {
    // Wait for auth to be ready
    if (window.MindBalanceAuth && window.MindBalanceAuth.onAuthReady) {
      window.MindBalanceAuth.onAuthReady(async (user) => {
        if (!user) return;
        
        // Get article info from page
        const slug = window.location.pathname.split('/').filter(Boolean).pop()?.replace('.html', '') || 'unknown';
        const titleEl = document.querySelector('.article-title, h1');
        const title = titleEl ? titleEl.textContent : 'Article';
        
        // Log reading activity
        try {
          await window.MindBalanceAuth.logReadingActivity(slug, title);
          console.log('Reading activity logged for:', slug);
        } catch (e) {
          console.error('Failed to log reading activity:', e);
        }
      });
    }
  }

  // Listen for language changes and refresh TTS content
  function initLanguageChangeListener() {
    // Listen for translations-ready event (fired when translations are loaded)
    window.addEventListener('translations-ready', (e) => {
      // Refresh article content and UI with new translations
      paragraphs = getArticleContent();
      if (isPlaying) {
        stopSpeech();
      }
      updatePlayerUI();
      // Re-render dynamic UI elements that need translations
      updateDynamicUITranslations();
    });

    // Listen for language select changes
    const languageSelects = document.querySelectorAll('[data-language-select]');
    languageSelects.forEach(select => {
      select.addEventListener('change', () => {
        // The translations-ready event will handle the UI update
        // Just stop any current playback
        if (isPlaying) {
          stopSpeech();
        }
      });
    });

    // Also listen for storage changes (in case language is changed from another tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'mindbalance-language') {
        setTimeout(() => {
          paragraphs = getArticleContent();
          if (isPlaying) {
            stopSpeech();
          }
          updatePlayerUI();
        }, 500);
      }
    });
  }
  
  // Update dynamic UI elements with current translations
  function updateDynamicUITranslations() {
    // Update mini player
    const miniTitle = document.querySelector('.tts-mini-player__title');
    if (miniTitle) {
      miniTitle.textContent = getTranslation('tts_listening', 'Listening to article');
    }
    
    // Update notes panel title
    const notesTitle = document.querySelector('.notes-panel__title');
    if (notesTitle) {
      notesTitle.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M19 3H4.99c-1.11 0-1.98.9-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z"/></svg> ${getTranslation('my_notes', 'My Notes')}`;
    }
    
    // Update notes placeholder
    const notesTextarea = document.getElementById('articleNotesTextarea');
    if (notesTextarea) {
      notesTextarea.placeholder = getTranslation('notes_placeholder', 'Write your notes here...');
    }
    
    // Update notes save status
    const saveStatus = document.getElementById('notesSaveStatus');
    if (saveStatus) {
      saveStatus.textContent = getTranslation('notes_auto_save', 'Notes are saved automatically');
    }
  }

  // Reading Controls Panel
  function initReadingControls() {
    const panel = document.querySelector('.reading-controls');
    if (!panel) return;

    // Toggle panel visibility
    const toggleBtn = panel.querySelector('.reading-controls__toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        localStorage.setItem('article-controls-collapsed', panel.classList.contains('collapsed'));
      });

      // Restore collapsed state
      if (localStorage.getItem('article-controls-collapsed') === 'true') {
        panel.classList.add('collapsed');
      }
    }

    // Font size controls
    const fontSmaller = document.getElementById('fontSmaller');
    const fontLarger = document.getElementById('fontLarger');
    const fontSizes = ['small', 'normal', 'large', 'x-large'];
    let currentFontIndex = fontSizes.indexOf(localStorage.getItem('article-font-size') || 'normal');
    if (currentFontIndex < 0) currentFontIndex = 1;
    document.body.setAttribute('data-article-font', fontSizes[currentFontIndex]);

    if (fontSmaller) {
      fontSmaller.addEventListener('click', () => {
        if (currentFontIndex > 0) {
          currentFontIndex--;
          document.body.setAttribute('data-article-font', fontSizes[currentFontIndex]);
          localStorage.setItem('article-font-size', fontSizes[currentFontIndex]);
        }
      });
    }

    if (fontLarger) {
      fontLarger.addEventListener('click', () => {
        if (currentFontIndex < fontSizes.length - 1) {
          currentFontIndex++;
          document.body.setAttribute('data-article-font', fontSizes[currentFontIndex]);
          localStorage.setItem('article-font-size', fontSizes[currentFontIndex]);
        }
      });
    }

    // Line spacing control
    const spacingBtn = document.getElementById('lineSpacingBtn');
    const spacings = ['compact', 'normal', 'relaxed'];
    let currentSpacingIndex = spacings.indexOf(localStorage.getItem('article-line-spacing') || 'normal');
    if (currentSpacingIndex < 0) currentSpacingIndex = 1;
    document.body.setAttribute('data-article-spacing', spacings[currentSpacingIndex]);

    if (spacingBtn) {
      spacingBtn.addEventListener('click', () => {
        currentSpacingIndex = (currentSpacingIndex + 1) % spacings.length;
        document.body.setAttribute('data-article-spacing', spacings[currentSpacingIndex]);
        localStorage.setItem('article-line-spacing', spacings[currentSpacingIndex]);
        
        // Update tooltip
        const tooltip = spacingBtn.querySelector('.reading-control-btn__tooltip');
        if (tooltip) {
          const labels = { compact: 'Compact', normal: 'Normal', relaxed: 'Relaxed' };
          tooltip.textContent = 'Spacing: ' + labels[spacings[currentSpacingIndex]];
        }
      });
    }

    // Reading mode toggle
    const readingModeBtn = document.getElementById('readingModeBtn');
    if (readingModeBtn) {
      readingModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('article-reading-mode');
        readingModeBtn.classList.toggle('active', document.body.classList.contains('article-reading-mode'));
      });
    }

    // Print button
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  // Time Remaining Indicator
  function initTimeRemaining() {
    const timeValue = document.getElementById('timeRemainingValue');
    if (!timeValue) return;

    // Estimate reading time (avg 200 words per minute)
    const content = document.querySelector('.article-content');
    if (!content) return;

    const text = content.textContent || '';
    const wordCount = text.trim().split(/\s+/).length;
    const totalMinutes = Math.ceil(wordCount / 200);

    function updateTimeRemaining() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
      const remainingPercent = 1 - scrollPercent;
      const remainingMinutes = Math.max(1, Math.ceil(totalMinutes * remainingPercent));
      
      if (remainingMinutes <= 1) {
        timeValue.textContent = '< 1';
      } else {
        timeValue.textContent = remainingMinutes;
      }
    }

    updateTimeRemaining();
    window.addEventListener('scroll', updateTimeRemaining, { passive: true });
  }

  // Text Highlight Feature
  function initTextHighlight() {
    const content = document.querySelector('.article-content');
    if (!content) return;

    const articleId = window.location.pathname;
    const storageKey = 'article-highlights-' + articleId.replace(/[^a-z0-9]/gi, '-');

    // Load saved highlights
    function loadHighlights() {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      
      try {
        const highlights = JSON.parse(saved);
        highlights.forEach(h => {
          const range = findTextInContent(h.text);
          if (range) {
            wrapRangeWithHighlight(range, h.id);
          }
        });
      } catch (e) {
        console.error('Error loading highlights:', e);
      }
    }

    // Find text in content
    function findTextInContent(searchText) {
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        const idx = node.textContent.indexOf(searchText);
        if (idx >= 0) {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + searchText.length);
          return range;
        }
      }
      return null;
    }

    // Wrap range with highlight span
    function wrapRangeWithHighlight(range, id) {
      const span = document.createElement('span');
      span.className = 'user-highlight';
      span.dataset.highlightId = id || Date.now().toString();
      
      try {
        // Try the simple approach first
        range.surroundContents(span);
      } catch (e) {
        // If selection spans multiple elements, extract and wrap the contents
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }
      
      span.addEventListener('click', () => {
        const confirmMsg = getTranslation('highlight_remove_confirm', 'Remove this highlight?');
        if (confirm(confirmMsg)) {
          removeHighlight(span.dataset.highlightId);
        }
      });
    }

    // Save highlights
    function saveHighlights() {
      const highlights = [];
      content.querySelectorAll('.user-highlight').forEach(span => {
        highlights.push({
          id: span.dataset.highlightId,
          text: span.textContent
        });
      });
      localStorage.setItem(storageKey, JSON.stringify(highlights));
    }

    // Remove highlight
    function removeHighlight(id) {
      const span = content.querySelector(`[data-highlight-id="${id}"]`);
      if (span) {
        const parent = span.parentNode;
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        saveHighlights();
      }
    }

    // Handle text selection for highlighting
    const highlightBtn = document.getElementById('highlightBtn');
    if (highlightBtn) {
      highlightBtn.addEventListener('click', () => {
        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) {
          alert(getTranslation('highlight_select_first', 'Select some text first to highlight it.'));
          return;
        }

        const range = selection.getRangeAt(0);
        if (!content.contains(range.commonAncestorContainer)) {
          alert(getTranslation('highlight_select_article', 'Please select text within the article content.'));
          return;
        }

        try {
          wrapRangeWithHighlight(range);
          saveHighlights();
          selection.removeAllRanges();
        } catch (e) {
          console.error('Could not highlight:', e);
        }
      });
    }

    loadHighlights();
  }

  // Bookmark Reading Position (works for all users via localStorage)
  function initBookmark() {
    const articleId = window.location.pathname;
    const storageKey = 'article-bookmark-' + articleId.replace(/[^a-z0-9]/gi, '-');

    // Load bookmark on page load
    function loadBookmark() {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const scrollPos = parseInt(saved, 10);
        if (scrollPos > 100) {
          showResumePrompt(scrollPos);
        }
      }
    }

    // Save bookmark periodically
    function saveBookmark() {
      const scrollTop = window.scrollY;
      if (scrollTop > 100) {
        localStorage.setItem(storageKey, scrollTop.toString());
      }
    }

    // Show resume reading prompt
    function showResumePrompt(scrollPos) {
      const prompt = document.createElement('div');
      prompt.className = 'bookmark-prompt';
      
      const resumeText = getTranslation('bookmark_resume', 'Resume where you left off?');
      const yesText = getTranslation('bookmark_yes', 'Yes');
      const noText = getTranslation('bookmark_no', 'No');
      
      prompt.innerHTML = `
        <span>${resumeText}</span>
        <button class="bookmark-prompt__yes">${yesText}</button>
        <button class="bookmark-prompt__no">${noText}</button>
      `;
      document.body.appendChild(prompt);

      prompt.querySelector('.bookmark-prompt__yes').addEventListener('click', () => {
        window.scrollTo({ top: scrollPos, behavior: 'smooth' });
        prompt.remove();
      });

      prompt.querySelector('.bookmark-prompt__no').addEventListener('click', () => {
        localStorage.removeItem(storageKey);
        prompt.remove();
      });

      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (prompt.parentNode) prompt.remove();
      }, 10000);
    }

    // Debounced save on scroll
    let saveTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveBookmark, 1000);
    }, { passive: true });

    // Load on init
    setTimeout(loadBookmark, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for external use
  window.ArticleTTS = {
    play: playSpeech,
    pause: pauseSpeech,
    stop: stopSpeech,
    changeSpeed
  };

  // ============================================
  // SAVE ARTICLE FUNCTIONALITY
  // ============================================
  
  function getSupabaseClient() {
    if (typeof getSupabase === 'function') {
      return getSupabase();
    }
    return null;
  }
  
  function getArticleInfo() {
    const path = window.location.pathname;
    const slug = path.split('/').pop().replace('.html', '');
    const title = document.querySelector('title')?.textContent?.split('|')[0]?.trim() || slug;
    const category = document.querySelector('.article-category')?.textContent || 
                    document.querySelector('.article-tag')?.textContent || 'Article';
    const image = document.querySelector('.article-hero img')?.src || 
                 document.querySelector('meta[property="og:image"]')?.content || '';
    return { slug, title, category, image };
  }
  
  async function checkIfSaved() {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return false;
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return false;
    
    const { slug } = getArticleInfo();
    const { data } = await supabaseClient
      .from('saved_articles')
      .select('id')
      .eq('user_id', user.id)
      .eq('article_slug', slug)
      .single();
    
    return !!data;
  }
  
  async function toggleSaveArticle() {
    const btn = document.getElementById('saveArticleBtn');
    if (!btn) return;
    
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      alert('Please sign in to save articles');
      window.location.href = '/auth/';
      return;
    }
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      alert('Please sign in to save articles');
      window.location.href = '/auth/';
      return;
    }
    
    btn.disabled = true;
    const { slug, title, category, image } = getArticleInfo();
    const isSaved = btn.classList.contains('is-saved');
    
    try {
      if (isSaved) {
        await supabaseClient
          .from('saved_articles')
          .delete()
          .eq('user_id', user.id)
          .eq('article_slug', slug);
        
        btn.classList.remove('is-saved');
        btn.querySelector('i').className = 'far fa-bookmark';
        btn.querySelector('span').textContent = getTranslation('save_article', 'Save Article');
      } else {
        await supabaseClient
          .from('saved_articles')
          .upsert({
            user_id: user.id,
            article_slug: slug,
            article_title: title,
            article_thumbnail: image
          }, { onConflict: 'user_id,article_slug' });
        
        btn.classList.add('is-saved');
        btn.querySelector('i').className = 'fas fa-bookmark';
        btn.querySelector('span').textContent = getTranslation('article_saved', 'Saved!');
      }
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Failed to save article. Please try again.');
    } finally {
      btn.disabled = false;
    }
  }
  
  async function initSaveButton() {
    const btn = document.getElementById('saveArticleBtn');
    if (!btn) return;
    
    btn.addEventListener('click', toggleSaveArticle);
    
    const isSaved = await checkIfSaved();
    if (isSaved) {
      btn.classList.add('is-saved');
      btn.querySelector('i').className = 'fas fa-bookmark';
      btn.querySelector('span').textContent = getTranslation('article_saved', 'Saved!');
    }
  }
  
  document.addEventListener('DOMContentLoaded', initSaveButton);
})();
