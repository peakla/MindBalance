/**
 * MindBalance Translation System
 * 
 * This is a lightweight loader that fetches translations from JSON files.
 * Translations are stored in /i18n/{lang}.json files.
 * 
 * To add/edit translations:
 * 1. Edit translations.csv (the master file)
 * 2. Run: python scripts/csv_to_json.py
 * 3. The JSON files in /i18n/ will be updated
 * 
 * Supported languages: en, es, fr, zh, hi, ko
 */

// Cache for loaded translations
const translationCache = {};

// Fallback translations (minimal English for critical UI before JSON loads)
const fallbackTranslations = {
  nav_home: "Home",
  nav_contact: "Contact",
  nav_resources: "Resource Library",
  nav_community: "Community Hub",
  nav_blog: "Blog",
  nav_signin: "Sign In",
  nav_signout: "Sign Out",
  settings_title: "Settings",
  settings_preferences: "Preferences",
  settings_dark_mode: "Dark Mode",
  settings_font_size: "Font Size",
  settings_language: "Language"
};

// Supported languages
const supportedLanguages = ['en', 'es', 'fr', 'zh', 'hi', 'ko'];

/**
 * Get current language from localStorage
 */
function getCurrentLanguage() {
  // Support both old key (mindbalance-language) and new key for migration
  const stored = localStorage.getItem('mindbalance-language') || localStorage.getItem('mindbalance_language');
  if (stored && supportedLanguages.includes(stored)) {
    return stored;
  }
  return 'en';
}

/**
 * Load translations for a specific language
 */
async function loadTranslations(lang) {
  console.log('[Translations] Loading translations for:', lang);
  // Return from cache if available
  if (translationCache[lang]) {
    console.log('[Translations] Returning cached translations for:', lang);
    return translationCache[lang];
  }
  
  try {
    console.log('[Translations] Fetching /i18n/' + lang + '.json...');
    const response = await fetch(`/i18n/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${lang}.json`);
    }
    const data = await response.json();
    console.log('[Translations] Loaded', Object.keys(data).length, 'keys for', lang);
    translationCache[lang] = data;
    return data;
  } catch (error) {
    console.warn(`[Translations] Could not load translations for '${lang}':`, error);
    // Fallback to English
    if (lang !== 'en') {
      return loadTranslations('en');
    }
    return fallbackTranslations;
  }
}

/**
 * Apply translations to the page
 */
function applyTranslationsSync(translations) {
  console.log('[Translations] Applying translations to page...');
  // Helper to check if text contains HTML tags
  function containsHTML(text) {
    return /<[a-z][\s\S]*>/i.test(text);
  }
  
  // Apply to data-translate elements
  const translateEls = document.querySelectorAll('[data-translate]');
  console.log('[Translations] Found', translateEls.length, 'elements with data-translate');
  let appliedCount = 0;
  translateEls.forEach(el => {
    const key = el.getAttribute('data-translate');
    if (translations[key]) {
      // Use innerHTML for content with HTML tags, textContent otherwise
      if (containsHTML(translations[key])) {
        el.innerHTML = translations[key];
      } else {
        el.textContent = translations[key];
      }
      appliedCount++;
    }
  });
  console.log('[Translations] Applied', appliedCount, 'translations');
  
  // Apply to data-translate-placeholder elements
  document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
    const key = el.getAttribute('data-translate-placeholder');
    if (translations[key]) {
      el.placeholder = translations[key];
    }
  });
  
  // Apply to data-translate-html elements (for content with HTML)
  document.querySelectorAll('[data-translate-html]').forEach(el => {
    const key = el.getAttribute('data-translate-html');
    if (translations[key]) {
      el.innerHTML = translations[key];
    }
  });
}

/**
 * Apply translations (async version)
 */
async function applyTranslations(lang) {
  const translations = await loadTranslations(lang);
  applyTranslationsSync(translations);
  return translations;
}

/**
 * Set and apply a new language
 */
async function setLanguage(lang) {
  console.log('[Translations] setLanguage called with:', lang);
  if (!supportedLanguages.includes(lang)) {
    console.warn(`Unsupported language: ${lang}`);
    lang = 'en';
  }
  
  localStorage.setItem('mindbalance-language', lang);
  document.documentElement.lang = lang;
  console.log('[Translations] Set document lang to:', lang);
  
  // Sync ALL language selectors on the page
  document.querySelectorAll('[data-language-select]').forEach(select => {
    select.value = lang;
  });
  
  try {
    await applyTranslations(lang);
    console.log('[Translations] Successfully applied translations for:', lang);
  } catch (error) {
    console.error('[Translations] Error applying translations:', error);
  }
  
  // Dispatch event when language changes
  window.dispatchEvent(new CustomEvent('translations-ready', { 
    detail: { lang: lang, translations: translationCache[lang] } 
  }));
}

/**
 * Get a single translation (async)
 */
async function getTranslation(key, lang = null) {
  const language = lang || getCurrentLanguage();
  const translations = await loadTranslations(language);
  return translations[key] || fallbackTranslations[key] || key;
}

/**
 * Get a translation synchronously from cache
 * Returns the key if translation not found
 */
function getTranslationSync(key, lang = null) {
  const language = lang || getCurrentLanguage();
  const translations = translationCache[language] || translationCache['en'] || fallbackTranslations;
  return translations[key] || key;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
  console.log('[Translations] Initializing translation system...');
  const currentLang = getCurrentLanguage();
  console.log('[Translations] Current language:', currentLang);
  
  // Set up language selectors
  const langSelects = document.querySelectorAll('[data-language-select]');
  console.log('[Translations] Found', langSelects.length, 'language selectors');
  langSelects.forEach(langSelect => {
    langSelect.value = currentLang;
    langSelect.addEventListener('change', function(e) {
      console.log('[Translations] Language changed to:', this.value);
      setLanguage(this.value);
    });
  });
  
  // Also use event delegation for dynamically added selectors or hidden ones
  document.addEventListener('change', function(e) {
    if (e.target && e.target.matches('[data-language-select]')) {
      console.log('[Translations] Language changed via delegation to:', e.target.value);
      setLanguage(e.target.value);
    }
  });
  
  // Load and apply translations
  document.documentElement.lang = currentLang;
  await applyTranslations(currentLang);
  console.log('[Translations] Initial translations applied');
  
  // Dispatch event when translations are ready
  window.dispatchEvent(new CustomEvent('translations-ready', { 
    detail: { lang: currentLang, translations: translationCache[currentLang] } 
  }));
});

// Expose global API
window.MindBalanceTranslations = {
  setLanguage,
  getCurrentLanguage,
  applyTranslations,
  getTranslation,
  getTranslationSync,
  loadTranslations,
  supportedLanguages
};

// Legacy compatibility: expose translations object (populated on demand)
// This allows existing code that uses translations[lang][key] to still work
// after the translations are loaded
window.translations = new Proxy({}, {
  get: function(target, lang) {
    return translationCache[lang] || {};
  }
});
