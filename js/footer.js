document.addEventListener('DOMContentLoaded', () => {
  initBackToTop();
  initNewsletterForm();
  initFooterAccordion();
  initFooterControls();
});

function initBackToTop() {
  const backToTopBtn = document.getElementById('backToTop');
  if (!backToTopBtn) return;

  const showThreshold = 400;

  window.addEventListener('scroll', () => {
    if (window.scrollY > showThreshold) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  }, { passive: true });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const emailInput = form.querySelector('.mb-footer__newsletter-input');
    const btn = form.querySelector('.mb-footer__newsletter-btn');
    const email = emailInput.value.trim();
    
    if (!email) return;

    const originalContent = btn.innerHTML;
    btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Subscribed!';
    btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    btn.disabled = true;
    
    emailInput.value = '';

    setTimeout(() => {
      btn.innerHTML = originalContent;
      btn.style.background = '';
      btn.disabled = false;
    }, 3000);

    showToast('Thanks for subscribing! Check your inbox for updates.');
  });
}

function initFooterAccordion() {
  const accordionBtns = document.querySelectorAll('.mb-footer__accordion-btn');
  
  accordionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !isExpanded);
    });
  });
}

function initFooterControls() {
  const langSelect = document.getElementById('footerLangSelect');
  const themeToggle = document.getElementById('footerThemeToggle');

  if (langSelect) {
    const savedLang = localStorage.getItem('preferredLanguage') || 'en';
    langSelect.value = savedLang;

    langSelect.addEventListener('change', (e) => {
      const lang = e.target.value;
      localStorage.setItem('preferredLanguage', lang);
      
      const headerLangSelect = document.querySelector('[data-language-select]');
      if (headerLangSelect) {
        headerLangSelect.value = lang;
        headerLangSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      if (typeof loadTranslations === 'function') {
        loadTranslations(lang);
      }
    });
  }

  if (themeToggle) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
                   localStorage.getItem('darkMode') === 'true';
    themeToggle.checked = isDark;

    themeToggle.addEventListener('change', (e) => {
      const isDarkMode = e.target.checked;
      
      if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('darkMode', 'false');
      }

      const headerThemeToggle = document.querySelector('[data-theme-toggle]');
      if (headerThemeToggle && headerThemeToggle.checked !== isDarkMode) {
        headerThemeToggle.checked = isDarkMode;
      }
    });
  }
}

function showToast(message) {
  let toast = document.querySelector('.footer-toast');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'footer-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 14px 28px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
      z-index: 9999;
      opacity: 0;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3000);
}
