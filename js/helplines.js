document.addEventListener('DOMContentLoaded', function() {
  initHelplinesFilters();
  initCopyButtons();
  initViewToggle();
  initMobileCategories();
});

function initHelplinesFilters() {
  const filterPills = document.querySelectorAll('.helplines-filter-pill');
  const helplineCards = document.querySelectorAll('.helpline-card');
  const helplinesGrid = document.querySelector('.helplines-grid');
  
  if (!filterPills.length || !helplineCards.length) return;
  
  filterPills.forEach(pill => {
    pill.addEventListener('click', function() {
      const filter = this.dataset.filter;
      
      filterPills.forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      
      helplineCards.forEach((card, index) => {
        const category = card.dataset.category;
        const shouldShow = filter === 'all' || category === filter;
        
        if (shouldShow) {
          card.classList.remove('filter-hidden');
          card.classList.add('filter-visible');
          card.style.position = 'relative';
          card.style.visibility = 'visible';
          card.style.animationDelay = `${index * 0.05}s`;
        } else {
          card.classList.add('filter-hidden');
          card.classList.remove('filter-visible');
          setTimeout(() => {
            if (card.classList.contains('filter-hidden')) {
              card.style.position = 'absolute';
              card.style.visibility = 'hidden';
            }
          }, 300);
        }
      });
      
      if (helplinesGrid) {
        helplinesGrid.style.minHeight = '400px';
      }
    });
  });
}

function initCopyButtons() {
  document.querySelectorAll('.helpline-copy-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const phoneNumber = this.dataset.phone;
      if (!phoneNumber) return;
      
      navigator.clipboard.writeText(phoneNumber).then(() => {
        this.classList.add('copied');
        const icon = this.querySelector('ion-icon');
        if (icon) {
          icon.setAttribute('name', 'checkmark-outline');
        }
        
        setTimeout(() => {
          this.classList.remove('copied');
          if (icon) {
            icon.setAttribute('name', 'copy-outline');
          }
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        const textArea = document.createElement('textarea');
        textArea.value = phoneNumber;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          this.classList.add('copied');
          const icon = this.querySelector('ion-icon');
          if (icon) {
            icon.setAttribute('name', 'checkmark-outline');
          }
          setTimeout(() => {
            this.classList.remove('copied');
            if (icon) {
              icon.setAttribute('name', 'copy-outline');
            }
          }, 2000);
        } catch (fallbackErr) {
          console.error('Fallback copy failed:', fallbackErr);
        }
        document.body.removeChild(textArea);
      });
    });
  });
}

function initViewToggle() {
  const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
  const helplinesGrid = document.querySelector('.helplines-grid');
  
  if (!viewToggleBtns.length || !helplinesGrid) return;
  
  // Load saved preference
  const savedView = localStorage.getItem('helplines-view') || 'grid';
  if (savedView === 'list') {
    helplinesGrid.classList.add('list-view');
    viewToggleBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === 'list');
    });
  }
  
  viewToggleBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const view = this.dataset.view;
      
      viewToggleBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      if (view === 'list') {
        helplinesGrid.classList.add('list-view');
      } else {
        helplinesGrid.classList.remove('list-view');
      }
      
      // Save preference
      localStorage.setItem('helplines-view', view);
      
      // Trigger re-layout animation
      helplinesGrid.style.opacity = '0';
      setTimeout(() => {
        helplinesGrid.style.opacity = '1';
      }, 150);
    });
  });
}

