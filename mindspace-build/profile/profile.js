// ==================== PROFILE ====================
"use strict";

// --- State ---
let currentUser = null;
let userProfile = null;
let allActivities = [];
let viewedUserId = null;
let isOwnProfile = true;


// --- DOM Helpers ---
function createSafeElement(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Activity Item ---
function createActivityItem(activity) {
  const item = createSafeElement('div', 'mb-activity-item card-animated hover-lift');
  item.dataset.type = activity.type;

  const iconWrap = createSafeElement('div', 'mb-activity-item__icon');
  const icon = document.createElement('ion-icon');
  icon.setAttribute('name', activity.icon);
  iconWrap.appendChild(icon);

  const contentWrap = createSafeElement('div', 'mb-activity-item__content');
  const text = createSafeElement('p', 'mb-activity-item__text');
  const typeLabels = {
    'post': 'You posted',
    'comment': 'You commented',
    'article_read': 'Read article',
    'article_complete': 'Finished reading',
    'page_view': 'Visited',
    'mood_checkin': 'Mood check-in',
    'achievement_unlocked': 'Achievement unlocked',
    'profile_update': 'Updated profile',
    'bookmark': 'Bookmarked',
    'like': 'Liked a post'
  };
  const label = typeLabels[activity.type] || activity.type;
  const showColon = ['post', 'comment'].includes(activity.type) || activity.content !== label;
  const strong = createSafeElement('strong', null, showColon ? label + ': ' : label);
  text.appendChild(strong);
  if (showColon) text.appendChild(document.createTextNode(truncate(activity.content, 100)));

  const time = createSafeElement('span', 'mb-activity-item__time', formatTimeAgo(activity.time));
  contentWrap.appendChild(text);
  contentWrap.appendChild(time);

  item.appendChild(iconWrap);
  item.appendChild(contentWrap);
  return item;
}

// --- Empty State ---
function createEmptyState(iconName, message, linkHref, linkText) {
  const empty = createSafeElement('div', 'mb-profile__empty');
  const icon = document.createElement('ion-icon');
  icon.setAttribute('name', iconName);
  empty.appendChild(icon);
  empty.appendChild(createSafeElement('p', null, message));
  if (linkHref && linkText) {
    const link = createSafeElement('a', null, linkText);
    link.href = linkHref;
    empty.appendChild(link);
  }
  return empty;
}

// --- Liked Post Card ---
function createLikedPost(content, createdAt, likeCount, postId, authorName, authorAvatar) {
  const post = createSafeElement('div', 'mb-liked-post card-animated hover-lift');
  post.onclick = () => window.location.href = `../community/#post-${postId}`;

  const header = createSafeElement('div', 'mb-liked-post__header');

  const avatarWrap = createSafeElement('div', 'mb-liked-post__avatar');
  const avatarImg = document.createElement('img');
  avatarImg.src = authorAvatar || '/assets/images/avatars/avatar1.svg';
  avatarImg.alt = authorName || 'User';
  avatarImg.onerror = () => { avatarImg.src = '/assets/images/avatars/avatar1.svg'; };
  avatarWrap.appendChild(avatarImg);

  const authorInfo = createSafeElement('div', 'mb-liked-post__author-info');
  authorInfo.appendChild(createSafeElement('span', 'mb-liked-post__author-name', authorName || 'Anonymous'));
  authorInfo.appendChild(createSafeElement('span', 'mb-liked-post__time', formatTimeAgo(new Date(createdAt))));

  header.appendChild(avatarWrap);
  header.appendChild(authorInfo);

  const contentWrap = createSafeElement('div', 'mb-liked-post__content');
  contentWrap.appendChild(createSafeElement('p', null, truncate(content, 200)));

  const footer = createSafeElement('div', 'mb-liked-post__footer');

  const stats = createSafeElement('div', 'mb-liked-post__stats');
  const heartIcon = document.createElement('ion-icon');
  heartIcon.setAttribute('name', 'heart');
  stats.appendChild(heartIcon);
  stats.appendChild(createSafeElement('span', null, ` ${likeCount || 0}`));

  const viewLink = createSafeElement('span', 'mb-liked-post__view', 'View post');
  const arrowIcon = document.createElement('ion-icon');
  arrowIcon.setAttribute('name', 'arrow-forward-outline');
  viewLink.appendChild(arrowIcon);

  footer.appendChild(stats);
  footer.appendChild(viewLink);

  post.appendChild(header);
  post.appendChild(contentWrap);
  post.appendChild(footer);
  return post;
}

// --- Goal Item ---
function createGoalItem(goal) {
  const item = createSafeElement('div', 'mb-profile__goal-item');


  const categoryIcons = {
    'mindfulness': 'leaf-outline',
    'exercise': 'fitness-outline',
    'sleep': 'moon-outline',
    'social': 'people-outline',
    'reading': 'book-outline',
    'other': 'star-outline'
  };

  const check = createSafeElement('div', 'goal-check');
  if (goal.completed) {
    check.classList.add('completed');
    const checkIcon = document.createElement('ion-icon');
    checkIcon.setAttribute('name', 'checkmark');
    check.appendChild(checkIcon);
  }
  check.onclick = () => window.toggleGoalComplete(goal.id, !goal.completed);

  const info = createSafeElement('div', 'goal-info');
  info.appendChild(createSafeElement('div', 'goal-title', goal.title));


  const categoryEl = createSafeElement('div', 'goal-category');
  const catIcon = document.createElement('ion-icon');
  catIcon.setAttribute('name', categoryIcons[goal.category] || 'star-outline');
  categoryEl.appendChild(catIcon);
  categoryEl.appendChild(document.createTextNode(goal.category.charAt(0).toUpperCase() + goal.category.slice(1)));
  info.appendChild(categoryEl);

  const deleteBtn = createSafeElement('button', 'goal-delete');
  const trashIcon = document.createElement('ion-icon');
  trashIcon.setAttribute('name', 'trash-outline');
  deleteBtn.appendChild(trashIcon);
  deleteBtn.onclick = () => window.deleteGoal(goal.id);

  item.appendChild(check);
  item.appendChild(info);
  item.appendChild(deleteBtn);
  return item;
}

// --- Badge ---
function createBadge(achievement, isUnlocked) {
  const badge = createSafeElement('div', 'mb-profile__badge card-animated hover-lift');
  if (isUnlocked) {
    badge.classList.add('unlocked');
  } else {
    badge.classList.add('locked');
  }


  if (!isUnlocked) {
    const lockIcon = document.createElement('ion-icon');
    lockIcon.setAttribute('name', 'lock-closed');
    lockIcon.className = 'badge-lock-icon';
    badge.appendChild(lockIcon);
  }


  const iconWrap = createSafeElement('div', 'mb-profile__badge-icon');
  const trophyIcon = document.createElement('ion-icon');
  trophyIcon.setAttribute('name', 'trophy');
  iconWrap.appendChild(trophyIcon);

  badge.appendChild(iconWrap);
  badge.appendChild(createSafeElement('h4', null, achievement.name || 'Achievement'));
  badge.appendChild(createSafeElement('p', null, achievement.description || ''));
  badge.appendChild(createSafeElement('div', 'badge-points', `+${achievement.points || 0} pts`));

  return badge;
}

// --- Mood Bar ---
function createMoodBar(mood) {
  const bar = createSafeElement('div', 'mood-bar');
  const moodEmojis = ['😢', '😔', '😐', '😊', '😄'];
  const moodValue = mood.mood_value || 3;

  const barEl = createSafeElement('div', 'bar');
  barEl.style.height = `${moodValue * 20}px`;
  barEl.title = mood.note || '';
  bar.appendChild(barEl);
  bar.appendChild(createSafeElement('div', 'date', new Date(mood.logged_at).toLocaleDateString('en-US', { weekday: 'short' })));

  return bar;
}

// --- Saved Article Card ---
function createSavedArticleCard(article) {
  const card = createSafeElement('div', 'mb-profile__saved-card card-animated hover-lift');

  const link = document.createElement('a');
  const slug = (article.article_slug || '').replace(/[^a-zA-Z0-9-]/g, '');
  link.href = `/articles/${slug}.html`;
  link.className = 'saved-card-link';

  const imgUrl = article.article_image || article.article_thumbnail;
  if (imgUrl) {
    if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://') || imgUrl.startsWith('/')) {
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = article.article_title || 'Article';
      img.onerror = () => img.style.display = 'none';
      link.appendChild(img);
    }
  }

  const body = createSafeElement('div', 'card-body');
  body.appendChild(createSafeElement('span', 'saved-category', article.article_category || 'Article'));
  body.appendChild(createSafeElement('h4', null, article.article_title || 'Untitled'));
  body.appendChild(createSafeElement('span', 'saved-date', `Saved ${formatTimeAgo(new Date(article.saved_at))}`));

  link.appendChild(body);
  card.appendChild(link);
  return card;
}

// --- Supabase Client ---
function getSupabaseClient() {
  if (typeof getSupabase === 'function') {
    return getSupabase();
  }
  return null;
}


// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {

  const urlParams = new URLSearchParams(window.location.search);
  viewedUserId = urlParams.get('user');

  setupTabs();
  setupPhotoUpload();
  setupEditProfile();
  setupSettings();
  setupActivityFilters();
  setupThemePicker();
  setupMoodSelector();
  setupGoals();
  setupSocialLinks();
  setupPrivacySettings();

  function handleAuth(user) {
    currentUser = user;


    if (viewedUserId) {
      isOwnProfile = user && user.id === viewedUserId;
    } else {
      isOwnProfile = true;
      viewedUserId = user ? user.id : null;
    }


    window.isOwnProfile = isOwnProfile;

    if (viewedUserId) {

      showProfileView();
      applyViewMode();
      loadProfileData(viewedUserId);
      loadActivityData(viewedUserId);
      loadFollowerCountsData(viewedUserId);
      loadReputationPointsData(viewedUserId);


      if (typeof ProfileAnalytics !== 'undefined') {
        ProfileAnalytics.init(viewedUserId);
      }


      if (!isOwnProfile && currentUser) {
        checkFollowStatus();
      }
    } else if (!user) {

      showGuestView();
    }
  }

  function waitForAuth() {
    if (typeof onAuthReady === 'function') {
      onAuthReady(handleAuth);

      if (typeof onAuthChange === 'function') {
        onAuthChange((user) => {
          currentUser = user;
          if (viewedUserId) {
            isOwnProfile = user && user.id === viewedUserId;
            window.isOwnProfile = isOwnProfile;
            applyViewMode();
            if (!isOwnProfile && currentUser) {
              checkFollowStatus();
            }
          } else if (user) {
            isOwnProfile = true;
            window.isOwnProfile = isOwnProfile;
            viewedUserId = user.id;
            showProfileView();
            applyViewMode();
            loadProfileData(user.id);
            loadActivityData(user.id);
            loadFollowerCountsData(user.id);
            loadReputationPointsData(user.id);


            if (typeof ProfileAnalytics !== 'undefined') {
              ProfileAnalytics.init(user.id);
            }
          } else {
            showGuestView();
          }
        });
      }
    } else {
      window.addEventListener('mindspace:authready', (e) => {
        handleAuth(e.detail.user);
      });
    }
  }

  waitForAuth();
});



