const MBAnalytics = (function() {
  'use strict';

  let supabaseClient = null;
  let currentUser = null;
  let sessionId = null;
  let pageLoadTime = Date.now();
  let scrollDepth = 0;
  let readingStartTime = null;
  let isTracking = false;

  function getSupabase() {
    if (!supabaseClient && typeof supabase !== 'undefined') {
      const SUPABASE_URL = "https://cxjqessxarjayqxvhnhs.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4anFlc3N4YXJqYXlxeHZobmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjQwOTEsImV4cCI6MjA4MzYwMDA5MX0.SUI4sPOSPxDiGwqwQr19UOKtbK7KmjMqkX6HUT6-yps";
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
  }

  function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function getOrCreateSessionId() {
    let sid = sessionStorage.getItem('mb_session_id');
    if (!sid) {
      sid = generateSessionId();
      sessionStorage.setItem('mb_session_id', sid);
    }
    return sid;
  }

  async function init() {
    sessionId = getOrCreateSessionId();
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      currentUser = data?.session?.user || null;
      
      sb.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
      });
    }
    
    setupScrollTracking();
    setupVisibilityTracking();
    isTracking = true;
    
    trackPageView();
  }

  function setupScrollTracking() {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (docHeight > 0) {
            const currentScroll = window.scrollY;
            const newDepth = Math.round((currentScroll / docHeight) * 100);
            if (newDepth > scrollDepth) {
              scrollDepth = newDepth;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  function setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        saveReadingProgress();
      } else {
        readingStartTime = Date.now();
      }
    });

    window.addEventListener('beforeunload', () => {
      saveReadingProgress();
      trackPageExit();
    });
  }

  async function trackPageView() {
    const pageData = {
      page_url: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer || null,
      timestamp: new Date().toISOString()
    };

    await logActivity('page_view', pageData);
    readingStartTime = Date.now();
  }

  async function trackPageExit() {
    const timeSpent = Math.round((Date.now() - pageLoadTime) / 1000);
    
    await logActivity('page_exit', {
      page_url: window.location.pathname,
      time_spent_seconds: timeSpent,
      scroll_depth: scrollDepth
    });
  }

  async function logActivity(actionType, metadata = {}) {
    if (!currentUser) return;

    const sb = getSupabase();
    if (!sb) return;

    try {
      await sb.from('user_activity_logs').insert({
        user_id: currentUser.id,
        activity_type: actionType,
        page_url: window.location.pathname,
        activity_data: metadata
      });
    } catch (err) {
      console.warn('Analytics log failed:', err);
    }
  }

  async function trackArticleRead(articleId, articleTitle) {
    if (!currentUser) return;

    await logActivity('article_read', {
      article_id: articleId,
      article_title: articleTitle
    });

    await updateReadingProgress(articleId, 0, 0);
    await checkAchievements('article_read');
  }

  async function trackArticleComplete(articleId) {
    if (!currentUser) return;

    const timeSpent = readingStartTime ? Math.round((Date.now() - readingStartTime) / 1000) : 0;

    await logActivity('article_complete', {
      article_id: articleId,
      time_spent_seconds: timeSpent,
      scroll_depth: scrollDepth
    });

    await updateReadingProgress(articleId, 100, timeSpent);
    await checkAchievements('article_complete');
  }

  async function updateReadingProgress(articleSlug, progress, timeSpent) {
    if (!currentUser) return;

    const sb = getSupabase();
    if (!sb) return;

    try {
      const { data: existing } = await sb
        .from('reading_progress')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('article_slug', articleSlug)
        .single();

      if (existing) {
        if (progress > existing.scroll_depth || timeSpent > existing.time_spent_seconds) {
          await sb.from('reading_progress').update({
            scroll_depth: Math.max(progress, existing.scroll_depth),
            time_spent_seconds: Math.max(timeSpent, existing.time_spent_seconds),
            last_read_at: new Date().toISOString(),
            completed: progress >= 90
          }).eq('id', existing.id);
        }
      } else {
        await sb.from('reading_progress').insert({
          user_id: currentUser.id,
          article_slug: articleSlug,
          scroll_depth: progress,
          time_spent_seconds: timeSpent,
          completed: progress >= 90
        });
      }
    } catch (err) {
      console.warn('Reading progress update failed:', err);
    }
  }

  async function saveReadingProgress() {
    const articleId = document.body.dataset.articleId;
    if (!articleId || !currentUser) return;

    const timeSpent = readingStartTime ? Math.round((Date.now() - readingStartTime) / 1000) : 0;
    await updateReadingProgress(articleId, scrollDepth, timeSpent);
  }

  async function trackResourceView(resourceId, resourceTitle) {
    await logActivity('resource_view', {
      resource_id: resourceId,
      resource_title: resourceTitle
    });
  }

  async function trackSearch(query, resultsCount) {
    await logActivity('search', {
      query: query,
      results_count: resultsCount
    });
  }

  async function trackShare(contentType, contentId, platform) {
    await logActivity('share', {
      content_type: contentType,
      content_id: contentId,
      platform: platform
    });
  }

  async function trackMoodEntry(mood, notes) {
    await logActivity('mood_entry', {
      mood: mood,
      has_notes: !!notes
    });
    await checkAchievements('mood_entry');
  }

  async function trackGoalProgress(goalId, progress) {
    await logActivity('goal_progress', {
      goal_id: goalId,
      progress: progress
    });
    if (progress >= 100) {
      await checkAchievements('goal_complete');
    }
  }

  async function trackCommunityAction(actionType, postId) {
    await logActivity('community_' + actionType, {
      post_id: postId
    });
    await checkAchievements('community_' + actionType);
  }

  const ACHIEVEMENTS = [
    { id: 'first_article', name: 'First Steps', description: 'Read your first article', icon: 'book-outline', condition: { action: 'article_read', count: 1 } },
    { id: 'bookworm', name: 'Bookworm', description: 'Read 10 articles', icon: 'library-outline', condition: { action: 'article_read', count: 10 } },
    { id: 'scholar', name: 'Scholar', description: 'Read 25 articles', icon: 'school-outline', condition: { action: 'article_read', count: 25 } },
    { id: 'first_post', name: 'Voice Heard', description: 'Create your first community post', icon: 'chatbubble-outline', condition: { action: 'community_post', count: 1 } },
    { id: 'contributor', name: 'Contributor', description: 'Make 10 community posts', icon: 'chatbubbles-outline', condition: { action: 'community_post', count: 10 } },
    { id: 'first_comment', name: 'Engaged', description: 'Leave your first comment', icon: 'chatbox-outline', condition: { action: 'community_comment', count: 1 } },
    { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame-outline', condition: { action: 'streak', count: 7 } },
    { id: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', icon: 'flame', condition: { action: 'streak', count: 30 } },
    { id: 'mood_tracker', name: 'Self Aware', description: 'Log your mood 7 times', icon: 'happy-outline', condition: { action: 'mood_entry', count: 7 } },
    { id: 'goal_setter', name: 'Goal Setter', description: 'Complete your first goal', icon: 'flag-outline', condition: { action: 'goal_complete', count: 1 } },
    { id: 'achiever', name: 'Achiever', description: 'Complete 5 goals', icon: 'trophy-outline', condition: { action: 'goal_complete', count: 5 } },
    { id: 'explorer', name: 'Explorer', description: 'View 20 different resources', icon: 'compass-outline', condition: { action: 'resource_view', count: 20 } },
    { id: 'social_butterfly', name: 'Social Butterfly', description: 'Follow 10 users', icon: 'people-outline', condition: { action: 'follow', count: 10 } },
    { id: 'early_adopter', name: 'Early Adopter', description: 'Join MindBalance community', icon: 'rocket-outline', condition: { action: 'signup', count: 1 } },
    { id: 'completionist', name: 'Completionist', description: 'Complete 10 articles 100%', icon: 'checkmark-done-outline', condition: { action: 'article_complete', count: 10 } }
  ];

  async function checkAchievements(actionType) {
    if (!currentUser) return;

    const sb = getSupabase();
    if (!sb) return;

    try {
      const { data: existingAchievements } = await sb
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', currentUser.id);

      const earnedIds = (existingAchievements || []).map(a => a.achievement_id);

      const { count: actionCount } = await sb
        .from('user_activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('activity_type', actionType);

      for (const achievement of ACHIEVEMENTS) {
        if (earnedIds.includes(achievement.id)) continue;
        if (achievement.condition.action !== actionType) continue;
        
        if (actionCount >= achievement.condition.count) {
          await unlockAchievement(achievement);
        }
      }
    } catch (err) {
      console.warn('Achievement check failed:', err);
    }
  }

  async function unlockAchievement(achievement) {
    if (!currentUser) return;

    const sb = getSupabase();
    if (!sb) return;

    try {
      await sb.from('user_achievements').insert({
        user_id: currentUser.id,
        achievement_id: achievement.id,
        achievement_name: achievement.name,
        achievement_description: achievement.description,
        achievement_icon: achievement.icon,
        unlocked_at: new Date().toISOString()
      });

      try {
        await sb.from('notifications').insert({
          user_id: currentUser.id,
          type: 'achievement',
          from_user_name: 'MindBalance',
          content: `You earned the "${achievement.name}" badge: ${achievement.description}`,
          read: false
        });
      } catch (notifErr) {
        console.warn('Failed to create achievement notification:', notifErr);
      }

      showAchievementNotification(achievement);
    } catch (err) {
      console.warn('Achievement unlock failed:', err);
    }
  }

  function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'mb-achievement-notification';
    notification.innerHTML = `
      <div class="mb-achievement-notification__icon">
        <ion-icon name="${achievement.icon}"></ion-icon>
      </div>
      <div class="mb-achievement-notification__content">
        <span class="mb-achievement-notification__label">Achievement Unlocked!</span>
        <span class="mb-achievement-notification__name">${achievement.name}</span>
        <span class="mb-achievement-notification__desc">${achievement.description}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 500);
    }, 4000);
  }

  async function getActivityStats(userId, days = 30) {
    const sb = getSupabase();
    if (!sb) return null;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data } = await sb
        .from('user_activity_logs')
        .select('activity_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      return processActivityData(data || [], days);
    } catch (err) {
      console.warn('Failed to get activity stats:', err);
      return null;
    }
  }

  function processActivityData(activities, days) {
    const dailyCounts = {};
    const typeCounts = {};
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dailyCounts[key] = 0;
    }

    activities.forEach(activity => {
      const date = activity.created_at.split('T')[0];
      if (dailyCounts.hasOwnProperty(date)) {
        dailyCounts[date]++;
      }
      typeCounts[activity.activity_type] = (typeCounts[activity.activity_type] || 0) + 1;
    });

    return {
      dailyCounts,
      typeCounts,
      totalActivities: activities.length
    };
  }

  async function getReadingStats(userId) {
    const sb = getSupabase();
    if (!sb) return null;

    try {
      const { data } = await sb
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId);

      const articles = data || [];
      const completed = articles.filter(a => a.completed).length;
      const totalTime = articles.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
      const avgProgress = articles.length > 0 
        ? Math.round(articles.reduce((sum, a) => sum + (a.scroll_depth || 0), 0) / articles.length) 
        : 0;

      return {
        articlesStarted: articles.length,
        articlesCompleted: completed,
        totalReadingTime: totalTime,
        averageProgress: avgProgress
      };
    } catch (err) {
      console.warn('Failed to get reading stats:', err);
      return null;
    }
  }

  async function getAchievements(userId) {
    const sb = getSupabase();
    if (!sb) return { earned: [], available: ACHIEVEMENTS };

    try {
      const [userAchievementsResult, allAchievementsResult] = await Promise.all([
        sb.from('user_achievements')
          .select('*')
          .eq('user_id', userId)
          .order('unlocked_at', { ascending: false }),
        sb.from('achievements')
          .select('*')
      ]);

      const userAchievements = userAchievementsResult.data || [];
      const dbAchievements = allAchievementsResult.data || [];
      
      const dbAchievementMap = {};
      dbAchievements.forEach(a => {
        dbAchievementMap[a.id] = a;
      });

      const earnedIds = userAchievements.map(a => a.achievement_id);
      
      const earned = userAchievements.map(userAchievement => {
        const dbInfo = dbAchievementMap[userAchievement.achievement_id];
        const jsInfo = ACHIEVEMENTS.find(a => a.id === userAchievement.achievement_id);
        return {
          ...userAchievement,
          name: dbInfo?.name || jsInfo?.name || userAchievement.achievement_name || 'Achievement',
          description: dbInfo?.description || jsInfo?.description || userAchievement.achievement_description || '',
          icon: dbInfo?.icon || jsInfo?.icon || userAchievement.achievement_icon || 'trophy-outline'
        };
      });

      const allAvailableIds = new Set([
        ...ACHIEVEMENTS.map(a => a.id),
        ...dbAchievements.map(a => a.id)
      ]);
      
      const available = [];
      allAvailableIds.forEach(id => {
        if (!earnedIds.includes(id)) {
          const dbInfo = dbAchievementMap[id];
          const jsInfo = ACHIEVEMENTS.find(a => a.id === id);
          if (dbInfo || jsInfo) {
            available.push({
              id,
              name: dbInfo?.name || jsInfo?.name || 'Achievement',
              description: dbInfo?.description || jsInfo?.description || '',
              icon: dbInfo?.icon || jsInfo?.icon || 'trophy-outline'
            });
          }
        }
      });

      return {
        earned,
        available
      };
    } catch (err) {
      console.warn('Failed to get achievements:', err);
      return { earned: [], available: ACHIEVEMENTS };
    }
  }

  async function getStreakData(userId, days = 365) {
    const sb = getSupabase();
    if (!sb) return null;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data } = await sb
        .from('user_activity_logs')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      const activeDays = new Set();
      (data || []).forEach(activity => {
        const date = activity.created_at.split('T')[0];
        activeDays.add(date);
      });

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateKey = checkDate.toISOString().split('T')[0];
        
        if (activeDays.has(dateKey)) {
          tempStreak++;
          if (i === 0 || currentStreak > 0) {
            currentStreak = tempStreak;
          }
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 0;
          if (i === 0) currentStreak = 0;
        }
      }

      if (tempStreak > longestStreak) longestStreak = tempStreak;

      return {
        currentStreak,
        longestStreak,
        activeDays: Array.from(activeDays),
        totalActiveDays: activeDays.size
      };
    } catch (err) {
      console.warn('Failed to get streak data:', err);
      return null;
    }
  }

  async function getRecentActivity(userId, limit = 20) {
    const sb = getSupabase();
    if (!sb) return [];

    try {
      const { data } = await sb
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (err) {
      console.warn('Failed to get recent activity:', err);
      return [];
    }
  }

  return {
    init,
    trackArticleRead,
    trackArticleComplete,
    trackResourceView,
    trackSearch,
    trackShare,
    trackMoodEntry,
    trackGoalProgress,
    trackCommunityAction,
    logActivity,
    getActivityStats,
    getReadingStats,
    getAchievements,
    getStreakData,
    getRecentActivity,
    ACHIEVEMENTS
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  MBAnalytics.init();
});
