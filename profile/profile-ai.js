/* ===== AI WELLNESS INSIGHTS =====*/
/* Fetch and display AI-powered wellness insights in the profile */

(function() {
  'use strict';
  
  let insightsLoaded = false;
  
  // Pool of varied fallback messages to avoid showing the same one
  const FALLBACK_MESSAGES = [
    { message: 'Keep tracking your wellness journey - every step counts!', affirmation: 'You are capable of amazing things.' },
    { message: 'Your dedication to self-care makes a real difference.', affirmation: 'Every day is a chance to grow stronger.' },
    { message: 'Small steps lead to big changes in your wellbeing.', affirmation: 'You have the strength to overcome any challenge.' },
    { message: 'Taking time for yourself is never wasted time.', affirmation: 'Your mental health matters deeply.' },
    { message: 'Progress, not perfection, is what truly matters.', affirmation: 'Be proud of how far you have come.' },
    { message: 'Your commitment to wellness inspires positive change.', affirmation: 'You deserve all the happiness in the world.' },
    { message: 'Checking in with yourself is a powerful habit.', affirmation: 'Today is full of new possibilities.' },
    { message: 'Awareness is the first step toward positive growth.', affirmation: 'You are worthy of love and care.' }
  ];
  
  function getRandomFallback() {
    const index = Math.floor(Math.random() * FALLBACK_MESSAGES.length);
    return FALLBACK_MESSAGES[index];
  }
  
  // Sanitize text to prevent XSS - escape HTML entities
  function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  let retryCount = 0;
  const MAX_RETRIES = 5;
  
  async function loadAIInsights() {
    if (insightsLoaded) return;
    
    const contentEl = document.getElementById('aiInsightsContent');
    const affirmationEl = document.getElementById('aiAffirmation');
    
    if (!contentEl) {
      console.log('[AI Insights] Content element not found');
      return;
    }
    
    // Helper to show fallback content
    function showFallback(message, affirmation, isFinal = true) {
      contentEl.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = message;
      contentEl.appendChild(p);
      if (affirmationEl) {
        affirmationEl.textContent = `"${affirmation}"`;
        affirmationEl.style.display = 'block';
      }
      if (isFinal) {
        insightsLoaded = true;
      }
    }
    
    // Check if Supabase is available - retry if not
    if (!window.supabaseClient) {
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        console.log(`[AI Insights] Waiting for Supabase... (attempt ${retryCount}/${MAX_RETRIES})`);
        setTimeout(loadAIInsights, 1000);
        return;
      }
      console.log('[AI Insights] Supabase not available after retries');
      const fallback = getRandomFallback();
      showFallback(fallback.message, fallback.affirmation);
      return;
    }
    
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) {
        showFallback('Sign in to see your personalized wellness insights.', 'Your journey to wellness starts here.');
        return;
      }
      
      // Fetch user wellness data in parallel
      const [moodResult, goalsResult, profileResult] = await Promise.all([
        window.supabaseClient
          .from('mood_logs')
          .select('mood_level, note, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
        window.supabaseClient
          .from('wellness_goals')
          .select('id, title, category, completed')
          .eq('user_id', user.id),
        window.supabaseClient
          .from('profiles')
          .select('current_streak, longest_streak')
          .eq('id', user.id)
          .single()
      ]);
      
      const moodData = moodResult.data || [];
      const goalsData = goalsResult.data || [];
      const profile = profileResult.data || {};
      
      // Call AI insights API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch('/api/wellness/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mood_data: moodData,
            goals_data: goalsData,
            streak_data: {
              current_streak: profile.current_streak || 0,
              longest_streak: profile.longest_streak || 0
            }
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const result = await response.json();
        
        if (result.success !== false && result.insight) {
          contentEl.innerHTML = '';
          const p = document.createElement('p');
          p.textContent = result.insight;
          contentEl.appendChild(p);
          
          if (result.affirmation && affirmationEl) {
            affirmationEl.textContent = `"${result.affirmation}"`;
            affirmationEl.style.display = 'block';
          }
          insightsLoaded = true;
          console.log('[AI Insights] Successfully loaded personalized insight');
        } else {
          console.log('[AI Insights] API returned no insight, using fallback. Response:', result);
          const fallback = getRandomFallback();
          showFallback(fallback.message, fallback.affirmation);
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        console.log('[AI Insights] API call failed:', fetchErr.message);
        const fallback = getRandomFallback();
        showFallback(fallback.message, fallback.affirmation);
      }
      
    } catch (err) {
      console.error('[AI Insights] Error:', err);
      const fallback = getRandomFallback();
      showFallback(fallback.message, fallback.affirmation);
    }
  }
  
  async function loadMoodAnalysis() {
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return null;
      
      const { data: moodEntries } = await window.supabaseClient
        .from('mood_logs')
        .select('mood_level, note, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      
      const response = await fetch('/api/wellness/mood-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood_entries: moodEntries || [] })
      });
      
      return await response.json();
    } catch (err) {
      console.error('Mood analysis error:', err);
      return null;
    }
  }
  
  async function getGoalSuggestion() {
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return null;
      
      const { data: goals } = await window.supabaseClient
        .from('wellness_goals')
        .select('id, title, category, completed')
        .eq('user_id', user.id);
      
      const currentGoals = (goals || []).filter(g => !g.completed);
      const completedGoals = (goals || []).filter(g => g.completed);
      
      const response = await fetch('/api/wellness/goal-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          current_goals: currentGoals,
          completed_goals: completedGoals
        })
      });
      
      return await response.json();
    } catch (err) {
      console.error('Goal suggestion error:', err);
      return null;
    }
  }
  
  // Display mood analysis in the mood insights section
  async function displayMoodAnalysis() {
    const moodTrendEl = document.getElementById('moodTrendValue');
    if (!moodTrendEl) return;
    
    const result = await loadMoodAnalysis();
    if (result && result.success !== false) {
      // Update the mood trend with AI-powered analysis
      if (result.analysis) {
        moodTrendEl.textContent = result.analysis.split(' ')[0] || 'Stable';
        moodTrendEl.title = result.analysis;
      }
      
      // Show suggestion as a toast or update UI
      if (result.suggestion) {
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'ai-mood-suggestion';
        
        const icon = document.createElement('ion-icon');
        icon.setAttribute('name', 'bulb-outline');
        
        const span = document.createElement('span');
        span.textContent = result.suggestion;
        
        suggestionEl.appendChild(icon);
        suggestionEl.appendChild(span);
        
        const moodInsights = document.getElementById('moodInsights');
        if (moodInsights && !moodInsights.querySelector('.ai-mood-suggestion')) {
          moodInsights.appendChild(suggestionEl);
        }
      }
    }
  }
  
  // Display goal suggestion in the goals section
  async function displayGoalSuggestion() {
    const goalsSection = document.querySelector('.mb-profile__wellness-section:has(.mb-profile__goals-list), .mb-profile__goals-section');
    if (!goalsSection) return;
    
    // Check if suggestion already exists
    if (goalsSection.querySelector('.ai-goal-suggestion')) return;
    
    const result = await getGoalSuggestion();
    if (result && result.success !== false && result.goal) {
      // Build elements safely to prevent XSS
      const suggestionEl = document.createElement('div');
      suggestionEl.className = 'ai-goal-suggestion glass-card';
      
      // Header
      const header = document.createElement('div');
      header.className = 'ai-goal-suggestion__header';
      const headerIcon = document.createElement('ion-icon');
      headerIcon.setAttribute('name', 'sparkles');
      const headerText = document.createElement('span');
      headerText.textContent = 'AI Suggestion';
      header.appendChild(headerIcon);
      header.appendChild(headerText);
      
      // Goal text
      const goalText = document.createElement('p');
      goalText.className = 'ai-goal-suggestion__text';
      goalText.textContent = result.goal;
      
      // Reason
      const reasonText = document.createElement('p');
      reasonText.className = 'ai-goal-suggestion__reason';
      reasonText.textContent = result.why || '';
      
      // Add button with event listener (not inline onclick)
      const addBtn = document.createElement('button');
      addBtn.className = 'ai-goal-suggestion__add';
      const btnIcon = document.createElement('ion-icon');
      btnIcon.setAttribute('name', 'add-outline');
      addBtn.appendChild(btnIcon);
      addBtn.appendChild(document.createTextNode(' Add This Goal'));
      
      // Store goal data safely
      const goalData = {
        title: result.goal,
        category: result.category || 'mindfulness'
      };
      
      addBtn.addEventListener('click', function() {
        window.addSuggestedGoal(goalData.title, goalData.category);
      });
      
      // Assemble
      suggestionEl.appendChild(header);
      suggestionEl.appendChild(goalText);
      suggestionEl.appendChild(reasonText);
      suggestionEl.appendChild(addBtn);
      
      // Insert after the goals header
      const sectionHeader = goalsSection.querySelector('h3');
      if (sectionHeader && sectionHeader.nextSibling) {
        sectionHeader.parentNode.insertBefore(suggestionEl, sectionHeader.nextSibling);
      } else {
        goalsSection.appendChild(suggestionEl);
      }
    }
  }
  
  // Load insights when wellness tab is shown
  function initAIInsights() {
    // Observe wellness tab visibility
    const wellnessTab = document.querySelector('[data-tab="wellness"]');
    if (wellnessTab) {
      wellnessTab.addEventListener('click', () => {
        setTimeout(() => {
          loadAIInsights();
          displayMoodAnalysis();
          displayGoalSuggestion();
        }, 300);
      });
    }
    
    // Also load if wellness panel is already visible
    const wellnessPanel = document.getElementById('wellnessPanel');
    if (wellnessPanel && wellnessPanel.classList.contains('is-active')) {
      setTimeout(() => {
        loadAIInsights();
        displayMoodAnalysis();
        displayGoalSuggestion();
      }, 500);
    }
    
    // Load when profile data is ready
    window.addEventListener('profileLoaded', () => {
      const wellnessPanel = document.getElementById('wellnessPanel');
      if (wellnessPanel && wellnessPanel.classList.contains('is-active')) {
        loadAIInsights();
        displayMoodAnalysis();
        displayGoalSuggestion();
      }
    });
  }
  
  // Global function to add a suggested goal
  window.addSuggestedGoal = async function(title, category) {
    if (!window.supabaseClient) return;
    
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return;
      
      await window.supabaseClient
        .from('wellness_goals')
        .insert({
          user_id: user.id,
          title: title,
          category: category,
          completed: false
        });
      
      // Remove the suggestion element
      const suggestionEl = document.querySelector('.ai-goal-suggestion');
      if (suggestionEl) {
        suggestionEl.remove();
      }
      
      // Reload goals if function exists
      if (typeof window.loadWellnessGoals === 'function') {
        window.loadWellnessGoals();
      }
      
      // Show success feedback
      if (window.ImmersiveProfile?.triggerHaptic) {
        window.ImmersiveProfile.triggerHaptic('medium');
      }
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  };

  
  // Expose functions globally
  window.AIWellness = {
    loadInsights: loadAIInsights,
    getMoodAnalysis: loadMoodAnalysis,
    getGoalSuggestion: getGoalSuggestion
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIInsights);
  } else {
    initAIInsights();
  }
})();