// ==================== VIEW MODE ====================
function applyViewMode() {
  const editElements = document.querySelectorAll('.mb-profile__edit-btn, .mb-profile__cover-edit, .mb-profile__avatar-edit');
  const followBtnContainer = document.getElementById('followBtnContainer');
  const shareBtn = document.getElementById('shareProfileBtn');
  const viewPublicBtn = document.getElementById('viewPublicBtn');

  if (isOwnProfile) {

    editElements.forEach(el => el.style.display = '');
    if (followBtnContainer) followBtnContainer.style.display = 'none';
    if (shareBtn) shareBtn.style.display = 'inline-flex';
    if (viewPublicBtn) viewPublicBtn.style.display = 'inline-flex';


    document.querySelectorAll('.mb-profile__tab').forEach(tab => {
      tab.style.display = '';
    });
  } else {

    editElements.forEach(el => el.style.display = 'none');
    if (followBtnContainer) followBtnContainer.style.display = 'inline-flex';
    if (shareBtn) shareBtn.style.display = 'none';
    if (viewPublicBtn) viewPublicBtn.style.display = 'none';


    const settingsTab = document.querySelector('[data-tab="settings"]');
    const wellnessTab = document.querySelector('[data-tab="wellness"]');
    const likedPostsTab = document.querySelector('[data-tab="liked-posts"]');
    const savedTab = document.querySelector('[data-tab="saved"]');
    if (settingsTab) settingsTab.style.display = 'none';
    if (wellnessTab) wellnessTab.style.display = 'none';
    if (likedPostsTab) likedPostsTab.style.display = 'none';
    if (savedTab) savedTab.style.display = 'none';


    checkFollowStatus();
  }
}

function showGuestView() {

  if (viewedUserId && !isOwnProfile) {
    showProfileView();
    applyViewMode();
    loadProfileData(viewedUserId);
    loadActivityData(viewedUserId);
    loadFollowerCountsData(viewedUserId);
    loadReputationPointsData(viewedUserId);
  } else {

    window.location.href = '../auth/';
  }
}

function showProfileView() {
  document.getElementById('guestView').style.display = 'none';
  document.getElementById('profileView').style.display = 'block';
}



// ==================== DATA LOADING ====================
async function loadProfile() {
  if (currentUser) {
    loadProfileData(currentUser.id);
  }
}

async function loadProfileData(userId) {
  if (!userId) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;


  if (isOwnProfile && currentUser) {
    document.getElementById('profileEmail').textContent = currentUser.email || '';
  } else {
    document.getElementById('profileEmail').textContent = '';
  }


  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profile) {
    userProfile = profile;

    window.userProfile = profile;
    window.isOwnProfile = isOwnProfile;
    document.getElementById('profileName').textContent = profile.display_name || profile.username || 'User';
    document.getElementById('profileBio').textContent = profile.bio || 'No bio yet...';

    const avatarImg = document.getElementById('avatarImg');
    if (profile.avatar_url) {
      avatarImg.src = profile.avatar_url;
      avatarImg.style.display = '';
      const initialsEl = document.getElementById('avatarInitials');
      if (initialsEl) initialsEl.style.display = 'none';
    } else {
      const name = profile.display_name || profile.username || profile.email || 'U';
      const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || name.substring(0, 2).toUpperCase();
      const colors = ['#2068A8','#E57373','#64B5F6','#81C784','#FFD54F','#BA68C8','#4DB6AC','#FF8A65','#90A4AE','#A1887F'];
      const colorIndex = name.charCodeAt(0) % colors.length;
      let initialsEl = document.getElementById('avatarInitials');
      if (!initialsEl) {
        initialsEl = document.createElement('div');
        initialsEl.id = 'avatarInitials';
        initialsEl.className = 'mb-profile__avatar-initials';
        avatarImg.parentElement.appendChild(initialsEl);
      }
      initialsEl.textContent = initials;
      initialsEl.style.background = colors[colorIndex];
      initialsEl.style.display = 'flex';
      avatarImg.style.display = 'none';
    }

    if (profile.cover_url) {
      document.getElementById('coverPhoto').style.backgroundImage = `url(${profile.cover_url})`;
    } else {
      const localCover = localStorage.getItem('profile_cover_url');
      if (localCover && isOwnProfile) {
        document.getElementById('coverPhoto').style.backgroundImage = `url(${localCover})`;
      }
    }


    document.getElementById('settingsName').value = profile.display_name || '';
    document.getElementById('settingsBio').value = profile.bio || '';


    if (profile.theme_color) {
      applyThemeColor(profile.theme_color);
      const colorBtns = document.querySelectorAll('.mb-profile__color-btn');
      colorBtns.forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.color === profile.theme_color);
      });
    }


    if (profile.social_links) {
      let links;
      try {
        links = typeof profile.social_links === 'string' ? JSON.parse(profile.social_links) : profile.social_links;
      } catch (e) {
        links = {};
      }
      if (links.website) {
        document.getElementById('settingsWebsite').value = links.website;
        const websiteLink = document.getElementById('socialWebsite');
        const websiteUrl = links.website.startsWith('http') ? links.website : 'https://' + links.website;
        try {
          const parsed = new URL(websiteUrl);
          if (['http:', 'https:'].includes(parsed.protocol)) {
            websiteLink.href = parsed.href;
            websiteLink.hidden = false;
          }
        } catch (e) {}
      }
      if (links.twitter) {
        document.getElementById('settingsTwitter').value = links.twitter;
        const twitterLink = document.getElementById('socialTwitter');
        const handle = links.twitter.replace(/[^a-zA-Z0-9_]/g, '');
        if (handle) {
          twitterLink.href = 'https://twitter.com/' + handle;
          twitterLink.hidden = false;
        }
      }
      if (links.instagram) {
        document.getElementById('settingsInstagram').value = links.instagram;
        const instaLink = document.getElementById('socialInstagram');
        const handle = links.instagram.replace(/[^a-zA-Z0-9_.]/g, '');
        if (handle) {
          instaLink.href = 'https://instagram.com/' + handle;
          instaLink.hidden = false;
        }
      }
    }


    updateSocialLinksVisibility();


    updateProfileCompletion(profile);


    document.getElementById('publicProfile').checked = profile.is_public !== false;
    document.getElementById('showActivity').checked = profile.show_activity !== false;
    document.getElementById('showSaved').checked = profile.show_saved === true;


    const streakNumberEl = document.getElementById('streakNumber');
    if (streakNumberEl) streakNumberEl.textContent = profile.current_streak || 0;
    document.getElementById('bestStreak').textContent = profile.longest_streak || 0;


    if (profile.reputation_points) {
      document.getElementById('reputationPoints').textContent = profile.reputation_points;
    }
  } else if (isOwnProfile && currentUser) {

    document.getElementById('profileName').textContent = 'New User';


    await supabaseClient.from('profiles').upsert({
      id: currentUser.id,
      username: currentUser.email?.split('@')[0] || 'user',
      created_at: new Date().toISOString()
    });


    profile = { id: currentUser.id, display_name: null };
  } else {

    document.getElementById('profileName').textContent = 'User';
  }


  loadStatsData(userId);


  if (isOwnProfile) {
    setupRealtimeSubscriptions(userId);


    const needsOnboarding = !profile?.display_name || profile.display_name.trim() === '';
    if (needsOnboarding) {
      showOnboardingModal();
    }
  }
}


// --- Stats ---
async function loadStats() {
  if (currentUser) {
    loadStatsData(currentUser.id);
  }
}

async function loadStatsData(userId) {
  if (!userId) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;


  const { count: postCount } = await supabaseClient
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId);


  const { count: commentCount } = await supabaseClient
    .from('post_comments')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId);


  const { count: likeCount } = await supabaseClient
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  document.getElementById('postCount').textContent = postCount || 0;
  document.getElementById('commentCount').textContent = commentCount || 0;
  document.getElementById('likeCount').textContent = likeCount || 0;
}


// --- Activity ---
async function loadActivity() {
  if (currentUser) {
    loadActivityData(currentUser.id);
  }
}

