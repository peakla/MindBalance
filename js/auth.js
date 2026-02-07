// ==================== AUTHENTICATION ====================

// --- Supabase Configuration ---
const SUPABASE_URL = "https://cxjqessxarjayqxvhnhs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4anFlc3N4YXJqYXlxeHZobmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjQwOTEsImV4cCI6MjA4MzYwMDA5MX0.SUI4sPOSPxDiGwqwQr19UOKtbK7KmjMqkX6HUT6-yps";

let supabaseClient = null;
let authReady = false;
let currentAuthUser = null;
let authChangeCallbacks = [];

// --- Supabase Client ---
function getSupabase() {
  if (!supabaseClient && typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// --- User Session ---
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

// --- Path Helpers ---
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

// --- Redirect Management ---
function saveRedirectUrl() {
  const currentUrl = window.location.pathname + window.location.search;
  if (!currentUrl.includes('/auth/')) {
    sessionStorage.setItem('auth_redirect', currentUrl);
  }
}

function saveRedirectToProfile() {
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

// --- Auth State Broadcasting ---
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

// --- Auth UI Updates ---
function updateAuthUI(user) {
  const authBtns = document.querySelectorAll('[data-auth-btn]');
  const authPath = getAuthPath();
  
  authBtns.forEach(authBtn => {
    const spanEl = authBtn.querySelector('.span') || authBtn.querySelector('.auth-text') || authBtn.querySelector('span');
    const textTarget = spanEl || authBtn;
    
    authBtn.href = authPath;
    
    if (user) {
      textTarget.textContent = 'Sign Out';
      if (textTarget.hasAttribute('data-translate')) {
        textTarget.setAttribute('data-translate', 'nav_signout');
      }
      authBtn.onclick = (e) => {
        e.preventDefault();
        signOut();
      };
    } else {
      textTarget.textContent = 'Sign In';
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
  
  document.querySelectorAll('[data-auth-show]').forEach(el => {
    if (user) {
      el.style.display = '';
      el.removeAttribute('hidden');
    } else {
      el.style.display = 'none';
      el.setAttribute('hidden', '');
    }
  });
  
  document.querySelectorAll('[data-auth-hide]').forEach(el => {
    if (user) {
      el.style.display = 'none';
      el.setAttribute('hidden', '');
    } else {
      el.style.display = '';
      el.removeAttribute('hidden');
    }
  });
  
  updateUserButton(user);
}

// --- Mobile Logout ---
function handleMobileLogout() {
  signOut();
}

window.handleMobileLogout = handleMobileLogout;

// --- User Button ---
async function updateUserButton(user) {
  const userBtn = document.querySelector('[data-user-btn]');
  if (!userBtn) return;
  
  const icon = userBtn.querySelector('.action-icon');
  
  if (user) {
    userBtn.classList.add('is-signed-in');
    
    userBtn.onclick = null;
    userBtn.href = getProfilePath();
    
    try {
      const sb = getSupabase();
      if (sb) {
        const { data: profile } = await sb
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.avatar_url) {
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
          if (icon) icon.style.display = '';
          const existingAvatar = userBtn.querySelector('.user-avatar');
          if (existingAvatar) existingAvatar.remove();
        }
      }
    } catch (e) {
      console.log('Could not load user avatar');
      if (icon) icon.style.display = '';
    }
  } else {
    userBtn.classList.remove('is-signed-in');
    
    if (icon) icon.style.display = '';
    const avatar = userBtn.querySelector('.user-avatar');
    if (avatar) avatar.remove();
    
    userBtn.onclick = (e) => {
      e.preventDefault();
      saveRedirectToProfile();
      window.location.href = getAuthPath();
    };
  }
}

// --- Auth Initialization ---
function initAuth() {
  const sb = getSupabase();
  if (!sb) return;
  
  initUserMenu();
  
  sb.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    broadcastAuthChange(user);
    updateAuthUI(user);
    updateUserMenuUI(user);
    if (user) {
      logDailyVisit(user.id);
    }
  });
  
  getCurrentUser().then(user => {
    broadcastAuthChange(user);
    updateAuthUI(user);
    updateUserMenuUI(user);
    if (user) {
      logDailyVisit(user.id);
    }
  });
}

// --- Daily Visit Logging ---
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}

// ==================== READING ACTIVITY & STREAK TRACKING ====================

async function logReadingActivity(articleSlug, articleTitle) {
  const sb = getSupabase();
  if (!sb) return null;
  
  const user = await getCurrentUser();
  if (!user) return null;
  
  const today = new Date().toISOString().split('T')[0];
  
  const sessionKey = `reading_logged_${articleSlug}_${today}`;
  if (sessionStorage.getItem(sessionKey)) {
    console.log('Already logged reading for this article today');
    return null;
  }
  
  try {
    const { data: existing } = await sb
      .from('user_engagement')
      .select('articles_read')
      .eq('user_id', user.id)
      .eq('visit_date', today)
      .single();
    
    const currentCount = existing?.articles_read || 0;
    
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
    
    sessionStorage.setItem(sessionKey, 'true');
    
    await updateStreakFromActivity(user.id);
    return data;
  } catch (e) {
    console.error('Error logging reading activity:', e);
    return null;
  }
}

// --- Streak Calculation ---
async function updateStreakFromActivity(userId) {
  const sb = getSupabase();
  if (!sb) return;
  
  try {
    const { data: engagementDays, error } = await sb
      .from('user_engagement')
      .select('visit_date')
      .eq('user_id', userId)
      .order('visit_date', { ascending: false });
    
    if (error || !engagementDays || engagementDays.length === 0) {
      return;
    }
    
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < engagementDays.length; i++) {
      const visitDate = new Date(engagementDays[i].visit_date + 'T00:00:00');
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (visitDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else if (i === 0) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        if (visitDate.getTime() === yesterday.getTime()) {
          currentStreak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    const { data: profile } = await sb
      .from('profiles')
      .select('longest_streak')
      .eq('id', userId)
      .single();
    
    const longestStreak = Math.max(currentStreak, profile?.longest_streak || 0);
    
    await sb
      .from('profiles')
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_visit_date: today.toISOString().split('T')[0]
      })
      .eq('id', userId);
    
    window.dispatchEvent(new CustomEvent('mindbalance:streakupdated', {
      detail: { currentStreak, longestStreak }
    }));
    
  } catch (e) {
    console.error('Error updating streak:', e);
  }
}

// --- Reading Calendar ---
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

// ==================== USER MENU ====================

function toggleUserMenu() {
  const wrapper = document.getElementById('userMenuWrapper');
  const trigger = document.getElementById('userMenuTrigger');
  if (!wrapper) return;
  
  const isActive = wrapper.classList.toggle('active');
  if (trigger) {
    trigger.setAttribute('aria-expanded', isActive);
  }
}

function closeUserMenu() {
  const wrapper = document.getElementById('userMenuWrapper');
  const trigger = document.getElementById('userMenuTrigger');
  if (wrapper) {
    wrapper.classList.remove('active');
  }
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
  }
}

async function handleUserMenuLogout() {
  closeUserMenu();
  await signOut();
  window.location.href = '/';
}

// --- User Menu UI ---
async function updateUserMenuUI(user) {
  const signedInSection = document.querySelector('.user-menu-signed-in');
  const guestSection = document.querySelector('.user-menu-guest');
  const userIcon = document.querySelector('[data-user-icon]');
  const userMenuAvatar = document.getElementById('userMenuAvatar');
  const userMenuName = document.getElementById('userMenuName');
  const userMenuEmail = document.getElementById('userMenuEmail');
  
  if (user) {
    if (signedInSection) signedInSection.style.display = 'block';
    if (guestSection) guestSection.style.display = 'none';
    
    let displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
    let avatarUrl = user.user_metadata?.avatar_url || null;
    
    if (userMenuEmail) userMenuEmail.textContent = user.email || '';
    
    try {
      const sb = getSupabase();
      if (sb) {
        const { data: profile } = await sb
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          if (profile.display_name) displayName = profile.display_name;
          if (profile.avatar_url) avatarUrl = profile.avatar_url;
        }
      }
    } catch (e) {
    }
    
    if (userMenuName) userMenuName.textContent = displayName;
    
    if (userMenuAvatar) {
      userMenuAvatar.src = avatarUrl || '/assets/images/default-avatar.png';
    }
    
    if (userIcon) {
      if (avatarUrl) {
        userIcon.innerHTML = `<img src="${avatarUrl}" alt="${displayName}" class="user-avatar-small">`;
      } else {
        userIcon.innerHTML = '<ion-icon name="person-outline"></ion-icon>';
      }
    }
  } else {
    if (signedInSection) signedInSection.style.display = 'none';
    if (guestSection) guestSection.style.display = 'block';
    
    if (userIcon) {
      userIcon.innerHTML = '<ion-icon name="person-outline"></ion-icon>';
    }
    
    if (userMenuAvatar) {
      userMenuAvatar.src = '/assets/images/default-avatar.png';
    }
    if (userMenuName) userMenuName.textContent = 'User';
    if (userMenuEmail) userMenuEmail.textContent = '';
  }
}

// --- User Menu Initialization ---
function initUserMenu() {
  const trigger = document.getElementById('userMenuTrigger');
  const wrapper = document.getElementById('userMenuWrapper');
  
  if (trigger) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleUserMenu();
    });
  }
  
  document.addEventListener('click', (e) => {
    if (wrapper && !wrapper.contains(e.target)) {
      closeUserMenu();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeUserMenu();
    }
  });
}

// --- Global Exports ---
window.toggleUserMenu = toggleUserMenu;
window.closeUserMenu = closeUserMenu;
window.handleUserMenuLogout = handleUserMenuLogout;

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
  updateStreakFromActivity,
  updateUserMenuUI
};
