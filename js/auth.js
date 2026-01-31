const SUPABASE_URL = "https://cxjqessxarjayqxvhnhs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4anFlc3N4YXJqYXlxeHZobmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjQwOTEsImV4cCI6MjA4MzYwMDA5MX0.SUI4sPOSPxDiGwqwQr19UOKtbK7KmjMqkX6HUT6-yps";

let supabaseClient = null;
let authReady = false;
let currentAuthUser = null;
let authChangeCallbacks = [];

function getSupabase() {
  if (!supabaseClient && typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

async function getCurrentUser() {
  const sb = getSupabase();
  if (!sb) return null;
  
  const { data } = await sb.auth.getSession();
  return data?.session?.user || null;
}

async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  
  await sb.auth.signOut();
}

function getAuthPath() {
  const path = window.location.pathname;
  if (path.includes('/blog/') || 
      path.includes('/resourcelib/') ||
      path.includes('/community/') ||
      path.includes('/support/') ||
      path.includes('/auth/') ||
      path.includes('/articles/') ||
      path.includes('/profile/') ||
      path.includes('/find-help/')) {
    return '../auth/';
  }
  return './auth/';
}

function getProfilePath() {
  const path = window.location.pathname;
  if (path.includes('/blog/') || 
      path.includes('/resourcelib/') ||
      path.includes('/community/') ||
      path.includes('/support/') ||
      path.includes('/auth/') ||
      path.includes('/articles/') ||
      path.includes('/find-help/')) {
    return '../profile/';
  }
  if (path.includes('/profile/')) {
    return './';
  }
  return './profile/';
}

function saveRedirectUrl() {
  const currentUrl = window.location.pathname + window.location.search;
  if (!currentUrl.includes('/auth/')) {
    sessionStorage.setItem('auth_redirect', currentUrl);
  }
}

function saveRedirectToProfile() {
  // Set redirect to profile page when user clicks user icon to manage account
  sessionStorage.setItem('auth_redirect', '/profile/');
  sessionStorage.setItem('auth_intent', 'manage_profile');
}

function getRedirectUrl() {
  return sessionStorage.getItem('auth_redirect') || '/';
}

function getAuthIntent() {
  return sessionStorage.getItem('auth_intent') || null;
}

function clearRedirectUrl() {
  sessionStorage.removeItem('auth_redirect');
  sessionStorage.removeItem('auth_intent');
}

function broadcastAuthChange(user) {
  if (currentAuthUser === user && authReady) return;
  
  currentAuthUser = user;
  const wasReady = authReady;
  authReady = true;
  
  authChangeCallbacks.forEach(cb => cb(user));
  
  if (!wasReady) {
    const event = new CustomEvent('mindbalance:authready', {
      detail: { user: user, isSignedIn: !!user }
    });
    window.dispatchEvent(event);
  }
  
  const event = new CustomEvent('mindbalance:authchange', {
    detail: { user: user, isSignedIn: !!user }
  });
  window.dispatchEvent(event);
}

function onAuthReady(callback) {
  if (authReady) {
    callback(currentAuthUser);
  } else {
    const handler = (e) => {
      callback(e.detail.user);
      window.removeEventListener('mindbalance:authready', handler);
    };
    window.addEventListener('mindbalance:authready', handler);
  }
}

function onAuthChange(callback) {
  if (authChangeCallbacks.indexOf(callback) === -1) {
    authChangeCallbacks.push(callback);
  }
  if (authReady) {
    callback(currentAuthUser);
  }
}

function updateAuthUI(user) {
  const authBtns = document.querySelectorAll('[data-auth-btn]');
  const authPath = getAuthPath();
  
  authBtns.forEach(authBtn => {
    const spanEl = authBtn.querySelector('.span') || authBtn.querySelector('.auth-text') || authBtn.querySelector('span');
    const textTarget = spanEl || authBtn;
    
    authBtn.href = authPath;
    
    if (user) {
      textTarget.textContent = 'Sign Out';
      // Update translate attribute so translations don't overwrite our text
      if (textTarget.hasAttribute('data-translate')) {
        textTarget.setAttribute('data-translate', 'nav_signout');
      }
      authBtn.onclick = (e) => {
        e.preventDefault();
        signOut();
      };
    } else {
      textTarget.textContent = 'Sign In';
      // Reset translate attribute for sign in state
      if (textTarget.hasAttribute('data-translate')) {
        textTarget.setAttribute('data-translate', 'nav_signin');
      }
      authBtn.onclick = (e) => {
        e.preventDefault();
        saveRedirectUrl();
        window.location.href = authPath;
      };
    }
  });
  
  // Update user button in navbar to show avatar when signed in
  updateUserButton(user);
}

async function updateUserButton(user) {
  const userBtn = document.querySelector('[data-user-btn]');
  if (!userBtn) return;
  
  const icon = userBtn.querySelector('.action-icon');
  
  if (user) {
    userBtn.classList.add('is-signed-in');
    
    // When logged in, clicking user icon goes directly to profile
    userBtn.onclick = null; // Clear any previous handler
    userBtn.href = getProfilePath();
    
    // Try to get user profile with avatar
    try {
      const sb = getSupabase();
      if (sb) {
        const { data: profile } = await sb
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.avatar_url) {
          // Replace icon with avatar image
          if (icon) icon.style.display = 'none';
          
          let avatar = userBtn.querySelector('.user-avatar');
          if (!avatar) {
            avatar = document.createElement('img');
            avatar.className = 'user-avatar';
            avatar.alt = profile.display_name || 'User';
            userBtn.insertBefore(avatar, userBtn.firstChild);
          }
          avatar.src = profile.avatar_url;
        } else {
          // No avatar, ensure icon is visible and remove any existing avatar
          if (icon) icon.style.display = '';
          const existingAvatar = userBtn.querySelector('.user-avatar');
          if (existingAvatar) existingAvatar.remove();
        }
      }
    } catch (e) {
      console.log('Could not load user avatar');
      // Ensure icon is visible on error
      if (icon) icon.style.display = '';
    }
  } else {
    userBtn.classList.remove('is-signed-in');
    
    // Restore icon
    if (icon) icon.style.display = '';
    const avatar = userBtn.querySelector('.user-avatar');
    if (avatar) avatar.remove();
    
    // When not logged in, clicking user icon should redirect to profile after login
    userBtn.onclick = (e) => {
      e.preventDefault();
      saveRedirectToProfile();
      window.location.href = getAuthPath();
    };
  }
}

