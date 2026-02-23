// ==================== SETTINGS MODAL ====================
(function() {
  'use strict';

  // --- Constants ---
  const STORAGE_KEYS = {
    theme: 'mindbalance_theme',
    fontSize: 'mindbalance_font_size',
    reduceMotion: 'mindbalance_reduce_motion',
    highContrast: 'mindbalance_high_contrast',
    colorblind: 'mindbalance_colorblind',
    adhdMode: 'mindbalance_adhd_mode',
    dyslexiaFont: 'mindbalance_dyslexia_font',
    accentColor: 'mindbalance_accent_color',
    language: 'mindbalance_language',
    onboardingComplete: 'mindbalance_onboarding_complete',
    activePreset: 'mindbalance_active_preset'
  };

  const ACCENT_COLORS = {
    gold:   { hex: '#af916d', hover: '#9d8260', rgb: '175, 145, 109', light: '#d4c4a8', soft: '#f5f0e8', dark: '#7a6548', gradEnd: '#d4a574', text: '#6b5635', name: 'Gold' },
    purple: { hex: '#9b7ed9', hover: '#8a6dc8', rgb: '155, 126, 217', light: '#c9b8ec', soft: '#f3eefb', dark: '#6b4fb5', gradEnd: '#b99ae6', text: '#5a3d9e', name: 'Purple' },
    blue:   { hex: '#4a90d9', hover: '#3d7fc8', rgb: '74, 144, 217',  light: '#a3c8ed', soft: '#eaf2fb', dark: '#2d6ab0', gradEnd: '#6daeed', text: '#245a8c', name: 'Blue' },
    green:  { hex: '#4db896', hover: '#3fa884', rgb: '77, 184, 150',  light: '#a3dbc7', soft: '#e8f7f1', dark: '#2e8a6a', gradEnd: '#6fd4aa', text: '#267558', name: 'Green' },
    teal:   { hex: '#38b2ac', hover: '#2d9d98', rgb: '56, 178, 172',  light: '#96d8d4', soft: '#e6f5f4', dark: '#238079', gradEnd: '#5fccc6', text: '#1d6b65', name: 'Teal' },
    pink:   { hex: '#d97eab', hover: '#c86d9a', rgb: '217, 126, 171', light: '#ecbdd5', soft: '#fbeef4', dark: '#b4547f', gradEnd: '#e9a3c3', text: '#993f6a', name: 'Pink' },
    orange: { hex: '#e09c5c', hover: '#d08b4b', rgb: '224, 156, 92',  light: '#f0cca3', soft: '#fdf3e8', dark: '#b87430', gradEnd: '#edb87a', text: '#9a6228', name: 'Orange' },
    red:    { hex: '#e07070', hover: '#d05f5f', rgb: '224, 112, 112', light: '#f0b3b3', soft: '#fdeaea', dark: '#b84444', gradEnd: '#ed9494', text: '#9a3535', name: 'Red' }
  };

  const THEME_PRESETS = {
    default: {
      name: 'Default',
      description: 'Classic MindBalance',
      theme: 'light',
      accent: 'gold',
      fontSize: 'normal',
      highContrast: false
    },
    ocean: {
      name: 'Calm Ocean',
      description: 'Peaceful blue tones',
      theme: 'light',
      accent: 'blue',
      fontSize: 'normal',
      highContrast: false
    },
    sunset: {
      name: 'Warm Sunset',
      description: 'Cozy warm colors',
      theme: 'light',
      accent: 'orange',
      fontSize: 'normal',
      highContrast: false
    },
    forest: {
      name: 'Forest Green',
      description: 'Natural serenity',
      theme: 'light',
      accent: 'green',
      fontSize: 'normal',
      highContrast: false
    },
    night: {
      name: 'Night Mode',
      description: 'Easy on the eyes',
      theme: 'dark',
      accent: 'purple',
      fontSize: 'normal',
      highContrast: false
    },
    contrast: {
      name: 'High Contrast',
      description: 'Maximum readability',
      theme: 'light',
      accent: 'gold',
      fontSize: 'large',
      highContrast: true
    }
  };

  const ACCESSIBILITY_FEATURES = [
    { key: 'reduceMotion', points: 10 },
    { key: 'highContrast', points: 15 },
    { key: 'adhdMode', points: 15 },
    { key: 'dyslexiaFont', points: 20 },
    { key: 'colorblind', points: 15, checkFn: (val) => val && val !== 'none' }
  ];

  let currentCategory = 'appearance';
  // --- State ---
  let compareMode = false;
  let savedSettings = {};

  function getPreference(key, defaultValue) {
  // --- Preferences ---
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  function setPreference(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Could not save preference:', key);
    }
  }

  function calculateAccessibilityScore() {
  // --- Accessibility Score ---
    let score = 25;
    ACCESSIBILITY_FEATURES.forEach(feature => {
      const value = getPreference(STORAGE_KEYS[feature.key], 'false');
      if (feature.checkFn) {
        if (feature.checkFn(value)) score += feature.points;
      } else if (value === 'true') {
        score += feature.points;
      }
    });
    return Math.min(score, 100);
  }

  function updateAccessibilityScore() {
    const score = calculateAccessibilityScore();
    const scoreValue = document.querySelector('.accessibility-score-value');
    const progressRing = document.querySelector('.progress-ring');

    if (scoreValue) scoreValue.textContent = score;
    if (progressRing) {
      const circumference = 2 * Math.PI * 35;
      const offset = circumference - (score / 100) * circumference;
      progressRing.style.strokeDasharray = circumference;
      progressRing.style.strokeDashoffset = offset;
    }
  }

  function createSettingsModal() {

  // ==================== MODAL TEMPLATE ====================
    const modalHTML = `
      <div class="settings-modal-overlay" id="settingsModalOverlay">
        <div class="settings-modal">
          <!-- Left Sidebar -->
          <div class="settings-sidebar">
            <div class="settings-sidebar-header">
              <h2 class="settings-sidebar-title">
                <ion-icon name="settings-outline"></ion-icon>
                <span data-translate="settings_title">Settings</span>
              </h2>
            </div>

            <div class="settings-categories">
              <button class="settings-category-btn active" data-category="appearance">
                <ion-icon name="color-palette-outline"></ion-icon>
                <span data-translate="settings_appearance">Appearance</span>
              </button>
              <button class="settings-category-btn" data-category="accessibility">
                <ion-icon name="accessibility-outline"></ion-icon>
                <span data-translate="settings_accessibility">Accessibility</span>
              </button>
              <button class="settings-category-btn" data-category="reading">
                <ion-icon name="book-outline"></ion-icon>
                <span data-translate="settings_reading">Reading</span>
              </button>
              <button class="settings-category-btn" data-category="language">
                <ion-icon name="globe-outline"></ion-icon>
                <span data-translate="settings_language">Language</span>
              </button>
            </div>

            <!-- Accessibility Score -->
            <div class="settings-accessibility-score">
              <div class="accessibility-score-ring">
                <svg width="80" height="80">
                  <circle class="bg-ring" cx="40" cy="40" r="35"></circle>
                  <circle class="progress-ring" cx="40" cy="40" r="35"></circle>
                </svg>
                <span class="accessibility-score-value">25</span>
              </div>
              <span class="accessibility-score-label" data-translate="settings_accessibility_score">Accessibility Score</span>
            </div>
          </div>

          <!-- Main Content -->
          <div class="settings-main">
            <div class="settings-main-header">
              <h3 class="settings-main-title" id="settingsPanelTitle" data-translate="settings_appearance">Appearance</h3>
              <div class="settings-header-actions">
                <div class="settings-sync-indicator" id="syncIndicator">
                  <ion-icon name="cloud-done-outline"></ion-icon>
                  <span data-translate="settings_synced">Synced</span>
                </div>
                <button class="settings-compare-toggle" id="compareToggle">
                  <ion-icon name="git-compare-outline"></ion-icon>
                  <span data-translate="settings_compare">Compare</span>
                </button>
                <button class="settings-close-btn" id="settingsCloseBtn">
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>
            </div>

            <!-- Mobile Tabs -->
            <div class="settings-mobile-tabs">
              <button class="settings-mobile-tab active" data-category="appearance" data-translate="settings_appearance">Appearance</button>
              <button class="settings-mobile-tab" data-category="accessibility" data-translate="settings_accessibility">Accessibility</button>
              <button class="settings-mobile-tab" data-category="reading" data-translate="settings_reading">Reading</button>
              <button class="settings-mobile-tab" data-category="language" data-translate="settings_language">Language</button>
            </div>

            <div class="settings-content">
              <!-- Appearance Panel -->
              <div class="settings-panel active" id="panelAppearance">
                <div class="settings-section">
                  <h4 class="settings-section-title" data-translate="settings_theme_presets">Theme Presets</h4>
                  <div class="theme-presets-grid">
                    <div class="theme-preset-card theme-preset-default" data-preset="default">
                      <div class="theme-preset-name" data-translate="settings_preset_default">Default</div>
                      <div class="theme-preset-desc" data-translate="settings_preset_default_desc">Classic MindBalance</div>
                    </div>
                    <div class="theme-preset-card theme-preset-ocean" data-preset="ocean">
                      <div class="theme-preset-name" data-translate="settings_preset_ocean">Calm Ocean</div>
                      <div class="theme-preset-desc" data-translate="settings_preset_ocean_desc">Peaceful blue tones</div>
                    </div>
                    <div class="theme-preset-card theme-preset-sunset" data-preset="sunset">
                      <div class="theme-preset-name" data-translate="settings_preset_sunset">Warm Sunset</div>
                      <div class="theme-preset-desc" data-translate="settings_preset_sunset_desc">Cozy warm colors</div>
                    </div>
                    <div class="theme-preset-card theme-preset-forest" data-preset="forest">
                      <div class="theme-preset-name" data-translate="settings_preset_forest">Forest Green</div>
                      <div class="theme-preset-desc" data-translate="settings_preset_forest_desc">Natural serenity</div>
                    </div>
                    <div class="theme-preset-card theme-preset-night" data-preset="night">
                      <div class="theme-preset-name" data-translate="settings_preset_night">Night Mode</div>
                      <div class="theme-preset-desc" data-translate="settings_preset_night_desc">Easy on the eyes</div>
                    </div>
                    <div class="theme-preset-card theme-preset-contrast" data-preset="contrast">
                      <div class="theme-preset-name" data-translate="settings_preset_contrast">High Contrast</div>
                      <div class="theme-preset-desc" data-translate="settings_preset_contrast_desc">Maximum readability</div>
                    </div>
                  </div>
                </div>

                <div class="settings-section">
                  <h4 class="settings-section-title" data-translate="settings_theme">Theme</h4>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="moon-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4 data-translate="settings_dark_mode">Dark Mode</h4>
                        <p data-translate="settings_dark_mode_desc">Reduce eye strain in low light</p>
                      </div>
                    </div>
                    <label class="settings-toggle">
                      <input type="checkbox" id="settingsDarkMode" data-theme-toggle>
                      <span class="settings-toggle-slider"></span>
                    </label>
                  </div>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="megaphone-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4>Welcome Bar</h4>
                        <p>Show the welcome banner at the top</p>
                      </div>
                    </div>
                    <label class="settings-toggle">
                      <input type="checkbox" data-topbar-toggle checked>
                      <span class="settings-toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="settings-section">
                  <h4 class="settings-section-title" data-translate="settings_accent_color">Accent Color</h4>
                  <div class="accent-color-grid" id="accentColorGrid">
                    <!-- Colors will be inserted here -->
                  </div>
                </div>

                <!-- Live Preview -->
                <div class="settings-preview">
                  <div class="settings-preview-title" data-translate="settings_live_preview">Live Preview</div>
                  <div class="settings-preview-frame">
                    <p class="preview-sample-text" style="font-size: 18px; font-weight: 600; margin-bottom: 8px;" data-translate="settings_preview_welcome">Welcome to MindBalance</p>
                    <p class="preview-sample-text" style="font-size: 14px; opacity: 0.8; margin-bottom: 16px;" data-translate="settings_preview_journey">Your journey to mental wellness starts here.</p>
                    <span class="preview-sample-btn" data-translate="settings_preview_btn">Get Started</span>
                  </div>
                </div>
              </div>

              <!-- Accessibility Panel -->
              <div class="settings-panel" id="panelAccessibility">
                <div class="settings-section">
                  <h4 class="settings-section-title" data-translate="settings_visual_accessibility">Visual Accessibility</h4>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="contrast-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4 data-translate="settings_high_contrast">High Contrast</h4>
                        <p data-translate="settings_high_contrast_desc">Increase contrast for better readability</p>
                      </div>
                    </div>
                    <label class="settings-toggle">
                      <input type="checkbox" id="settingsHighContrast" data-high-contrast-toggle>
                      <span class="settings-toggle-slider"></span>
                    </label>
                  </div>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="eye-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4 data-translate="settings_colorblind_mode">Colorblind Mode</h4>
                        <p data-translate="settings_colorblind_desc">Adjust colors for color vision deficiency</p>
                      </div>
                    </div>
                    <select class="settings-select" id="settingsColorblind" data-colorblind-select>
                      <option value="none" data-translate="settings_colorblind_none">None</option>
                      <option value="protanopia" data-translate="settings_colorblind_protanopia">Protanopia (Red-blind)</option>
                      <option value="deuteranopia" data-translate="settings_colorblind_deuteranopia">Deuteranopia (Green-blind)</option>
                      <option value="tritanopia" data-translate="settings_colorblind_tritanopia">Tritanopia (Blue-blind)</option>
                    </select>
                  </div>
                </div>

                <div class="settings-section">
                  <h4 class="settings-section-title" data-translate="settings_cognitive_accessibility">Cognitive Accessibility</h4>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="flash-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4 data-translate="settings_focus_mode">Focus Mode (ADHD)</h4>
                        <p data-translate="settings_focus_mode_desc">Reduce distractions for better focus</p>
                      </div>
                    </div>
                    <label class="settings-toggle">
                      <input type="checkbox" id="settingsAdhd" data-adhd-toggle>
                      <span class="settings-toggle-slider"></span>
                    </label>
                  </div>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="text-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4 data-translate="settings_dyslexia_font">Dyslexia-Friendly Font</h4>
                        <p data-translate="settings_dyslexia_font_desc">Use OpenDyslexic font for easier reading</p>
                      </div>
                    </div>
                    <label class="settings-toggle">
                      <input type="checkbox" id="settingsDyslexia" data-dyslexia-toggle>
                      <span class="settings-toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="settings-section">
                  <h4 class="settings-section-title" data-translate="settings_motion_animation">Motion & Animation</h4>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="pause-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4 data-translate="settings_reduce_motion">Reduce Motion</h4>
                        <p data-translate="settings_reduce_motion_desc">Minimize animations and transitions</p>
                      </div>
                    </div>
                    <label class="settings-toggle">
                      <input type="checkbox" id="settingsReduceMotion" data-reduce-motion-toggle>
                      <span class="settings-toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Reading Panel -->
              <div class="settings-panel" id="panelReading">
                <div class="settings-section">
                  <h4 class="settings-section-title" data-translate="settings_text_size">Text Size</h4>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="resize-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4 data-translate="settings_font_size">Font Size</h4>
                        <p data-translate="settings_font_size_desc">Adjust text size for comfortable reading</p>
                      </div>
                    </div>
                    <select class="settings-select" id="settingsFontSize" data-font-size-select>
                      <option value="small" data-translate="settings_font_small">Small</option>
                      <option value="normal" data-translate="settings_font_normal">Normal</option>
                      <option value="large" data-translate="settings_font_large">Large</option>
                      <option value="xlarge" data-translate="settings_font_xlarge">Extra Large</option>
                    </select>
                  </div>
                </div>

                <!-- Live Preview for Reading -->
                <div class="settings-preview">
                  <div class="settings-preview-title" data-translate="settings_text_preview">Text Preview</div>
                  <div class="settings-preview-frame">
                    <p class="preview-sample-text" id="readingPreviewText" data-translate="settings_reading_preview_text">
                      Mental health is just as important as physical health. Taking time each day to check in with yourself, practice mindfulness, and seek support when needed are all crucial steps toward maintaining your wellbeing.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Language Panel -->
              <div class="settings-panel" id="panelLanguage">
                <div class="settings-section">
                  <h4 class="settings-section-title" data-translate="settings_language">Language</h4>

                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="language-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4 data-translate="settings_display_language">Display Language</h4>
                        <p data-translate="settings_display_language_desc">Choose your preferred language</p>
                      </div>
                    </div>
                    <select class="settings-select" id="settingsLanguage" data-language-select>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="zh">中文</option>
                      <option value="hi">हिन्दी</option>
                      <option value="ko">한국어</option>
                      <option value="de">Deutsch</option>
                      <option value="gr">Ελληνικά</option>
                      <option value="ru">Русский</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Reset Button -->
              <button class="settings-reset-btn" id="settingsResetBtn">
                <ion-icon name="refresh-outline"></ion-icon>
                <span data-translate="settings_reset_defaults">Reset to Defaults</span>
              </button>
            </div>
          </div>

          <!-- Onboarding Overlay -->
          <div class="settings-onboarding" id="settingsOnboarding">
            <div class="onboarding-card">
              <div class="onboarding-icon">
                <ion-icon name="sparkles-outline"></ion-icon>
              </div>
              <h3 class="onboarding-title" data-translate="settings_onboarding_title">Welcome to Settings!</h3>
              <p class="onboarding-text" data-translate="settings_onboarding_text">
                Customize your MindBalance experience with theme presets, accessibility options, and more. Your preferences sync across all pages.
              </p>
              <button class="onboarding-btn" id="onboardingStartBtn" data-translate="settings_onboarding_start">Let's Get Started</button>
              <button class="onboarding-skip" id="onboardingSkipBtn" data-translate="settings_onboarding_skip">Skip for now</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    initializeAccentColors();
    initializeEventListeners();
    loadCurrentSettings();
    updateAccessibilityScore();
    checkOnboarding();
    updateSyncStatus();
    initTopbarToggle();
  }

  function initTopbarToggle() {
    var toggles = document.querySelectorAll('[data-topbar-toggle]');
    var topbar = document.getElementById('smartTopbar');
    var isDismissed = sessionStorage.getItem('topbarDismissed') === '1';
    toggles.forEach(function(t) { t.checked = !isDismissed; });
    toggles.forEach(function(toggle) {
      toggle.removeEventListener('change', toggle._topbarHandler);
      toggle._topbarHandler = function() {
        var checked = this.checked;
        toggles = document.querySelectorAll('[data-topbar-toggle]');
        toggles.forEach(function(t) { t.checked = checked; });
        if (topbar) {
          if (checked) {
            sessionStorage.removeItem('topbarDismissed');
            topbar.classList.remove('dismissed');
            topbar.classList.remove('topbar--hidden');
            var hdr = document.querySelector('.header');
            if (hdr) hdr.classList.remove('topbar--gone');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.documentElement.style.setProperty('--topbar-height', topbar.offsetHeight + 'px');
          } else {
            topbar.classList.add('dismissed');
            sessionStorage.setItem('topbarDismissed', '1');
            document.documentElement.style.setProperty('--topbar-height', '0px');
            var hdr = document.querySelector('.header');
            if (hdr) hdr.classList.add('topbar--gone');
          }
        }
      };
      toggle.addEventListener('change', toggle._topbarHandler);
    });
  }

  function initializeAccentColors() {

  // ==================== ACCENT COLORS ====================
    const grid = document.getElementById('accentColorGrid');
    if (!grid) return;

    Object.entries(ACCENT_COLORS).forEach(([key, color]) => {
      const option = document.createElement('div');
      option.className = 'accent-color-option';
      option.dataset.color = key;
      option.style.backgroundColor = color.hex;
      option.title = color.name;
      grid.appendChild(option);
    });
  }

  function initializeEventListeners() {

  // ==================== EVENT LISTENERS ====================
    const overlay = document.getElementById('settingsModalOverlay');
    const closeBtn = document.getElementById('settingsCloseBtn');
    const categoryBtns = document.querySelectorAll('.settings-category-btn');
    const mobileTabs = document.querySelectorAll('.settings-mobile-tab');
    const compareToggle = document.getElementById('compareToggle');
    const resetBtn = document.getElementById('settingsResetBtn');
    const onboardingStartBtn = document.getElementById('onboardingStartBtn');
    const onboardingSkipBtn = document.getElementById('onboardingSkipBtn');

    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) closeSettingsModal();
    });

    closeBtn?.addEventListener('click', closeSettingsModal);

    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => switchCategory(btn.dataset.category));
    });

    mobileTabs.forEach(tab => {
      tab.addEventListener('click', () => switchCategory(tab.dataset.category));
    });

    compareToggle?.addEventListener('click', toggleCompareMode);
    resetBtn?.addEventListener('click', resetToDefaults);
    onboardingStartBtn?.addEventListener('click', completeOnboarding);
    onboardingSkipBtn?.addEventListener('click', completeOnboarding);

    document.querySelectorAll('.theme-preset-card').forEach(card => {
      card.addEventListener('click', () => applyPreset(card.dataset.preset));
    });

    document.querySelectorAll('.accent-color-option').forEach(option => {
      option.addEventListener('click', () => selectAccentColor(option.dataset.color));
    });

    document.getElementById('settingsDarkMode')?.addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      setPreference(STORAGE_KEYS.theme, theme);
      window.MindBalanceSettings?.applyTheme?.(theme);
      clearActivePreset();
      updateSyncStatus();
    });

    document.getElementById('settingsHighContrast')?.addEventListener('change', (e) => {
      setPreference(STORAGE_KEYS.highContrast, e.target.checked);
      window.MindBalanceSettings?.applyHighContrast?.(e.target.checked);
      updateAccessibilityScore();
      updateSyncStatus();
    });

    document.getElementById('settingsColorblind')?.addEventListener('change', (e) => {
      setPreference(STORAGE_KEYS.colorblind, e.target.value);
      window.MindBalanceSettings?.applyColorblind?.(e.target.value);
      updateAccessibilityScore();
      updateSyncStatus();
    });

    document.getElementById('settingsAdhd')?.addEventListener('change', (e) => {
      setPreference(STORAGE_KEYS.adhdMode, e.target.checked);
      window.MindBalanceSettings?.applyAdhdMode?.(e.target.checked);
      updateAccessibilityScore();
      updateSyncStatus();
    });

    document.getElementById('settingsDyslexia')?.addEventListener('change', (e) => {
      setPreference(STORAGE_KEYS.dyslexiaFont, e.target.checked);
      window.MindBalanceSettings?.applyDyslexiaFont?.(e.target.checked);
      updateAccessibilityScore();
      updateSyncStatus();
    });

    document.getElementById('settingsReduceMotion')?.addEventListener('change', (e) => {
      setPreference(STORAGE_KEYS.reduceMotion, e.target.checked);
      window.MindBalanceSettings?.applyReduceMotion?.(e.target.checked);
      updateAccessibilityScore();
      updateSyncStatus();
    });

    document.getElementById('settingsFontSize')?.addEventListener('change', (e) => {
      setPreference(STORAGE_KEYS.fontSize, e.target.value);
      window.MindBalanceSettings?.applyFontSize?.(e.target.value);
      updateReadingPreview(e.target.value);
      updateSyncStatus();
    });

    document.getElementById('settingsLanguage')?.addEventListener('change', (e) => {
      const lang = e.target.value;
      setPreference(STORAGE_KEYS.language, lang);


      updateSyncStatus();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSettingsModal();
    });
  }

  function loadCurrentSettings() {
  // --- Load Settings ---
    const darkMode = document.getElementById('settingsDarkMode');
    const highContrast = document.getElementById('settingsHighContrast');
    const colorblind = document.getElementById('settingsColorblind');
    const adhd = document.getElementById('settingsAdhd');
    const dyslexia = document.getElementById('settingsDyslexia');
    const reduceMotion = document.getElementById('settingsReduceMotion');
    const fontSize = document.getElementById('settingsFontSize');
    const language = document.getElementById('settingsLanguage');

    const theme = getPreference(STORAGE_KEYS.theme, 'light');
    if (darkMode) darkMode.checked = theme === 'dark';

    if (highContrast) highContrast.checked = getPreference(STORAGE_KEYS.highContrast, 'false') === 'true';
    if (colorblind) colorblind.value = getPreference(STORAGE_KEYS.colorblind, 'none');
    if (adhd) adhd.checked = getPreference(STORAGE_KEYS.adhdMode, 'false') === 'true';
    if (dyslexia) dyslexia.checked = getPreference(STORAGE_KEYS.dyslexiaFont, 'false') === 'true';
    if (reduceMotion) reduceMotion.checked = getPreference(STORAGE_KEYS.reduceMotion, 'false') === 'true';
    if (fontSize) fontSize.value = getPreference(STORAGE_KEYS.fontSize, 'normal');
    if (language) language.value = getPreference(STORAGE_KEYS.language, 'en');

    const activeAccent = getPreference(STORAGE_KEYS.accentColor, 'gold');
    document.querySelectorAll('.accent-color-option').forEach(option => {
      option.classList.toggle('active', option.dataset.color === activeAccent);
    });

    const activePreset = getPreference(STORAGE_KEYS.activePreset, null);
    if (activePreset) {
      document.querySelectorAll('.theme-preset-card').forEach(card => {
        card.classList.toggle('active', card.dataset.preset === activePreset);
      });
    }

    updateReadingPreview(getPreference(STORAGE_KEYS.fontSize, 'normal'));
  }

  function switchCategory(category) {
  // --- Category Switching ---
    currentCategory = category;

    document.querySelectorAll('.settings-category-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    document.querySelectorAll('.settings-mobile-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });

    document.querySelectorAll('.settings-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const panelMap = {
      appearance: 'panelAppearance',
      accessibility: 'panelAccessibility',
      reading: 'panelReading',
      language: 'panelLanguage'
    };

    document.getElementById(panelMap[category])?.classList.add('active');

    const titleMap = {
      appearance: 'Appearance',
      accessibility: 'Accessibility',
      reading: 'Reading',
      language: 'Language'
    };

    const titleEl = document.getElementById('settingsPanelTitle');
    if (titleEl) titleEl.textContent = titleMap[category];
  }

  function applyPreset(presetKey) {
  // --- Theme Presets ---
    const preset = THEME_PRESETS[presetKey];
    if (!preset) return;

    setPreference(STORAGE_KEYS.theme, preset.theme);
    setPreference(STORAGE_KEYS.accentColor, preset.accent);
    setPreference(STORAGE_KEYS.fontSize, preset.fontSize);
    setPreference(STORAGE_KEYS.highContrast, preset.highContrast);
    setPreference(STORAGE_KEYS.activePreset, presetKey);

    window.MindBalanceSettings?.applyTheme?.(preset.theme);
    window.MindBalanceSettings?.applyAccentColor?.(preset.accent);
    window.MindBalanceSettings?.applyFontSize?.(preset.fontSize);
    window.MindBalanceSettings?.applyHighContrast?.(preset.highContrast);

    document.querySelectorAll('.theme-preset-card').forEach(card => {
      card.classList.toggle('active', card.dataset.preset === presetKey);
    });

    loadCurrentSettings();
    updateSyncStatus();
  }

  function clearActivePreset() {
    setPreference(STORAGE_KEYS.activePreset, '');
    document.querySelectorAll('.theme-preset-card').forEach(card => {
      card.classList.remove('active');
    });
  }

  function selectAccentColor(colorKey) {
  // --- Accent Colors ---
    setPreference(STORAGE_KEYS.accentColor, colorKey);
    window.MindBalanceSettings?.applyAccentColor?.(colorKey);

    document.querySelectorAll('.accent-color-option').forEach(option => {
      option.classList.toggle('active', option.dataset.color === colorKey);
    });

    clearActivePreset();
    updateSyncStatus();
  }

  function toggleCompareMode() {
  // --- Compare Mode ---
    compareMode = !compareMode;
    const toggle = document.getElementById('compareToggle');
    toggle?.classList.toggle('active', compareMode);

    if (compareMode) {
      savedSettings = {
        theme: getPreference(STORAGE_KEYS.theme, 'light'),
        accent: getPreference(STORAGE_KEYS.accentColor, 'gold'),
        fontSize: getPreference(STORAGE_KEYS.fontSize, 'normal'),
        highContrast: getPreference(STORAGE_KEYS.highContrast, 'false'),
        colorblind: getPreference(STORAGE_KEYS.colorblind, 'none'),
        adhdMode: getPreference(STORAGE_KEYS.adhdMode, 'false'),
        dyslexiaFont: getPreference(STORAGE_KEYS.dyslexiaFont, 'false'),
        reduceMotion: getPreference(STORAGE_KEYS.reduceMotion, 'false')
      };

      window.MindBalanceSettings?.applyTheme?.('light');
      window.MindBalanceSettings?.applyAccentColor?.('gold');
      window.MindBalanceSettings?.applyFontSize?.('normal');
      window.MindBalanceSettings?.applyHighContrast?.(false);
      window.MindBalanceSettings?.applyColorblind?.('none');
      window.MindBalanceSettings?.applyAdhdMode?.(false);
      window.MindBalanceSettings?.applyDyslexiaFont?.(false);
      window.MindBalanceSettings?.applyReduceMotion?.(false);
    } else {
      window.MindBalanceSettings?.applyTheme?.(savedSettings.theme);
      window.MindBalanceSettings?.applyAccentColor?.(savedSettings.accent);
      window.MindBalanceSettings?.applyFontSize?.(savedSettings.fontSize);
      window.MindBalanceSettings?.applyHighContrast?.(savedSettings.highContrast === 'true');
      window.MindBalanceSettings?.applyColorblind?.(savedSettings.colorblind);
      window.MindBalanceSettings?.applyAdhdMode?.(savedSettings.adhdMode === 'true');
      window.MindBalanceSettings?.applyDyslexiaFont?.(savedSettings.dyslexiaFont === 'true');
      window.MindBalanceSettings?.applyReduceMotion?.(savedSettings.reduceMotion === 'true');
    }
  }

  function resetToDefaults() {
  // --- Reset ---
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;

    Object.values(STORAGE_KEYS).forEach(key => {
      if (key !== STORAGE_KEYS.onboardingComplete) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem('mindbalance-language');

    window.MindBalanceSettings?.applyTheme?.('light');
    window.MindBalanceSettings?.applyAccentColor?.('gold');
    window.MindBalanceSettings?.applyFontSize?.('normal');
    window.MindBalanceSettings?.applyHighContrast?.(false);
    window.MindBalanceSettings?.applyColorblind?.('none');
    window.MindBalanceSettings?.applyAdhdMode?.(false);
    window.MindBalanceSettings?.applyDyslexiaFont?.(false);
    window.MindBalanceSettings?.applyReduceMotion?.(false);

    if (typeof setLanguage === 'function') {
      setLanguage('en');
    } else if (window.MindBalanceTranslations?.setLanguage) {
      window.MindBalanceTranslations.setLanguage('en');
    }
    document.querySelectorAll('.language-selector, #languageSelect').forEach(sel => {
      sel.value = 'en';
    });

    loadCurrentSettings();
    updateAccessibilityScore();
    updateSyncStatus();
  }

  function updateReadingPreview(size) {
    const preview = document.getElementById('readingPreviewText');
    if (!preview) return;

    const sizes = {
      small: '13px',
      normal: '15px',
      large: '18px',
      xlarge: '22px'
    };

    preview.style.fontSize = sizes[size] || '15px';
  }

  function checkOnboarding() {
  // --- Onboarding ---
    const onboardingComplete = getPreference(STORAGE_KEYS.onboardingComplete, 'false');
    if (onboardingComplete !== 'true') {
      document.getElementById('settingsOnboarding')?.classList.add('active');
    }
  }

  function completeOnboarding() {
    setPreference(STORAGE_KEYS.onboardingComplete, 'true');
    document.getElementById('settingsOnboarding')?.classList.remove('active');
  }

  function updateSyncStatus() {
  // --- Sync Status ---
    const indicator = document.getElementById('syncIndicator');
    if (!indicator) return;

    indicator.classList.remove('syncing', 'offline');
    indicator.innerHTML = '<ion-icon name="cloud-done-outline"></ion-icon><span>Synced</span>';

    indicator.classList.add('syncing');
    indicator.innerHTML = '<ion-icon name="sync-outline"></ion-icon><span>Syncing...</span>';

    setTimeout(() => {
      indicator.classList.remove('syncing');
      indicator.innerHTML = '<ion-icon name="cloud-done-outline"></ion-icon><span>Synced</span>';
    }, 800);
  }

  function openSettingsModal() {

  // ==================== MODAL OPEN/CLOSE ====================
    document.getElementById('settingsModalOverlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadCurrentSettings();
    updateAccessibilityScore();


    if (window.MindBalanceTranslations?.applyTranslations) {
      const modal = document.getElementById('settingsModalOverlay');
      if (modal) {
        window.MindBalanceTranslations.applyTranslations(modal);
      }
    }
  }

  function closeSettingsModal() {
    document.getElementById('settingsModalOverlay')?.classList.remove('active');
    document.body.style.overflow = '';

    if (compareMode) {
      toggleCompareMode();
    }
  }

  function init() {

  // ==================== INITIALIZATION ====================
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createSettingsModal);
    } else {
      createSettingsModal();
    }
  }

  window.SettingsModal = {
    open: openSettingsModal,
    close: closeSettingsModal
  };

  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;

  init();
})();
