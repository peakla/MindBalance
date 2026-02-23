// ==================== FOOTER ====================

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initBackToTop();
  initNewsletterForm();
  initBlogNewsletterForm();
  initFooterAccordion();
  initFooterControls();
});

// --- Back To Top ---
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

// --- Newsletter API Base ---
function getNewsletterApiBase() {
  const host = window.location.hostname;
  if (host === 'mindbalance.cloud' || host === 'www.mindbalance.cloud' ||
      host === 'mindspace.site' || host === 'www.mindspace.site') {
    return 'https://d519c840-a074-41fa-b89a-8627dded835a-00-f7kivyi5gpot.worf.replit.dev';
  }
  return '';
}

// --- Newsletter Form ---
function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const emailInput = form.querySelector('.mb-footer__newsletter-input');
    const btn = form.querySelector('.mb-footer__newsletter-btn');
    const email = emailInput.value.trim().toLowerCase();
    
    if (!email) return;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      showToast('Please enter a valid email address.');
      return;
    }

    const originalContent = btn.innerHTML;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Subscribing...';
    btn.disabled = true;
    
    try {
      const sb = typeof getSupabase === 'function' ? getSupabase() : null;
      if (!sb) {
        showToast('Service temporarily unavailable. Please try again later.');
        btn.innerHTML = originalContent;
        btn.disabled = false;
        return;
      }

      const { data: existing } = await sb
        .from('newsletter_subscribers')
        .select('email, is_active')
        .eq('email', email)
        .maybeSingle();

      if (existing && existing.is_active) {
        btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Subscribed!';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        emailInput.value = '';
        showToast('You are already subscribed to our newsletter!');
      } else {
        const { error } = await sb
          .from('newsletter_subscribers')
          .upsert({
            email: email,
            is_active: true,
            subscribed_at: new Date().toISOString()
          }, { onConflict: 'email' });

        if (error) throw error;

        const apiBase = getNewsletterApiBase();
        try {
          await fetch(apiBase + '/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
          });
        } catch (emailErr) {
          console.warn('Welcome email request failed:', emailErr);
        }

        btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Subscribed!';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        emailInput.value = '';
        showToast('Thanks for subscribing! Welcome to our community.');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      btn.innerHTML = '<ion-icon name="close-outline"></ion-icon> Error';
      btn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      showToast('Something went wrong. Please try again later.');
    }

    setTimeout(() => {
      btn.innerHTML = originalContent;
      btn.style.background = '';
      btn.disabled = false;
    }, 3000);
  });
}

// --- Blog Newsletter Form ---
function initBlogNewsletterForm() {
  const form = document.getElementById('blogNewsletterForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('blogNewsEmail');
    const btn = form.querySelector('button[type="submit"]');
    const email = emailInput.value.trim().toLowerCase();

    if (!email) return;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      showToast('Please enter a valid email address.');
      return;
    }

    const originalContent = btn.innerHTML;
    btn.innerHTML = 'Subscribing...';
    btn.disabled = true;

    try {
      const sb = typeof getSupabase === 'function' ? getSupabase() : null;
      if (!sb) {
        showToast('Service temporarily unavailable. Please try again later.');
        btn.innerHTML = originalContent;
        btn.disabled = false;
        return;
      }

      const { data: existing } = await sb
        .from('newsletter_subscribers')
        .select('email, is_active')
        .eq('email', email)
        .maybeSingle();

      if (existing && existing.is_active) {
        btn.innerHTML = 'Subscribed!';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.style.color = '#fff';
        emailInput.value = '';
        showToast('You are already subscribed to our newsletter!');
      } else {
        const { error } = await sb
          .from('newsletter_subscribers')
          .upsert({
            email: email,
            is_active: true,
            subscribed_at: new Date().toISOString()
          }, { onConflict: 'email' });

        if (error) throw error;

        const apiBase = getNewsletterApiBase();
        try {
          await fetch(apiBase + '/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
          });
        } catch (emailErr) {
          console.warn('Welcome email request failed:', emailErr);
        }

        btn.innerHTML = 'Subscribed!';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.style.color = '#fff';
        emailInput.value = '';
        showToast('Thanks for subscribing! Welcome to our community.');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      btn.innerHTML = 'Error';
      btn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      btn.style.color = '#fff';
      showToast('Something went wrong. Please try again later.');
    }

    setTimeout(() => {
      btn.innerHTML = originalContent;
      btn.style.background = '';
      btn.style.color = '';
      btn.disabled = false;
    }, 3000);
  });
}

// --- Footer Accordion ---
function initFooterAccordion() {
  const accordionBtns = document.querySelectorAll('.mb-footer__accordion-btn');
  
  accordionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !isExpanded);
    });
  });
}

// --- Footer Controls ---
function initFooterControls() {
  const langSelect = document.getElementById('footerLangSelect');
  const themeToggle = document.getElementById('footerThemeToggle');

  if (langSelect) {
    const savedLang = window.MindBalanceTranslations?.getCurrentLanguage?.() || 
                      localStorage.getItem('mindbalance-language') || 'en';
    langSelect.value = savedLang;

    langSelect.addEventListener('change', (e) => {
      const lang = e.target.value;
      
      if (window.MindBalanceTranslations?.setLanguage) {
        window.MindBalanceTranslations.setLanguage(lang);
      } else {
        localStorage.setItem('mindbalance-language', lang);
        document.querySelectorAll('[data-language-select]').forEach(select => {
          if (select !== langSelect) {
            select.value = lang;
          }
        });
      }
    });
  }

  if (themeToggle) {
    const savedTheme = localStorage.getItem('mindbalance_theme') || 'light';
    const isDark = savedTheme === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle.checked = isDark;

    themeToggle.addEventListener('change', (e) => {
      const isDarkMode = e.target.checked;
      const newTheme = isDarkMode ? 'dark' : 'light';
      
      localStorage.setItem('mindbalance_theme', newTheme);
      
      if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      document.querySelectorAll('[data-theme-toggle]').forEach(toggle => {
        if (toggle !== themeToggle) {
          toggle.checked = isDarkMode;
        }
      });
    });
  }

  listenForHeaderChanges();
}

// --- Header Change Sync ---
function listenForHeaderChanges() {
  document.querySelectorAll('[data-theme-toggle]').forEach(toggle => {
    if (toggle.id !== 'footerThemeToggle') {
      toggle.addEventListener('change', function() {
        const footerToggle = document.getElementById('footerThemeToggle');
        if (footerToggle && footerToggle.checked !== this.checked) {
          footerToggle.checked = this.checked;
        }
      });
    }
  });

  document.querySelectorAll('[data-language-select]').forEach(select => {
    if (select.id !== 'footerLangSelect') {
      select.addEventListener('change', function() {
        const footerSelect = document.getElementById('footerLangSelect');
        if (footerSelect && footerSelect.value !== this.value) {
          footerSelect.value = this.value;
        }
      });
    }
  });
}

// --- Toast ---
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
