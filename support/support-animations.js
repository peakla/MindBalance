// ==================== SUPPORT PAGE ANIMATIONS ====================

(function() {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ==================== SCROLL ANIMATIONS ====================
  function initScrollAnimations() {
    if (prefersReducedMotion) {
      document.querySelectorAll('.animate-section, .animate-stagger, .animate-slide-left, .animate-slide-right, .animate-scale').forEach(el => {
        el.classList.add('is-visible');
      });
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -80px 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-section, .animate-stagger, .animate-slide-left, .animate-slide-right, .animate-scale');
    animatedElements.forEach(el => observer.observe(el));
  }

  // ==================== BACK TO TOP ====================
  function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    if (!backToTopBtn) return;

    function toggleBackToTop() {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    });

    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        toggleBackToTop();
        scrollTimeout = null;
      }, 100);
    }, { passive: true });

    toggleBackToTop();
  }

  // ==================== ANIMATION CLASSES ====================
  function addAnimationClasses() {
    const crisisCards = document.querySelector('.crisis-cards');
    if (crisisCards) {
      crisisCards.classList.add('animate-stagger');
    }

    const crisisBanner = document.querySelector('.crisis-banner');
    if (crisisBanner) {
      crisisBanner.classList.add('animate-section');
    }

    const quicklinksGrid = document.querySelector('.quicklinks-grid');
    if (quicklinksGrid) {
      quicklinksGrid.classList.add('animate-stagger');
    }

    const helplinesGrid = document.querySelector('.helplines-grid');
    if (helplinesGrid) {
      helplinesGrid.classList.add('animate-stagger');
    }

    const selfhelpCards = document.querySelector('.selfhelp-cards');
    if (selfhelpCards) {
      selfhelpCards.classList.add('animate-stagger');
    }

    const faqList = document.querySelector('.faq-list');
    if (faqList) {
      faqList.classList.add('animate-stagger');
    }

    document.querySelectorAll('.section-header').forEach(header => {
      header.classList.add('animate-section');
    });

    const appointmentForm = document.querySelector('.appointment-form');
    if (appointmentForm) {
      appointmentForm.classList.add('animate-scale');
    }

    const resourcesGrid = document.querySelector('.resources-grid');
    if (resourcesGrid) {
      resourcesGrid.classList.add('animate-stagger');
    }
  }

  // ==================== CARD HOVER EFFECTS ====================
  function initCardHoverEffects() {
    if (prefersReducedMotion) return;

    const cards = document.querySelectorAll('.crisis-card, .quicklink-card, .helpline-card, .selfhelp-card');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', function(e) {
        this.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
      });

      card.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        this.style.transform = `translateY(-8px) scale(1.02) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      card.addEventListener('mouseleave', function() {
        this.style.transform = '';
      });
    });
  }

  // ==================== RIPPLE EFFECT ====================
  function initRippleEffect() {
    if (prefersReducedMotion) return;

    const buttons = document.querySelectorAll('.crisis-btn, .helpline-contact');
    
    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  // ==================== INITIALIZATION ====================
  function init() {
    addAnimationClasses();
    initScrollAnimations();
    initBackToTop();
    initCardHoverEffects();
    initRippleEffect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
