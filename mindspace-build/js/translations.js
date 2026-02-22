// ==================== TRANSLATION SYSTEM ====================

// --- Cache & Fallbacks ---
const translationCache = {};

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

const supportedLanguages = ['en', 'es', 'fr', 'zh', 'hi', 'ko', 'de'];

// --- Language Detection ---
function getCurrentLanguage() {
  const stored = localStorage.getItem('mindspace_language') || localStorage.getItem('mindspace-language');
  if (stored && supportedLanguages.includes(stored)) {
    return stored;
  }
  return 'en';
}

// --- Load Translations ---
async function loadTranslations(lang) {
  console.log('[Translations] Loading translations for:', lang);
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
    if (lang !== 'en') {
      return loadTranslations('en');
    }
    return fallbackTranslations;
  }
}

// --- Apply Translations (Sync) ---
function applyTranslationsSync(translations, container = document) {
  console.log('[Translations] Applying translations to', container === document ? 'page' : 'container');
  function containsHTML(text) {
    return /<[a-z][\s\S]*>/i.test(text);
  }
  
  const translateEls = container.querySelectorAll('[data-translate]');
  console.log('[Translations] Found', translateEls.length, 'elements with data-translate');
  let appliedCount = 0;
  translateEls.forEach(el => {
    const key = el.getAttribute('data-translate');
    if (translations[key]) {
      if (containsHTML(translations[key])) {
        el.innerHTML = translations[key];
      } else {
        el.textContent = translations[key];
      }
      appliedCount++;
    }
  });
  console.log('[Translations] Applied', appliedCount, 'translations');
  
  container.querySelectorAll('[data-translate-placeholder]').forEach(el => {
    const key = el.getAttribute('data-translate-placeholder');
    if (translations[key]) {
      el.placeholder = translations[key];
    }
  });
  
  container.querySelectorAll('[data-translate-html]').forEach(el => {
    const key = el.getAttribute('data-translate-html');
    if (translations[key]) {
      el.innerHTML = translations[key];
    }
  });
}

// --- Apply Translations (Async) ---
async function applyTranslations(langOrContainer) {
  if (langOrContainer instanceof HTMLElement) {
    const currentLang = getCurrentLanguage();
    const translations = await loadTranslations(currentLang);
    applyTranslationsSync(translations, langOrContainer);
    return translations;
  }
  
  const lang = langOrContainer || getCurrentLanguage();
  const translations = await loadTranslations(lang);
  applyTranslationsSync(translations);
  return translations;
}

// --- Set Language ---
async function setLanguage(lang) {
  console.log('[Translations] setLanguage called with:', lang);
  if (!supportedLanguages.includes(lang)) {
    console.warn(`Unsupported language: ${lang}`);
    lang = 'en';
  }
  
  localStorage.setItem('mindspace_language', lang);
  localStorage.setItem('mindspace-language', lang);
  document.documentElement.lang = lang;
  console.log('[Translations] Set document lang to:', lang);
  
  document.querySelectorAll('[data-language-select]').forEach(select => {
    select.value = lang;
  });
  
  try {
    await applyTranslations(lang);
    console.log('[Translations] Successfully applied translations for:', lang);
  } catch (error) {
    console.error('[Translations] Error applying translations:', error);
  }
  
  window.dispatchEvent(new CustomEvent('translations-ready', { 
    detail: { lang: lang, translations: translationCache[lang] } 
  }));
}

// --- Translation Getters ---
async function getTranslation(key, lang = null) {
  const language = lang || getCurrentLanguage();
  const translations = await loadTranslations(language);
  return translations[key] || fallbackTranslations[key] || key;
}

function getTranslationSync(key, lang = null) {
  const language = lang || getCurrentLanguage();
  const translations = translationCache[language] || translationCache['en'] || fallbackTranslations;
  return translations[key] || key;
}

// --- Event Delegation ---
document.addEventListener('change', function(e) {
  if (e.target && e.target.matches('[data-language-select]')) {
    console.log('[Translations] Language changed to:', e.target.value);
    setLanguage(e.target.value);
  }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async function() {
  console.log('[Translations] Initializing translation system...');
  const currentLang = getCurrentLanguage();
  console.log('[Translations] Current language:', currentLang);
  
  const langSelects = document.querySelectorAll('[data-language-select]');
  console.log('[Translations] Found', langSelects.length, 'language selectors');
  langSelects.forEach(langSelect => {
    langSelect.value = currentLang;
  });
  
  document.documentElement.lang = currentLang;
  await applyTranslations(currentLang);
  console.log('[Translations] Initial translations applied');
  
  window.dispatchEvent(new CustomEvent('translations-ready', { 
    detail: { lang: currentLang, translations: translationCache[currentLang] } 
  }));
});

// --- Public API ---
window.MindSpaceTranslations = {
  setLanguage,
  getCurrentLanguage,
  applyTranslations,
  getTranslation,
  getTranslationSync,
  loadTranslations,
  supportedLanguages
};

// --- Legacy Compatibility ---
window.translations = new Proxy({}, {
  get: function(target, lang) {
    return translationCache[lang] || {};
  }
});