async function loadActivityData(userId) {
  if (!userId) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const activityFeed = document.getElementById('activityFeed');

  const [postsRes, commentsRes, logsRes] = await Promise.all([
    supabaseClient
      .from('posts')
      .select('id, content, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseClient
      .from('post_comments')
      .select('id, content, created_at, post_id')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseClient
      .from('user_activity_logs')
      .select('id, activity_type, page_url, activity_data, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
  ]);

  const posts = postsRes.data;
  const comments = commentsRes.data;
  const activityLogs = logsRes.data;

  const activities = [];

  if (posts) {
    posts.forEach(post => {
      activities.push({
        type: 'post',
        content: post.content,
        time: new Date(post.created_at),
        icon: 'create-outline'
      });
    });
  }

  if (comments) {
    comments.forEach(comment => {
      activities.push({
        type: 'comment',
        content: comment.content,
        time: new Date(comment.created_at),
        icon: 'chatbubble-outline'
      });
    });
  }

  if (activityLogs) {
    const hiddenTypes = ['page_view', 'page_exit'];
    const activityConfig = {
      'article_read': { icon: 'book-outline', label: 'Read article' },
      'article_complete': { icon: 'checkmark-done-outline', label: 'Finished reading' },
      'mood_checkin': { icon: 'happy-outline', label: 'Mood check-in' },
      'mood_entry': { icon: 'happy-outline', label: 'Mood check-in' },
      'achievement_unlocked': { icon: 'trophy-outline', label: 'Achievement unlocked' },
      'profile_update': { icon: 'person-outline', label: 'Updated profile' },
      'bookmark': { icon: 'bookmark-outline', label: 'Bookmarked' },
      'like': { icon: 'heart-outline', label: 'Liked a post' },
      'resource_view': { icon: 'folder-open-outline', label: 'Viewed resource' },
      'search': { icon: 'search-outline', label: 'Searched' },
      'share': { icon: 'share-social-outline', label: 'Shared' },
      'community_post': { icon: 'chatbubble-outline', label: 'Posted in community' },
      'community_comment': { icon: 'chatbox-outline', label: 'Commented' },
      'community_like': { icon: 'heart-outline', label: 'Liked a post' },
      'follow': { icon: 'person-add-outline', label: 'Followed someone' }
    };
    activityLogs.forEach(log => {
      const logType = log.activity_type || log.action_type || '';
      if (hiddenTypes.includes(logType)) return;
      const config = activityConfig[logType] || { icon: 'ellipse-outline', label: logType.replace(/_/g, ' ') };
      let desc = config.label;
      try {
        const rawData = log.activity_data || log.metadata;
        if (rawData) {
          const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          if (data.article_title) desc += ': ' + data.article_title;
          else if (data.mood) desc += ': ' + data.mood;
          else if (data.badge_name) desc += ': ' + data.badge_name;
          else if (data.resource_title) desc += ': ' + data.resource_title;
          else if (data.query) desc += ': "' + data.query + '"';
        }
      } catch (e) {}
      activities.push({
        type: logType,
        content: desc,
        time: new Date(log.created_at),
        icon: config.icon
      });
    });
  }


  activities.sort((a, b) => b.time - a.time);


  allActivities = activities;

  if (activities.length === 0) {
    activityFeed.innerHTML = '';
    if (isOwnProfile) {
      activityFeed.appendChild(createEmptyState('newspaper-outline', 'No activity yet', '../community/', 'Join the conversation'));
    } else {
      const viewedName = document.getElementById('profileName')?.textContent || 'This user';
      activityFeed.appendChild(createEmptyState('newspaper-outline', viewedName + ' has no activity yet', null, null));
    }
    return;
  }

  activityFeed.innerHTML = '';
  activities.slice(0, 10).forEach(activity => {
    activityFeed.appendChild(createActivityItem(activity));
  });
}

// --- Helpers ---
function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString();
}


// ==================== UI SETUP ====================
function setupTabs() {
  const tabs = document.querySelectorAll('.mb-profile__tab');
  const panels = document.querySelectorAll('.mb-profile__panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;


      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');


      panels.forEach(panel => {
        panel.classList.remove('is-active');
        if (panel.id === `${targetTab}Panel`) {
          panel.classList.add('is-active');
        }
      });


      if (targetTab === 'liked') {
        loadLikedPosts();
      } else if (targetTab === 'achievements') {
        loadAchievements();
      } else if (targetTab === 'wellness') {
        loadMoodHistory();
        loadGoals();
        loadStreak();
      } else if (targetTab === 'saved') {
        loadSavedArticles();
      }
    });
  });
}

// --- Photo Upload ---
function setupPhotoUpload() {
  const avatarBtn = document.getElementById('editAvatarBtn');
  const avatarInput = document.getElementById('avatarInput');
  const coverBtn = document.getElementById('editCoverBtn');
  const coverInput = document.getElementById('coverInput');
  const avatarPicker = document.getElementById('avatarPicker');
  const closePickerBtn = document.getElementById('closeAvatarPicker');
  const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
  const presetButtons = document.querySelectorAll('.mb-avatar-preset');

  avatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (avatarPicker) {
      avatarPicker.hidden = !avatarPicker.hidden;
    }
  });

  closePickerBtn?.addEventListener('click', () => {
    if (avatarPicker) avatarPicker.hidden = true;
  });

  uploadAvatarBtn?.addEventListener('click', () => {
    avatarInput?.click();
    if (avatarPicker) avatarPicker.hidden = true;
  });

  presetButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const avatarId = btn.dataset.avatar;
      if (!avatarId || !currentUser) return;

      const avatarUrl = `/assets/images/avatars/${avatarId}.svg`;

      presetButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      await setPresetAvatar(avatarUrl);
      if (avatarPicker) avatarPicker.hidden = true;
    });
  });

  avatarPicker?.addEventListener('click', (e) => {
    if (e.target === avatarPicker) {
      avatarPicker.hidden = true;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && avatarPicker && !avatarPicker.hidden) {
      avatarPicker.hidden = true;
      avatarBtn?.focus();
    }
  });

  coverBtn?.addEventListener('click', () => coverInput?.click());

  avatarInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    await uploadPhoto(file, 'avatar');
  });

  coverInput?.addEventListener('change', async (e) => {
    console.log('Cover input change event triggered');
    const file = e.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }
    if (!currentUser) {
      console.log('No current user - cannot upload');
      ToastManager.warning('Please log in to upload a cover photo.');
      return;
    }
    console.log('Cover file selected:', file.name, file.size, file.type);
    await uploadPhoto(file, 'cover');
  });
}

async function setPresetAvatar(avatarUrl) {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient || !currentUser) return;

  try {
    await supabaseClient
      .from('profiles')
      .upsert({
        id: currentUser.id,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    document.getElementById('avatarImg').src = avatarUrl;


    if (!userProfile) {
      userProfile = { id: currentUser.id };
    }
    userProfile.avatar_url = avatarUrl;
    updateProfileCompletion(userProfile);
  } catch (error) {
    console.error('Error setting preset avatar:', error);
    ToastManager.error('Failed to set avatar. Please try again.');
  }
}

// --- File Upload ---
async function uploadPhoto(file, type) {
  console.log('uploadPhoto called:', { type, fileName: file?.name, fileSize: file?.size });

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    console.error('Supabase client not available');
    ToastManager.error('Unable to connect to server. Please refresh and try again.');
    return;
  }
  if (!currentUser) {
    console.error('No current user - not logged in');
    ToastManager.warning('Please log in to upload photos.');
    return;
  }

  const fileExt = file.name.split('.').pop().toLowerCase();
  const fileName = `${currentUser.id}_${type}_${Date.now()}.${fileExt}`;
  const filePath = `${type}s/${fileName}`;

  console.log('Uploading to storage:', { bucket: 'avatars', filePath });


  const { data, error } = await supabaseClient.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (error) {
    console.error('Storage upload error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    ToastManager.error(`Failed to upload photo: ${error.message || 'Unknown error'}. Please try again.`);
    return;
  }

  console.log('Upload successful:', data);


  const { data: { publicUrl } } = supabaseClient.storage
    .from('avatars')
    .getPublicUrl(filePath);


  const updateField = type === 'avatar' ? 'avatar_url' : 'cover_url';
  console.log('Saving to database:', { updateField, publicUrl });


  const { data: updateData, error: updateError } = await supabaseClient
    .from('profiles')
    .update({
      [updateField]: publicUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentUser.id)
    .select();

  console.log('Update result:', { updateData, updateError });


  if (updateError) {
    console.error('Database update error (possible RLS policy issue):', updateError);
    console.error('Update error details:', JSON.stringify(updateError, null, 2));


    if (updateError.code === '42501' || updateError.message?.includes('policy')) {
      ToastManager.error('Permission denied. Please check database permissions.');
      return;
    }

    if (updateError.code === '42703' && type === 'cover') {
      console.warn('cover_url column missing from profiles table');
      if (type === 'cover') {
        document.getElementById('coverPhoto').style.backgroundImage = `url(${publicUrl})`;
        localStorage.setItem('profile_cover_url', publicUrl);
        ToastManager.info('Cover photo updated locally. Database column pending setup.');
      }
      return;
    }

    ToastManager.error(`Failed to update profile: ${updateError.message || 'Unknown error'}. Please try again.`);
    return;
  }


  if (!updateData || updateData.length === 0) {
    console.log('No existing profile found, trying insert...');
    const { error: insertError } = await supabaseClient
      .from('profiles')
      .insert({
        id: currentUser.id,
        [updateField]: publicUrl,
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError, null, 2));


      if (insertError.code === '42501' || insertError.message?.includes('policy')) {
        ToastManager.error('Permission denied. Please check database permissions.');
        return;
      }


      if (insertError.code === '23505') {
        ToastManager.error('Profile exists but update was blocked. Please contact support.');
        return;
      }

      ToastManager.error(`Failed to save photo to profile: ${insertError.message || 'Unknown error'}. Please try again.`);
      return;
    }
    console.log('Insert successful');
  } else {
    console.log('Update successful');
  }


  if (!userProfile) {
    userProfile = { id: currentUser.id };
  }
  userProfile[updateField] = publicUrl;


  if (type === 'avatar') {
    document.getElementById('avatarImg').src = publicUrl;
  } else {
    document.getElementById('coverPhoto').style.backgroundImage = `url(${publicUrl})`;
  }


  updateProfileCompletion(userProfile);
}

// --- Edit Profile ---
function setupEditProfile() {
  const editBtn = document.getElementById('editProfileBtn');
  const modal = document.getElementById('editModal');
  const closeButtons = modal?.querySelectorAll('[data-close-modal]');
  const saveBtn = document.getElementById('saveProfileBtn');

  editBtn?.addEventListener('click', () => {
    document.getElementById('editName').value = userProfile?.display_name || '';
    document.getElementById('editBio').value = userProfile?.bio || '';
    modal.hidden = false;
  });

  closeButtons?.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.hidden = true;
    });
  });

  saveBtn?.addEventListener('click', async () => {
    const name = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();

    if (!currentUser) return;

    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return;


    const { error } = await supabaseClient
      .from('profiles')
      .upsert({
        id: currentUser.id,
        display_name: name,
        bio: bio,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Save error:', error);
      ToastManager.error('Failed to save profile. Please try again.');
      return;
    }

    document.getElementById('profileName').textContent = name || 'User';
    document.getElementById('profileBio').textContent = bio || 'No bio yet...';
    document.getElementById('settingsName').value = name;
    document.getElementById('settingsBio').value = bio;

    userProfile = { ...userProfile, display_name: name, bio: bio };
    window.userProfile = userProfile;


    updateProfileCompletion(userProfile);


    if (window.MindSpaceImmersive?.updateGreeting) {
      window.MindSpaceImmersive.updateGreeting();
    }

    modal.hidden = true;
  });
}

