(function() {
  'use strict';

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
    gold: { hex: '#af916d', hover: '#9d8260', rgb: '175, 145, 109', name: 'Gold' },
    purple: { hex: '#9b7ed9', hover: '#8a6dc8', rgb: '155, 126, 217', name: 'Purple' },
    blue: { hex: '#4a90d9', hover: '#3d7fc8', rgb: '74, 144, 217', name: 'Blue' },
    green: { hex: '#4db896', hover: '#3fa884', rgb: '77, 184, 150', name: 'Green' },
    teal: { hex: '#38b2ac', hover: '#2d9d98', rgb: '56, 178, 172', name: 'Teal' },
    pink: { hex: '#d97eab', hover: '#c86d9a', rgb: '217, 126, 171', name: 'Pink' },
    orange: { hex: '#e09c5c', hover: '#d08b4b', rgb: '224, 156, 92', name: 'Orange' },
    red: { hex: '#e07070', hover: '#d05f5f', rgb: '224, 112, 112', name: 'Red' }
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
  let compareMode = false;
  let savedSettings = {};

  function getPreference(key, defaultValue) {
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
    const modalHTML = `
      <div class="settings-modal-overlay" id="settingsModalOverlay">
        <div class="settings-modal">
          <!-- Left Sidebar -->
          <div class="settings-sidebar">
            <div class="settings-sidebar-header">
              <h2 class="settings-sidebar-title">
                <ion-icon name="settings-outline"></ion-icon>
                Settings
              </h2>
            </div>
            
            <div class="settings-categories">
              <button class="settings-category-btn active" data-category="appearance">
                <ion-icon name="color-palette-outline"></ion-icon>
                Appearance
              </button>
              <button class="settings-category-btn" data-category="accessibility">
                <ion-icon name="accessibility-outline"></ion-icon>
                Accessibility
              </button>
              <button class="settings-category-btn" data-category="reading">
                <ion-icon name="book-outline"></ion-icon>
                Reading
              </button>
              <button class="settings-category-btn" data-category="language">
                <ion-icon name="globe-outline"></ion-icon>
                Language
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
              <span class="accessibility-score-label">Accessibility Score</span>
            </div>
          </div>
          
          <!-- Main Content -->
          <div class="settings-main">
            <div class="settings-main-header">
              <h3 class="settings-main-title" id="settingsPanelTitle">Appearance</h3>
              <div class="settings-header-actions">
                <div class="settings-sync-indicator" id="syncIndicator">
                  <ion-icon name="cloud-done-outline"></ion-icon>
                  <span>Synced</span>
                </div>
                <button class="settings-compare-toggle" id="compareToggle">
                  <ion-icon name="git-compare-outline"></ion-icon>
                  <span>Compare</span>
                </button>
                <button class="settings-close-btn" id="settingsCloseBtn">
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>
            </div>
            
            <!-- Mobile Tabs -->
            <div class="settings-mobile-tabs">
              <button class="settings-mobile-tab active" data-category="appearance">Appearance</button>
              <button class="settings-mobile-tab" data-category="accessibility">Accessibility</button>
              <button class="settings-mobile-tab" data-category="reading">Reading</button>
              <button class="settings-mobile-tab" data-category="language">Language</button>
            </div>
            
            <div class="settings-content">
              <!-- Appearance Panel -->
              <div class="settings-panel active" id="panelAppearance">
                <div class="settings-section">
                  <h4 class="settings-section-title">Theme Presets</h4>
                  <div class="theme-presets-grid">
                    <div class="theme-preset-card theme-preset-default" data-preset="default">
                      <div class="theme-preset-name">Default</div>
                      <div class="theme-preset-desc">Classic MindBalance</div>
                    </div>
                    <div class="theme-preset-card theme-preset-ocean" data-preset="ocean">
                      <div class="theme-preset-name">Calm Ocean</div>
                      <div class="theme-preset-desc">Peaceful blue tones</div>
                    </div>
                    <div class="theme-preset-card theme-preset-sunset" data-preset="sunset">
                      <div class="theme-preset-name">Warm Sunset</div>
                      <div class="theme-preset-desc">Cozy warm colors</div>
                    </div>
                    <div class="theme-preset-card theme-preset-forest" data-preset="forest">
                      <div class="theme-preset-name">Forest Green</div>
                      <div class="theme-preset-desc">Natural serenity</div>
                    </div>
                    <div class="theme-preset-card theme-preset-night" data-preset="night">
                      <div class="theme-preset-name">Night Mode</div>
                      <div class="theme-preset-desc">Easy on the eyes</div>
                    </div>
                    <div class="theme-preset-card theme-preset-contrast" data-preset="contrast">
                      <div class="theme-preset-name">High Contrast</div>
                      <div class="theme-preset-desc">Maximum readability</div>
                    </div>
                  </div>
                </div>
                
                <div class="settings-section">
                  <h4 class="settings-section-title">Theme</h4>
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="moon-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4>Dark Mode</h4>
                        <p>Reduce eye strain in low light</p>
                      </div>
                    </div>
                    <label class="settings-toggle">
                      <input type="checkbox" id="settingsDarkMode" data-theme-toggle>
                      <span class="settings-toggle-slider"></span>
                    </label>
                  </div>
                </div>
                
                <div class="settings-section">
                  <h4 class="settings-section-title">Accent Color</h4>
                  <div class="accent-color-grid" id="accentColorGrid">
                    <!-- Colors will be inserted here -->
                  </div>
                </div>
                
                <!-- Live Preview -->
                <div class="settings-preview">
                  <div class="settings-preview-title">Live Preview</div>
                  <div class="settings-preview-frame">
                    <p class="preview-sample-text" style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Welcome to MindBalance</p>
                    <p class="preview-sample-text" style="font-size: 14px; opacity: 0.8; margin-bottom: 16px;">Your journey to mental wellness starts here.</p>
                    <span class="preview-sample-btn">Get Started</span>
                  </div>
                </div>
              </div>
              
              <!-- Accessibility Panel -->
              <div class="settings-panel" id="panelAccessibility">
                <div class="settings-section">
                  <h4 class="settings-section-title">Visual Accessibility</h4>
                  
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="contrast-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4>High Contrast</h4>
                        <p>Increase contrast for better readability</p>
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
                        <h4>Colorblind Mode</h4>
                        <p>Adjust colors for color vision deficiency</p>
                      </div>
                    </div>
                    <select class="settings-select" id="settingsColorblind" data-colorblind-select>
                      <option value="none">None</option>
                      <option value="protanopia">Protanopia (Red-blind)</option>
                      <option value="deuteranopia">Deuteranopia (Green-blind)</option>
                      <option value="tritanopia">Tritanopia (Blue-blind)</option>
                    </select>
                  </div>
                </div>
                
                <div class="settings-section">
                  <h4 class="settings-section-title">Cognitive Accessibility</h4>
                  
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="flash-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4>Focus Mode (ADHD)</h4>
                        <p>Reduce distractions for better focus</p>
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
                        <h4>Dyslexia-Friendly Font</h4>
                        <p>Use OpenDyslexic font for easier reading</p>
                      </div>
                    </div>
                    <label class="settings-toggle">
                      <input type="checkbox" id="settingsDyslexia" data-dyslexia-toggle>
                      <span class="settings-toggle-slider"></span>
                    </label>
                  </div>
                </div>
                
                <div class="settings-section">
                  <h4 class="settings-section-title">Motion & Animation</h4>
                  
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="pause-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4>Reduce Motion</h4>
                        <p>Minimize animations and transitions</p>
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
                  <h4 class="settings-section-title">Text Size</h4>
                  
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="resize-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4>Font Size</h4>
                        <p>Adjust text size for comfortable reading</p>
                      </div>
                    </div>
                    <select class="settings-select" id="settingsFontSize" data-font-size-select>
                      <option value="small">Small</option>
                      <option value="normal">Normal</option>
                      <option value="large">Large</option>
                      <option value="xlarge">Extra Large</option>
                    </select>
                  </div>
                </div>
                
                <!-- Live Preview for Reading -->
                <div class="settings-preview">
                  <div class="settings-preview-title">Text Preview</div>
                  <div class="settings-preview-frame">
                    <p class="preview-sample-text" id="readingPreviewText">
                      Mental health is just as important as physical health. Taking time each day to check in with yourself, practice mindfulness, and seek support when needed are all crucial steps toward maintaining your wellbeing.
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Language Panel -->
              <div class="settings-panel" id="panelLanguage">
                <div class="settings-section">
                  <h4 class="settings-section-title">Language</h4>
                  
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <div class="settings-item-icon">
                        <ion-icon name="language-outline"></ion-icon>
                      </div>
                      <div class="settings-item-text">
                        <h4>Display Language</h4>
                        <p>Choose your preferred language</p>
                      </div>
                    </div>
                    <select class="settings-select" id="settingsLanguage">
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="zh">中文</option>
                      <option value="hi">हिन्दी</option>
                      <option value="ko">한국어</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <!-- Reset Button -->
              <button class="settings-reset-btn" id="settingsResetBtn">
                <ion-icon name="refresh-outline"></ion-icon>
                Reset to Defaults
              </button>
            </div>
          </div>
          
          <!-- Onboarding Overlay -->
          <div class="settings-onboarding" id="settingsOnboarding">
            <div class="onboarding-card">
              <div class="onboarding-icon">
                <ion-icon name="sparkles-outline"></ion-icon>
              </div>
              <h3 class="onboarding-title">Welcome to Settings!</h3>
              <p class="onboarding-text">
                Customize your MindBalance experience with theme presets, accessibility options, and more. Your preferences sync across all pages.
              </p>
              <button class="onboarding-btn" id="onboardingStartBtn">Let's Get Started</button>
              <button class="onboarding-skip" id="onboardingSkipBtn">Skip for now</button>
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
  }

  function initializeAccentColors() {
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
      setPreference(STORAGE_KEYS.language, e.target.value);
      if (window.changeLanguage) window.changeLanguage(e.target.value);
      updateSyncStatus();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSettingsModal();
    });
  }

  function loadCurrentSettings() {
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
    setPreference(STORAGE_KEYS.accentColor, colorKey);
    window.MindBalanceSettings?.applyAccentColor?.(colorKey);
    
    document.querySelectorAll('.accent-color-option').forEach(option => {
      option.classList.toggle('active', option.dataset.color === colorKey);
    });
    
    clearActivePreset();
    updateSyncStatus();
  }

  function toggleCompareMode() {
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
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
    
    Object.values(STORAGE_KEYS).forEach(key => {
      if (key !== STORAGE_KEYS.onboardingComplete) {
        localStorage.removeItem(key);
      }
    });
    
    window.MindBalanceSettings?.applyTheme?.('light');
    window.MindBalanceSettings?.applyAccentColor?.('gold');
    window.MindBalanceSettings?.applyFontSize?.('normal');
    window.MindBalanceSettings?.applyHighContrast?.(false);
    window.MindBalanceSettings?.applyColorblind?.('none');
    window.MindBalanceSettings?.applyAdhdMode?.(false);
    window.MindBalanceSettings?.applyDyslexiaFont?.(false);
    window.MindBalanceSettings?.applyReduceMotion?.(false);
    
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
    document.getElementById('settingsModalOverlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadCurrentSettings();
    updateAccessibilityScore();
  }

  function closeSettingsModal() {
    document.getElementById('settingsModalOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
    
    if (compareMode) {
      toggleCompareMode();
    }
  }

  function init() {
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

  init();
})();
