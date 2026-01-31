/**
 * Support Page Animations
 * Handles scroll-triggered animations, back-to-top button, and staggered reveals
 */

(function() {
  'use strict';

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ========================
  // INTERSECTION OBSERVER FOR SCROLL ANIMATIONS
  // ========================
  function initScrollAnimations() {
    if (prefersReducedMotion) {
      // If reduced motion is preferred, make all elements visible immediately
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
          // Optionally unobserve after animation triggers
          // observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all animated elements
    const animatedElements = document.querySelectorAll('.animate-section, .animate-stagger, .animate-slide-left, .animate-slide-right, .animate-scale');
    animatedElements.forEach(el => observer.observe(el));
  }

  // ========================
  // BACK TO TOP BUTTON
  // ========================
  function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    if (!backToTopBtn) return;

    // Show/hide button based on scroll position
    function toggleBackToTop() {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }

    // Smooth scroll to top
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    });

    // Throttled scroll handler
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        toggleBackToTop();
        scrollTimeout = null;
      }, 100);
    }, { passive: true });

    // Initial check
    toggleBackToTop();
  }

  // ========================
  // ADD ANIMATION CLASSES TO SECTIONS
  // ========================
  function addAnimationClasses() {
    // Crisis section cards
    const crisisCards = document.querySelector('.crisis-cards');
    if (crisisCards) {
      crisisCards.classList.add('animate-stagger');
    }

    // Crisis banner
    const crisisBanner = document.querySelector('.crisis-banner');
    if (crisisBanner) {
      crisisBanner.classList.add('animate-section');
    }

    // Quick links grid
    const quicklinksGrid = document.querySelector('.quicklinks-grid');
    if (quicklinksGrid) {
      quicklinksGrid.classList.add('animate-stagger');
    }

    // Helplines grid
    const helplinesGrid = document.querySelector('.helplines-grid');
    if (helplinesGrid) {
      helplinesGrid.classList.add('animate-stagger');
    }

    // Self-help cards
    const selfhelpCards = document.querySelector('.selfhelp-cards');
    if (selfhelpCards) {
      selfhelpCards.classList.add('animate-stagger');
    }

    // FAQ items
    const faqList = document.querySelector('.faq-list');
    if (faqList) {
      faqList.classList.add('animate-stagger');
    }

    // Section headers
    document.querySelectorAll('.section-header').forEach(header => {
      header.classList.add('animate-section');
    });

    // Appointment form
    const appointmentForm = document.querySelector('.appointment-form');
    if (appointmentForm) {
      appointmentForm.classList.add('animate-scale');
    }

    // Resources grid
    const resourcesGrid = document.querySelector('.resources-grid');
    if (resourcesGrid) {
      resourcesGrid.classList.add('animate-stagger');
    }
  }

  // ========================
  // ENHANCED CARD HOVER EFFECTS
  // ========================
  function initCardHoverEffects() {
    if (prefersReducedMotion) return;

    // Add subtle tilt effect on hover
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

  // ========================
  // RIPPLE EFFECT ON BUTTONS
  // ========================
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

  // ========================
  // INITIALIZE ALL ANIMATIONS
  // ========================
  function init() {
    addAnimationClasses();
    initScrollAnimations();
    initBackToTop();
    initCardHoverEffects();
    initRippleEffect();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