// --- Settings ---
function setupSettings() {
  const saveBtn = document.getElementById('saveSettingsBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  saveBtn?.addEventListener('click', async () => {
    const name = document.getElementById('settingsName').value.trim();
    const bio = document.getElementById('settingsBio').value.trim();

    if (!currentUser) return;

    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return;


    const { error } = await supabaseClient
      .from('profiles')
      .upsert({
        id: currentUser.id,
        display_name: name,
        bio: bio,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Save error:', error);
      ToastManager.error('Failed to save settings. Please try again.');
      return;
    }

    document.getElementById('profileName').textContent = name || 'User';
    document.getElementById('profileBio').textContent = bio || 'No bio yet...';

    userProfile = { ...userProfile, display_name: name, bio: bio };
    window.userProfile = userProfile;


    updateProfileCompletion(userProfile);


    if (window.MindSpaceImmersive?.updateGreeting) {
      window.MindSpaceImmersive.updateGreeting();
    }

    ToastManager.success('Settings saved!');
  });

  logoutBtn?.addEventListener('click', async () => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      window.location.href = '../';
      return;
    }
    await supabaseClient.auth.signOut();
    window.location.href = '../';
  });
}



// ==================== SOCIAL FEATURES ====================
async function loadFollowerCounts() {
  if (currentUser) {
    loadFollowerCountsData(currentUser.id);
  }
}

async function loadFollowerCountsData(userId) {
  if (!userId) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const { count: followerCount } = await supabaseClient
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  const { count: followingCount } = await supabaseClient
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  document.getElementById('followerCount').textContent = followerCount || 0;
  document.getElementById('followingCount').textContent = followingCount || 0;
}

// --- Liked Posts ---
async function loadLikedPosts() {
  if (!currentUser) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const likedContainer = document.getElementById('likedPosts');

  const { data: likes, error } = await supabaseClient
    .from('post_likes')
    .select('post_id, created_at, posts(id, content, author_id, created_at, like_count)')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    const { data: altLikes } = await supabaseClient
      .from('likes')
      .select('post_id, created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!altLikes || altLikes.length === 0) {
      likedContainer.innerHTML = '';
      likedContainer.appendChild(createEmptyState('heart-outline', 'No liked posts yet', '../community/', 'Explore the community'));
      return;
    }

    const postIds = altLikes.map(l => l.post_id).filter(Boolean);
    if (postIds.length === 0) {
      likedContainer.innerHTML = '';
      likedContainer.appendChild(createEmptyState('heart-outline', 'No liked posts yet', '../community/', 'Explore the community'));
      return;
    }

    const { data: posts } = await supabaseClient
      .from('posts')
      .select('id, content, author_id, created_at, like_count')
      .in('id', postIds);

    if (!posts || posts.length === 0) {
      likedContainer.innerHTML = '';
      likedContainer.appendChild(createEmptyState('heart-outline', 'No liked posts yet', '../community/', 'Explore the community'));
      return;
    }


    const authorIds = [...new Set(posts.map(p => p.author_id).filter(Boolean))];
    const { data: profiles } = authorIds.length > 0
      ? await supabaseClient.from('profiles').select('id, display_name, avatar_url').in('id', authorIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    likedContainer.innerHTML = '';
    posts.forEach(post => {
      const author = profileMap.get(post.author_id) || {};
      likedContainer.appendChild(createLikedPost(post.content, post.created_at, post.like_count, post.id, author.display_name, author.avatar_url));
    });
    return;
  }

  if (!likes || likes.length === 0) {
    likedContainer.innerHTML = '';
    likedContainer.appendChild(createEmptyState('heart-outline', 'No liked posts yet', '../community/', 'Explore the community'));
    return;
  }


  const authorIds = [...new Set(likes.filter(l => l.posts).map(l => l.posts.author_id).filter(Boolean))];
  const { data: profiles } = authorIds.length > 0
    ? await supabaseClient.from('profiles').select('id, display_name, avatar_url').in('id', authorIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  likedContainer.innerHTML = '';
  likes.filter(l => l.posts).forEach(like => {
    const author = profileMap.get(like.posts.author_id) || {};
    likedContainer.appendChild(createLikedPost(like.posts.content, like.posts.created_at, like.posts.like_count, like.posts.id, author.display_name, author.avatar_url));
  });
}

// --- Achievements ---
async function loadAchievements() {
  if (!currentUser) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const grid = document.getElementById('achievementsGrid');

  const { data: allAchievements } = await supabaseClient
    .from('achievements')
    .select('*')
    .order('category', { ascending: true });

  const { data: userAchievements } = await supabaseClient
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', currentUser.id);

  if (!allAchievements || allAchievements.length === 0) {
    grid.innerHTML = '';
    grid.appendChild(createEmptyState('trophy-outline', 'No achievements available'));
    return;
  }

  const unlockedIds = new Set((userAchievements || []).map(ua => ua.achievement_id));
  const totalPoints = allAchievements
    .filter(a => unlockedIds.has(a.id))
    .reduce((sum, a) => sum + (a.points || 0), 0);

  const totalPointsEl = document.getElementById('totalPoints');
  if (totalPointsEl) totalPointsEl.textContent = totalPoints;

  if (!grid) return;
  grid.innerHTML = '';
  allAchievements.forEach(achievement => {
    const isUnlocked = unlockedIds.has(achievement.id);
    grid.appendChild(createBadge(achievement, isUnlocked));
  });


  checkAndAwardBadges(allAchievements, unlockedIds);
}

async function checkAndAwardBadges(allAchievements, unlockedIds) {
  if (!currentUser) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  if (!allAchievements || !unlockedIds) {
    const { data: achievements } = await supabaseClient
      .from('achievements')
      .select('*');

    const { data: userAchievements } = await supabaseClient
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', currentUser.id);

    allAchievements = achievements || [];
    unlockedIds = new Set((userAchievements || []).map(ua => ua.achievement_id));
  }

  if (allAchievements.length === 0) return;


  const [postsResult, commentsResult, likesResult, moodResult, goalsResult, savedResult, followersResult] = await Promise.all([
    supabaseClient.from('posts').select('id', { count: 'exact' }).eq('author_id', currentUser.id),
    supabaseClient.from('post_comments').select('id', { count: 'exact' }).eq('author_id', currentUser.id),
    supabaseClient.from('posts').select('like_count').eq('author_id', currentUser.id),
    supabaseClient.from('mood_logs').select('id', { count: 'exact' }).eq('user_id', currentUser.id),
    supabaseClient.from('wellness_goals').select('id, completed').eq('user_id', currentUser.id),
    supabaseClient.from('saved_articles').select('id', { count: 'exact' }).eq('user_id', currentUser.id),
    supabaseClient.from('followers').select('id', { count: 'exact' }).eq('following_id', currentUser.id)
  ]);

  const postCount = postsResult.count || 0;
  const commentCount = commentsResult.count || 0;
  const likesReceived = (likesResult.data || []).reduce((sum, p) => sum + (p.like_count || 0), 0);
  const moodLogCount = moodResult.count || 0;
  const goalCount = (goalsResult.data || []).length;
  const completedGoals = (goalsResult.data || []).filter(g => g.completed).length;
  const savedCount = savedResult.count || 0;
  const currentStreak = userProfile?.current_streak || 0;
  const followerCount = followersResult.count || 0;

  const stats = {
    posts: postCount,
    comments: commentCount,
    likes_received: likesReceived,
    mood_logs: moodLogCount,
    goals: goalCount,
    goals_completed: completedGoals,
    saves: savedCount,
    streak: currentStreak,
    followers: followerCount
  };


  const knownCriteriaTypes = ['posts', 'comments', 'likes_received', 'mood_logs', 'goals', 'goals_completed', 'saves', 'streak', 'profile_complete', 'followers'];


  const newBadges = [];
  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue;

    let criteria;
    try {
      criteria = typeof achievement.criteria === 'string' ? JSON.parse(achievement.criteria) : achievement.criteria;
    } catch (e) {
      continue;
    }
    if (!criteria || Object.keys(criteria).length === 0) continue;


    const criteriaKeys = Object.keys(criteria);
    const hasUnknownCriteria = criteriaKeys.some(key => !knownCriteriaTypes.includes(key));
    if (hasUnknownCriteria) continue;

    let earned = true;

    if (criteria.posts !== undefined && stats.posts < criteria.posts) earned = false;
    if (criteria.comments !== undefined && stats.comments < criteria.comments) earned = false;
    if (criteria.likes_received !== undefined && stats.likes_received < criteria.likes_received) earned = false;
    if (criteria.mood_logs !== undefined && stats.mood_logs < criteria.mood_logs) earned = false;
    if (criteria.goals !== undefined && stats.goals < criteria.goals) earned = false;
    if (criteria.goals_completed !== undefined && stats.goals_completed < criteria.goals_completed) earned = false;
    if (criteria.saves !== undefined && stats.saves < criteria.saves) earned = false;
    if (criteria.streak !== undefined && stats.streak < criteria.streak) earned = false;
    if (criteria.followers !== undefined && stats.followers < criteria.followers) earned = false;


    if (criteria.profile_complete !== undefined) {
      const hasAvatar = userProfile?.avatar_url && userProfile.avatar_url.trim() !== '';
      const hasBio = userProfile?.bio && userProfile.bio.trim() !== '';


      let socialLinks = userProfile?.social_links || {};
      if (typeof socialLinks === 'string') {
        try {
          socialLinks = JSON.parse(socialLinks);
        } catch (e) {
          socialLinks = {};
        }
      }
      const hasSocialLinks = Object.values(socialLinks).some(link => link && String(link).trim() !== '');

      if (!hasAvatar || !hasBio || !hasSocialLinks) {
        earned = false;
      }
    }

    if (earned) {
      newBadges.push({
        user_id: currentUser.id,
        achievement_id: achievement.id,
        unlocked_at: new Date().toISOString()
      });
    }
  }


  if (newBadges.length > 0) {
    await supabaseClient.from('user_achievements').insert(newBadges);

    const notifications = newBadges.map(badge => {
      const achievement = allAchievements.find(a => a.id === badge.achievement_id);
      return {
        user_id: currentUser.id,
        type: 'achievement',
        from_user_name: 'MindSpace',
        content: `You earned the "${achievement?.name || 'Achievement'}" badge: ${achievement?.description || ''}`,
        read: false
      };
    });

    try {
      await supabaseClient.from('notifications').insert(notifications);
    } catch (notifErr) {
      console.warn('Failed to create achievement notifications:', notifErr);
    }
    loadAchievements();
  }
}

