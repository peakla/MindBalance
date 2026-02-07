// ==================== BLOG ====================

(function() {
  'use strict';

  // --- Translation Helper ---
  function getTranslation(key, fallback) {
    if (window.translations) {
      const lang = localStorage.getItem('mindbalance-language') || 'en';
      const langMap = { en: 'en', es: 'es', fr: 'fr', zh: 'zh', hi: 'hi' };
      const langKey = langMap[lang] || 'en';
      if (window.translations[langKey] && window.translations[langKey][key]) {
        return window.translations[langKey][key];
      }
    }
    return fallback;
  }

  // ==================== TEXT-TO-SPEECH ====================
  let speechSynthesis = window.speechSynthesis;
  let currentUtterance = null;
  let isPlaying = false;

  function stopSpeech() {
    if (speechSynthesis) {
      speechSynthesis.cancel();
      isPlaying = false;
      updateAllTTSButtons();
    }
  }

  function speakText(text, button) {
    if (!speechSynthesis) {
      alert(getTranslation('tts_not_supported', 'Text-to-speech is not supported in your browser.'));
      return;
    }

    if (isPlaying) {
      stopSpeech();
      return;
    }

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = document.documentElement.lang || 'en';
    currentUtterance.rate = 0.9;
    currentUtterance.pitch = 1;

    currentUtterance.onstart = () => {
      isPlaying = true;
      if (button) {
        button.classList.add('is-playing');
        button.setAttribute('aria-pressed', 'true');
        const icon = button.querySelector('.tts-icon');
        if (icon) icon.textContent = '⏹';
      }
    };

    currentUtterance.onend = () => {
      isPlaying = false;
      updateAllTTSButtons();
    };

    currentUtterance.onerror = () => {
      isPlaying = false;
      updateAllTTSButtons();
    };

    speechSynthesis.speak(currentUtterance);
  }

  function updateAllTTSButtons() {
    document.querySelectorAll('.mb-ttsBtn').forEach(btn => {
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-pressed', 'false');
      const icon = btn.querySelector('.tts-icon');
      if (icon) icon.textContent = '🔊';
    });
  }

  function getArticleText(article) {
    const title = article.querySelector('.mb-featureCard__title, .mb-postCard__title, .mb-listPost__title, .mb-miniCard__title');
    const excerpt = article.querySelector('.mb-featureCard__desc, .mb-postCard__excerpt, .mb-listPost__excerpt');
    const subtext = article.querySelector('.mb-featureCard__subtext, .mb-postCard__subtext, .mb-listPost__subtext');
    
    let text = '';
    if (title) text += title.textContent.trim() + '. ';
    if (excerpt) text += excerpt.textContent.trim() + '. ';
    if (subtext) text += subtext.textContent.trim();
    
    return text;
  }

  function addTTSButtons() {
    const articles = document.querySelectorAll('.mb-featureCard, .mb-postCard, .mb-listPost');
    
    articles.forEach(article => {
      if (article.querySelector('.mb-ttsBtn')) return;
      
      const actionsContainer = article.querySelector('.mb-featureCard__actions, .mb-postCard__body, .mb-listPost__body');
      if (!actionsContainer) return;

      const ttsBtn = document.createElement('button');
      ttsBtn.className = 'mb-ttsBtn';
      ttsBtn.type = 'button';
      ttsBtn.setAttribute('aria-label', getTranslation('blog_listen', 'Listen to article'));
      ttsBtn.setAttribute('aria-pressed', 'false');
      ttsBtn.setAttribute('data-translate-aria', 'blog_listen');
      ttsBtn.innerHTML = `<span class="tts-icon" aria-hidden="true">🔊</span> <span data-translate="blog_listen">Listen</span>`;

      ttsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = getArticleText(article);
        speakText(text, ttsBtn);
      });

      if (article.classList.contains('mb-featureCard')) {
        actionsContainer.appendChild(ttsBtn);
      } else {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-articleActions';
        wrapper.appendChild(ttsBtn);
        actionsContainer.appendChild(wrapper);
      }
    });
  }

  // ==================== READING MODE ====================
  let readingModeEnabled = localStorage.getItem('mindbalance-reading-mode') === 'true';

  function toggleReadingMode() {
    readingModeEnabled = !readingModeEnabled;
    localStorage.setItem('mindbalance-reading-mode', readingModeEnabled);
    applyReadingMode();
    updateReadingModeButton();
  }

  function applyReadingMode() {
    document.body.classList.toggle('reading-mode', readingModeEnabled);
  }

  function updateReadingModeButton() {
    const btn = document.getElementById('readingModeBtn');
    if (btn) {
      btn.classList.toggle('is-active', readingModeEnabled);
      btn.setAttribute('aria-pressed', readingModeEnabled.toString());
    }
  }

  function createReadingModeToggle() {
    const existingBtn = document.getElementById('readingModeBtn');
    if (existingBtn) return;

    const container = document.querySelector('.mb-blogHero__chips');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'mb-readingModeWrapper';
    wrapper.innerHTML = `
      <button id="readingModeBtn" class="mb-readingModeBtn ${readingModeEnabled ? 'is-active' : ''}" 
              type="button" 
              aria-pressed="${readingModeEnabled}"
              aria-label="${getTranslation('blog_reading_mode', 'Reading Mode')}"
              data-translate-aria="blog_reading_mode">
        <span class="reading-icon" aria-hidden="true">📖</span>
        <span data-translate="blog_reading_mode">Reading Mode</span>
      </button>
    `;

    container.parentNode.insertBefore(wrapper, container.nextSibling);

    document.getElementById('readingModeBtn').addEventListener('click', toggleReadingMode);
    applyReadingMode();
  }

  // ==================== READING PROGRESS ====================
  function updateReadingProgress() {
    const progressFill = document.querySelector('.mb-readingProgress__fill');
    const progressBar = document.querySelector('.mb-readingProgress');
    if (!progressFill || !progressBar) return;

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.min(Math.round((scrollTop / docHeight) * 100), 100);
    
    progressFill.style.width = progress + '%';
    progressBar.setAttribute('aria-valuenow', progress.toString());
  }

  function createReadingProgressBar() {
    if (document.querySelector('.mb-readingProgress')) return;

    const progressBar = document.createElement('div');
    progressBar.className = 'mb-readingProgress';
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-label', getTranslation('blog_reading_progress', 'Reading progress'));
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-valuenow', '0');
    progressBar.setAttribute('data-translate-aria', 'blog_reading_progress');
    progressBar.innerHTML = '<div class="mb-readingProgress__fill"></div>';

    document.body.appendChild(progressBar);

    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    updateReadingProgress();
  }

  // ==================== KEYBOARD NAVIGATION ====================
  function enhanceKeyboardNav() {
    const articles = document.querySelectorAll('.mb-featureCard, .mb-postCard, .mb-listPost, .mb-miniCard');
    
    articles.forEach(article => {
      article.setAttribute('tabindex', '0');
      
      article.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const link = article.querySelector('a[href]');
          if (link && e.target === article) {
            e.preventDefault();
            link.click();
          }
        }
      });
    });
  }

  // ==================== HOVER EFFECTS ====================
  function addHoverEffects() {
    const cards = document.querySelectorAll('.mb-postCard, .mb-listPost, .mb-miniCard');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.classList.add('is-hovered');
      });
      
      card.addEventListener('mouseleave', () => {
        card.classList.remove('is-hovered');
      });

      card.addEventListener('focus', () => {
        card.classList.add('is-focused');
      });

      card.addEventListener('blur', () => {
        card.classList.remove('is-focused');
      });
    });
  }

  // ==================== INITIALIZATION ====================
  function init() {
    addTTSButtons();
    createReadingModeToggle();
    createReadingProgressBar();
    enhanceKeyboardNav();
    addHoverEffects();

    window.addEventListener('beforeunload', stopSpeech);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // --- Public API ---
  window.MindBalanceBlog = {
    stopSpeech,
    toggleReadingMode
  };
})();