function initAuth() {
  const sb = getSupabase();
  if (!sb) return;
  
  sb.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    broadcastAuthChange(user);
    updateAuthUI(user);
    if (user) {
      logDailyVisit(user.id);
    }
  });
  
  getCurrentUser().then(user => {
    broadcastAuthChange(user);
    updateAuthUI(user);
    if (user) {
      logDailyVisit(user.id);
    }
  });
}

async function logDailyVisit(userId) {
  const sb = getSupabase();
  if (!sb || !userId) return;
  
  const today = new Date().toISOString().split('T')[0];
  const sessionKey = `daily_visit_logged_${today}`;
  
  if (sessionStorage.getItem(sessionKey)) {
    return;
  }
  
  try {
    await sb
      .from('user_engagement')
      .upsert({
        user_id: userId,
        visit_date: today,
        articles_read: 0
      }, { 
        onConflict: 'user_id,visit_date',
        ignoreDuplicates: true
      });
    
    sessionStorage.setItem(sessionKey, 'true');
    await updateStreakFromActivity(userId);
  } catch (e) {
    console.warn('Error logging daily visit:', e);
  }
}

// Initialize auth immediately if document is already ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}

// =====================================================
// READING ACTIVITY & STREAK TRACKING
// =====================================================

async function logReadingActivity(articleSlug, articleTitle) {
  const sb = getSupabase();
  if (!sb) return null;
  
  const user = await getCurrentUser();
  if (!user) return null;
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Check if already logged for this article today (to avoid duplicate counts)
  const sessionKey = `reading_logged_${articleSlug}_${today}`;
  if (sessionStorage.getItem(sessionKey)) {
    console.log('Already logged reading for this article today');
    return null;
  }
  
  try {
    // Use upsert with conflict on (user_id, visit_date) unique constraint
    // First, get current count
    const { data: existing } = await sb
      .from('user_engagement')
      .select('articles_read')
      .eq('user_id', user.id)
      .eq('visit_date', today)
      .single();
    
    const currentCount = existing?.articles_read || 0;
    
    // Upsert the engagement record
    const { data, error } = await sb
      .from('user_engagement')
      .upsert({
        user_id: user.id,
        visit_date: today,
        articles_read: currentCount + 1
      }, { 
        onConflict: 'user_id,visit_date'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Mark as logged for this session
    sessionStorage.setItem(sessionKey, 'true');
    
    // Update streak after logging activity
    await updateStreakFromActivity(user.id);
    return data;
  } catch (e) {
    console.error('Error logging reading activity:', e);
    return null;
  }
}

async function updateStreakFromActivity(userId) {
  const sb = getSupabase();
  if (!sb) return;
  
  try {
    // Get user's engagement history ordered by date
    const { data: engagementDays, error } = await sb
      .from('user_engagement')
      .select('visit_date')
      .eq('user_id', userId)
      .order('visit_date', { ascending: false });
    
    if (error || !engagementDays || engagementDays.length === 0) {
      return;
    }
    
    // Calculate streak from consecutive days
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check each day going backwards
    for (let i = 0; i < engagementDays.length; i++) {
      const visitDate = new Date(engagementDays[i].visit_date + 'T00:00:00');
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (visitDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else if (i === 0) {
        // If today is not in the list, check if yesterday was
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        if (visitDate.getTime() === yesterday.getTime()) {
          // Continue checking from yesterday
          currentStreak++;
        } else {
          // Streak is broken
          break;
        }
      } else {
        // Gap in dates - streak is broken
        break;
      }
    }
    
    // Get current profile to check longest streak
    const { data: profile } = await sb
      .from('profiles')
      .select('longest_streak')
      .eq('id', userId)
      .single();
    
    const longestStreak = Math.max(currentStreak, profile?.longest_streak || 0);
    
    // Update profile with new streak values
    await sb
      .from('profiles')
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_visit_date: today.toISOString().split('T')[0]
      })
      .eq('id', userId);
    
    // Dispatch event for real-time UI updates
    window.dispatchEvent(new CustomEvent('mindbalance:streakupdated', {
      detail: { currentStreak, longestStreak }
    }));
    
  } catch (e) {
    console.error('Error updating streak:', e);
  }
}

async function getReadingCalendar(userId, days = 30) {
  const sb = getSupabase();
  if (!sb) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  try {
    const { data, error } = await sb
      .from('user_engagement')
      .select('visit_date, articles_read')
      .eq('user_id', userId)
      .gte('visit_date', startDate.toISOString().split('T')[0])
      .order('visit_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching reading calendar:', e);
    return [];
  }
}

window.MindBalanceAuth = {
  getSupabase,
  getCurrentUser,
  signOut,
  onAuthReady,
  onAuthChange,
  getRedirectUrl,
  clearRedirectUrl,
  saveRedirectUrl,
  isReady: () => authReady,
  getUser: () => currentAuthUser,
  logReadingActivity,
  getReadingCalendar,
  updateStreakFromActivity
};
