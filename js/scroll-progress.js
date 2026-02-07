// ==================== SCROLL PROGRESS ====================

(function() {
  'use strict';
  
  function initScrollProgress() {
    const scrollProgress = document.querySelector('.scroll-progress');
    if (!scrollProgress) return;
    
    const progressBar = scrollProgress.querySelector('.scroll-progress__bar');
    const dots = scrollProgress.querySelectorAll('.scroll-progress__dot');
    
    const sections = [];
    dots.forEach(dot => {
      const sectionId = dot.getAttribute('data-section');
      const element = document.getElementById(sectionId);
      if (element) {
        sections.push({ id: sectionId, element: element });
      }
    });
    
    if (sections.length === 0) return;
    
    dots.forEach(dot => {
      dot.addEventListener('click', function() {
        const sectionId = this.getAttribute('data-section');
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
    
    function updateScrollProgress() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      
      if (progressBar) {
        progressBar.style.setProperty('--progress', scrollPercent + '%');
      }
      
      if (scrollTop > 300) {
        scrollProgress.classList.add('visible');
      } else {
        scrollProgress.classList.remove('visible');
      }
      
      let currentSection = null;
      const viewportMiddle = scrollTop + window.innerHeight / 2;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const sectionTop = section.element.getBoundingClientRect().top + window.scrollY;
        
        if (sectionTop <= viewportMiddle) {
          currentSection = section.id;
          break;
        }
      }
      
      if (!currentSection && sections.length > 0) {
        currentSection = sections[0].id;
      }
      
      dots.forEach(dot => {
        const sectionId = dot.getAttribute('data-section');
        if (sectionId === currentSection) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
    
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollProgress);
  } else {
    initScrollProgress();
  }
})();
