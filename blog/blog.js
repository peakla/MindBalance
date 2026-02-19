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
    var title = article.querySelector('.mb-articleCard__title, .mb-featureCard__title, .mb-postCard__title, .mb-listPost__title, .mb-miniCard__title');
    var excerpt = article.querySelector('.mb-articleCard__desc, .mb-featureCard__desc, .mb-postCard__excerpt, .mb-listPost__excerpt');
    var subtext = article.querySelector('.mb-featureCard__subtext, .mb-postCard__subtext, .mb-listPost__subtext');

    var text = '';
    if (title) text += title.textContent.trim() + '. ';
    if (excerpt) text += excerpt.textContent.trim() + '. ';
    if (subtext) text += subtext.textContent.trim();

    return text;
  }

  function addTTSButtons() {
    var articles = document.querySelectorAll('.mb-articleCard, .mb-featureCard, .mb-postCard, .mb-listPost');

    articles.forEach(function (article) {
      if (article.querySelector('.mb-ttsBtn')) return;

      var actionsContainer = article.querySelector('.mb-articleCard__body, .mb-featureCard__actions, .mb-postCard__body, .mb-listPost__body');
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
    var articles = document.querySelectorAll('.mb-articleCard, .mb-featureCard, .mb-postCard, .mb-listPost, .mb-miniCard, .mb-compactCard');

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
    var cards = document.querySelectorAll('.mb-articleCard, .mb-postCard, .mb-listPost, .mb-miniCard, .mb-compactCard');

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
        var filter = card.dataset.filter;
        categoryCards.forEach(function (c) { c.classList.remove('is-active'); });
        card.classList.add('is-active');

        var stickyChips = document.querySelectorAll('.mb-stickyChip[data-filter]');
        stickyChips.forEach(function (c) {
          c.classList.toggle('is-active', c.dataset.filter === filter);
        });

        filterArticlesByCategory(filter);
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

  // ==================== ARTICLE FILTERING ====================
  function filterArticlesByCategory(filter) {
    var allCards = document.querySelectorAll('[data-category]');
    allCards.forEach(function (card) {
      if (filter === 'all') {
        card.style.display = '';
        card.style.opacity = '1';
        card.style.transform = '';
      } else {
        var match = card.dataset.category.toLowerCase() === filter.toLowerCase();
        card.style.display = match ? '' : 'none';
        if (match) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          requestAnimationFrame(function () {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = '';
          });
        }
      }
    });

    var resultsCount = document.getElementById('resultsCount');
    var noResults = document.getElementById('noResults');
    var activeLabel = document.getElementById('activeFilterLabel');
    if (resultsCount || noResults) {
      var visible = document.querySelectorAll('[data-category]:not([style*="display: none"])');
      if (resultsCount) resultsCount.textContent = 'Showing: ' + visible.length + ' posts';
      if (noResults) noResults.style.display = visible.length === 0 ? '' : 'none';
      if (activeLabel) activeLabel.textContent = 'Filter: ' + (filter === 'all' ? 'All' : filter);
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

      var card = e.target.closest('.mb-articleCard, .mb-postCard, .mb-miniCard, .mb-compactCard, .mb-listPost');
      if (!card) return;

      e.preventDefault();
      openPreview(card);
    });

    function openPreview(card) {
      var titleEl = card.querySelector('.mb-articleCard__title a, .mb-postCard__title a, .mb-miniCard__title a, .mb-compactCard__title a, .mb-listPost__title a');
      var imgEl = card.querySelector('img');
      var excerptEl = card.querySelector('.mb-articleCard__desc, .mb-postCard__excerpt, .mb-listPost__excerpt');
      var subtextEl = card.querySelector('.mb-postCard__subtext, .mb-listPost__subtext');
      var hintEl = card.querySelector('.mb-postHint');
      var pillEl = card.querySelector('.mb-articleCard__source, .mb-postCard__pill, .mb-pill');
      var metaEl = card.querySelector('.mb-articleCard__meta, .mb-postCard__meta, .mb-miniCard__meta, .mb-compactCard__meta');
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
            .replace('mb-articleCard__source', '')
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
          var imgWrap = card.querySelector('.mb-articleCard__imgWrap, .mb-postCard__imgWrap, .mb-miniCard__imgWrap, .mb-compactCard__imgWrap, .mb-listPost__imgWrap');
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

  // ==================== SCROLL REVEAL ====================
  function initScrollReveal() {
    var revealEls = document.querySelectorAll('[data-reveal]');
    if (!revealEls.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { observer.observe(el); });
  }

  // ==================== STICKY FILTER CHIPS ====================
  function initStickyFilters() {
    var stickyEl = document.getElementById('stickyFilters');
    var catSection = document.querySelector('.mb-categoryCards');
    if (!stickyEl || !catSection) return;

    var chips = stickyEl.querySelectorAll('.mb-stickyChip[data-filter]');
    var categoryCards = document.querySelectorAll('.mb-categoryCard[data-filter]');

    function getNavbarHeight() {
      var header = document.querySelector('.header');
      if (!header) return 80;
      return header.offsetHeight;
    }

    function updateStickyVisibility() {
      var rect = catSection.getBoundingClientRect();
      var navH = getNavbarHeight();
      var shouldShow = rect.bottom < navH;
      stickyEl.classList.toggle('is-visible', shouldShow);
      stickyEl.style.top = navH + 'px';
    }

    window.addEventListener('scroll', updateStickyVisibility, { passive: true });
    window.addEventListener('resize', updateStickyVisibility, { passive: true });
    updateStickyVisibility();

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        var filter = chip.dataset.filter;
        categoryCards.forEach(function (c) {
          c.classList.toggle('is-active', c.dataset.filter === filter);
        });
        filterArticlesByCategory(filter);
      });
    });
  }

  // ==================== ROTATING QUOTES ====================
  function initQuoteRotation() {
    var quoteEl = document.getElementById('rotatingQuote');
    var authorEl = document.getElementById('rotatingAuthor');
    if (!quoteEl || !authorEl) return;

    var quotes = [
      { text: "You don\u2019t have to control your thoughts. You just have to stop letting them control you.", author: "Dan Millman" },
      { text: "Mental health is not a destination, but a process. It\u2019s about how you drive, not where you\u2019re going.", author: "Noam Shpancer" },
      { text: "There is hope, even when your brain tells you there isn\u2019t.", author: "John Green" },
      { text: "You are not your illness. You have an individual story to tell. You have a name, a history, a personality.", author: "Julian Seifter" },
      { text: "Recovery is not one and done. It is a lifelong journey that takes place one day, one step at a time.", author: "Unknown" },
      { text: "Self-care is how you take your power back.", author: "Lalah Delia" },
      { text: "It\u2019s okay to not be okay \u2013 as long as you are not giving up.", author: "Karen Salmansohn" },
      { text: "The strongest people are not those who show strength in front of us, but those who win battles we know nothing about.", author: "Jonathan Harnisch" }
    ];

    var index = 0;
    setInterval(function () {
      index = (index + 1) % quotes.length;
      quoteEl.style.opacity = '0';
      authorEl.style.opacity = '0';
      setTimeout(function () {
        quoteEl.textContent = quotes[index].text;
        authorEl.textContent = '\u2014 ' + quotes[index].author;
        quoteEl.style.opacity = '1';
        authorEl.style.opacity = '1';
      }, 400);
    }, 8000);
  }

  // ==================== ANIMATED STAT COUNTERS ====================
  function initStatCounters() {
    var statNumbers = document.querySelectorAll('.mb-stats__number[data-count], .mb-heroStats__number[data-count]');
    if (!statNumbers.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-count'), 10);
          var duration = 1500;
          var start = 0;
          var startTime = null;

          function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(animate);
            else el.textContent = target + '+';
          }

          requestAnimationFrame(animate);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(function (el) { observer.observe(el); });
  }

  // ==================== MOOD-BASED RECOMMENDATIONS ====================
  function initMoodRecommendations() {
    var moodBtns = document.querySelectorAll('.mb-moodBtn[data-mood]');
    var resultsEl = document.getElementById('moodResults');
    var resultsTitleEl = document.getElementById('moodResultsTitle');
    var resultsCardsEl = document.getElementById('moodResultsCards');
    if (!moodBtns.length || !resultsEl) return;

    var moodMap = {
      anxious: {
        title: 'When you\u2019re feeling anxious, try these:',
        articles: [
          { title: 'Anxiety Disorders: symptoms, types & treatment', url: '../articles/anxiety.html', category: 'Anxiety', time: '15 min' },
          { title: 'Meditation & mindfulness: a beginner\u2019s guide', url: '../articles/mindfulness.html', category: 'Mindfulness', time: '12 min' },
          { title: 'Anxiety and sleep: the cycle that keeps people stuck', url: 'https://www.sleepfoundation.org/mental-health/anxiety-and-sleep', category: 'Sleep', time: '6 min' }
        ]
      },
      sad: {
        title: 'When you\u2019re feeling down, these can help:',
        articles: [
          { title: 'Understanding Depression: Symptoms & Treatment', url: '../articles/depression.html', category: 'Depression', time: '12 min' },
          { title: 'Stories of Hope: Real Recovery Journeys', url: '../articles/recovery-stories.html', category: 'Story', time: '10 min' },
          { title: 'Mental Health Wins: Celebrating Progress', url: '../articles/mental-health-wins.html', category: 'Story', time: '10 min' }
        ]
      },
      stressed: {
        title: 'Stressed? These articles offer real coping tools:',
        articles: [
          { title: 'Stress: what it is and how to manage it', url: '../articles/stress.html', category: 'Stress', time: '12 min' },
          { title: 'Mental health basics: daily life & support', url: 'https://www.cdc.gov/mental-health/about/', category: 'Stress', time: '6 min' },
          { title: 'Workplace Mental Health: A Growing Priority', url: '../articles/workplace-wellness.html', category: 'News', time: '10 min' }
        ]
      },
      tired: {
        title: 'Rest is important. Start here:',
        articles: [
          { title: 'Better Sleep: Your Complete Guide', url: '../articles/sleep.html', category: 'Sleep', time: '10 min' },
          { title: 'How much sleep do you really need?', url: '../articles/sleep.html', category: 'Sleep', time: '4 min' },
          { title: 'Meditation & mindfulness: a beginner\u2019s guide', url: '../articles/mindfulness.html', category: 'Mindfulness', time: '12 min' }
        ]
      },
      hopeful: {
        title: 'Keep that energy! These will inspire you:',
        articles: [
          { title: 'Stories of Hope: Real Recovery Journeys', url: '../articles/recovery-stories.html', category: 'Story', time: '10 min' },
          { title: 'Community Care: The Power of Coming Together', url: '../articles/community-support.html', category: 'Community', time: '10 min' },
          { title: 'Mental Health Wins: Celebrating Progress', url: '../articles/mental-health-wins.html', category: 'Story', time: '10 min' }
        ]
      },
      curious: {
        title: 'Great mindset! Explore these in-depth guides:',
        articles: [
          { title: 'Anxiety Disorders: symptoms, types & treatment', url: '../articles/anxiety.html', category: 'Anxiety', time: '15 min' },
          { title: 'Teen Mental Health: A Complete Guide', url: '../articles/teen-mental-health.html', category: 'Teens', time: '10 min' },
          { title: 'Breaking: New Research in Mental Health', url: '../articles/mental-health-news.html', category: 'News', time: '10 min' }
        ]
      }
    };

    moodBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mood = btn.dataset.mood;
        var data = moodMap[mood];
        if (!data) return;

        moodBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');

        if (resultsTitleEl) resultsTitleEl.textContent = data.title;
        if (resultsCardsEl) {
          resultsCardsEl.innerHTML = data.articles.map(function (a) {
            return '<a class="mb-moodRec__card" href="' + a.url + '">' +
              '<span class="mb-pill">' + a.category + '</span>' +
              '<span class="mb-moodRec__cardTitle">' + a.title + '</span>' +
              '<span class="mb-moodRec__cardMeta">' + a.time + ' read</span>' +
              '</a>';
          }).join('');
        }

        resultsEl.hidden = false;
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    initScrollReveal();
    initStickyFilters();
    initQuoteRotation();
    initStatCounters();
    initMoodRecommendations();

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
