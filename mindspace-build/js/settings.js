// ==================== SETTINGS ====================

(function() {
  'use strict';

  // --- Storage Keys ---
  const STORAGE_KEYS = {
    theme: 'mindspace_theme',
    fontSize: 'mindspace_font_size',
    reduceMotion: 'mindspace_reduce_motion',
    highContrast: 'mindspace_high_contrast',
    colorblind: 'mindspace_colorblind',
    adhdMode: 'mindspace_adhd_mode',
    dyslexiaFont: 'mindspace_dyslexia_font',
    accentColor: 'mindspace_accent_color'
  };

  // --- Accent Colors ---
  const ACCENT_COLORS = {
    blue: { hex: '#5BA4E6', hover: '#4893D4', rgb: '91, 164, 230' },
    purple: { hex: '#6DB3F2', hover: '#5CA3E6', rgb: '109, 179, 242' },
    sky: { hex: '#4a90d9', hover: '#3d7fc8', rgb: '74, 144, 217' },
    green: { hex: '#4db896', hover: '#3fa884', rgb: '77, 184, 150' },
    teal: { hex: '#38b2ac', hover: '#2d9d98', rgb: '56, 178, 172' },
    pink: { hex: '#d97eab', hover: '#c86d9a', rgb: '217, 126, 171' },
    orange: { hex: '#e09c5c', hover: '#d08b4b', rgb: '224, 156, 92' },
    red: { hex: '#e07070', hover: '#d05f5f', rgb: '224, 112, 112' }
  };

  const DEFAULT_ACCENT = 'blue';

  // --- Preference Helpers ---
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

  // --- Theme ---
  function getSystemThemePreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function applyTheme(theme) {
    const effectiveTheme = theme === 'system' ? getSystemThemePreference() : theme;
    
    if (effectiveTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    document.querySelectorAll('[data-theme-toggle]').forEach(toggle => {
      toggle.checked = effectiveTheme === 'dark';
    });
    
    const storedAccent = getPreference(STORAGE_KEYS.accentColor, null);
    if (!storedAccent) {
      applyAccentColor(DEFAULT_ACCENT);
    }
  }

  // --- Font Size ---
  function applyFontSize(size) {
    document.documentElement.setAttribute('data-font-size', size);
    
    document.querySelectorAll('select[data-font-size-select]').forEach(select => {
      select.value = size;
    });
  }

  // --- Reduce Motion ---
  function applyReduceMotion(enabled) {
    if (enabled === 'true' || enabled === true) {
      document.documentElement.setAttribute('data-reduce-motion', 'true');
    } else {
      document.documentElement.removeAttribute('data-reduce-motion');
    }

    document.querySelectorAll('[data-reduce-motion-toggle]').forEach(toggle => {
      if (toggle.tagName === 'INPUT') {
        toggle.checked = enabled === 'true' || enabled === true;
      }
    });
  }

  // --- High Contrast ---
  function applyHighContrast(enabled) {
    if (enabled === 'true' || enabled === true) {
      document.documentElement.setAttribute('data-high-contrast', 'true');
    } else {
      document.documentElement.removeAttribute('data-high-contrast');
    }

    document.querySelectorAll('[data-high-contrast-toggle]').forEach(toggle => {
      if (toggle.tagName === 'INPUT') {
        toggle.checked = enabled === 'true' || enabled === true;
      }
    });
  }

  // --- Colorblind Mode ---
  function applyColorblind(mode) {
    if (mode && mode !== 'none') {
      document.documentElement.setAttribute('data-colorblind', mode);
    } else {
      document.documentElement.removeAttribute('data-colorblind');
    }

    document.querySelectorAll('select[data-colorblind-select]').forEach(select => {
      select.value = mode || 'none';
    });
  }

  // --- ADHD Mode ---
  function applyAdhdMode(enabled) {
    if (enabled === 'true' || enabled === true) {
      document.documentElement.setAttribute('data-adhd-mode', 'true');
    } else {
      document.documentElement.removeAttribute('data-adhd-mode');
    }

    document.querySelectorAll('[data-adhd-toggle]').forEach(toggle => {
      if (toggle.tagName === 'INPUT') {
        toggle.checked = enabled === 'true' || enabled === true;
      }
    });
  }

  // --- Dyslexia Font ---
  function applyDyslexiaFont(enabled) {
    if (enabled === 'true' || enabled === true) {
      document.documentElement.setAttribute('data-dyslexia-font', 'true');
    } else {
      document.documentElement.removeAttribute('data-dyslexia-font');
    }

    document.querySelectorAll('[data-dyslexia-toggle]').forEach(toggle => {
      if (toggle.tagName === 'INPUT') {
        toggle.checked = enabled === 'true' || enabled === true;
      }
    });
  }

  // --- Accent Color ---
  function applyAccentColor(colorName) {
    const color = ACCENT_COLORS[colorName] || ACCENT_COLORS.blue;
    const effectiveColorName = ACCENT_COLORS[colorName] ? colorName : 'gold';
    
    document.documentElement.style.setProperty('--user-accent', color.hex);
    document.documentElement.style.setProperty('--user-accent-hover', color.hover);
    document.documentElement.style.setProperty('--user-accent-rgb', color.rgb);
    document.documentElement.style.setProperty('--user-accent-glow', `rgba(${color.rgb}, 0.3)`);
    
    document.documentElement.setAttribute('data-accent', effectiveColorName);
    
    document.querySelectorAll('[data-accent-color]').forEach(btn => {
      const isActive = btn.getAttribute('data-accent-color') === effectiveColorName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    
    document.querySelectorAll('select[data-accent-select]').forEach(select => {
      select.value = effectiveColorName;
    });
  }

  // --- Settings Initialization ---
  function initSettings() {
    const savedTheme = getPreference(STORAGE_KEYS.theme, 'light');
    const savedFontSize = getPreference(STORAGE_KEYS.fontSize, 'normal');
    const savedReduceMotion = getPreference(STORAGE_KEYS.reduceMotion, 'false');
    const savedColorblind = getPreference(STORAGE_KEYS.colorblind, 'none');
    const savedAdhdMode = getPreference(STORAGE_KEYS.adhdMode, 'false');
    const savedDyslexiaFont = getPreference(STORAGE_KEYS.dyslexiaFont, 'false');
    
    const savedAccentColor = getPreference(STORAGE_KEYS.accentColor, DEFAULT_ACCENT);

    try { localStorage.removeItem(STORAGE_KEYS.highContrast); } catch(e) {}
    document.documentElement.removeAttribute('data-high-contrast');

    applyTheme(savedTheme);
    applyFontSize(savedFontSize);
    applyReduceMotion(savedReduceMotion);
    applyColorblind(savedColorblind);
    applyAdhdMode(savedAdhdMode);
    applyDyslexiaFont(savedDyslexiaFont);
    applyAccentColor(savedAccentColor);
  }

  // --- Settings Listeners ---
  function initSettingsListeners() {
    document.querySelectorAll('[data-theme-toggle]').forEach(toggle => {
      toggle.addEventListener('change', function() {
        const newTheme = this.checked ? 'dark' : 'light';
        setPreference(STORAGE_KEYS.theme, newTheme);
        applyTheme(newTheme);
      });
    });

    document.querySelectorAll('select[data-font-size-select]').forEach(select => {
      select.addEventListener('change', function() {
        const newSize = this.value;
        setPreference(STORAGE_KEYS.fontSize, newSize);
        applyFontSize(newSize);
      });
    });

    document.querySelectorAll('input[data-reduce-motion-toggle]').forEach(toggle => {
      toggle.addEventListener('change', function() {
        const newValue = this.checked ? 'true' : 'false';
        setPreference(STORAGE_KEYS.reduceMotion, newValue);
        applyReduceMotion(newValue);
      });
    });

    document.querySelectorAll('input[data-high-contrast-toggle]').forEach(toggle => {
      toggle.addEventListener('change', function() {
        const newValue = this.checked ? 'true' : 'false';
        setPreference(STORAGE_KEYS.highContrast, newValue);
        applyHighContrast(newValue);
      });
    });

    document.querySelectorAll('select[data-colorblind-select]').forEach(select => {
      select.addEventListener('change', function() {
        const newMode = this.value;
        setPreference(STORAGE_KEYS.colorblind, newMode);
        applyColorblind(newMode);
      });
    });

    document.querySelectorAll('input[data-adhd-toggle]').forEach(toggle => {
      toggle.addEventListener('change', function() {
        const newValue = this.checked ? 'true' : 'false';
        setPreference(STORAGE_KEYS.adhdMode, newValue);
        applyAdhdMode(newValue);
      });
    });

    document.querySelectorAll('input[data-dyslexia-toggle]').forEach(toggle => {
      toggle.addEventListener('change', function() {
        const newValue = this.checked ? 'true' : 'false';
        setPreference(STORAGE_KEYS.dyslexiaFont, newValue);
        applyDyslexiaFont(newValue);
      });
    });

    document.querySelectorAll('[data-accent-color]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const colorName = this.getAttribute('data-accent-color');
        setPreference(STORAGE_KEYS.accentColor, colorName);
        applyAccentColor(colorName);
      });
    });

    document.querySelectorAll('select[data-accent-select]').forEach(select => {
      select.addEventListener('change', function() {
        const colorName = this.value;
        setPreference(STORAGE_KEYS.accentColor, colorName);
        applyAccentColor(colorName);
      });
    });
  }

  // --- Settings Dropdown ---
  function initSettingsDropdown() {
    const settingsWrappers = document.querySelectorAll('.settings-wrapper');
    
    settingsWrappers.forEach(wrapper => {
      const settingsToggle = wrapper.querySelector('[data-settings-toggle]');
      const settingsDropdown = wrapper.querySelector('[data-settings-dropdown]');

      if (settingsToggle) {
        settingsToggle.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          if (window.SettingsModal && window.SettingsModal.open) {
            window.SettingsModal.open();
          } else if (settingsDropdown) {
            document.querySelectorAll('.settings-dropdown.active').forEach(d => {
              if (d !== settingsDropdown) d.classList.remove('active');
            });
            settingsDropdown.classList.toggle('active');
          }
        });

        if (settingsDropdown) {
          settingsDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
          });
        }
      }
    });

    document.addEventListener('click', function(e) {
      document.querySelectorAll('.settings-dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    });
  }

  // --- User Button ---
  function initUserButton() {
    const userBtns = document.querySelectorAll('[data-user-btn]');
    
    if (userBtns.length > 0 && typeof MindSpaceAuth !== 'undefined') {
      MindSpaceAuth.onAuthChange(function(user) {
        userBtns.forEach(userBtn => {
          if (user) {
            userBtn.classList.add('signed-in');
            userBtn.setAttribute('title', user.email || 'Signed in');
          } else {
            userBtn.classList.remove('signed-in');
            userBtn.setAttribute('title', 'Not signed in');
          }
        });
      });
    }
  }

  // --- Initialize ---
  initSettings();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initSettingsListeners();
      initSettingsDropdown();
      initUserButton();
    });
  } else {
    initSettingsListeners();
    initSettingsDropdown();
    initUserButton();
  }

  // --- System Theme Change Listener ---
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
      const savedTheme = getPreference(STORAGE_KEYS.theme, 'light');
      if (savedTheme === 'system') {
        applyTheme('system');
      }
    });
  }

  // --- Public API ---
  window.MindSpaceSettings = {
    setTheme: function(theme) {
      setPreference(STORAGE_KEYS.theme, theme);
      applyTheme(theme);
    },
    applyTheme: applyTheme,
    setFontSize: function(size) {
      setPreference(STORAGE_KEYS.fontSize, size);
      applyFontSize(size);
    },
    applyFontSize: applyFontSize,
    setReduceMotion: function(enabled) {
      setPreference(STORAGE_KEYS.reduceMotion, enabled ? 'true' : 'false');
      applyReduceMotion(enabled);
    },
    applyReduceMotion: applyReduceMotion,
    setHighContrast: function(enabled) {
      setPreference(STORAGE_KEYS.highContrast, enabled ? 'true' : 'false');
      applyHighContrast(enabled);
    },
    applyHighContrast: applyHighContrast,
    setColorblind: function(mode) {
      setPreference(STORAGE_KEYS.colorblind, mode);
      applyColorblind(mode);
    },
    applyColorblind: applyColorblind,
    setAdhdMode: function(enabled) {
      setPreference(STORAGE_KEYS.adhdMode, enabled ? 'true' : 'false');
      applyAdhdMode(enabled);
    },
    applyAdhdMode: applyAdhdMode,
    setDyslexiaFont: function(enabled) {
      setPreference(STORAGE_KEYS.dyslexiaFont, enabled ? 'true' : 'false');
      applyDyslexiaFont(enabled);
    },
    applyDyslexiaFont: applyDyslexiaFont,
    setAccentColor: function(colorName) {
      setPreference(STORAGE_KEYS.accentColor, colorName);
      applyAccentColor(colorName);
    },
    applyAccentColor: applyAccentColor,
    getAccentColors: function() {
      return ACCENT_COLORS;
    },
    getPreferences: function() {
      return {
        theme: getPreference(STORAGE_KEYS.theme, 'light'),
        fontSize: getPreference(STORAGE_KEYS.fontSize, 'normal'),
        reduceMotion: getPreference(STORAGE_KEYS.reduceMotion, 'false') === 'true',
        highContrast: getPreference(STORAGE_KEYS.highContrast, 'false') === 'true',
        colorblind: getPreference(STORAGE_KEYS.colorblind, 'none'),
        adhdMode: getPreference(STORAGE_KEYS.adhdMode, 'false') === 'true',
        dyslexiaFont: getPreference(STORAGE_KEYS.dyslexiaFont, 'false') === 'true',
        accentColor: getPreference(STORAGE_KEYS.accentColor, DEFAULT_ACCENT)
      };
    }
  };
})();
