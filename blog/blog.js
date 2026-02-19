// ==================== BLOG ====================

(function () {
  'use strict';

  // --- Translation Helper ---
  function getTranslation(key, fallback) {
    if (window.translations) {
      var lang = localStorage.getItem('mindbalance-language') || 'en';
      var langMap = { en: 'en', es: 'es', fr: 'fr', zh: 'zh', hi: 'hi', ko: 'ko' };
      var langKey = langMap[lang] || 'en';
      if (window.translations[langKey] && window.translations[langKey][key]) {
        return window.translations[langKey][key];
      }
    }
    return fallback;
  }

  // ==================== TEXT-TO-SPEECH ====================
  var speechSynth = window.speechSynthesis;
  var currentUtterance = null;
  var isPlaying = false;

  function stopSpeech() {
    if (speechSynth) {
      speechSynth.cancel();
      isPlaying = false;
      updateAllTTSButtons();
    }
  }

  function speakText(text, button) {
    if (!speechSynth) {
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

    currentUtterance.onstart = function () {
      isPlaying = true;
      if (button) {
        button.classList.add('is-playing');
        button.setAttribute('aria-pressed', 'true');
        var icon = button.querySelector('.tts-icon');
        if (icon) icon.textContent = '⏹';
      }
    };

    currentUtterance.onend = function () {
      isPlaying = false;
      updateAllTTSButtons();
    };

    currentUtterance.onerror = function () {
      isPlaying = false;
      updateAllTTSButtons();
    };

    speechSynth.speak(currentUtterance);
  }

  function updateAllTTSButtons() {
    document.querySelectorAll('.mb-ttsBtn').forEach(function (btn) {
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-pressed', 'false');
      var icon = btn.querySelector('.tts-icon');
      if (icon) icon.textContent = '🔊';
    });
  }

  function getArticleText(article) {
    var title = article.querySelector('.mb-featureCard__title, .mb-postCard__title, .mb-listPost__title, .mb-miniCard__title');
    var excerpt = article.querySelector('.mb-featureCard__desc, .mb-postCard__excerpt, .mb-listPost__excerpt');
    var subtext = article.querySelector('.mb-featureCard__subtext, .mb-postCard__subtext, .mb-listPost__subtext');

    var text = '';
    if (title) text += title.textContent.trim() + '. ';
    if (excerpt) text += excerpt.textContent.trim() + '. ';
    if (subtext) text += subtext.textContent.trim();

    return text;
  }

  function addTTSButtons() {
    var articles = document.querySelectorAll('.mb-featureCard, .mb-postCard, .mb-listPost');

    articles.forEach(function (article) {
      if (article.querySelector('.mb-ttsBtn')) return;

      var actionsContainer = article.querySelector('.mb-featureCard__actions, .mb-postCard__body, .mb-listPost__body');
      if (!actionsContainer) return;

      var ttsBtn = document.createElement('button');
      ttsBtn.className = 'mb-ttsBtn';
      ttsBtn.type = 'button';
      ttsBtn.setAttribute('aria-label', getTranslation('blog_listen', 'Listen to article'));
      ttsBtn.setAttribute('aria-pressed', 'false');
      ttsBtn.setAttribute('data-translate-aria', 'blog_listen');
      ttsBtn.innerHTML = '<span class="tts-icon" aria-hidden="true">🔊</span> <span data-translate="blog_listen">Listen</span>';

      ttsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var text = getArticleText(article);
        speakText(text, ttsBtn);
      });

      if (article.classList.contains('mb-featureCard')) {
        actionsContainer.appendChild(ttsBtn);
      } else {
        var wrapper = document.createElement('div');
        wrapper.className = 'mb-articleActions';
        wrapper.appendChild(ttsBtn);
        actionsContainer.appendChild(wrapper);
      }
    });
  }

  // ==================== READING MODE ====================
  var readingModeEnabled = localStorage.getItem('mindbalance-reading-mode') === 'true';

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
    var btn = document.getElementById('readingModeBtn');
    if (btn) {
      btn.classList.toggle('is-active', readingModeEnabled);
      btn.setAttribute('aria-pressed', readingModeEnabled.toString());
    }
  }

  function createReadingModeToggle() {
    if (document.getElementById('readingModeBtn')) return;

    var container = document.querySelector('.mb-blogHero__chips');
    if (!container) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'mb-readingModeWrapper';
    wrapper.innerHTML =
      '<button id="readingModeBtn" class="mb-readingModeBtn ' + (readingModeEnabled ? 'is-active' : '') + '" ' +
      'type="button" ' +
      'aria-pressed="' + readingModeEnabled + '" ' +
      'aria-label="' + getTranslation('blog_reading_mode', 'Reading Mode') + '" ' +
      'data-translate-aria="blog_reading_mode">' +
      '<span class="reading-icon" aria-hidden="true">📖</span> ' +
      '<span data-translate="blog_reading_mode">Reading Mode</span>' +
      '</button>';

    container.parentNode.insertBefore(wrapper, container.nextSibling);
    document.getElementById('readingModeBtn').addEventListener('click', toggleReadingMode);
    applyReadingMode();
  }

  // ==================== READING PROGRESS BAR ====================
  function updateReadingProgress() {
    var progressFill = document.querySelector('.mb-readingProgress__bar');
    var progressBar = document.querySelector('.mb-readingProgress');
    if (!progressFill || !progressBar) return;

    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? Math.min(Math.round((scrollTop / docHeight) * 100), 100) : 0;

    progressFill.style.width = progress + '%';
    progressBar.setAttribute('aria-valuenow', progress.toString());
  }

  function createReadingProgressBar() {
    if (document.querySelector('.mb-readingProgress')) return;

    var progressBar = document.createElement('div');
    progressBar.className = 'mb-readingProgress';
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-label', getTranslation('blog_reading_progress', 'Reading progress'));
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-valuenow', '0');
    progressBar.setAttribute('data-translate-aria', 'blog_reading_progress');
    progressBar.innerHTML = '<div class="mb-readingProgress__bar"></div>';

    document.body.appendChild(progressBar);
    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    updateReadingProgress();
  }

  // ==================== KEYBOARD NAVIGATION ====================
  function enhanceKeyboardNav() {
    var articles = document.querySelectorAll('.mb-featureCard, .mb-postCard, .mb-listPost, .mb-miniCard, .mb-compactCard');

    articles.forEach(function (article) {
      article.setAttribute('tabindex', '0');

      article.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          var link = article.querySelector('a[href]');
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
    var cards = document.querySelectorAll('.mb-postCard, .mb-listPost, .mb-miniCard, .mb-compactCard');

    cards.forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        card.classList.add('is-hovered');
      });
      card.addEventListener('mouseleave', function () {
        card.classList.remove('is-hovered');
      });
      card.addEventListener('focus', function () {
        card.classList.add('is-focused');
      });
      card.addEventListener('blur', function () {
        card.classList.remove('is-focused');
      });
    });
  }

  // ==================== CATEGORY CARD FILTERS ====================
  function initCategoryCards() {
    var categoryCards = document.querySelectorAll('.mb-categoryCard[data-filter]');
    if (categoryCards.length === 0) return;

    categoryCards.forEach(function (card) {
      card.addEventListener('click', function () {
        categoryCards.forEach(function (c) { c.classList.remove('is-active'); });
        card.classList.add('is-active');
      });
    });

    var chips = document.querySelectorAll('.mb-chip[data-filter]');
    if (chips.length > 0) {
      var observer = new MutationObserver(function () {
        var activeChip = document.querySelector('.mb-chip.is-active, .mb-chip.active');
        var activeFilter = activeChip ? activeChip.dataset.filter : 'all';
        categoryCards.forEach(function (c) {
          c.classList.toggle('is-active', c.dataset.filter === activeFilter);
        });
      });
      chips.forEach(function (chip) {
        observer.observe(chip, { attributes: true, attributeFilter: ['class'] });
      });
    }
  }

  // ==================== READING DASHBOARD ====================
  function initDashboard() {
    var dashboardCards = document.getElementById('dashboardCards');
    var ringFill = document.getElementById('ringFill');
    var ringText = document.getElementById('ringText');
    var streakCount = document.getElementById('streakCount');

    var readArticles = JSON.parse(localStorage.getItem('mindbalance-read-articles') || '[]');
    var totalArticles = 13;
    var readCount = readArticles.length;
    var percentage = Math.round((readCount / totalArticles) * 100);

    if (ringFill) {
      var circumference = 2 * Math.PI * 35;
      var offset = circumference - (percentage / 100) * circumference;
      ringFill.style.strokeDasharray = circumference;
      ringFill.style.strokeDashoffset = offset;
    }
    if (ringText) ringText.textContent = percentage + '%';

    var streak = parseInt(localStorage.getItem('mindbalance-reading-streak') || '0', 10);
    if (streakCount) streakCount.textContent = streak;

    if (dashboardCards) {
      if (readArticles.length === 0) {
        dashboardCards.innerHTML =
          '<div class="mb-dashboard__guest">' +
          '<p data-translate="blog_dashboard_empty">Start reading to track your progress!</p>' +
          '</div>';
      } else {
        var recent = readArticles.slice(-5).reverse();
        dashboardCards.innerHTML = recent.map(function (article) {
          var progress = article.progress || 0;
          return '<a class="mb-dashboard__card" href="' + (article.url || '#') + '">' +
            '<img class="mb-dashboard__cardThumb" src="' + (article.image || '') + '" alt="" loading="lazy">' +
            '<div class="mb-dashboard__cardBody">' +
            '<span class="mb-dashboard__cardTitle">' + (article.title || 'Article') + '</span>' +
            '<div class="mb-dashboard__cardBar">' +
            '<div class="mb-dashboard__cardBarFill" style="width: ' + progress + '%"></div>' +
            '</div>' +
            '</div>' +
            '</a>';
        }).join('');
      }
    }
  }

  // ==================== FLOATING TABLE OF CONTENTS ====================
  function initToc() {
    var tocLinks = document.querySelectorAll('.mb-blogToc__link');
    var tocProgress = document.getElementById('tocProgress');

    if (tocLinks.length === 0) return;

    var sections = [];
    tocLinks.forEach(function (link) {
      var sectionId = link.getAttribute('data-toc-section');
      var section = sectionId ? document.getElementById(sectionId) : null;
      if (section) sections.push({ id: sectionId, element: section, link: link });
    });

    if (sections.length === 0) return;

    function updateToc() {
      var scrollTop = window.scrollY + 200;
      var activeIndex = 0;

      sections.forEach(function (section, index) {
        if (scrollTop >= section.element.offsetTop) {
          activeIndex = index;
        }
      });

      tocLinks.forEach(function (link) { link.classList.remove('is-active'); });
      if (sections[activeIndex]) sections[activeIndex].link.classList.add('is-active');

      if (tocProgress) {
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var progress = docHeight > 0 ? Math.min(Math.round((window.scrollY / docHeight) * 100), 100) : 0;
        tocProgress.style.height = progress + '%';
      }
    }

    window.addEventListener('scroll', updateToc, { passive: true });
    updateToc();

    tocLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var sectionId = link.getAttribute('data-toc-section');
        var section = sectionId ? document.getElementById(sectionId) : null;
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ==================== ARTICLE PREVIEW PANEL ====================
  function initPreviewPanel() {
    var panel = document.getElementById('previewPanel');
    var overlay = document.getElementById('previewOverlay');
    var closeBtn = document.getElementById('previewClose');

    if (!panel || !overlay) return;

    document.addEventListener('click', function (e) {
      if (e.target.closest('a[href]') || e.target.closest('button') || e.target.closest('.mb-cardBookmark')) return;

      var card = e.target.closest('.mb-postCard, .mb-miniCard, .mb-compactCard, .mb-listPost');
      if (!card) return;

      e.preventDefault();
      openPreview(card);
    });

    function openPreview(card) {
      var titleEl = card.querySelector('.mb-postCard__title a, .mb-miniCard__title a, .mb-compactCard__title a, .mb-listPost__title a');
      var imgEl = card.querySelector('img');
      var excerptEl = card.querySelector('.mb-postCard__excerpt, .mb-listPost__excerpt');
      var subtextEl = card.querySelector('.mb-postCard__subtext, .mb-listPost__subtext');
      var hintEl = card.querySelector('.mb-postHint');
      var pillEl = card.querySelector('.mb-postCard__pill, .mb-pill');
      var metaEl = card.querySelector('.mb-postCard__meta, .mb-miniCard__meta, .mb-compactCard__meta');
      var moodEl = card.querySelector('.mb-mood');
      var linkEl = card.querySelector('a[href]');

      var previewTitle = document.getElementById('previewTitle');
      var previewImg = document.getElementById('previewImg');
      var previewCategory = document.getElementById('previewCategory');
      var previewMeta = document.getElementById('previewMeta');
      var previewMood = document.getElementById('previewMood');
      var previewExcerpt = document.getElementById('previewExcerpt');
      var previewTakeawaysList = document.getElementById('previewTakeawaysList');
      var previewReadBtn = document.getElementById('previewReadBtn');

      if (previewTitle) previewTitle.textContent = titleEl ? titleEl.textContent.trim() : '';

      if (previewImg && imgEl) {
        previewImg.src = imgEl.src || '';
        previewImg.alt = imgEl.alt || '';
      }

      if (previewCategory) {
        previewCategory.textContent = pillEl ? pillEl.textContent.trim() : '';
        previewCategory.className = 'mb-previewPanel__category';
        if (pillEl) {
          var pillClasses = pillEl.className
            .replace('mb-postCard__pill', '')
            .replace('mb-miniCard__pill', '')
            .replace('mb-compactCard__pill', '')
            .replace('mb-pill', '')
            .trim();
          if (pillClasses) previewCategory.className += ' ' + pillClasses;
        }
      }

      if (previewMeta) previewMeta.textContent = metaEl ? metaEl.textContent.trim() : '';

      if (previewMood && moodEl) {
        previewMood.textContent = moodEl.textContent.trim();
        var moodMatch = moodEl.className.match(/mb-mood--\w+/);
        previewMood.className = 'mb-previewPanel__mood' + (moodMatch ? ' ' + moodMatch[0] : '');
      }

      if (previewExcerpt) previewExcerpt.textContent = excerptEl ? excerptEl.textContent.trim() : '';

      if (previewTakeawaysList) {
        var takeaways = [];
        if (subtextEl) {
          subtextEl.textContent.split('.').forEach(function (s) {
            var trimmed = s.trim();
            if (trimmed.length > 10) takeaways.push(trimmed);
          });
        }
        if (hintEl) {
          var hintText = hintEl.textContent.replace(/^(Best for:|What you'll learn:|Quick take:)/i, '').trim();
          if (hintText) takeaways.push(hintText);
        }
        previewTakeawaysList.innerHTML = takeaways.length > 0
          ? takeaways.map(function (t) { return '<li>' + t + '</li>'; }).join('')
          : '<li>Click "Read Full Article" for the complete content.</li>';
      }

      if (previewReadBtn) previewReadBtn.href = linkEl ? linkEl.href : '#';

      panel.classList.add('is-open');
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closePreview() {
      panel.classList.remove('is-open');
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closePreview);
    overlay.addEventListener('click', closePreview);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) closePreview();
    });

    var previewTts = document.getElementById('previewTts');
    if (previewTts) {
      previewTts.addEventListener('click', function () {
        var title = document.getElementById('previewTitle');
        var excerpt = document.getElementById('previewExcerpt');
        var text = (title ? title.textContent : '') + '. ' + (excerpt ? excerpt.textContent : '');
        speakText(text, previewTts);
      });
    }
  }

  // ==================== BOOKMARK VISUAL TOGGLE ====================
  function initBookmarks() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.mb-cardBookmark');
      if (!btn) return;
      btn.classList.toggle('is-saved');
      var icon = btn.querySelector('ion-icon');
      if (icon) {
        icon.setAttribute('name', btn.classList.contains('is-saved') ? 'bookmark' : 'bookmark-outline');
      }
    });
  }

  // ==================== CARD READING PROGRESS ====================
  function initCardProgress() {
    var readArticles = JSON.parse(localStorage.getItem('mindbalance-read-articles') || '[]');
    if (readArticles.length === 0) return;

    document.querySelectorAll('[data-category]').forEach(function (card) {
      var link = card.querySelector('a[href]');
      if (!link) return;

      var url = link.getAttribute('href');
      var article = readArticles.find(function (a) { return a.url === url; });

      if (article && article.progress > 0) {
        var existingProgress = card.querySelector('.mb-cardProgress');
        if (existingProgress) {
          var fill = existingProgress.querySelector('.mb-cardProgress__bar');
          if (fill) fill.style.width = article.progress + '%';
        } else {
          var progressBar = document.createElement('div');
          progressBar.className = 'mb-cardProgress';
          progressBar.innerHTML = '<div class="mb-cardProgress__bar" style="width: ' + article.progress + '%"></div>';
          var imgWrap = card.querySelector('.mb-postCard__imgWrap, .mb-miniCard__imgWrap, .mb-compactCard__imgWrap, .mb-listPost__imgWrap');
          if (imgWrap) imgWrap.appendChild(progressBar);
        }
      }
    });
  }

  // ==================== BACK TO TOP ====================
  function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      btn.classList.toggle('is-visible', window.scrollY > 600);
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ==================== SMOOTH SCROLL ====================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href === '#') return;
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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
    initCategoryCards();
    initDashboard();
    initToc();
    initPreviewPanel();
    initBookmarks();
    initCardProgress();
    initBackToTop();
    initSmoothScroll();

    window.addEventListener('beforeunload', stopSpeech);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // --- Public API ---
  window.MindBalanceBlog = {
    stopSpeech: stopSpeech,
    toggleReadingMode: toggleReadingMode,
    speakText: speakText
  };
})();