// --- Saved Articles ---
async function loadSavedArticles() {
  if (!currentUser) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const savedContainer = document.getElementById('savedItems');
  if (!savedContainer) return;

  try {
    const { data: articles, error } = await supabaseClient
      .from('saved_articles')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('saved_at', { ascending: false });

    if (error || !articles || articles.length === 0) {
      savedContainer.innerHTML = '';
      savedContainer.appendChild(createEmptyState('bookmark-outline', 'No saved articles yet', '../blog/', 'Browse articles'));
      return;
    }

    savedContainer.innerHTML = '';
    articles.forEach(article => {
      savedContainer.appendChild(createSavedArticleCard(article));
    });
  } catch (err) {
    console.error('Error loading saved articles:', err);
    savedContainer.innerHTML = '';
    savedContainer.appendChild(createEmptyState('alert-circle-outline', 'Could not load saved articles'));
  }
}


// ==================== WELLNESS ====================
let selectedMood = null;

function setupMoodSelector() {
  const moodBtns = document.querySelectorAll('.mb-profile__mood-btn');
  const logBtn = document.getElementById('logMoodBtn');

  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      moodBtns.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      selectedMood = {
        score: parseInt(btn.dataset.mood),
        emoji: btn.dataset.emoji
      };
    });
  });

  logBtn?.addEventListener('click', logMood);
}

async function logMood() {
  if (!currentUser || !selectedMood) {
    ToastManager.warning('Please select a mood first');
    return;
  }

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const note = document.getElementById('moodNote').value.trim();

  const { error } = await supabaseClient
    .from('mood_logs')
    .insert({
      user_id: currentUser.id,
      mood: selectedMood.emoji,
      mood_score: selectedMood.score,
      note: note || null
    });

  if (error) {
    console.error('Error logging mood:', error);
    ToastManager.error('Failed to log mood. Please try again.');
    return;
  }

  ToastManager.success('Mood logged successfully!');

  document.getElementById('moodNote').value = '';
  document.querySelectorAll('.mb-profile__mood-btn').forEach(b => b.classList.remove('is-selected'));
  selectedMood = null;

  loadMoodHistory();

  checkAndAwardBadges();
}

// --- Mood History ---
async function loadMoodHistory() {
  if (!currentUser) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const chart = document.getElementById('moodChart');

  const { data: moods, error } = await supabaseClient
    .from('mood_logs')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(14);


  const { count: totalCount } = await supabaseClient
    .from('mood_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', currentUser.id);


  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: allMoods } = await supabaseClient
    .from('mood_logs')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error || !moods || moods.length === 0) {
    chart.innerHTML = '';
    chart.appendChild(createSafeElement('p', 'mb-profile__mood-empty', 'No mood entries yet. Start tracking today!'));
    hideInsights();
    return;
  }

  const moodEmojis = {
    'very_sad': '😢',
    'sad': '😔',
    'neutral': '😐',
    'happy': '😊',
    'very_happy': '😄'
  };

  chart.innerHTML = '';
  chart.classList.add('mb-profile__mood-entries');

  const moodLevels = {
    'very_sad': 1,
    'sad': 2,
    'neutral': 3,
    'happy': 4,
    'very_happy': 5
  };

  moods.reverse().forEach(mood => {
    const date = new Date(mood.created_at);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const emoji = moodEmojis[mood.mood] || '😐';
    const moodLevel = moodLevels[mood.mood] || 3;
    const moodLabels = { 1: 'Very Bad', 2: 'Bad', 3: 'Okay', 4: 'Good', 5: 'Great' };
    const moodLabel = moodLabels[moodLevel];

    const card = createSafeElement('div', 'mood-entry-card');
    card.setAttribute('data-mood', moodLevel);


    const emojiContainer = createSafeElement('div', 'mood-entry-emoji');
    const emojiSpan = createSafeElement('span', 'mood-emoji-large', emoji);
    emojiContainer.appendChild(emojiSpan);


    const contentDiv = createSafeElement('div', 'mood-entry-content');


    const headerDiv = createSafeElement('div', 'mood-entry-header');
    const moodLabelSpan = createSafeElement('span', 'mood-label', moodLabel);
    const timeSpan = createSafeElement('span', 'mood-time', timeStr);
    headerDiv.appendChild(moodLabelSpan);
    headerDiv.appendChild(timeSpan);


    const dateSpan = createSafeElement('span', 'mood-date', dayName);

    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(dateSpan);


    if (mood.note) {
      const noteDiv = createSafeElement('div', 'mood-note-preview');
      const noteIcon = createSafeElement('ion-icon');
      noteIcon.setAttribute('name', 'chatbubble-outline');
      noteDiv.appendChild(noteIcon);
      const noteText = createSafeElement('span', '', mood.note);
      noteDiv.appendChild(noteText);
      contentDiv.appendChild(noteDiv);
    }

    card.appendChild(emojiContainer);
    card.appendChild(contentDiv);
    chart.appendChild(card);
  });


  updateMoodInsights(allMoods || moods, totalCount || moods.length);
}

function hideInsights() {
  const insightsEl = document.getElementById('moodInsights');
  if (insightsEl) insightsEl.style.display = 'none';
}

function updateMoodInsights(moods, totalCount) {
  const insightsEl = document.getElementById('moodInsights');
  if (!insightsEl || moods.length === 0) {
    if (insightsEl) insightsEl.style.display = 'none';
    return;
  }

  insightsEl.style.display = 'block';

  const moodScores = {
    'very_sad': 1,
    'sad': 2,
    'neutral': 3,
    'happy': 4,
    'very_happy': 5
  };

  const moodEmojis = {
    1: '😢', 2: '😔', 3: '😐', 4: '😊', 5: '😄'
  };


  const scores = moods.map(m => moodScores[m.mood] || 3);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const avgMoodEl = document.getElementById('avgMoodValue');
  if (avgMoodEl) {
    const avgEmoji = moodEmojis[Math.round(avgScore)] || '😐';
    avgMoodEl.textContent = avgEmoji;
  }


  const dayMoods = {};
  moods.forEach(m => {
    const day = new Date(m.created_at).toLocaleDateString('en-US', { weekday: 'short' });
    if (!dayMoods[day]) dayMoods[day] = [];
    dayMoods[day].push(moodScores[m.mood] || 3);
  });

  let bestDay = '--';
  let bestDayAvg = 0;
  Object.entries(dayMoods).forEach(([day, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > bestDayAvg) {
      bestDayAvg = avg;
      bestDay = day;
    }
  });

  const bestDayEl = document.getElementById('bestDayValue');
  if (bestDayEl) bestDayEl.textContent = bestDay;


  const totalEntriesEl = document.getElementById('totalEntriesValue');
  if (totalEntriesEl) totalEntriesEl.textContent = totalCount;


  const trendEl = document.getElementById('moodTrendValue');
  if (trendEl && moods.length >= 3) {
    const halfPoint = Math.floor(moods.length / 2);
    const recentMoods = moods.slice(halfPoint);
    const olderMoods = moods.slice(0, halfPoint);

    const recentAvg = recentMoods.map(m => moodScores[m.mood] || 3).reduce((a, b) => a + b, 0) / recentMoods.length;
    const olderAvg = olderMoods.map(m => moodScores[m.mood] || 3).reduce((a, b) => a + b, 0) / olderMoods.length;

    const diff = recentAvg - olderAvg;
    if (diff > 0.3) {
      trendEl.textContent = '📈';
      trendEl.title = 'Improving';
    } else if (diff < -0.3) {
      trendEl.textContent = '📉';
      trendEl.title = 'Declining';
    } else {
      trendEl.textContent = '➡️';
      trendEl.title = 'Stable';
    }
  } else if (trendEl) {
    trendEl.textContent = '➡️';
    trendEl.title = 'Stable';
  }


  updateMoodLineChart(moods);


  updateMoodDistribution(moods);
}

// --- Mood Charts ---
function updateMoodLineChart(moods) {
  const svgEl = document.getElementById('moodSvg');
  const lineEl = document.getElementById('moodLine');
  const areaEl = document.getElementById('moodArea');
  const dotsEl = document.getElementById('moodDots');
  const xAxisEl = document.getElementById('moodXAxis');

  if (!svgEl || !lineEl || !areaEl || !dotsEl || moods.length === 0) return;

  const moodScores = {
    'very_sad': 1,
    'sad': 2,
    'neutral': 3,
    'happy': 4,
    'very_happy': 5
  };


  const chartMoods = moods.slice(-14);

  const width = 400;
  const height = 120;
  const padding = 10;

  const xStep = (width - padding * 2) / (chartMoods.length - 1 || 1);


  const points = chartMoods.map((mood, i) => {
    const x = padding + i * xStep;
    const score = moodScores[mood.mood] || 3;
    const y = height - padding - ((score - 1) / 4) * (height - padding * 2);
    return { x, y, score, date: mood.created_at, note: mood.note };
  });


  if (points.length > 1) {
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    lineEl.setAttribute('d', linePath);


    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
    areaEl.setAttribute('d', areaPath);
  } else if (points.length === 1) {
    lineEl.setAttribute('d', `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`);
    areaEl.setAttribute('d', '');
  }


  dotsEl.innerHTML = '';
  points.forEach((p, i) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', 5);
    const dateStr = new Date(p.date).toLocaleDateString();
    circle.setAttribute('title', `${dateStr}${p.note ? ': ' + p.note : ''}`);
    dotsEl.appendChild(circle);
  });


  if (xAxisEl) {
    xAxisEl.innerHTML = '';
    const showLabels = chartMoods.length <= 7 ? chartMoods : chartMoods.filter((_, i) => i % 2 === 0 || i === chartMoods.length - 1);
    showLabels.forEach((mood, i) => {
      const span = document.createElement('span');
      span.textContent = new Date(mood.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      xAxisEl.appendChild(span);
    });
  }
}