function initMobileCategories() {
  const helplinesGrid = document.querySelector('.helplines-grid');
  const helplineCards = document.querySelectorAll('.helpline-card');
  
  if (!helplinesGrid || !helplineCards.length) return;
  
  // Check if we're on mobile
  const isMobile = () => window.innerWidth <= 768;
  
  // Store original cards for restoration
  let originalCards = Array.from(helplineCards).map(card => card.cloneNode(true));
  let mobileGroupsCreated = false;
  
  // Category configuration with translation keys
  const categories = {
    crisis: { nameKey: 'mobile_cat_crisis', fallback: 'Crisis Lines', icon: 'alert-circle' },
    lgbtq: { nameKey: 'mobile_cat_lgbtq', fallback: 'LGBTQ+ Support', icon: 'heart-half' },
    youth: { nameKey: 'mobile_cat_youth', fallback: 'Youth & Students', icon: 'school' },
    veterans: { nameKey: 'mobile_cat_veterans', fallback: 'Veterans', icon: 'shield-checkmark' },
    specialized: { nameKey: 'mobile_cat_specialized', fallback: 'Specialized', icon: 'medical' },
    general: { nameKey: 'mobile_cat_general', fallback: 'General Support', icon: 'call' }
  };
  
  // Get translated text
  function getTranslation(key, fallback) {
    if (window.translations && window.translations[key]) {
      return window.translations[key];
    }
    return fallback;
  }
  
  function createMobileGroups() {
    if (mobileGroupsCreated) return;
    
    // Group cards by category
    const grouped = {};
    helplineCards.forEach(card => {
      const category = card.dataset.category || 'general';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(card.cloneNode(true));
    });
    
    // Clear the grid
    helplinesGrid.innerHTML = '';
    helplinesGrid.classList.add('mobile-grouped');
    
    // Create category groups
    Object.keys(categories).forEach(cat => {
      const cards = grouped[cat];
      if (!cards || cards.length === 0) return;
      
      const group = document.createElement('div');
      group.className = 'mobile-category-group';
      group.dataset.category = cat;
      
      const config = categories[cat];
      const categoryName = getTranslation(config.nameKey, config.fallback);
      
      group.innerHTML = `
        <button class="mobile-category-header" aria-expanded="false">
          <div class="mobile-category-header__left">
            <div class="mobile-category-header__icon mobile-category-header__icon--${cat}">
              <ion-icon name="${config.icon}"></ion-icon>
            </div>
            <h3 class="mobile-category-header__title" data-translate="${config.nameKey}">${categoryName}</h3>
            <span class="mobile-category-header__count">${cards.length}</span>
          </div>
          <ion-icon name="chevron-down" class="mobile-category-header__chevron"></ion-icon>
        </button>
        <div class="mobile-category-content"></div>
      `;
      
      const content = group.querySelector('.mobile-category-content');
      cards.forEach(card => content.appendChild(card));
      
      // Add click handler
      const header = group.querySelector('.mobile-category-header');
      header.addEventListener('click', () => {
        const isExpanded = group.classList.contains('expanded');
        group.classList.toggle('expanded');
        header.setAttribute('aria-expanded', !isExpanded);
      });
      
      // Expand crisis section by default
      if (cat === 'crisis') {
        group.classList.add('expanded');
        header.setAttribute('aria-expanded', 'true');
      }
      
      helplinesGrid.appendChild(group);
    });
    
    // Reinitialize copy buttons for cloned cards
    initCopyButtons();
    
    mobileGroupsCreated = true;
  }
  
  function restoreDesktopGrid() {
    if (!mobileGroupsCreated) return;
    
    helplinesGrid.innerHTML = '';
    helplinesGrid.classList.remove('mobile-grouped');
    
    // Restore saved view preference
    const savedView = localStorage.getItem('helplines-view') || 'grid';
    if (savedView === 'list') {
      helplinesGrid.classList.add('list-view');
    }
    
    originalCards.forEach(card => {
      helplinesGrid.appendChild(card.cloneNode(true));
    });
    
    // Reinitialize copy buttons for new cards
    initCopyButtons();
    
    mobileGroupsCreated = false;
  }
  
  function handleResize() {
    if (isMobile() && !mobileGroupsCreated) {
      createMobileGroups();
    } else if (!isMobile() && mobileGroupsCreated) {
      restoreDesktopGrid();
    }
  }
  
  // Debounce resize handler
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 150);
  });
  
  // Initial check
  handleResize();
}
