/* ============================================
   ENHANCED WELLNESS CHECK-IN
   Interactive mood selector with personalized tips
   ============================================ */

(function() {
  'use strict';

  // Mood data with tips, affirmations, and actions
  const moodData = {
    happy: {
      emoji: '😊',
      color: '#10b981',
      colorDark: '#059669',
      affirmation: "That's wonderful! Your positive energy is contagious.",
      tipTitle: "Maintain Your Glow",
      tip: "Channel this positive energy into something meaningful. Consider reaching out to a friend, journaling what's making you happy, or starting a project you've been putting off.",
      actions: [
        { text: "Share gratitude", href: "/community/", icon: "💝", primary: true },
        { text: "Read uplifting stories", href: "/articles/", icon: "📖", primary: false }
      ]
    },
    calm: {
      emoji: '😌',
      color: '#06b6d4',
      colorDark: '#0891b2',
      affirmation: "Peace is a beautiful state. Cherish this moment.",
      tipTitle: "Deepen Your Calm",
      tip: "This is the perfect time for mindful activities. Try a short meditation, gentle stretching, or simply sit with a warm drink and appreciate the stillness.",
      actions: [
        { text: "Try meditation", href: "/support/#breathing", icon: "🧘", primary: true },
        { text: "Calming sounds", href: "/resourcelib/", icon: "🎵", primary: false }
      ]
    },
    okay: {
      emoji: '😐',
      color: '#f59e0b',
      colorDark: '#d97706',
      affirmation: "Neutral days are perfectly valid. You're doing fine.",
      tipTitle: "Add a Spark",
      tip: "Sometimes we need a small boost. Try stepping outside for fresh air, listening to upbeat music, or doing one small thing that usually brings you joy.",
      actions: [
        { text: "Quick mood boost", href: "/support/#grounding", icon: "✨", primary: true },
        { text: "Browse resources", href: "/resourcelib/", icon: "📚", primary: false }
      ]
    },
    anxious: {
      emoji: '😰',
      color: '#8b5cf6',
      colorDark: '#7c3aed',
      affirmation: "Your feelings are valid. Let's work through this together.",
      tipTitle: "Grounding Exercise",
      tip: "Try the 5-4-3-2-1 technique: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste. This helps bring you back to the present moment.",
      actions: [
        { text: "Breathing exercise", href: "/support/#breathing", icon: "🌬️", primary: true },
        { text: "Talk to someone", href: "/find-help/", icon: "💬", primary: false }
      ]
    },
    sad: {
      emoji: '😢',
      color: '#3b82f6',
      colorDark: '#2563eb',
      affirmation: "It's okay to feel sad. Every emotion has its place.",
      tipTitle: "Gentle Care",
      tip: "Be gentle with yourself today. Sadness often carries important messages. Consider writing down your thoughts, talking to someone you trust, or simply allowing yourself to rest.",
      actions: [
        { text: "Journaling prompts", href: "/support/#journaling", icon: "📝", primary: true },
        { text: "Read recovery stories", href: "/articles/recovery-stories.html", icon: "💚", primary: false }
      ]
    },
    stressed: {
      emoji: '😤',
      color: '#ef4444',
      colorDark: '#dc2626',
      affirmation: "Stress is temporary. You have the strength to get through this.",
      tipTitle: "Release the Tension",
      tip: "Take a deep breath. In for 4 counts, hold for 4, out for 6. Physical movement can help too — even a 2-minute stretch or walk can release built-up tension.",
      actions: [
        { text: "2-min breathing", href: "/support/#breathing", icon: "🧘", primary: true },
        { text: "Stress resources", href: "/resourcelib/?category=stress", icon: "📖", primary: false }
      ]
    }
  };

  // Daily tips for default state (before mood selection)
  const dailyTips = {
    0: { icon: "🌅", title: "Restful Sunday", text: "Sundays are for recharging. Take time today to do something that truly relaxes you, whether it's reading, nature walks, or simply doing nothing at all." },
    1: { icon: "🧘", title: "Mindful Monday", text: "Start your week with intention. Try a 2-minute breathing exercise before your first task: inhale for 4 counts, hold for 4, exhale for 6." },
    2: { icon: "💪", title: "Strength Tuesday", text: "You've made it through Monday! Celebrate small wins today. Write down three things you accomplished, no matter how small." },
    3: { icon: "🌿", title: "Wellness Wednesday", text: "Midweek check-in: How's your water intake? Aim for 8 glasses. Staying hydrated directly impacts your mood and mental clarity." },
    4: { icon: "🙏", title: "Thankful Thursday", text: "Gratitude rewires your brain for positivity. Name three things you're grateful for right now — they can be as simple as morning coffee." },
    5: { icon: "🎉", title: "Feel-Good Friday", text: "You've almost made it through the week! Plan something small to look forward to this weekend, even if it's just extra sleep." },
    6: { icon: "✨", title: "Self-Care Saturday", text: "Weekends are for recovery. Do one thing today purely for your own enjoyment — no productivity guilt allowed!" }
  };

  // Time-based greetings
  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { text: "Good morning", icon: "🌅" };
    } else if (hour >= 12 && hour < 17) {
      return { text: "Good afternoon", icon: "☀️" };
    } else if (hour >= 17 && hour < 21) {
      return { text: "Good evening", icon: "🌆" };
    } else {
      return { text: "Good night", icon: "🌙" };
    }
  }

  // Get streak from localStorage
  function getStreak() {
    const streakData = localStorage.getItem('wellnessStreak');
    if (!streakData) return { count: 0, lastDate: null };
    
    try {
      const data = JSON.parse(streakData);
      const today = new Date().toDateString();
      const lastDate = new Date(data.lastDate).toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      if (lastDate === today) {
        return data;
      } else if (lastDate === yesterday) {
        return { count: data.count, lastDate: data.lastDate };
      } else {
        return { count: 0, lastDate: null };
      }
    } catch (e) {
      return { count: 0, lastDate: null };
    }
  }

  // Update streak
  function updateStreak() {
    const streak = getStreak();
    const today = new Date().toDateString();
    const lastDate = streak.lastDate ? new Date(streak.lastDate).toDateString() : null;
    
    if (lastDate === today) {
      return streak.count;
    }
    
    const newCount = lastDate === new Date(Date.now() - 86400000).toDateString() 
      ? streak.count + 1 
      : 1;
    
    localStorage.setItem('wellnessStreak', JSON.stringify({
      count: newCount,
      lastDate: new Date().toISOString()
    }));
    
    return newCount;
  }

  // Simulated community mood data (in production, this would come from backend)
  function getCommunityMoods() {
    const stored = sessionStorage.getItem('communityMoods');
    if (stored) {
      return JSON.parse(stored);
    }
    
    const moods = {
      happy: 28 + Math.floor(Math.random() * 10),
      calm: 22 + Math.floor(Math.random() * 8),
      okay: 20 + Math.floor(Math.random() * 10),
      anxious: 12 + Math.floor(Math.random() * 5),
      sad: 8 + Math.floor(Math.random() * 4),
      stressed: 10 + Math.floor(Math.random() * 5)
    };
    
    sessionStorage.setItem('communityMoods', JSON.stringify(moods));
    return moods;
  }

  // Check for reduced motion preference
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Create confetti effect
  function createConfetti(container) {
    if (prefersReducedMotion()) return; // Skip confetti for reduced motion
    
    const colors = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: absolute;
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: -10px;
        opacity: ${Math.random() * 0.7 + 0.3};
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        animation: confetti-fall ${Math.random() * 2 + 2}s ease-out forwards;
      `;
      container.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 3000);
    }
    
    // Add confetti animation if not exists
    if (!document.getElementById('confetti-styles')) {
      const style = document.createElement('style');
      style.id = 'confetti-styles';
      style.textContent = `
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Create calming ripple effect
  function createRipple(container, x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'wellness-checkin__ripple';
    ripple.style.cssText = `
      left: ${x}px;
      top: ${y}px;
      width: 100px;
      height: 100px;
    `;
    container.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 1000);
  }

  // Haptic feedback for mobile
  function hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }
  }

  // Initialize the wellness check-in
  function init() {
    const section = document.querySelector('.wellness-checkin');
    if (!section) return;

    const container = section.querySelector('.wellness-checkin__container');
    const greetingEl = section.querySelector('.wellness-checkin__time-greeting');
    const streakEl = section.querySelector('.wellness-checkin__streak');
    const moodButtons = section.querySelectorAll('.wellness-checkin__mood-btn');
    const responseEl = section.querySelector('.wellness-checkin__response');
    const defaultTipEl = section.querySelector('.wellness-checkin__default-tip');
    const communityBar = section.querySelector('.wellness-checkin__community-bar');
    const confettiCanvas = section.querySelector('.wellness-checkin__confetti');

    // Set time greeting
    if (greetingEl) {
      const greeting = getTimeGreeting();
      const iconSpan = greetingEl.querySelector('.wellness-checkin__time-icon');
      const textSpan = greetingEl.querySelector('span:not(.wellness-checkin__time-icon)');
      if (iconSpan) iconSpan.textContent = greeting.icon;
      if (textSpan) textSpan.textContent = greeting.text;
    }

    // Set streak
    const streak = getStreak();
    if (streakEl) {
      if (streak.count > 0) {
        streakEl.querySelector('.wellness-checkin__streak-count').textContent = streak.count;
        streakEl.style.display = 'inline-flex';
      } else {
        streakEl.style.display = 'none';
      }
    }

    // Set default daily tip
    if (defaultTipEl) {
      const today = new Date().getDay();
      const tip = dailyTips[today];
      const iconEl = defaultTipEl.querySelector('.wellness-checkin__default-tip-icon');
      const titleEl = defaultTipEl.querySelector('.wellness-checkin__default-tip-title');
      const textEl = defaultTipEl.querySelector('.wellness-checkin__default-tip-text');
      
      if (iconEl) iconEl.textContent = tip.icon;
      if (titleEl) titleEl.textContent = tip.title;
      if (textEl) textEl.textContent = tip.text;
    }

    // Set community mood bar
    if (communityBar) {
      const moods = getCommunityMoods();
      const total = Object.values(moods).reduce((a, b) => a + b, 0);
      
      Object.entries(moods).forEach(([mood, count]) => {
        const segment = communityBar.querySelector(`[data-mood="${mood}"]`);
        if (segment) {
          segment.style.width = `${(count / total) * 100}%`;
        }
      });

      // Update legend percentages
      const legend = section.querySelector('.wellness-checkin__community-legend');
      if (legend) {
        Object.entries(moods).forEach(([mood, count]) => {
          const item = legend.querySelector(`[data-mood="${mood}"] .wellness-checkin__legend-percent`);
          if (item) {
            item.textContent = `${Math.round((count / total) * 100)}%`;
          }
        });
      }
    }

    // Mood button click handlers
    moodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        const data = moodData[mood];
        if (!data) return;

        hapticFeedback('medium');

        // Update selected state
        moodButtons.forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');

        // Update streak
        const newStreak = updateStreak();
        if (streakEl) {
          streakEl.querySelector('.wellness-checkin__streak-count').textContent = newStreak;
          streakEl.style.display = 'inline-flex';
        }

        // Show confetti for positive moods
        if (confettiCanvas && (mood === 'happy' || mood === 'calm')) {
          createConfetti(confettiCanvas);
        }

        // Create ripple for anxious/stressed
        if (mood === 'anxious' || mood === 'stressed') {
          const rect = container.getBoundingClientRect();
          const x = btn.getBoundingClientRect().left - rect.left + btn.offsetWidth / 2;
          const y = btn.getBoundingClientRect().top - rect.top + btn.offsetHeight / 2;
          createRipple(container, x, y);
        }

        // Hide default tip, show response
        if (defaultTipEl) defaultTipEl.style.display = 'none';
        
        if (responseEl) {
          // Update content
          const affirmationEl = responseEl.querySelector('.wellness-checkin__affirmation');
          const tipTitleEl = responseEl.querySelector('.wellness-checkin__tip-title');
          const tipTextEl = responseEl.querySelector('.wellness-checkin__tip-text');
          const tipCard = responseEl.querySelector('.wellness-checkin__tip');
          const actionsEl = responseEl.querySelector('.wellness-checkin__actions');

          if (affirmationEl) {
            affirmationEl.innerHTML = `<span>${data.emoji}</span> ${data.affirmation}`;
          }
          if (tipTitleEl) tipTitleEl.textContent = data.tipTitle;
          if (tipTextEl) tipTextEl.textContent = data.tip;
          if (tipCard) tipCard.style.borderLeftColor = data.color;

          // Update actions
          if (actionsEl) {
            actionsEl.innerHTML = data.actions.map(action => `
              <a href="${action.href}" class="wellness-checkin__action-btn wellness-checkin__action-btn--${action.primary ? 'primary' : 'secondary'}">
                <span>${action.icon}</span>
                ${action.text}
              </a>
            `).join('');
          }

          // Update CSS variables for accent colors
          responseEl.style.setProperty('--mood-accent', data.color);
          responseEl.style.setProperty('--mood-accent-dark', data.colorDark);

          // Show response
          responseEl.classList.add('is-visible');
        }

        // Update section background subtly
        section.style.setProperty('--selected-mood-color', data.color);
      });
    });

    console.log('[Wellness Check-In] Initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
