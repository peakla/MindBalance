/**
 * MindBalance - Shared Animation System
 * Consistent scroll-triggered animations across all pages
 */

(function() {
  'use strict';

  const ANIMATION_CONFIG = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const ANIMATION_SELECTORS = [
    '.animate-fade-in',
    '.animate-slide-up',
    '.animate-slide-left',
    '.animate-slide-right',
    '.animate-scale-in',
    '.animate-blur-in',
    '.animate-stagger',
    '.animate-section'
  ];

  let observer = null;

  function shouldReduceMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function revealElement(element) {
    element.classList.add('is-visible');
  }

  function revealAllImmediately() {
    const elements = document.querySelectorAll(ANIMATION_SELECTORS.join(', '));
    elements.forEach(el => revealElement(el));
  }

  function handleIntersection(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        revealElement(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }

  function initScrollAnimations() {
    if (shouldReduceMotion()) {
      revealAllImmediately();
      return;
    }

    if (!('IntersectionObserver' in window)) {
      revealAllImmediately();
      return;
    }

    observer = new IntersectionObserver(handleIntersection, {
      threshold: ANIMATION_CONFIG.threshold,
      rootMargin: ANIMATION_CONFIG.rootMargin
    });

    const elements = document.querySelectorAll(ANIMATION_SELECTORS.join(', '));
    elements.forEach(el => {
      if (!el.classList.contains('is-visible')) {
        observer.observe(el);
      }
    });
  }

  function initBackToTop() {
    const backToTopBtn = document.querySelector('.back-to-top');
    if (!backToTopBtn) return;

    const showThreshold = 400;
    let isVisible = false;

    function toggleVisibility() {
      const shouldShow = window.scrollY > showThreshold;
      
      if (shouldShow !== isVisible) {
        isVisible = shouldShow;
        backToTopBtn.classList.toggle('is-visible', isVisible);
      }
    }

    function scrollToTop(e) {
      e.preventDefault();
      
      if (shouldReduceMotion()) {
        window.scrollTo(0, 0);
      } else {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    backToTopBtn.addEventListener('click', scrollToTop);
    
    toggleVisibility();
  }

  function initRippleEffect() {
    const rippleElements = document.querySelectorAll('.btn-ripple');
    
    rippleElements.forEach(el => {
      el.addEventListener('click', function(e) {
        if (shouldReduceMotion()) return;
        
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('span');
        
        ripple.className = 'ripple-effect';
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) + 'px';
        
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  function initHoverEffects() {
    if (shouldReduceMotion()) return;
    
    const hover3dElements = document.querySelectorAll('.hover-3d');
    
    hover3dElements.forEach(el => {
      el.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
      });
      
      el.addEventListener('mouseleave', function() {
        this.style.transform = '';
      });
    });
  }

  function initParallax() {
    if (shouldReduceMotion()) return;
    
    const parallaxElements = document.querySelectorAll('.parallax-bg');
    
    if (parallaxElements.length === 0) return;
    
    function updateParallax() {
      const scrollY = window.scrollY;
      
      parallaxElements.forEach(el => {
        const speed = parseFloat(el.dataset.speed) || 0.5;
        const yPos = -(scrollY * speed);
        el.style.transform = `translateY(${yPos}px)`;
      });
    }
    
    window.addEventListener('scroll', updateParallax, { passive: true });
  }

  function initCountUp() {
    const countElements = document.querySelectorAll('.count-up');
    
    if (countElements.length === 0) return;
    
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target) || 0;
          const duration = parseInt(el.dataset.duration) || 2000;
          const start = 0;
          const startTime = performance.now();
          
          function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const current = Math.round(start + (target - start) * easeProgress);
            el.textContent = current.toLocaleString();
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          }
          
          if (!shouldReduceMotion()) {
            requestAnimationFrame(animate);
          } else {
            el.textContent = target.toLocaleString();
          }
          
          countObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    
    countElements.forEach(el => countObserver.observe(el));
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        initScrollAnimations();
        initBackToTop();
        initRippleEffect();
        initHoverEffects();
        initParallax();
        initCountUp();
      });
    } else {
      initScrollAnimations();
      initBackToTop();
      initRippleEffect();
      initHoverEffects();
      initParallax();
      initCountUp();
    }
  }

  window.MindBalanceAnimations = {
    init: init,
    refresh: initScrollAnimations,
    revealAll: revealAllImmediately
  };

  init();
})();
