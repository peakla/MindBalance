// ==================== QUOTE BANNER & WELLNESS TIP ====================

(function() {
  'use strict';

  // --- Quotes Data ---
  const quotes = [
    { text: 'quote_1_text', author: 'quote_1_author' },
    { text: 'quote_2_text', author: 'quote_2_author' },
    { text: 'quote_3_text', author: 'quote_3_author' },
    { text: 'quote_4_text', author: 'quote_4_author' },
    { text: 'quote_5_text', author: 'quote_5_author' },
    { text: 'quote_6_text', author: 'quote_6_author' },
    { text: 'quote_7_text', author: 'quote_7_author' }
  ];

  const fallbackQuotes = {
    quote_1_text: "You don't have to control your thoughts. You just have to stop letting them control you.",
    quote_1_author: "Dan Millman",
    quote_2_text: "Mental health is not a destination, but a process. It's about how you drive, not where you're going.",
    quote_2_author: "Noam Shpancer",
    quote_3_text: "There is hope, even when your brain tells you there isn't.",
    quote_3_author: "John Green",
    quote_4_text: "Self-care is how you take your power back.",
    quote_4_author: "Lalah Delia",
    quote_5_text: "You are not your illness. You have an individual story to tell. You have a name, a history, a personality.",
    quote_5_author: "Julian Seifter",
    quote_6_text: "Healing takes time, and asking for help is a courageous step.",
    quote_6_author: "Mariska Hargitay",
    quote_7_text: "Be patient with yourself. Self-growth is tender; it's holy ground.",
    quote_7_author: "Stephen Covey"
  };

  // --- Wellness Tips Data ---
  const wellnessTips = [
    { title: 'tip_sunday_title', text: 'tip_sunday_text', icon: '🌅', link: '/articles/mindfulness.html' },
    { title: 'tip_monday_title', text: 'tip_monday_text', icon: '🎯', link: '/support/' },
    { title: 'tip_tuesday_title', text: 'tip_tuesday_text', icon: '💬', link: '/community/' },
    { title: 'tip_wednesday_title', text: 'tip_wednesday_text', icon: '🌿', link: '/articles/stress.html' },
    { title: 'tip_thursday_title', text: 'tip_thursday_text', icon: '📝', link: '/support/#tools' },
    { title: 'tip_friday_title', text: 'tip_friday_text', icon: '🎉', link: '/resourcelib/' },
    { title: 'tip_saturday_title', text: 'tip_saturday_text', icon: '💤', link: '/articles/sleep.html' }
  ];

  const fallbackTips = {
    tip_sunday_title: "Start Fresh",
    tip_sunday_text: "Begin your week with intention. Take 5 minutes to set a simple wellness goal for the week ahead.",
    tip_monday_title: "Mindful Monday",
    tip_monday_text: "Try a 2-minute breathing exercise before starting work. Inhale for 4 counts, hold for 4, exhale for 6.",
    tip_tuesday_title: "Connect Today",
    tip_tuesday_text: "Reach out to someone you care about. A simple message can strengthen bonds and boost mood.",
    tip_wednesday_title: "Midweek Reset",
    tip_wednesday_text: "Take a short walk outside if possible. Even 10 minutes of movement can reduce stress significantly.",
    tip_thursday_title: "Gratitude Practice",
    tip_thursday_text: "Write down three things you're grateful for today. This simple habit rewires your brain for positivity.",
    tip_friday_title: "Celebrate Wins",
    tip_friday_text: "Acknowledge what you accomplished this week, no matter how small. Every step forward counts.",
    tip_saturday_title: "Rest & Recharge",
    tip_saturday_text: "Give yourself permission to rest today. Quality sleep is essential for mental wellness.",
    tip_day_label: "Today's Wellness Tip"
  };

  // --- State ---
  let currentQuoteIndex = 0;
  let autoRotateInterval = null;
  let translations = {};

  // --- Translation Helper ---
  function t(key) {
    return translations[key] || fallbackQuotes[key] || fallbackTips[key] || key;
  }

  // --- Quote Banner ---
  function initQuoteBanner() {
    const banner = document.querySelector('.quote-banner');
    if (!banner) return;

    const textEl = banner.querySelector('.quote-banner__text');
    const authorEl = banner.querySelector('.quote-banner__author');
    const dotsContainer = banner.querySelector('.quote-banner__controls');

    if (!textEl || !authorEl || !dotsContainer) return;

    dotsContainer.innerHTML = '';
    quotes.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = 'quote-banner__dot' + (index === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Quote ${index + 1} of ${quotes.length}`);
      dot.setAttribute('tabindex', '0');
      dot.addEventListener('click', () => goToQuote(index));
      dotsContainer.appendChild(dot);
    });

    displayQuote(0);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion) {
      startAutoRotate();
    }

    banner.addEventListener('mouseenter', stopAutoRotate);
    banner.addEventListener('mouseleave', () => {
      if (!prefersReducedMotion) startAutoRotate();
    });

    banner.addEventListener('focusin', stopAutoRotate);
    banner.addEventListener('focusout', (e) => {
      if (!banner.contains(e.relatedTarget) && !prefersReducedMotion) {
        startAutoRotate();
      }
    });
  }

  // --- Display Quote ---
  function displayQuote(index) {
    const banner = document.querySelector('.quote-banner');
    if (!banner) return;

    const textEl = banner.querySelector('.quote-banner__text');
    const authorEl = banner.querySelector('.quote-banner__author');
    const dots = banner.querySelectorAll('.quote-banner__dot');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      textEl.textContent = t(quotes[index].text);
      authorEl.textContent = '— ' + t(quotes[index].author);
    } else {
      textEl.classList.add('fade-out');
      authorEl.classList.add('fade-out');

      setTimeout(() => {
        textEl.textContent = t(quotes[index].text);
        authorEl.textContent = '— ' + t(quotes[index].author);
        textEl.classList.remove('fade-out');
        authorEl.classList.remove('fade-out');
      }, 500);
    }

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    currentQuoteIndex = index;
  }

  // --- Quote Navigation ---
  function goToQuote(index) {
    stopAutoRotate();
    displayQuote(index);
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      setTimeout(startAutoRotate, 5000);
    }
  }

  function nextQuote() {
    const nextIndex = (currentQuoteIndex + 1) % quotes.length;
    displayQuote(nextIndex);
  }

  // --- Auto-Rotation ---
  function startAutoRotate() {
    stopAutoRotate();
    autoRotateInterval = setInterval(nextQuote, 12000);
  }

  function stopAutoRotate() {
    if (autoRotateInterval) {
      clearInterval(autoRotateInterval);
      autoRotateInterval = null;
    }
  }

  // --- Wellness Tip ---
  function initWellnessTip() {
    const tipSection = document.querySelector('.wellness-tip');
    if (!tipSection) return;

    const titleEl = tipSection.querySelector('.wellness-tip__title');
    const textEl = tipSection.querySelector('.wellness-tip__text');
    const iconEl = tipSection.querySelector('.wellness-tip__icon');
    const actionEl = tipSection.querySelector('.wellness-tip__action');
    const dayEl = tipSection.querySelector('.wellness-tip__day');

    if (!titleEl || !textEl) return;

    const today = new Date().getDay();
    const tip = wellnessTips[today];

    titleEl.textContent = t(tip.title);
    textEl.textContent = t(tip.text);
    
    if (iconEl) {
      iconEl.textContent = tip.icon;
    }
    
    if (actionEl && tip.link) {
      actionEl.href = tip.link;
    }

    if (dayEl) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayEl.textContent = days[today] + "'s wellness focus";
    }
  }

  // --- Initialization ---
  async function init() {
    const lang = localStorage.getItem('mindbalance-language') || 'en';
    
    try {
      const response = await fetch(`/i18n/${lang}.json`);
      if (response.ok) {
        translations = await response.json();
      }
    } catch (e) {
      console.warn('Could not load translations for quote banner');
    }

    initQuoteBanner();
    initWellnessTip();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // --- Language Change Handler ---
  window.addEventListener('languageChanged', async (e) => {
    const lang = e.detail?.language || 'en';
    try {
      const response = await fetch(`/i18n/${lang}.json`);
      if (response.ok) {
        translations = await response.json();
      }
    } catch (err) {
      console.warn('Could not reload translations');
    }
    
    displayQuote(currentQuoteIndex);
    initWellnessTip();
  });

})();
