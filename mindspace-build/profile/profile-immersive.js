// ==================== IMMERSIVE PROFILE EXPERIENCE ====================

(function() {
  'use strict';
  
  // ==================== DAY/NIGHT CYCLE ====================
  const TimeOfDay = {
    MORNING: 'morning',
    AFTERNOON: 'afternoon',
    EVENING: 'evening',
    NIGHT: 'night'
  };
  
  function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return TimeOfDay.MORNING;
    if (hour >= 12 && hour < 17) return TimeOfDay.AFTERNOON;
    if (hour >= 17 && hour < 20) return TimeOfDay.EVENING;
    return TimeOfDay.NIGHT;
  }
  
  function getGreeting() {
    const time = getTimeOfDay();
    switch (time) {
      case TimeOfDay.MORNING: return 'Good morning';
      case TimeOfDay.AFTERNOON: return 'Good afternoon';
      case TimeOfDay.EVENING: return 'Good evening';
      case TimeOfDay.NIGHT: return 'Good night';
      default: return 'Welcome back';
    }
  }
  
  function getTimeEmoji() {
    const time = getTimeOfDay();
    switch (time) {
      case TimeOfDay.MORNING: return '🌅';
      case TimeOfDay.AFTERNOON: return '☀️';
      case TimeOfDay.EVENING: return '🌇';
      case TimeOfDay.NIGHT: return '🌙';
      default: return '✨';
    }
  }
  
  // --- Affirmations ---
  const affirmations = {
    morning: [
      "Today is full of possibilities.",
      "You have the strength to face whatever comes.",
      "Take a deep breath and embrace the day.",
      "Your potential is limitless.",
      "Every morning is a fresh start."
    ],
    afternoon: [
      "You're doing great. Keep going!",
      "Take a moment to appreciate your progress.",
      "Your efforts are making a difference.",
      "Stay focused, you've got this.",
      "Remember to take breaks and breathe."
    ],
    evening: [
      "You've accomplished more than you realize.",
      "It's okay to slow down now.",
      "Reflect on the good moments of today.",
      "You deserve rest and relaxation.",
      "Be proud of how far you've come."
    ],
    night: [
      "Rest well, tomorrow is a new beginning.",
      "Let go of today's worries.",
      "You did your best today, and that's enough.",
      "Sweet dreams await you.",
      "The night is for healing and renewal."
    ]
  };
  
  function getRandomAffirmation() {
    const time = getTimeOfDay();
    const timeAffirmations = affirmations[time] || affirmations.morning;
    return timeAffirmations[Math.floor(Math.random() * timeAffirmations.length)];
  }
  
  // --- Time Theme Application ---
  function applyTimeOfDay() {
    const time = getTimeOfDay();
    const body = document.body;
    const profile = document.querySelector('.mb-profile');
    
    body.classList.remove('time-morning', 'time-afternoon', 'time-evening', 'time-night');
    body.classList.add(`time-${time}`);
    
    if (profile) {
      profile.classList.add('immersive');
    }
    
    createImmersiveBackground();
    updateGreeting();
  }
  
  // --- Immersive Background ---
  function createImmersiveBackground() {
    if (document.querySelector('.immersive-bg')) return;
    
    const bg = document.createElement('div');
    bg.className = 'immersive-bg';
    bg.innerHTML = `
      <div class="immersive-bg__gradient"></div>
      <div class="immersive-bg__shapes">
        <div class="floating-shape"></div>
        <div class="floating-shape"></div>
        <div class="floating-shape"></div>
        <div class="floating-shape"></div>
      </div>
      <div class="immersive-bg__stars" id="starsContainer"></div>
      <div class="immersive-bg__sun"></div>
      <div class="immersive-bg__moon"></div>
    `;
    
    document.body.insertBefore(bg, document.body.firstChild);
    generateStars();
  }
  
  function generateStars() {
    const container = document.getElementById('starsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < 50; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 60}%`;
      star.style.width = `${2 + Math.random() * 3}px`;
      star.style.height = star.style.width;
      star.style.animationDelay = `${Math.random() * 3}s`;
      container.appendChild(star);
    }
  }
  
  // --- Greeting ---
  function updateGreeting() {
    const greetingEl = document.querySelector('.profile-greeting');
    if (!greetingEl) return;
    
    if (window.isOwnProfile !== true) {
      greetingEl.style.display = 'none';
      return;
    }
    greetingEl.style.display = '';
    
    const timeEl = greetingEl.querySelector('.profile-greeting__time');
    const messageEl = greetingEl.querySelector('.profile-greeting__message');
    const affirmationEl = greetingEl.querySelector('.profile-greeting__affirmation');
    
    const userName = window.userProfile?.display_name || 
                     document.querySelector('.mb-profile__name')?.textContent ||
                     'there';
    
    const firstName = userName.split(' ')[0];
    
    if (timeEl) {
      timeEl.textContent = `${getTimeEmoji()} ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
    }
    
    if (messageEl) {
      messageEl.textContent = '';
      const greetingText = document.createTextNode(`${getGreeting()}, `);
      const nameSpan = document.createElement('span');
      nameSpan.className = 'profile-greeting__name';
      nameSpan.textContent = firstName;
      const exclamation = document.createTextNode('!');
      messageEl.appendChild(greetingText);
      messageEl.appendChild(nameSpan);
      messageEl.appendChild(exclamation);
    }
    
    if (affirmationEl) {
      affirmationEl.textContent = `"${getRandomAffirmation()}"`;
    }
  }
  
  // ==================== SCROLL ANIMATIONS ====================
  function initScrollAnimations() {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          
          const counters = entry.target.querySelectorAll('.stat-counter[data-target]');
          counters.forEach(counter => animateCounter(counter));
          
          const rings = entry.target.querySelectorAll('.progress-ring__circle-progress');
          rings.forEach(ring => animateProgressRing(ring));
        }
      });
    }, observerOptions);
    
    document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale, .stagger-reveal').forEach(el => {
      observer.observe(el);
    });
  }
  
  // --- Counter Animation ---
  function animateCounter(counter) {
    if (counter.classList.contains('counted')) return;
    counter.classList.add('counted');
    
    const target = parseInt(counter.dataset.target) || 0;
    const duration = 1500;
    const start = performance.now();
    
    function update(currentTime) {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(easeOutQuart * target);
      
      counter.textContent = current.toLocaleString();
      
      if (progress < 1) {
        counter.classList.add('counting');
        requestAnimationFrame(update);
      } else {
        counter.classList.remove('counting');
      }
    }
    
    requestAnimationFrame(update);
  }
  
  // --- Progress Ring Animation ---
  function animateProgressRing(ring) {
    if (ring.classList.contains('animated')) return;
    ring.classList.add('animated');
    
    const percent = parseFloat(ring.dataset.percent) || 0;
    const circumference = 226;
    const offset = circumference - (percent / 100) * circumference;
    
    setTimeout(() => {
      ring.style.strokeDashoffset = offset;
    }, 100);
  }
  
  // ==================== HAPTIC FEEDBACK ====================
  const HapticIntensity = {
    LIGHT: 'light',
    MEDIUM: 'medium',
    HEAVY: 'heavy'
  };
  
  function triggerHaptic(intensity = HapticIntensity.LIGHT) {
    if (!window.navigator?.vibrate) return;
    
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    switch (intensity) {
      case HapticIntensity.LIGHT:
        navigator.vibrate(10);
        break;
      case HapticIntensity.MEDIUM:
        navigator.vibrate(25);
        break;
      case HapticIntensity.HEAVY:
        navigator.vibrate([30, 10, 30]);
        break;
    }
  }
  
  function initHapticFeedback() {
    document.querySelectorAll('.haptic-light, .quick-action-btn, .mb-profile__tab').forEach(el => {
      el.addEventListener('touchstart', () => triggerHaptic(HapticIntensity.LIGHT), { passive: true });
    });
    
    document.querySelectorAll('.haptic-medium, .follow-btn, .save-btn').forEach(el => {
      el.addEventListener('touchstart', () => triggerHaptic(HapticIntensity.MEDIUM), { passive: true });
    });
    
    document.querySelectorAll('.haptic-heavy, .achievement-unlock').forEach(el => {
      el.addEventListener('touchstart', () => triggerHaptic(HapticIntensity.HEAVY), { passive: true });
    });
    
    document.querySelectorAll('.haptic-feedback').forEach(el => {
      el.addEventListener('touchstart', function() {
        this.classList.add('touched');
        setTimeout(() => this.classList.remove('touched'), 400);
      }, { passive: true });
    });
  }
  
  // ==================== PARALLAX ====================
  function initParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    const shapes = document.querySelectorAll('.floating-shape');
    
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      
      shapes.forEach((shape, i) => {
        const speed = 0.05 + (i * 0.02);
        shape.style.transform = `translateY(${scrollY * speed}px)`;
      });
    }, { passive: true });
  }
  
  // ==================== ONLINE STATUS ====================
  function updateOnlineStatus(isOnline = true) {
    const statusEl = document.querySelector('.online-status');
    if (!statusEl) return;
    
    statusEl.classList.remove('online-status--online', 'online-status--away', 'online-status--offline');
    
    if (isOnline) {
      statusEl.classList.add('online-status--online');
      statusEl.querySelector('.online-status__text').textContent = 'Online';
    } else {
      statusEl.classList.add('online-status--offline');
      statusEl.querySelector('.online-status__text').textContent = 'Offline';
    }
  }
  
  // ==================== PEOPLE SUGGESTIONS ====================
  async function loadPeopleSuggestions() {
    const container = document.getElementById('peopleSuggestions');
    const list = document.getElementById('peopleSuggestionsList');
    if (!container || !list || !window.supabaseClient) return;
    
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return;
      
      const { data: following } = await window.supabaseClient
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);
      
      const followingIds = following?.map(f => f.following_id) || [];
      followingIds.push(user.id);
      
      const { data: suggestions } = await window.supabaseClient
        .from('profiles')
        .select('id, display_name, avatar_url')
        .not('id', 'in', `(${followingIds.join(',')})`)
        .not('display_name', 'is', null)
        .limit(5);
      
      if (!suggestions || suggestions.length === 0) {
        container.style.display = 'none';
        return;
      }
      
      container.style.display = 'block';
      list.innerHTML = '';
      
      for (const person of suggestions) {
        const { count: mutualCount } = await window.supabaseClient
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', person.id)
          .in('follower_id', followingIds.filter(id => id !== user.id));
        
        const item = document.createElement('div');
        item.className = 'people-suggestion';
        const avatarColors = ['#2068A8','#E57373','#64B5F6','#81C784','#FFD54F','#BA68C8','#4DB6AC','#FF8A65','#90A4AE','#A1887F'];
        const pName = person.display_name || 'U';
        const pInitials = pName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || pName.substring(0, 2).toUpperCase();
        const pColorIdx = pName.charCodeAt(0) % avatarColors.length;
        const avatarHtml = person.avatar_url
          ? `<img src="${person.avatar_url}" alt="${person.display_name}" class="people-suggestion__avatar" onerror="this.outerHTML='<div class=\\'people-suggestion__avatar people-suggestion__avatar--initials\\' style=\\'background:${avatarColors[pColorIdx]}\\'>${pInitials}</div>'">`
          : `<div class="people-suggestion__avatar people-suggestion__avatar--initials" style="background:${avatarColors[pColorIdx]}">${pInitials}</div>`;
        item.innerHTML = `
          ${avatarHtml}
          <div class="people-suggestion__info">
            <a href="/profile/?user=${person.id}" class="people-suggestion__name">${person.display_name}</a>
            <span class="people-suggestion__mutual">${mutualCount || 0} mutual connection${mutualCount !== 1 ? 's' : ''}</span>
          </div>
          <button class="people-suggestion__follow-btn haptic-light" data-user-id="${person.id}">Follow</button>
        `;
        
        const followBtn = item.querySelector('.people-suggestion__follow-btn');
        followBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const userId = followBtn.dataset.userId;
          
          try {
            await window.supabaseClient
              .from('followers')
              .insert({ follower_id: user.id, following_id: userId });
            
            followBtn.textContent = 'Following';
            followBtn.disabled = true;
            followBtn.style.opacity = '0.6';
            
            triggerHaptic(HapticIntensity.MEDIUM);
          } catch (err) {
            console.error('Failed to follow:', err);
          }
        });
        
        list.appendChild(item);
      }
    } catch (err) {
      console.error('Failed to load people suggestions:', err);
      container.style.display = 'none';
    }
  }
  
  // ==================== INITIALIZATION ====================
  function init() {
    applyTimeOfDay();
    setInterval(applyTimeOfDay, 60000);
    initScrollAnimations();
    initHapticFeedback();
    initParallax();
    
    window.addEventListener('profileLoaded', () => {
      updateGreeting();
      loadPeopleSuggestions();
    });
    
    setTimeout(() => {
      if (window.userProfile) {
        updateGreeting();
        loadPeopleSuggestions();
      }
    }, 2000);
    
    const observer = new MutationObserver(() => {
      applyTimeOfDay();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }
  
  // --- Public API ---
  window.ImmersiveProfile = {
    triggerHaptic,
    loadPeopleSuggestions,
    updateGreeting,
    animateCounter,
    animateProgressRing,
    getTimeOfDay,
    getGreeting,
    getRandomAffirmation
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