function updateMoodDistribution(moods) {
  const distribution = {
    'very_happy': 0,
    'happy': 0,
    'neutral': 0,
    'sad': 0,
    'very_sad': 0
  };

  moods.forEach(m => {
    if (distribution.hasOwnProperty(m.mood)) {
      distribution[m.mood]++;
    }
  });

  const total = moods.length;
  const maxCount = Math.max(...Object.values(distribution), 1);


  const barMappings = {
    'very_happy': { bar: 'moodBarVeryHappy', count: 'moodCountVeryHappy' },
    'happy': { bar: 'moodBarHappy', count: 'moodCountHappy' },
    'neutral': { bar: 'moodBarNeutral', count: 'moodCountNeutral' },
    'sad': { bar: 'moodBarSad', count: 'moodCountSad' },
    'very_sad': { bar: 'moodBarVerySad', count: 'moodCountVerySad' }
  };

  Object.entries(barMappings).forEach(([mood, ids]) => {
    const barEl = document.getElementById(ids.bar);
    const countEl = document.getElementById(ids.count);
    const count = distribution[mood];
    const percentage = (count / maxCount) * 100;

    if (barEl) {
      setTimeout(() => {
        barEl.style.width = `${percentage}%`;
      }, 100);
    }
    if (countEl) countEl.textContent = count;
  });
}


// ==================== GOALS ====================
function setupGoals() {
  const addBtn = document.getElementById('addGoalBtn');
  addBtn?.addEventListener('click', addGoal);
}

async function loadGoals() {
  if (!currentUser) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const list = document.getElementById('goalsList');

  const { data: goals, error } = await supabaseClient
    .from('wellness_goals')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error || !goals || goals.length === 0) {
    list.innerHTML = `
      <div class="mb-profile__goals-empty">
        <span class="empty-icon">🎯</span>
        <h4>No goals yet</h4>
        <p>Set a wellness goal to get started</p>
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  goals.forEach(goal => {
    list.appendChild(createGoalItem(goal));
  });
}

async function addGoal() {
  if (!currentUser) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const titleInput = document.getElementById('goalTitle');
  const categorySelect = document.getElementById('goalCategory');

  const title = titleInput.value.trim();
  const category = categorySelect.value;

  if (!title) {
    ToastManager.warning('Please enter a goal title');
    return;
  }

  const { error } = await supabaseClient
    .from('wellness_goals')
    .insert({
      user_id: currentUser.id,
      title: title,
      category: category
    });

  if (error) {
    console.error('Error adding goal:', error);
    ToastManager.error('Failed to add goal. Please try again.');
    return;
  }

  titleInput.value = '';
  loadGoals();
}

async function toggleGoalComplete(goalId, completed) {
  if (!currentUser) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const updateData = { completed };
  if (completed) {
    updateData.completed_at = new Date().toISOString();
  } else {
    updateData.completed_at = null;
  }

  const { error } = await supabaseClient
    .from('wellness_goals')
    .update(updateData)
    .eq('id', goalId)
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('Error updating goal:', error);
    return;
  }

  loadGoals();
}

async function deleteGoal(goalId) {
  if (!currentUser) return;
  if (!confirm('Are you sure you want to delete this goal?')) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const { error } = await supabaseClient
    .from('wellness_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('Error deleting goal:', error);
    return;
  }

  loadGoals();
}

// --- Streaks ---
async function loadStreak() {
  if (!currentUser || !userProfile) return;


  const streakEl = document.getElementById('streakNumber');
  const bestEl = document.getElementById('bestStreak');
  if (streakEl) streakEl.textContent = userProfile.current_streak || 0;
  if (bestEl) bestEl.textContent = userProfile.longest_streak || 0;


  await loadStreakCalendar();
}

async function loadStreakCalendar() {
  const calendarEl = document.getElementById('streakCalendar');
  if (!calendarEl) return;


  const targetUserId = viewedUserId || (currentUser ? currentUser.id : null);
  if (!targetUserId) return;


  let engagementDays = [];


  if (window.MindSpaceAuth && window.MindSpaceAuth.getReadingCalendar) {
    engagementDays = await window.MindSpaceAuth.getReadingCalendar(targetUserId, 28);
  } else {

    const supabaseClient = getSupabaseClient();
    if (supabaseClient) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);

      const { data } = await supabaseClient
        .from('user_engagement')
        .select('visit_date, articles_read')
        .eq('user_id', targetUserId)
        .gte('visit_date', startDate.toISOString().split('T')[0])
        .order('visit_date', { ascending: true });

      engagementDays = data || [];
    }
  }


  const activityMap = new Map();
  engagementDays.forEach(d => {
    activityMap.set(d.visit_date, d.articles_read || 1);
  });


  const today = new Date();
  today.setHours(0, 0, 0, 0);

  calendarEl.innerHTML = '';


  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const articles = activityMap.get(dateStr) || 0;

    const dayEl = document.createElement('div');
    dayEl.className = 'streak-day';


    let activityLevel = 0;
    if (articles > 0) {
      if (articles >= 5) activityLevel = 4;
      else if (articles >= 3) activityLevel = 3;
      else if (articles >= 2) activityLevel = 2;
      else activityLevel = 1;
      dayEl.classList.add(`active-${activityLevel}`);
    }


    if (i === 0) {
      dayEl.classList.add('today');
    }


    const tooltip = document.createElement('span');
    tooltip.className = 'streak-tooltip';
    const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    tooltip.textContent = articles > 0
      ? `${dateLabel}: ${articles} article${articles > 1 ? 's' : ''}`
      : `${dateLabel}: No activity`;
    dayEl.appendChild(tooltip);

    calendarEl.appendChild(dayEl);
  }


  updateStreakMilestones(userProfile?.current_streak || 0);
}

function updateStreakMilestones(currentStreak) {
  const milestones = document.querySelectorAll('.streak-milestone');
  milestones.forEach(milestone => {
    const days = parseInt(milestone.getAttribute('data-days')) || 0;
    milestone.classList.remove('achieved', 'locked');
    if (currentStreak >= days) {
      milestone.classList.add('achieved');
    } else {
      milestone.classList.add('locked');
    }
  });
}


window.addEventListener('mindspace:streakupdated', (e) => {
  const { currentStreak, longestStreak } = e.detail;

  const streakEl = document.getElementById('streakNumber');
  const bestEl = document.getElementById('bestStreak');

  if (streakEl) streakEl.textContent = currentStreak || 0;
  if (bestEl) bestEl.textContent = longestStreak || 0;


  loadStreakCalendar();
});



// ==================== REALTIME ====================
let realtimeSubscription = null;

function setupRealtimeSubscriptions(userId) {
  if (!userId || !isOwnProfile) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;


  if (realtimeSubscription) {
    supabaseClient.removeChannel(realtimeSubscription);
  }


  realtimeSubscription = supabaseClient
    .channel(`profile-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${userId}`
    }, (payload) => {
      console.log('Profile updated:', payload);
      if (payload.new) {

        const streakEl = document.getElementById('streakNumber');
        const bestEl = document.getElementById('bestStreak');
        if (streakEl && payload.new.current_streak !== undefined) {
          streakEl.textContent = payload.new.current_streak || 0;
        }
        if (bestEl && payload.new.longest_streak !== undefined) {
          bestEl.textContent = payload.new.longest_streak || 0;
        }
      }
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_engagement',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      console.log('Engagement updated:', payload);

      loadStreakCalendar();
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'posts',
      filter: `author_id=eq.${userId}`
    }, () => {

      loadStatsData(userId);
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'post_comments',
      filter: `author_id=eq.${userId}`
    }, () => {

      loadStatsData(userId);
    })
    .subscribe((status) => {
      console.log('Realtime subscription status:', status);
    });
}


window.addEventListener('beforeunload', () => {
  if (realtimeSubscription) {
    const supabaseClient = getSupabaseClient();
    if (supabaseClient) {
      supabaseClient.removeChannel(realtimeSubscription);
    }
  }
});


// ==================== ACTIVITY FILTERS ====================
function setupActivityFilters() {
  const filterBtns = document.querySelectorAll('.mb-profile__filter');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const filter = btn.dataset.filter;
      filterActivities(filter);
    });
  });
}

function filterActivities(filter) {
  const activityFeed = document.getElementById('activityFeed');

  let filtered = allActivities;
  if (filter === 'posts') {
    filtered = allActivities.filter(a => a.type === 'post');
  } else if (filter === 'comments') {
    filtered = allActivities.filter(a => a.type === 'comment');
  }

  if (filtered.length === 0) {
    const message = filter === 'all' ? 'activity' : filter;
    activityFeed.innerHTML = '';
    if (isOwnProfile) {
      activityFeed.appendChild(createEmptyState('newspaper-outline', `No ${message} yet`, '../community/', 'Join the conversation'));
    } else {
      const viewedName = document.getElementById('profileName')?.textContent || 'This user';
      activityFeed.appendChild(createEmptyState('newspaper-outline', `${viewedName} has no ${message} yet`, null, null));
    }
    return;
  }

  activityFeed.innerHTML = '';
  filtered.forEach(activity => {
    activityFeed.appendChild(createActivityItem(activity));
  });
}


// ==================== THEME ====================
function setupThemePicker() {
  const colorBtns = document.querySelectorAll('.mb-profile__color-btn');

  colorBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      colorBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const color = btn.dataset.color;
      applyThemeColor(color);

      if (!currentUser) return;

      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) return;

      await supabaseClient
        .from('profiles')
        .upsert({
          id: currentUser.id,
          theme_color: color,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      userProfile = { ...userProfile, theme_color: color };


      updateProfileCompletion(userProfile);
    });
  });
}

function applyThemeColor(color) {
  document.documentElement.style.setProperty('--profile-accent', color);
}


// ==================== SOCIAL LINKS ====================
function setupSocialLinks() {
  const saveBtn = document.getElementById('saveSocialBtn');
  saveBtn?.addEventListener('click', saveSocialLinks);
}

async function saveSocialLinks() {
  if (!currentUser) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const website = document.getElementById('settingsWebsite').value.trim();
  const twitter = document.getElementById('settingsTwitter').value.trim();
  const instagram = document.getElementById('settingsInstagram').value.trim();

  const socialLinks = { website, twitter, instagram };

  const { error } = await supabaseClient
    .from('profiles')
    .upsert({
      id: currentUser.id,
      social_links: socialLinks,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error saving social links:', error);
    ToastManager.error('Failed to save social links. Please try again.');
    return;
  }

  userProfile = { ...userProfile, social_links: socialLinks };


  updateProfileCompletion(userProfile);


  const websiteLink = document.getElementById('socialWebsite');
  const twitterLink = document.getElementById('socialTwitter');
  const instaLink = document.getElementById('socialInstagram');

  if (websiteLink) {
    websiteLink.href = website || '#';
    websiteLink.hidden = !website;
  }
  if (twitterLink && twitter) {
    const handle = twitter.replace(/[^a-zA-Z0-9_]/g, '');
    twitterLink.href = 'https://twitter.com/' + handle;
    twitterLink.hidden = !handle;
  } else if (twitterLink) {
    twitterLink.hidden = true;
  }
  if (instaLink && instagram) {
    const handle = instagram.replace(/[^a-zA-Z0-9_.]/g, '');
    instaLink.href = 'https://instagram.com/' + handle;
    instaLink.hidden = !handle;
  } else if (instaLink) {
    instaLink.hidden = true;
  }

  updateSocialLinksVisibility();
  ToastManager.success('Social links saved!');
}


// ==================== PRIVACY ====================
function setupPrivacySettings() {
  const saveBtn = document.getElementById('savePrivacyBtn');
  saveBtn?.addEventListener('click', savePrivacySettings);
}

async function savePrivacySettings() {
  if (!currentUser) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const isPublic = document.getElementById('publicProfile').checked;
  const showActivity = document.getElementById('showActivity').checked;
  const showSaved = document.getElementById('showSaved').checked;

  const { error } = await supabaseClient
    .from('profiles')
    .upsert({
      id: currentUser.id,
      is_public: isPublic,
      show_activity: showActivity,
      show_saved: showSaved,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error saving privacy settings:', error);
    ToastManager.error('Failed to save privacy settings. Please try again.');
    return;
  }

  userProfile = { ...userProfile, is_public: isPublic, show_activity: showActivity, show_saved: showSaved };
  ToastManager.success('Privacy settings saved!');
}



// ==================== REPUTATION ====================
async function loadReputationPoints() {
  if (currentUser) {
    loadReputationPointsData(currentUser.id);
  }
}

async function loadReputationPointsData(userId) {
  if (!userId) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  let totalRep = 0;

  const { data: posts } = await supabaseClient
    .from('posts')
    .select('like_count')
    .eq('author_id', userId);

  if (posts) {
    totalRep += posts.reduce((sum, p) => sum + (p.like_count || 0) * 2, 0);
  }

  const { count: repCommentCount } = await supabaseClient
    .from('post_comments')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId);

  totalRep += (repCommentCount || 0);

  const { data: achievements } = await supabaseClient
    .from('user_achievements')
    .select('achievements(points)')
    .eq('user_id', userId);

  if (achievements) {
    totalRep += achievements.reduce((sum, a) => sum + (a.achievements?.points || 0), 0);
  }

  document.getElementById('reputationPoints').textContent = totalRep;


  if (isOwnProfile && currentUser && currentUser.id === userId) {
    await supabaseClient
      .from('profiles')
      .upsert({
        id: userId,
        reputation_points: totalRep,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
  }
}



// ==================== FOLLOW SYSTEM ====================
async function checkFollowStatus() {
  if (!currentUser || !viewedUserId || isOwnProfile) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const { data: follow } = await supabaseClient
    .from('followers')
    .select('id')
    .eq('follower_id', currentUser.id)
    .eq('following_id', viewedUserId)
    .single();

  const followBtn = document.getElementById('followBtn');
  if (followBtn) {
    if (follow) {
      followBtn.classList.add('is-following');
      followBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Following';
    } else {
      followBtn.classList.remove('is-following');
      followBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Follow';
    }
  }
}

async function toggleFollow() {
  if (!currentUser) {

    window.location.href = '../auth/?redirect=' + encodeURIComponent(window.location.href);
    return;
  }

  if (!viewedUserId || isOwnProfile) return;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const followBtn = document.getElementById('followBtn');
  if (!followBtn) return;

  const isFollowing = followBtn.classList.contains('is-following');

  followBtn.disabled = true;

  try {
    if (isFollowing) {

      await supabaseClient
        .from('followers')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', viewedUserId);

      followBtn.classList.remove('is-following');
      followBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Follow';
    } else {

      await supabaseClient
        .from('followers')
        .insert({
          follower_id: currentUser.id,
          following_id: viewedUserId
        });

      followBtn.classList.add('is-following');
      followBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Following';

      const fromName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Someone';
      try {
        await supabaseClient.from('notifications').insert({
          user_id: viewedUserId,
          type: 'follow',
          from_user_name: fromName,
          content: `${fromName} started following you`,
          read: false
        });
      } catch (notifErr) {
        console.warn('Failed to create follow notification:', notifErr);
      }
    }


    loadFollowerCountsData(viewedUserId);
  } catch (err) {
    console.error('Follow error:', err);
  } finally {
    followBtn.disabled = false;
  }
}


window.toggleGoalComplete = toggleGoalComplete;
window.deleteGoal = deleteGoal;
window.toggleFollow = toggleFollow;



// ==================== PROFILE COMPLETION ====================
function updateProfileCompletion(profile) {

  let hasSocialLinks = false;
  try {
    if (profile.social_links) {
      const links = typeof profile.social_links === 'string'
        ? JSON.parse(profile.social_links)
        : profile.social_links;
      hasSocialLinks = Object.values(links).some(v => v);
    }
  } catch (e) {
    hasSocialLinks = false;
  }

  const criteria = [
    { name: 'avatar', check: profile.avatar_url && profile.avatar_url !== '', label: 'Add a profile photo' },
    { name: 'cover', check: profile.cover_url && profile.cover_url !== '', label: 'Add a cover photo' },
    { name: 'bio', check: profile.bio && profile.bio.length > 10, label: 'Write a bio (10+ chars)' },
    { name: 'name', check: profile.display_name && profile.display_name !== '', label: 'Set your display name' },
    { name: 'social', check: hasSocialLinks, label: 'Add social links' },
    { name: 'theme', check: profile.theme_color && profile.theme_color !== '', label: 'Choose a theme color' }
  ];

  const completed = criteria.filter(c => c.check).length;
  const total = criteria.length;
  const percent = Math.round((completed / total) * 100);

  const progressCircle = document.getElementById('completionProgress');
  const percentText = document.getElementById('completionPercent');
  const label = document.getElementById('completionLabel');
  const ring = document.getElementById('completionRing');

  if (!progressCircle || !percentText) return;

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percent / 100) * circumference;

  setTimeout(() => {
    progressCircle.style.strokeDashoffset = offset;
    percentText.textContent = percent + '%';
  }, 100);

  if (percent === 100) {
    label.textContent = 'Profile complete!';
    label.classList.add('is-complete');
    if (ring) ring.classList.add('is-complete');
  } else {
    label.classList.remove('is-complete');
    if (ring) ring.classList.remove('is-complete');

    const missing = criteria.filter(c => !c.check);
    const nextStep = missing[0];
    label.textContent = nextStep ? nextStep.label : 'Complete your profile';
  }
}


// --- Quick Actions ---
function setupQuickActions() {
  const shareBtn = document.getElementById('shareProfileBtn');
  const viewPublicBtn = document.getElementById('viewPublicBtn');

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const profileUrl = window.location.origin + '/profile/?user=' + (userProfile?.username || currentUser?.id);

      try {
        await navigator.clipboard.writeText(profileUrl);
        shareBtn.classList.add('is-copied');
        shareBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Copied!';

        setTimeout(() => {
          shareBtn.classList.remove('is-copied');
          shareBtn.innerHTML = '<ion-icon name="share-social-outline"></ion-icon> Share';
        }, 2000);
      } catch (err) {
        prompt('Copy this link:', profileUrl);
      }
    });
  }

  if (viewPublicBtn) {
    viewPublicBtn.addEventListener('click', () => {
      showPublicProfilePreview();
    });
  }
}

// --- URL Validation ---
function isValidUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}


// ==================== PUBLIC PROFILE PREVIEW ====================
function showPublicProfilePreview() {
  const modal = document.createElement('div');
  modal.className = 'mb-profile__preview-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'previewTitle');

  const backdrop = document.createElement('div');
  backdrop.className = 'preview-modal__backdrop';

  const content = document.createElement('div');
  content.className = 'preview-modal__content';

  const header = document.createElement('div');
  header.className = 'preview-modal__header';
  const title = document.createElement('h3');
  title.id = 'previewTitle';
  title.textContent = 'Public Profile Preview';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'preview-modal__close';
  closeBtn.setAttribute('aria-label', 'Close preview');
  closeBtn.innerHTML = '<ion-icon name="close-outline"></ion-icon>';
  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'preview-modal__body';

  const card = document.createElement('div');
  card.className = 'preview-card';

  const cover = document.createElement('div');
  cover.className = 'preview-cover';
  if (userProfile?.cover_url && isValidUrl(userProfile.cover_url)) {
    cover.style.backgroundImage = `url("${userProfile.cover_url.replace(/"/g, '')}")`;
    cover.style.backgroundSize = 'cover';
    cover.style.backgroundPosition = 'center';
  }

  const info = document.createElement('div');
  info.className = 'preview-info';

  const avatar = document.createElement('img');
  avatar.className = 'preview-avatar';
  avatar.alt = 'Avatar';
  if (userProfile?.avatar_url && isValidUrl(userProfile.avatar_url)) {
    avatar.src = userProfile.avatar_url;
  } else {
    avatar.src = '../assets/images/user.png';
  }

  const nameEl = document.createElement('h4');
  nameEl.textContent = userProfile?.display_name || 'User';

  const bioEl = document.createElement('p');
  bioEl.textContent = userProfile?.bio || 'No bio yet';

  const stats = document.createElement('div');
  stats.className = 'preview-stats';
  const postsStat = document.createElement('span');
  postsStat.textContent = (document.getElementById('postCount')?.textContent || '0') + ' posts';
  const followersStat = document.createElement('span');
  followersStat.textContent = (document.getElementById('followerCount')?.textContent || '0') + ' followers';
  stats.appendChild(postsStat);
  stats.appendChild(followersStat);

  info.appendChild(avatar);
  info.appendChild(nameEl);
  info.appendChild(bioEl);
  info.appendChild(stats);

  card.appendChild(cover);
  card.appendChild(info);

  const note = document.createElement('p');
  note.className = 'preview-note';
  note.textContent = 'This is how others see your profile when it\'s public.';

  body.appendChild(card);
  body.appendChild(note);

  content.appendChild(header);
  content.appendChild(body);

  modal.appendChild(backdrop);
  modal.appendChild(content);

  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('is-visible'), 10);

  closeBtn.focus();

  backdrop.addEventListener('click', () => closePreviewModal(modal));
  closeBtn.addEventListener('click', () => closePreviewModal(modal));

  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closePreviewModal(modal);
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
}

function closePreviewModal(modal) {
  modal.classList.remove('is-visible');
  setTimeout(() => modal.remove(), 300);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}


document.addEventListener('DOMContentLoaded', setupQuickActions);


function createFollowAvatar(profile) {
  const colors = ['#2068A8','#E57373','#64B5F6','#81C784','#FFD54F','#BA68C8','#4DB6AC','#FF8A65','#90A4AE','#A1887F'];
  if (profile.avatar_url) {
    const avatar = document.createElement('img');
    avatar.className = 'mb-follow-item__avatar';
    avatar.src = profile.avatar_url;
    avatar.alt = profile.display_name || 'User';
    avatar.onerror = () => {
      const parent = avatar.parentElement;
      const initialsEl = createInitialsCircle(profile, colors, 'mb-follow-item__avatar');
      parent.replaceChild(initialsEl, avatar);
    };
    return avatar;
  }
  return createInitialsCircle(profile, colors, 'mb-follow-item__avatar');
}

function createInitialsCircle(profile, colors, className) {
  const name = profile.display_name || profile.username || profile.email || 'U';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || name.substring(0, 2).toUpperCase();
  const colorIndex = name.charCodeAt(0) % colors.length;
  const el = document.createElement('div');
  el.className = className + ' mb-follow-item__avatar--initials';
  el.textContent = initials;
  el.style.background = colors[colorIndex];
  el.setAttribute('aria-label', name);
  return el;
}

async function openFollowersModal() {
  const modal = document.getElementById('followersModal');
  const list = document.getElementById('followersList');
  if (!modal || !list) return;

  modal.hidden = false;
  list.innerHTML = '<div class="mb-follow-modal__empty">Loading...</div>';

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const userId = viewedUserId || (currentUser ? currentUser.id : null);
  if (!userId) return;

  let followers = [];
  try {

    const result = await supabaseClient
      .from('followers')
      .select('follower_id')
      .eq('following_id', userId);

    if (result.error) throw result.error;


    if (result.data && result.data.length > 0) {
      const followerIds = result.data.map(f => f.follower_id);
      const profilesResult = await supabaseClient
        .from('profiles')
        .select('id, display_name, avatar_url, bio')
        .in('id', followerIds);

      if (profilesResult.data) {
        followers = profilesResult.data;
      }
    }
  } catch (error) {
    console.error('Error loading followers:', error);
    list.innerHTML = '<div class="mb-follow-modal__empty">Failed to load followers</div>';
    return;
  }

  if (!followers || followers.length === 0) {
    list.innerHTML = '<div class="mb-follow-modal__empty">No followers yet</div>';
    return;
  }

  list.innerHTML = '';
  followers.forEach(profile => {
    if (!profile) return;

    const item = document.createElement('div');
    item.className = 'mb-follow-item';

    const avatarEl = createFollowAvatar(profile);

    const info = document.createElement('div');
    info.className = 'mb-follow-item__info';

    const nameLink = document.createElement('a');
    nameLink.className = 'mb-follow-item__name';
    nameLink.href = '/profile/?user=' + profile.id;
    nameLink.textContent = profile.display_name || 'Anonymous';

    const bio = document.createElement('p');
    bio.className = 'mb-follow-item__bio';
    bio.textContent = profile.bio || '';

    info.appendChild(nameLink);
    if (profile.bio) info.appendChild(bio);

    item.appendChild(avatarEl);
    item.appendChild(info);
    list.appendChild(item);
  });
}

function closeFollowersModal() {
  const modal = document.getElementById('followersModal');
  if (modal) modal.hidden = true;
}

async function openFollowingModal() {
  const modal = document.getElementById('followingModal');
  const list = document.getElementById('followingList');
  if (!modal || !list) return;

  modal.hidden = false;
  list.innerHTML = '<div class="mb-follow-modal__empty">Loading...</div>';

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const userId = viewedUserId || (currentUser ? currentUser.id : null);
  if (!userId) return;

  let following = [];
  try {

    const result = await supabaseClient
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId);

    if (result.error) throw result.error;


    if (result.data && result.data.length > 0) {
      const followingIds = result.data.map(f => f.following_id);
      const profilesResult = await supabaseClient
        .from('profiles')
        .select('id, display_name, avatar_url, bio')
        .in('id', followingIds);

      if (profilesResult.data) {
        following = profilesResult.data;
      }
    }
  } catch (error) {
    console.error('Error loading following:', error);
    list.innerHTML = '<div class="mb-follow-modal__empty">Failed to load following</div>';
    return;
  }

  if (!following || following.length === 0) {
    list.innerHTML = '<div class="mb-follow-modal__empty">Not following anyone yet</div>';
    return;
  }

  list.innerHTML = '';
  following.forEach(profile => {
    if (!profile) return;

    const item = document.createElement('div');
    item.className = 'mb-follow-item';

    const avatarEl = createFollowAvatar(profile);

    const info = document.createElement('div');
    info.className = 'mb-follow-item__info';

    const nameLink = document.createElement('a');
    nameLink.className = 'mb-follow-item__name';
    nameLink.href = '/profile/?user=' + profile.id;
    nameLink.textContent = profile.display_name || 'Anonymous';

    const bio = document.createElement('p');
    bio.className = 'mb-follow-item__bio';
    bio.textContent = profile.bio || '';

    info.appendChild(nameLink);
    if (profile.bio) info.appendChild(bio);

    item.appendChild(avatarEl);
    item.appendChild(info);
    list.appendChild(item);
  });
}

function closeFollowingModal() {
  const modal = document.getElementById('followingModal');
  if (modal) modal.hidden = true;
}


document.addEventListener('click', (e) => {
  if (e.target.classList.contains('mb-follow-modal')) {
    e.target.hidden = true;
  }
});


function setupAccountDeletion() {
  const deleteBtn = document.getElementById('deleteAccountBtn');
  const confirmInput = document.getElementById('deleteConfirmInput');
  const confirmBtn = document.getElementById('confirmDeleteBtn');

  deleteBtn?.addEventListener('click', () => {
    const modal = document.getElementById('deleteModal');
    if (modal) {
      modal.hidden = false;
      confirmInput.value = '';
      confirmBtn.disabled = true;
      confirmBtn.classList.remove('is-enabled');
    }
  });

  confirmInput?.addEventListener('input', () => {
    const isValid = confirmInput.value.toUpperCase() === 'DELETE';
    confirmBtn.disabled = !isValid;
    confirmBtn.classList.toggle('is-enabled', isValid);
  });

  confirmBtn?.addEventListener('click', deleteAccount);
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  if (modal) modal.hidden = true;
}

async function deleteAccount() {
  if (!currentUser) return;

  const confirmInput = document.getElementById('deleteConfirmInput');
  if (confirmInput.value.toUpperCase() !== 'DELETE') return;

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  confirmBtn.textContent = 'Deleting...';
  confirmBtn.disabled = true;

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  try {

    await Promise.all([
      supabaseClient.from('posts').delete().eq('author_id', currentUser.id),
      supabaseClient.from('post_comments').delete().eq('author_id', currentUser.id),
      supabaseClient.from('likes').delete().eq('user_id', currentUser.id),
      supabaseClient.from('followers').delete().or(`follower_id.eq.${currentUser.id},following_id.eq.${currentUser.id}`),
      supabaseClient.from('saved_articles').delete().eq('user_id', currentUser.id),
      supabaseClient.from('mood_logs').delete().eq('user_id', currentUser.id),
      supabaseClient.from('wellness_goals').delete().eq('user_id', currentUser.id),
      supabaseClient.from('user_achievements').delete().eq('user_id', currentUser.id),
      supabaseClient.from('profiles').delete().eq('id', currentUser.id)
    ]);


    await supabaseClient.auth.signOut();

    ToastManager.success('Your account has been deleted. Redirecting to home page...');
    window.location.href = '/';
  } catch (error) {
    console.error('Error deleting account:', error);
    ToastManager.error('There was an error deleting your account. Please try again or contact support.');
    confirmBtn.textContent = 'Delete Account';
    confirmBtn.disabled = false;
  }
}


document.addEventListener('DOMContentLoaded', setupAccountDeletion);


function updateSocialLinksVisibility() {
  const container = document.getElementById('socialLinksDisplay');
  if (!container) return;

  const visibleLinks = container.querySelectorAll('a:not([hidden])');
  container.style.display = visibleLinks.length > 0 ? 'flex' : 'none';
}


let onboardingInitialized = false;

function showOnboardingModal() {
  const modal = document.getElementById('onboardingModal');
  if (!modal) return;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  const displayNameInput = document.getElementById('onboardingDisplayName');
  const bioInput = document.getElementById('onboardingBio');
  const saveBtn = document.getElementById('onboardingSaveBtn');


  setTimeout(() => displayNameInput?.focus(), 100);


  if (onboardingInitialized) return;
  onboardingInitialized = true;


  displayNameInput?.addEventListener('input', () => {
    const name = displayNameInput.value.trim();
    saveBtn.disabled = name.length < 2;
  });


  saveBtn?.addEventListener('click', async () => {
    const displayName = displayNameInput.value.trim();
    const bio = bioInput.value.trim();

    if (displayName.length < 2) {
      ToastManager.error('Display name must be at least 2 characters');
      displayNameInput.focus();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient || !currentUser) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabaseClient
        .from('profiles')
        .upsert({
          id: currentUser.id,
          display_name: displayName,
          bio: bio || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;


      userProfile = { ...userProfile, display_name: displayName, bio: bio };
      window.userProfile = userProfile;


      document.getElementById('profileName').textContent = displayName;
      document.getElementById('profileBio').textContent = bio || 'No bio yet...';
      document.getElementById('settingsName').value = displayName;
      document.getElementById('settingsBio').value = bio;


      updateProfileCompletion(userProfile);


      if (window.MindSpaceImmersive?.updateGreeting) {
        window.MindSpaceImmersive.updateGreeting();
      }


      hideOnboardingModal();

      ToastManager.success('Profile setup complete! Welcome to MindSpace!');
    } catch (error) {
      console.error('Onboarding error:', error);
      ToastManager.error('Failed to save profile. Please try again.');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-check"></i> Complete Setup';
    }
  });
}

function hideOnboardingModal() {
  const modal = document.getElementById('onboardingModal');
  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = '';
}
