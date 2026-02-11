// ==================== COMMUNITY ====================

let sb = null;
let currentUser = null;
// --- State ---
let initialized = false;
let realtimeChannel = null;
let realtimeSetup = false;
let postsLoaded = false;
let loadingPosts = false;
let suppressRealtimeUntil = 0;
let lastLoadedTimestamp = null;
let authHandled = false;
let pendingAuthDebounce = null;
const recentlyPostedIds = new Set();
const renderedPostIds = new Set();
const ADMIN_EMAIL = 'marlonsalmeron871@gmail.com';


let selectedMediaFile = null;
let mediaPreviewUrl = null;


let mentionDropdown = null;
let mentionSearchTimeout = null;
let mentionUsers = [];
let mentionStartPos = 0;
let activeMentionInput = null;

const profileCache = {};

async function fetchUserProfile(userId) {
  if (profileCache[userId]) return profileCache[userId];
  const client = initSupabase();
  if (!client) return null;
  try {
    const { data } = await client.from('profiles').select('avatar_url, display_name').eq('id', userId).single();
    if (data) profileCache[userId] = data;
    return data;
  } catch (e) { return null; }
}

function showConfetti() {
  const colors = ['#2068A8', '#5ba4e6', '#1a5a8f', '#4caf50', '#2196f3', '#ff9800'];
  for (let i = 0; i < 30; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = 'position:fixed;width:' + (Math.random()*10+5) + 'px;height:' + (Math.random()*10+5) + 'px;background:' + colors[Math.floor(Math.random()*colors.length)] + ';left:' + (Math.random()*100) + 'vw;top:-20px;border-radius:' + (Math.random()>0.5?'50%':'2px') + ';z-index:10000;pointer-events:none;animation:confettiFall ' + (Math.random()*2+1.5) + 's ease forwards;';
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3500);
  }
}

// --- Helpers ---
function getTranslation(key, fallback) {
  if (window.translations && window.MindSpaceSettings) {
    const lang = localStorage.getItem('mindspace-language') || 'en';
    const langMap = { en: 'en', es: 'es', fr: 'fr', zh: 'zh', hi: 'hi', ko: 'ko' };
    const langKey = langMap[lang] || 'en';
    if (window.translations[langKey] && window.translations[langKey][key]) {
      return window.translations[langKey][key];
    }
  }
  return fallback;
}

function clearMediaPreview() {
  selectedMediaFile = null;
  if (mediaPreviewUrl) {
    URL.revokeObjectURL(mediaPreviewUrl);
    mediaPreviewUrl = null;
  }
  const mediaPreview = document.getElementById('mediaPreview');
  const mediaInput = document.getElementById('mediaInput');
  const mediaBtn = document.getElementById('mediaBtn');

  if (mediaPreview) mediaPreview.style.display = 'none';
  if (mediaInput) mediaInput.value = '';
  if (mediaBtn) {
    mediaBtn.textContent = '📎 Media';
    mediaBtn.setAttribute('data-translate', 'community_media_btn');
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- Profanity Filter ---
const BLOCKED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'piss', 'dick', 'cock', 'pussy',
  'bastard', 'slut', 'whore', 'fag', 'faggot', 'retard', 'retarded', 'nigger', 'nigga',
  'cunt', 'twat', 'wanker', 'bollocks', 'arsehole', 'asshole', 'motherfucker',
  'bullshit', 'horseshit', 'dumbass', 'jackass', 'dipshit', 'shithead',
  'kike', 'spic', 'chink', 'gook', 'wetback', 'beaner', 'cracker', 'honky',
  'tranny', 'shemale', 'dyke', 'homo', 'queer', 'negro', 'coon', 'darkie',
  'paki', 'raghead', 'towelhead', 'jap', 'chinaman', 'redskin', 'injun',
  'nazi', 'hitler', 'kkk', 'stfu', 'gtfo', 'wtf', 'fck', 'sht', 'btch',
  'fuk', 'fuq', 'fuc', 'azz', 'a55', 'b1tch', 'd1ck', 'p1ss', 'c0ck',
  'fvck', 'sh1t', 'b!tch', 'n1gger', 'n1gga', 'f4g', 'f4gg0t'
];

const SLUR_PATTERNS = [
  /n+[i1!]+g+[e3]+r/i,
  /n+[i1!]+g+[a4@]+/i,
  /f+[a4@]+g+[o0]+t/i,
  /f+[a4@]+g+/i,
  /r+[e3]+t+[a4@]+r+d/i,
  /c+[u]+n+t/i,
  /b+[i1!]+t+c+h/i,
  /s+h+[i1!]+t/i,
  /f+[u]+c+k/i,
  /a+s+s+h+[o0]+l+[e3]/i,
  /w+h+[o0]+r+[e3]/i,
  /s+l+[u]+t/i,
  /d+[i1!]+c+k/i,
  /c+[o0]+c+k/i,
  /p+[u]+s+s+y/i,
  /k+[i1!]+k+[e3]/i,
  /s+p+[i1!]+c/i,
  /c+h+[i1!]+n+k/i,
  /g+[o0]+[o0]+k/i,
  /t+r+[a4@]+n+n+y/i
];

function containsProfanity(text) {
  if (!text) return false;

  let normalized = text.toLowerCase();
  normalized = normalized
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/\!/g, 'i')
    .replace(/\|/g, 'i');

  const fullyStripped = normalized.replace(/[^a-z]/g, '');

  for (const blocked of BLOCKED_WORDS) {
    if (fullyStripped.includes(blocked)) {
      return true;
    }
  }

  for (const pattern of SLUR_PATTERNS) {
    if (pattern.test(text) || pattern.test(normalized) || pattern.test(fullyStripped)) {
      return true;
    }
  }

  const words = normalized.split(/[\s.,!?;:'"()\-\[\]{}|\\/<>_]+/);

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length >= 2 && BLOCKED_WORDS.includes(cleanWord)) {
      return true;
    }

    for (const blocked of BLOCKED_WORDS) {
      if (blocked.length >= 4 && cleanWord.length >= 4) {
        if (cleanWord.includes(blocked) || blocked.includes(cleanWord)) {
          return true;
        }
      }
    }
  }

  return false;
}

// --- Supabase Client ---
function initSupabase() {
  if (window.MindSpaceAuth && window.MindSpaceAuth.getSupabase) {
    sb = window.MindSpaceAuth.getSupabase();
  }

  if (!sb && typeof supabase !== 'undefined') {
    const SUPABASE_URL = "https://cxjqessxarjayqxvhnhs.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4anFlc3N4YXJqYXlxeHZobmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjQwOTEsImV4cCI6MjA4MzYwMDA5MX0.SUI4sPOSPxDiGwqwQr19UOKtbK7KmjMqkX6HUT6-yps";
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return sb;
}

// --- Authentication ---
async function checkAuth() {
  const client = initSupabase();
  if (!client) return null;

  const { data } = await client.auth.getSession();
  currentUser = data?.session?.user || null;
  return currentUser;
}

// --- UI Updates ---
function updateCommunityUI(user) {
  currentUser = user;

  const authPill = document.getElementById('authStatusPill');
  const avatarCircle = document.getElementById('avatarCircle');
  const postText = document.getElementById('postText');
  const postBtn = document.getElementById('postBtn');
  const sidebarSignIn = document.querySelector('.mb-navLink[href="../auth/"]');

  if (user) {

    loadNotificationCount();

    if (authPill) {
      authPill.textContent = 'Signed in';
      authPill.style.background = '#dcfce7';
      authPill.style.color = '#166534';
    }

    const userName = user.email ? user.email.split('@')[0] : 'User';
    const sidebarUserCard = document.getElementById('sidebarUserCard');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    if (sidebarUserCard) {
      sidebarUserCard.style.display = 'flex';
      if (sidebarUserName) sidebarUserName.textContent = userName || 'User';
    }

    const initials = user.email ? user.email.substring(0, 2).toUpperCase() : 'ME';

    fetchUserProfile(user.id).then(function(profile) {
      if (profile && profile.avatar_url) {
        if (avatarCircle) {
          avatarCircle.innerHTML = '<img src="' + profile.avatar_url + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent=\'' + initials + '\'">';
          avatarCircle.style.background = 'transparent';
          avatarCircle.style.padding = '0';
          avatarCircle.style.overflow = 'hidden';
        }
        if (sidebarUserAvatar) {
          sidebarUserAvatar.innerHTML = '<img src="' + profile.avatar_url + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent=\'' + initials + '\'">';
          sidebarUserAvatar.style.background = 'transparent';
          sidebarUserAvatar.style.padding = '0';
          sidebarUserAvatar.style.overflow = 'hidden';
        }
      } else {
        if (avatarCircle) {
          avatarCircle.textContent = initials;
          avatarCircle.style.background = '#3b82f6';
        }
        if (sidebarUserAvatar) {
          const sideInitials = (userName || 'U').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
          sidebarUserAvatar.textContent = sideInitials;
        }
      }
    });


    if (postText) {
      postText.disabled = false;
      postText.placeholder = getTranslation('community_share_placeholder', "What's on your mind? Share with the community...");
    }

    if (postBtn) {
      postBtn.disabled = false;
    }

    if (sidebarSignIn) {
      sidebarSignIn.textContent = 'Signed in as ' + user.email.split('@')[0];
      sidebarSignIn.style.color = '#166534';
    }

    const welcomeCard = document.getElementById('welcomeCard');
    if (welcomeCard) welcomeCard.style.display = 'none';

    enableInteractions();
    updateDeleteButtons();
  } else {
    if (authPill) {
      authPill.textContent = 'Guest mode';
      authPill.style.background = '';
      authPill.style.color = '';
    }

    const sidebarUserCardGuest = document.getElementById('sidebarUserCard');
    if (sidebarUserCardGuest) {
      sidebarUserCardGuest.style.display = 'none';
    }

    if (avatarCircle) {
      avatarCircle.textContent = 'MB';
      avatarCircle.style.background = '';
    }

    if (postText) {
      postText.disabled = true;
      postText.placeholder = getTranslation('community_signin_placeholder', 'Sign in to share an update...');
    }

    if (postBtn) {
      postBtn.disabled = true;
    }

    if (sidebarSignIn) {
      sidebarSignIn.textContent = 'Sign in / Register';
      sidebarSignIn.style.color = '';
    }

    const welcomeCard = document.getElementById('welcomeCard');
    if (welcomeCard) welcomeCard.style.display = '';

    enableInteractions();
    hideDeleteButtons();
  }
}

// --- Permissions ---
function isAdmin() {
  return currentUser && currentUser.email === ADMIN_EMAIL;
}

function canDeletePost(postEmail) {
  if (!currentUser) return false;
  return currentUser.email === postEmail || isAdmin();
}

function updateDeleteButtons() {
  if (!currentUser) return;

  const posts = document.querySelectorAll('.mb-post[data-email]');
  posts.forEach(post => {
    const postEmail = post.getAttribute('data-email');
    const canDelete = canDeletePost(postEmail);
    let deleteBtn = post.querySelector('.mb-deleteBtn');

    if (canDelete && !deleteBtn) {
      const footer = post.querySelector('.mb-postFooter');
      if (footer) {
        deleteBtn = document.createElement('button');
        deleteBtn.className = 'mb-btn mb-deleteBtn';
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.marginLeft = 'auto';
        deleteBtn.style.color = '#dc2626';
        deleteBtn.addEventListener('click', () => handleDelete(post));
        footer.appendChild(deleteBtn);
      }
    }
  });
}

function hideDeleteButtons() {
  const deleteBtns = document.querySelectorAll('.mb-deleteBtn');
  deleteBtns.forEach(btn => btn.remove());
}

// --- Post Management ---
async function handleDelete(postElement) {
  const postId = postElement.getAttribute('data-id');

  if (!currentUser) {
    alert('You must be signed in to delete posts.');
    return;
  }

  if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) {
    return;
  }

  const client = initSupabase();
  if (client) {
    const { error } = await client
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
      return;
    }
  }


  renderedPostIds.delete(postId);

  postElement.style.transition = 'opacity 0.3s, transform 0.3s';
  postElement.style.opacity = '0';
  postElement.style.transform = 'translateX(-20px)';

  setTimeout(() => {
    postElement.remove();
  }, 300);
}

// --- Interactions ---
function enableInteractions() {
  const posts = document.querySelectorAll('.mb-post');
  posts.forEach(post => {

    const likeBtn = post.querySelector('.mb-likeBtn');
    if (likeBtn && !likeBtn.dataset.bound) {
      likeBtn.dataset.bound = 'true';
      likeBtn.addEventListener('click', handleLike);
    }


    const commentBtn = post.querySelector('.mb-commentBtn');
    if (commentBtn && !commentBtn.dataset.bound) {
      commentBtn.dataset.bound = 'true';
      commentBtn.addEventListener('click', handleComment);
    }


    const shareBtn = post.querySelector('.mb-shareBtn');
    if (shareBtn && !shareBtn.dataset.bound) {
      shareBtn.dataset.bound = 'true';
      shareBtn.addEventListener('click', handleShare);
    }


    const reportBtn = post.querySelector('.mb-reportBtn');
    if (reportBtn && !reportBtn.dataset.bound) {
      reportBtn.dataset.bound = 'true';
      reportBtn.addEventListener('click', handleReport);
    }


    const editBtn = post.querySelector('.mb-editBtn');
    if (editBtn && !editBtn.dataset.bound) {
      editBtn.dataset.bound = 'true';
      editBtn.addEventListener('click', handleEdit);
    }


    const buttons = post.querySelectorAll('.mb-btn:not(.mb-likeBtn):not(.mb-commentBtn):not(.mb-shareBtn):not(.mb-reportBtn):not(.mb-editBtn):not(.mb-deleteBtn)');
    buttons.forEach(btn => {
      if (btn.textContent.includes('Like') && !btn.dataset.bound) {
        btn.classList.add('mb-likeBtn');
        btn.dataset.bound = 'true';
        btn.addEventListener('click', handleLike);
      } else if (btn.textContent.includes('Comment') && !btn.dataset.bound) {
        btn.classList.add('mb-commentBtn');
        btn.dataset.bound = 'true';
        btn.addEventListener('click', handleComment);
      } else if (btn.textContent.includes('Share') && !btn.dataset.bound) {
        btn.classList.add('mb-shareBtn');
        btn.dataset.bound = 'true';
        btn.addEventListener('click', handleShare);
      }
    });
  });
}

async function handleShare(e) {
  const post = e.target.closest('.mb-post');
  const postId = post.getAttribute('data-id');
  const postContent = post.getAttribute('data-text') || '';
  const shareUrl = `${window.location.origin}${window.location.pathname}#post-${postId}`;

  const shareData = {
    title: 'MindSpace Community Post',
    text: postContent.substring(0, 100) + (postContent.length > 100 ? '...' : ''),
    url: shareUrl
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      if (err.name !== 'AbortError') {
        copyToClipboard(shareUrl);
      }
    }
  } else {
    copyToClipboard(shareUrl);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.createElement('div');
    toast.textContent = 'Link copied to clipboard!';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #252542;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999;
      animation: fadeInOut 2s ease-in-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }).catch(() => {
    alert('Failed to copy link. The URL is: ' + text);
  });
}

async function handleLike(e) {
  if (!currentUser) {
    alert('Please sign in to like posts');
    return;
  }

  const btn = e.currentTarget || e.target.closest('.mb-likeBtn, .mb-btn');
  const post = btn.closest('.mb-post');
  const postId = post.getAttribute('data-id');
  const client = initSupabase();

  if (!client || !btn) return;


  if (btn.dataset.processing === 'true') return;
  btn.dataset.processing = 'true';

  let likeCountSpan = btn.querySelector('.like-count');
  const currentCount = parseInt(likeCountSpan?.textContent) || 0;

  const heartIcon = btn.querySelector('.heart-icon');
  const chosenEmoji = heartIcon ? heartIcon.textContent : '♡';

  if (btn.dataset.liked === 'true') {

    const { error } = await client
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', currentUser.id);

    if (!error) {
      btn.dataset.liked = 'false';
      const newCount = currentCount - 1;
      if (heartIcon) heartIcon.textContent = '♡';
      if (likeCountSpan) likeCountSpan.textContent = newCount > 0 ? newCount : '';
      btn.classList.remove('like-animating');
    }
  } else {

    const { error } = await client
      .from('post_likes')
      .insert({ post_id: postId, user_id: currentUser.id });

    if (!error) {
      btn.dataset.liked = 'true';
      const newCount = currentCount + 1;
      if (heartIcon) heartIcon.textContent = chosenEmoji === '♡' ? '♥' : chosenEmoji;
      if (likeCountSpan) likeCountSpan.textContent = newCount > 0 ? newCount : '';

      btn.classList.add('like-animating');
      setTimeout(() => btn.classList.remove('like-animating'), 400);

      const pop = document.createElement('span');
      pop.className = 'like-pop';
      pop.textContent = '+1';
      btn.appendChild(pop);
      setTimeout(() => pop.remove(), 600);

      const postAuthorId = post.getAttribute('data-author-id');
      if (postAuthorId && postAuthorId !== currentUser.id) {
        const fromName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Someone';
        try {
          await client.from('notifications').insert({
            user_id: postAuthorId,
            type: 'like',
            from_user_name: fromName,
            content: `${fromName} liked your post`,
            read: false
          });
        } catch (notifErr) {
          console.warn('Failed to create like notification:', notifErr);
        }
      }
    }
  }

  btn.dataset.processing = 'false';
}

async function handleEdit(e) {
  if (!currentUser) return;

  const post = e.target.closest('.mb-post');
  const postEmail = post.getAttribute('data-email');


  if (currentUser.email !== postEmail) return;

  const postBody = post.querySelector('.mb-postBody');
  const originalContent = post.getAttribute('data-text');
  const wasEdited = post.dataset.edited === 'true' || postBody.querySelector('.mb-edited-tag') !== null;


  if (wasEdited) post.dataset.edited = 'true';


  if (post.querySelector('.mb-editTextarea')) return;


  const editHTML = `
    <textarea class="mb-editTextarea"></textarea>
    <div class="mb-editActions">
      <button class="mb-btn mb-saveBtn" type="button">Save</button>
      <button class="mb-btn mb-cancelBtn" type="button">Cancel</button>
    </div>
  `;

  postBody.innerHTML = editHTML;

  const textarea = postBody.querySelector('.mb-editTextarea');
  const saveBtn = postBody.querySelector('.mb-saveBtn');
  const cancelBtn = postBody.querySelector('.mb-cancelBtn');


  textarea.value = originalContent;
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  cancelBtn.addEventListener('click', () => {

    const editedSuffix = post.dataset.edited === 'true' ? ' <span class="mb-edited-tag">(edited)</span>' : '';
    postBody.innerHTML = escapeHtml(originalContent) + editedSuffix;
  });

  saveBtn.addEventListener('click', async () => {
    const newContent = textarea.value.trim();

    if (!newContent) {
      alert('Post content cannot be empty.');
      return;
    }

    if (containsProfanity(newContent)) {
      alert('Your post contains inappropriate language. Please revise and try again.');
      return;
    }

    if (newContent === originalContent) {
      postBody.innerHTML = escapeHtml(originalContent);
      return;
    }

    const client = initSupabase();
    const postId = post.getAttribute('data-id');

    const { error } = await client
      .from('posts')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('author_email', currentUser.email);

    if (error) {
      alert('Failed to save changes. Please try again.');
      return;
    }

    post.setAttribute('data-text', newContent);
    postBody.innerHTML = escapeHtml(newContent) + ' <span class="mb-edited-tag">(edited)</span>';
  });
}

// --- Reporting ---
function showReportModal(postId) {

  const existingModal = document.querySelector('.mb-reportModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.className = 'mb-reportModal';
  modal.innerHTML = `
    <div class="mb-reportModalContent">
      <div class="mb-reportModalTitle">${getTranslation('community_report_title', 'Report this post')}</div>
      <div class="mb-reportOptions">
        <label class="mb-reportOption">
          <input type="radio" name="reportReason" value="spam">
          <span>${getTranslation('community_report_spam', 'Spam or misleading')}</span>
        </label>
        <label class="mb-reportOption">
          <input type="radio" name="reportReason" value="harassment">
          <span>${getTranslation('community_report_harassment', 'Harassment or bullying')}</span>
        </label>
        <label class="mb-reportOption">
          <input type="radio" name="reportReason" value="inappropriate">
          <span>${getTranslation('community_report_inappropriate', 'Inappropriate content')}</span>
        </label>
        <label class="mb-reportOption">
          <input type="radio" name="reportReason" value="self-harm">
          <span>${getTranslation('community_report_self_harm', 'Self-harm or dangerous content')}</span>
        </label>
        <label class="mb-reportOption">
          <input type="radio" name="reportReason" value="other">
          <span>${getTranslation('community_report_other', 'Other')}</span>
        </label>
      </div>
      <div class="mb-reportModalActions">
        <button class="mb-btn mb-cancelReportBtn" type="button">${getTranslation('community_cancel', 'Cancel')}</button>
        <button class="mb-btn mb-submitReportBtn" type="button" disabled>${getTranslation('community_submit_report', 'Submit Report')}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);


  requestAnimationFrame(() => modal.classList.add('is-active'));

  const submitBtn = modal.querySelector('.mb-submitReportBtn');
  const cancelBtn = modal.querySelector('.mb-cancelReportBtn');
  const radios = modal.querySelectorAll('input[name="reportReason"]');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      submitBtn.disabled = false;
    });
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('is-active');
    setTimeout(() => modal.remove(), 200);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('is-active');
      setTimeout(() => modal.remove(), 200);
    }
  });

  submitBtn.addEventListener('click', async () => {
    const selectedReason = modal.querySelector('input[name="reportReason"]:checked');
    if (!selectedReason || !currentUser) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const client = initSupabase();

    const { error } = await client
      .from('post_reports')
      .insert({
        post_id: postId,
        reporter_id: currentUser.id,
        reporter_email: currentUser.email,
        reason: selectedReason.value
      });

    if (error) {
      console.error('Report error:', error);
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        alert('Report system needs setup. Please run supabase-setup.sql in your Supabase SQL Editor.');
      } else if (error.message?.includes('duplicate') || error.code === '23505') {
        alert('You have already reported this post.');
      } else if (error.message?.includes('violates row-level security') || error.code === '42501') {
        alert('Permission denied. Please make sure you are signed in and the database is properly configured.');
      } else {
        alert('Failed to submit report: ' + (error.message || 'Unknown error'));
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Report';
      return;
    }

    modal.classList.remove('is-active');
    setTimeout(() => modal.remove(), 200);


    const toast = document.createElement('div');
    toast.textContent = 'Report submitted. Thank you for helping keep the community safe.';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #27ae60;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  });
}

async function handleReport(e) {
  if (!currentUser) {
    alert('Please sign in to report posts');
    return;
  }

  const post = e.target.closest('.mb-post');
  const postId = post.getAttribute('data-id');

  showReportModal(postId);
}

// --- Comments ---
async function handleComment(e) {
  const post = e.target.closest('.mb-post');
  const postId = post.getAttribute('data-id');
  let commentBox = post.querySelector('.mb-commentBox');

  if (!commentBox) {
    commentBox = document.createElement('div');
    commentBox.className = 'mb-commentBox';


    const inputHtml = currentUser ? `
      <div class="mb-commentInputRow">
        <input type="text" class="mb-commentInput" placeholder="Write a comment..." />
        <button class="mb-btn mb-btnPrimary mb-sendBtn" type="button">Send</button>
      </div>
    ` : `
      <div class="mb-commentInputRow mb-guestPrompt" style="padding: 10px; background: rgba(0,0,0,0.03); border-radius: 8px; text-align: center; color: #666;">
        <a href="../auth/" style="color: #3b82f6; text-decoration: underline;">Sign in</a> to leave a comment
      </div>
    `;

    commentBox.innerHTML = `
      ${inputHtml}
      <div class="mb-comments"></div>
    `;
    post.appendChild(commentBox);


    await loadComments(postId, commentBox.querySelector('.mb-comments'));


    if (currentUser) {
      const sendBtn = commentBox.querySelector('.mb-btnPrimary');
      const input = commentBox.querySelector('.mb-commentInput');


      input.addEventListener('input', handleMentionInput);
      input.addEventListener('keydown', handleMentionKeydown);

      sendBtn.addEventListener('click', async () => {
        const text = input.value.trim();
        if (!text) return;

        if (containsProfanity(text)) {
          alert('Your comment contains inappropriate language. Please revise and try again.');
          return;
        }

        if (text && currentUser) {
          const client = initSupabase();
          if (!client) return;

          const { data, error } = await client
            .from('post_comments')
            .insert({
              post_id: postId,
              author_id: currentUser.id,
              author_email: currentUser.email,
              author_name: currentUser.email.split('@')[0],
              content: text
            })
            .select()
            .single();

          if (!error && data) {
            const commentsContainer = commentBox.querySelector('.mb-comments');
            const comment = createCommentElement(data);
            commentsContainer.appendChild(comment);
            input.value = '';

            const commentBtn = post.querySelector('.mb-postFooter .mb-btn:nth-child(2)');
            if (commentBtn) {
              const currentCount = parseInt(commentBtn.textContent.match(/\d+/)?.[0] || '0');
              commentBtn.textContent = `Comment (${currentCount + 1})`;
            }

            const postAuthorId = post.getAttribute('data-author-id');
            if (postAuthorId && postAuthorId !== currentUser.id) {
              const fromName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Someone';
              try {
                await client.from('notifications').insert({
                  user_id: postAuthorId,
                  type: 'comment',
                  from_user_name: fromName,
                  content: `${fromName} commented on your post`,
                  read: false
                });
              } catch (notifErr) {
                console.warn('Failed to create comment notification:', notifErr);
              }
            }

            processMentions(text, postId, data.id);
          }
        }
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendBtn.click();
        }
      });
    }
  } else {
    commentBox.style.display = commentBox.style.display === 'none' ? 'block' : 'none';
  }
}

async function loadComments(postId, container) {
  const client = initSupabase();
  if (!client) return;

  const { data, error } = await client
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (!error && data) {
    const authorIds = [...new Set(data.filter(c => c.author_id).map(c => c.author_id))];
    if (authorIds.length > 0) {
      try {
        const { data: profiles } = await client
          .from('profiles')
          .select('id, avatar_url, display_name')
          .in('id', authorIds);
        if (profiles) {
          profiles.forEach(p => {
            profileCache[p.id] = p;
          });
          data.forEach(comment => {
            if (comment.author_id && profileCache[comment.author_id]) {
              comment.avatar_url = profileCache[comment.author_id].avatar_url;
              if (!comment.author_name && profileCache[comment.author_id].display_name) {
                comment.author_name = profileCache[comment.author_id].display_name;
              }
            }
          });
        }
      } catch (e) {
        console.warn('Could not fetch comment author profiles:', e);
      }
    }
    data.forEach(comment => {
      container.appendChild(createCommentElement(comment));
    });
  }
}

async function deleteComment(commentId, commentEl) {
  if (!currentUser) return;
  if (!confirm('Delete this comment?')) return;

  const client = initSupabase();
  if (!client) return;

  const { error } = await client
    .from('post_comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', currentUser.id);

  if (!error) {
    commentEl.style.transition = 'opacity 0.3s, transform 0.3s';
    commentEl.style.opacity = '0';
    commentEl.style.transform = 'translateX(10px)';
    setTimeout(() => {
      commentEl.remove();
      const post = commentEl.closest('.mb-post');
      if (post) {
        const commentBtn = post.querySelector('.mb-postFooter .mb-btn:nth-child(2)');
        if (commentBtn) {
          const currentCount = parseInt(commentBtn.textContent.match(/\d+/)?.[0] || '1');
          commentBtn.textContent = `Comment (${Math.max(0, currentCount - 1)})`;
        }
      }
    }, 300);
  } else {
    console.error('Error deleting comment:', error);
  }
}

function createCommentElement(commentData) {
  const comment = document.createElement('div');
  comment.className = 'mb-comment';
  comment.setAttribute('data-comment-id', commentData.id);

  const isTeamComment = !commentData.author_id;
  const displayName = commentData.author_name || (isTeamComment ? 'MindSpace Team' : 'Anonymous');

  const avatarColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  const colorIndex = (commentData.author_id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % avatarColors.length;
  const initials = displayName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  let avatarHtml;
  if (isTeamComment) {
    avatarHtml = '<div class="mb-commentAvatar mb-commentAvatar--team">MB</div>';
  } else if (commentData.avatar_url) {
    avatarHtml = `<div class="mb-commentAvatar"><img src="${escapeHtml(commentData.avatar_url)}" alt="${escapeHtml(displayName)}" /></div>`;
  } else {
    avatarHtml = `<div class="mb-commentAvatar" style="background: ${avatarColors[colorIndex]}; color: #fff;">${initials}</div>`;
  }

  const level = isTeamComment ? null : getUserLevel(commentData.author_id || displayName);
  const levelBadgeHtml = level ? `<span class="mb-levelBadge mb-levelBadge--sm ${level.cls}">${level.label}</span>` : '';
  const teamBadgeHtml = isTeamComment ? '<span class="mb-teamBadge">Team</span>' : '';

  let authorHtml;
  if (commentData.author_id) {
    authorHtml = `<a href="/profile/?user=${commentData.author_id}" class="mb-commentAuthorLink">${escapeHtml(displayName)}</a>`;
  } else {
    authorHtml = `<span class="mb-commentAuthorName--team">${escapeHtml(displayName)}</span>`;
  }

  const timeStr = commentData.created_at ? formatTime(commentData.created_at) : '';

  const isOwnComment = currentUser && commentData.author_id === currentUser.id;
  const deleteHtml = isOwnComment ? `<button class="mb-commentDeleteBtn" title="Delete comment"><ion-icon name="trash-outline"></ion-icon></button>` : '';

  comment.innerHTML = `
    <div class="mb-commentLeft">
      ${avatarHtml}
    </div>
    <div class="mb-commentRight">
      <div class="mb-commentHeader">
        <div class="mb-commentMeta">
          ${authorHtml} ${teamBadgeHtml} ${levelBadgeHtml}
          <span class="mb-commentTime">${timeStr}</span>
        </div>
        ${deleteHtml}
      </div>
      <div class="mb-commentBody">${escapeHtml(commentData.content)}</div>
    </div>
  `;

  if (isOwnComment) {
    const deleteBtn = comment.querySelector('.mb-commentDeleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteComment(commentData.id, comment));
    }
  }

  return comment;
}

// --- HTML Escaping ---
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- Post Creation ---
async function handlePost() {
  const postText = document.getElementById('postText');
  const feedList = document.getElementById('feedList');
  const text = postText.value.trim();

  if (!text || !currentUser) return;

  if (containsProfanity(text)) {
    alert('Your post contains inappropriate language. Please revise and try again.');
    return;
  }

  const client = initSupabase();
  if (!client) {
    alert('Unable to connect. Please try again.');
    return;
  }

  const userName = currentUser.email.split('@')[0];

  const categorySelect = document.getElementById('postCategory');
  const category = categorySelect ? categorySelect.value : '';
  const fullContent = category ? `[${category}] ${text}` : text;

  let uploadedMediaUrl = null;
  if (selectedMediaFile) {
    const fileExt = selectedMediaFile.name.split('.').pop();
    const fileName = `${generateUUID()}.${fileExt}`;
    const filePath = `posts/${currentUser.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await client.storage
      .from('Post-Media')
      .upload(filePath, selectedMediaFile);

    if (uploadError) {
      console.error('Media upload error:', uploadError);

      if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
        alert('Media upload requires storage setup. Please create a "Post-Media" bucket in Supabase Storage. Your post will be created without the image.');
      } else {
        alert('Image upload failed: ' + (uploadError.message || 'Unknown error') + '. Your post will be created without the image.');
      }

      clearMediaPreview();
    } else {
      const { data: { publicUrl } } = client.storage
        .from('Post-Media')
        .getPublicUrl(filePath);
      uploadedMediaUrl = publicUrl;
    }
  }


  const placeholderId = generateUUID();
  const placeholder = document.createElement('article');
  placeholder.className = 'mb-post mb-post-pending card-animated hover-lift';
  placeholder.setAttribute('data-placeholder-id', placeholderId);
  placeholder.style.opacity = '0.6';
  const mediaPreviewHtml = uploadedMediaUrl ? `<div class="mb-postMedia"><img src="${uploadedMediaUrl}" alt="Post media" /></div>` : '';
  placeholder.innerHTML = `
    <div class="mb-postHead">
      <div class="mb-postMeta">
        <div class="mb-postName">${escapeHtml(userName)} <span class="mb-pill">Community</span></div>
        <div class="mb-postTime">Posting...</div>
      </div>
    </div>
    <div class="mb-postBody">${escapeHtml(text)}</div>
    ${mediaPreviewHtml}
    <div class="mb-postFooter">
      <button class="mb-btn" type="button" disabled>Like</button>
      <button class="mb-btn" type="button" disabled>Comment</button>
      <button class="mb-btn" type="button" disabled>Share</button>
    </div>
  `;
  feedList.insertBefore(placeholder, feedList.firstChild);
  postText.value = '';
  clearMediaPreview();

  const { data, error } = await client
    .from('posts')
    .insert({
      author_id: currentUser.id,
      author_email: currentUser.email,
      author_name: userName,
      content: fullContent,
      media_url: uploadedMediaUrl
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error.message || error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    placeholder.remove();
    if (error.message && error.message.includes('does not exist')) {
      alert('The forum database needs to be set up. Please run the supabase-setup.sql script in your Supabase SQL Editor.');
    } else {
      alert('Failed to create post: ' + (error.message || 'Unknown error'));
    }
    return;
  }


  recentlyPostedIds.add(data.id);
  suppressRealtimeUntil = Date.now() + 1000;


  setTimeout(() => recentlyPostedIds.delete(data.id), 10000);


  placeholder.remove();


  if (!renderedPostIds.has(data.id)) {
    renderedPostIds.add(data.id);
    const userProfile = await fetchUserProfile(currentUser.id);
    if (userProfile && userProfile.avatar_url) {
      data.avatar_url = userProfile.avatar_url;
    }
    const newPost = createPostElement(data, 'Just now');
    feedList.insertBefore(newPost, feedList.firstChild);
    enableInteractions();
    updateDeleteButtons();
  }

  const hasPosted = localStorage.getItem('mb-first-post');
  if (!hasPosted) {
    localStorage.setItem('mb-first-post', 'true');
    showConfetti();
  }

  if (categorySelect) categorySelect.value = '';

  processMentions(text, data.id, null);
}

// --- Post Rendering ---
function getUserLevel(authorId) {
  const hash = (authorId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const level = hash % 4;
  if (level === 3) return { label: '🏆 ' + getTranslation('community_level_champion', 'Champion'), cls: 'mb-levelBadge--champion' };
  if (level === 2) return { label: '💪 ' + getTranslation('community_level_supporter', 'Supporter'), cls: 'mb-levelBadge--supporter' };
  if (level === 1) return { label: '👤 ' + getTranslation('community_level_regular', 'Regular'), cls: 'mb-levelBadge--regular' };
  return { label: '🌱 ' + getTranslation('community_level_newcomer', 'Newcomer'), cls: 'mb-levelBadge--newcomer' };
}

function createPostElement(postData, timeStr) {
  const article = document.createElement('article');
  article.className = 'mb-post card-animated hover-lift' + (postData.is_pinned ? ' mb-post-pinned' : '');
  article.setAttribute('data-text', postData.content);
  article.setAttribute('data-id', postData.id);
  article.setAttribute('data-email', postData.author_email);
  article.setAttribute('data-author-id', postData.author_id || '');
  article.setAttribute('data-pinned', postData.is_pinned ? 'true' : 'false');

  const isOwnPost = currentUser && currentUser.email === postData.author_email;
  const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
  const showDeleteButton = canDeletePost(postData.author_email);
  const deleteButton = showDeleteButton
    ? `<button class="mb-btn mb-deleteBtn" type="button" style="color: #dc2626;">${getTranslation('community_delete', 'Delete')}</button>`
    : '';
  const editButton = isOwnPost
    ? `<button class="mb-btn mb-editBtn" type="button">${getTranslation('community_edit', 'Edit')}</button>`
    : '';
  const pinButton = isAdmin
    ? `<button class="mb-btn mb-pinBtn" type="button" title="${postData.is_pinned ? 'Unpin post' : 'Pin post'}" data-translate="${postData.is_pinned ? 'community_unpin' : 'community_pin'}">${postData.is_pinned ? '📌 Unpin' : '📌 Pin'}</button>`
    : '';

  const likeCount = postData.like_count || 0;
  const commentCount = postData.comment_count || 0;
  const isEdited = postData.edited_at ? ' <span class="mb-edited-tag">(edited)</span>' : '';
  const pinnedBadge = postData.is_pinned ? '<span class="mb-pinned-badge" data-translate="community_pinned">📌 Pinned</span>' : '';


  const mediaHtml = postData.media_url ? `<div class="mb-postMedia"><img src="${escapeHtml(postData.media_url)}" alt="Post media" loading="lazy" /></div>` : '';


  if (postData.edited_at) {
    article.dataset.edited = 'true';
  }

  const displayName = postData.author_name || 'MindSpace Team';
  const authorLink = postData.author_id
    ? `<a href="/profile/?user=${postData.author_id}" class="mb-postAuthorLink">${escapeHtml(displayName)}</a>`
    : escapeHtml(displayName);

  const isTeamPost = !postData.author_id || displayName === 'MindSpace Team';
  const initials = displayName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const avatarColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  const colorIndex = (postData.author_id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % avatarColors.length;
  const avatarColor = avatarColors[colorIndex];

  let categoryHtml = '';
  let displayContent = postData.content;
  const catMatch = displayContent.match(/^\[(motivation|question|story|resource|tip)\]\s*/i);
  if (catMatch) {
    const cat = catMatch[1].toLowerCase();
    const catEmojis = { motivation: '💪', question: '❓', story: '📖', resource: '📚', tip: '💡' };
    categoryHtml = `<span class="mb-categoryTag mb-categoryTag--${cat}">${catEmojis[cat] || ''} ${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>`;
    displayContent = displayContent.replace(catMatch[0], '');
  }

  const level = isTeamPost ? null : getUserLevel(postData.author_id || displayName);
  const levelBadgeHtml = level ? `<span class="mb-levelBadge ${level.cls}">${level.label}</span>` : '';

  let avatarHtml;
  if (isTeamPost) {
    avatarHtml = `<div class="mb-postAvatar mb-postAvatar--team">MB</div>`;
  } else if (postData.avatar_url) {
    avatarHtml = `<div class="mb-postAvatar" style="padding:0; overflow:hidden;"><img src="${escapeHtml(postData.avatar_url)}" alt="${escapeHtml(displayName)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" /></div>`;
  } else {
    avatarHtml = `<div class="mb-postAvatar" style="background: ${avatarColor}; display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 15px;">${initials}</div>`;
  }

  article.innerHTML = `
    <div class="mb-postHead">
      ${avatarHtml}
      <div class="mb-postMeta">
        <div class="mb-postName">${authorLink} ${levelBadgeHtml} ${categoryHtml} ${pinnedBadge}</div>
        <div class="mb-postTime">${timeStr || formatTime(postData.created_at)}</div>
      </div>
    </div>
    <div class="mb-postBody">${escapeHtml(displayContent)}${isEdited}</div>
    ${mediaHtml}
    <div class="mb-postFooter">
      <div class="mb-reactions">
        <button class="mb-btn mb-likeBtn mb-reactionBtn--like" type="button"><span class="heart-icon">♡</span> ${getTranslation('community_like', 'Like')} <span class="like-count">${likeCount > 0 ? likeCount : ''}</span></button>
        <div class="mb-reactionPicker" style="display:none;">
          <button class="mb-reactionOption" data-reaction="support" title="${getTranslation('community_reaction_support', 'Support')}">❤️</button>
          <button class="mb-reactionOption" data-reaction="insightful" title="${getTranslation('community_reaction_insightful', 'Insightful')}">💡</button>
          <button class="mb-reactionOption" data-reaction="hug" title="${getTranslation('community_reaction_hug', 'Hug')}">🤗</button>
          <button class="mb-reactionOption" data-reaction="applause" title="${getTranslation('community_reaction_applause', 'Applause')}">👏</button>
        </div>
      </div>
      <button class="mb-btn mb-commentBtn" type="button">${getTranslation('community_comment', 'Comment')} ${commentCount > 0 ? '(' + commentCount + ')' : ''}</button>
      <button class="mb-btn mb-shareBtn" type="button">${getTranslation('community_share', 'Share')}</button>
      <button class="mb-btn mb-bookmarkBtn" type="button" title="${getTranslation('community_bookmark', 'Bookmark')}">🔖</button>
      ${editButton}
      ${pinButton}
      ${deleteButton}
      <button class="mb-btn mb-reportBtn" type="button" title="${getTranslation('community_report', 'Report post')}">⚑</button>
    </div>
  `;


  const likeBtn = article.querySelector('.mb-likeBtn');
  const commentBtn = article.querySelector('.mb-commentBtn');
  const shareBtn = article.querySelector('.mb-shareBtn');
  const reportBtn = article.querySelector('.mb-reportBtn');

  if (likeBtn) {
    likeBtn.dataset.bound = 'true';
    likeBtn.addEventListener('click', handleLike);
  }

  if (commentBtn) {
    commentBtn.dataset.bound = 'true';
    commentBtn.addEventListener('click', handleComment);
  }

  if (shareBtn) {
    shareBtn.dataset.bound = 'true';
    shareBtn.addEventListener('click', handleShare);
  }

  if (reportBtn) {
    reportBtn.dataset.bound = 'true';
    reportBtn.addEventListener('click', handleReport);
  }

  if (showDeleteButton) {
    const deleteBtn = article.querySelector('.mb-deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => handleDelete(article));
    }
  }

  if (isOwnPost) {
    const editBtn = article.querySelector('.mb-editBtn');
    if (editBtn) {
      editBtn.addEventListener('click', handleEdit);
    }
  }


  if (isAdmin) {
    const pinBtn = article.querySelector('.mb-pinBtn');
    if (pinBtn) {
      pinBtn.addEventListener('click', handlePin);
    }
  }

  const reactionBtn = article.querySelector('.mb-reactionBtn--like');
  const reactionPicker = article.querySelector('.mb-reactionPicker');
  if (reactionBtn && reactionPicker) {
    let pickerTimeout;
    reactionBtn.addEventListener('mouseenter', () => {
      clearTimeout(pickerTimeout);
      reactionPicker.style.display = 'flex';
    });
    reactionBtn.addEventListener('mouseleave', () => {
      pickerTimeout = setTimeout(() => { reactionPicker.style.display = 'none'; }, 400);
    });
    reactionPicker.addEventListener('mouseenter', () => clearTimeout(pickerTimeout));
    reactionPicker.addEventListener('mouseleave', () => {
      pickerTimeout = setTimeout(() => { reactionPicker.style.display = 'none'; }, 300);
    });
    reactionPicker.querySelectorAll('.mb-reactionOption').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        reactionBtn.querySelector('.heart-icon').textContent = opt.textContent;
        reactionPicker.style.display = 'none';
        if (!reactionBtn.dataset.liked || reactionBtn.dataset.liked !== 'true') {
          reactionBtn.click();
        }
      });
    });
  }

  const postBody = article.querySelector('.mb-postBody');
  if (postBody && (displayContent || postData.content).length > 200) {
    postBody.classList.add('mb-postBody--truncated');
    const readMore = document.createElement('button');
    readMore.className = 'mb-readMore';
    readMore.textContent = 'Read more';
    readMore.addEventListener('click', () => {
      postBody.classList.toggle('mb-postBody--truncated');
      readMore.textContent = postBody.classList.contains('mb-postBody--truncated') ? 'Read more' : 'Show less';
    });
    postBody.after(readMore);
  }

  const bookmarkBtn = article.querySelector('.mb-bookmarkBtn');
  if (bookmarkBtn) {
    const bookmarks = JSON.parse(localStorage.getItem('mb-bookmarks') || '[]');
    if (bookmarks.includes(postData.id)) bookmarkBtn.classList.add('is-bookmarked');
    bookmarkBtn.addEventListener('click', () => {
      const bm = JSON.parse(localStorage.getItem('mb-bookmarks') || '[]');
      const idx = bm.indexOf(postData.id);
      if (idx > -1) { bm.splice(idx, 1); bookmarkBtn.classList.remove('is-bookmarked'); }
      else { bm.push(postData.id); bookmarkBtn.classList.add('is-bookmarked'); }
      localStorage.setItem('mb-bookmarks', JSON.stringify(bm));
    });
  }

  return article;
}

// --- Pinning ---
async function handlePin(e) {
  if (!currentUser || currentUser.email !== ADMIN_EMAIL) return;

  const btn = e.target.closest('.mb-pinBtn');
  const post = e.target.closest('.mb-post');
  const postId = post.getAttribute('data-id');
  const isPinned = post.getAttribute('data-pinned') === 'true';

  btn.disabled = true;
  btn.textContent = isPinned ? 'Unpinning...' : 'Pinning...';

  const client = initSupabase();

  const { error } = await client
    .from('posts')
    .update({
      is_pinned: !isPinned,
      pinned_at: isPinned ? null : new Date().toISOString()
    })
    .eq('id', postId);

  if (error) {
    console.error('Pin error:', error);
    alert('Failed to ' + (isPinned ? 'unpin' : 'pin') + ' post: ' + (error.message || 'Unknown error'));
    btn.disabled = false;
    btn.textContent = isPinned ? '📌 Unpin' : '📌 Pin';
    return;
  }


  post.setAttribute('data-pinned', isPinned ? 'false' : 'true');
  btn.textContent = isPinned ? '📌 Pin' : '📌 Unpin';
  btn.setAttribute('data-translate', isPinned ? 'community_pin' : 'community_unpin');
  btn.title = isPinned ? 'Pin post' : 'Unpin post';
  btn.disabled = false;


  const nameDiv = post.querySelector('.mb-postName');
  const existingBadge = nameDiv.querySelector('.mb-pinned-badge');

  if (isPinned && existingBadge) {
    existingBadge.remove();
    post.classList.remove('mb-post-pinned');
  } else if (!isPinned && !existingBadge) {
    const badge = document.createElement('span');
    badge.className = 'mb-pinned-badge';
    badge.textContent = '📌 Pinned';
    badge.setAttribute('data-translate', 'community_pinned');
    nameDiv.appendChild(badge);
    post.classList.add('mb-post-pinned');
  }


  await loadPosts(true);
}

// --- Time Formatting ---
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- Feed Loading ---
async function loadPosts(forceReload = false) {

  if (loadingPosts) return;
  loadingPosts = true;
  suppressRealtimeUntil = Date.now() + 2000;

  if (postsLoaded && !forceReload) {
    loadingPosts = false;
    return;
  }

  const feedList = document.getElementById('feedList');
  if (feedList) {
    feedList.innerHTML = Array(3).fill('').map(() => `
      <div class="mb-skeleton">
        <div class="mb-skeleton__head">
          <div class="mb-skeleton__circle"></div>
          <div style="flex:1; display:grid; gap:6px;">
            <div class="mb-skeleton__line mb-skeleton__line--short"></div>
            <div class="mb-skeleton__line mb-skeleton__line--medium" style="height:8px;"></div>
          </div>
        </div>
        <div class="mb-skeleton__body">
          <div class="mb-skeleton__line mb-skeleton__line--long"></div>
          <div class="mb-skeleton__line mb-skeleton__line--medium"></div>
        </div>
      </div>
    `).join('');
  }

  const client = initSupabase();
  if (!client) {
    loadingPosts = false;
    return;
  }

  if (!feedList) {
    loadingPosts = false;
    return;
  }


  renderedPostIds.clear();

  const { data, error } = await client
    .from('posts')
    .select('*')
    .order('is_pinned', { ascending: false, nullsFirst: false })
    .order('pinned_at', { ascending: false, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error loading posts:', error);
    loadingPosts = false;
    if (error.message && error.message.includes('does not exist')) {
      feedList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔧</div>
          <h3 style="margin-bottom: 8px; color: #333;">Forum Setup Required</h3>
          <p style="max-width: 400px; margin: 0 auto; line-height: 1.5;">
            The community forum database needs to be set up. Please run the <code>supabase-setup.sql</code> script in your Supabase SQL Editor.
          </p>
        </div>
      `;
    }
    return;
  }

  feedList.innerHTML = '';

  if (data && data.length > 0) {
    const uniqueAuthorIds = [...new Set(data.map(p => p.author_id).filter(Boolean))];
    if (uniqueAuthorIds.length > 0) {
      const { data: profiles } = await client.from('profiles').select('id, avatar_url').in('id', uniqueAuthorIds);
      if (profiles) {
        const profileMap = {};
        profiles.forEach(p => { profileMap[p.id] = p; });
        data.forEach(post => {
          if (post.author_id && profileMap[post.author_id]) {
            post.avatar_url = profileMap[post.author_id].avatar_url;
          }
        });
      }
    }

    if (currentUser) {
      const { data: userLikes } = await client
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUser.id);

      const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);

      data.forEach(postData => {
        if (renderedPostIds.has(postData.id)) return;
        renderedPostIds.add(postData.id);
        const article = createPostElement(postData);
        if (likedPostIds.has(postData.id)) {
          const likeBtn = article.querySelector('.mb-likeBtn');
          if (likeBtn) {
            likeBtn.dataset.liked = 'true';
            likeBtn.innerHTML = `<span class="heart-icon">♥</span> Liked <span class="like-count">${postData.like_count || ''}</span>`;
          }
        }
        feedList.appendChild(article);
      });
    } else {
      data.forEach(postData => {
        if (renderedPostIds.has(postData.id)) return;
        renderedPostIds.add(postData.id);
        const article = createPostElement(postData);
        feedList.appendChild(article);
      });
    }

    enableInteractions();
    updateDeleteButtons();


    if (data.length > 0) {
      lastLoadedTimestamp = new Date(data[0].created_at).getTime();
    }
  }

  postsLoaded = true;
  loadingPosts = false;

  scrollToHashPost();
}

function scrollToHashPost() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#post-')) return;
  const postId = hash.replace('#post-', '');
  const targetPost = document.querySelector(`.mb-post[data-id="${postId}"]`);
  if (targetPost) {
    setTimeout(() => {
      targetPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetPost.style.transition = 'box-shadow 0.4s ease';
      targetPost.style.boxShadow = '0 0 0 3px var(--accent-color, #2068A8), 0 4px 20px rgba(0,0,0,0.15)';
      setTimeout(() => {
        targetPost.style.boxShadow = '';
      }, 3000);
    }, 300);
  }
}

async function loadCommunityStats() {
  try {
    const client = initSupabase();
    if (!client) return;
    const { count: postCount } = await client.from('posts').select('*', { count: 'exact', head: true });
    const postsEl = document.getElementById('statPosts');
    if (postsEl) postsEl.textContent = postCount || 0;

    const membersEl = document.getElementById('statMembers');
    if (membersEl) membersEl.textContent = Math.floor((postCount || 0) * 2.5 + 12);

    const activeEl = document.getElementById('statActive');
    if (activeEl) activeEl.textContent = Math.floor(Math.random() * 5) + 1;
  } catch (e) {
    console.log('Stats load error:', e);
  }
}

async function loadTopContributors() {
  try {
    const client = initSupabase();
    if (!client) return;
    const { data: posts } = await client
      .from('posts')
      .select('author_name, author_id')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!posts) return;
    const counts = {};
    posts.forEach(p => {
      const key = p.author_name || 'MindSpace Team';
      if (!counts[key]) counts[key] = { name: key, count: 0 };
      counts[key].count++;
    });
    const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
    const container = document.getElementById('topContributors');
    if (!container) return;
    const avatarColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
    container.innerHTML = sorted.map((c, i) => {
      const initials = c.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      return '<div class="mb-contributor"><div class="mb-contributor__avatar" style="background:' + avatarColors[i % avatarColors.length] + ';">' + initials + '</div><div class="mb-contributor__info"><span class="mb-contributor__name">' + c.name + '</span><span class="mb-contributor__posts">' + c.count + ' post' + (c.count !== 1 ? 's' : '') + '</span></div></div>';
    }).join('');
  } catch (e) { console.log('Top contributors error:', e); }
}

// --- Realtime ---
function setupRealtimeSubscription() {

  if (realtimeSetup) return;
  realtimeSetup = true;

  const client = initSupabase();
  if (!client) {
    realtimeSetup = false;
    return;
  }

  if (realtimeChannel) {
    client.removeChannel(realtimeChannel);
  }

  realtimeChannel = client
    .channel('community-posts')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'posts' },
      (payload) => {
        const feedList = document.getElementById('feedList');
        if (!feedList) return;


        if (Date.now() < suppressRealtimeUntil) return;


        if (loadingPosts) return;


        if (renderedPostIds.has(payload.new.id)) return;


        if (recentlyPostedIds.has(payload.new.id)) return;


        if (lastLoadedTimestamp && payload.new.created_at) {
          const postTime = new Date(payload.new.created_at).getTime();
          if (postTime <= lastLoadedTimestamp) return;
        }


        const existingPost = feedList.querySelector(`[data-id="${payload.new.id}"]`);
        if (!existingPost) {
          renderedPostIds.add(payload.new.id);
          if (payload.new.author_id) {
            fetchUserProfile(payload.new.author_id).then(function(profile) {
              if (profile && profile.avatar_url) {
                payload.new.avatar_url = profile.avatar_url;
              }
              const article = createPostElement(payload.new, 'Just now');
              feedList.insertBefore(article, feedList.firstChild);
              enableInteractions();
              updateDeleteButtons();
            });
          } else {
            const article = createPostElement(payload.new, 'Just now');
            feedList.insertBefore(article, feedList.firstChild);
            enableInteractions();
            updateDeleteButtons();
          }
        }
      }
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'posts' },
      (payload) => {
        const feedList = document.getElementById('feedList');
        if (!feedList) return;


        renderedPostIds.delete(payload.old.id);

        const deletedPost = feedList.querySelector(`[data-id="${payload.old.id}"]`);
        if (deletedPost) {
          deletedPost.style.transition = 'opacity 0.3s';
          deletedPost.style.opacity = '0';
          setTimeout(() => deletedPost.remove(), 300);
        }
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'posts' },
      (payload) => {
        const feedList = document.getElementById('feedList');
        if (!feedList) return;

        const updatedPost = feedList.querySelector(`[data-id="${payload.new.id}"]`);
        if (updatedPost) {

          const likeBtn = updatedPost.querySelector('.mb-likeBtn');
          if (likeBtn) {
            let likeCountSpan = likeBtn.querySelector('.like-count');
            if (likeCountSpan) {
              likeCountSpan.textContent = payload.new.like_count > 0 ? payload.new.like_count : '';
            }
          }


          const commentBtn = updatedPost.querySelector('.mb-commentBtn');
          if (commentBtn) {
            const commentCount = payload.new.comment_count || 0;
            commentBtn.textContent = commentCount > 0 ? `Comment (${commentCount})` : 'Comment';
          }


          if (payload.new.edited_at) {
            const postBody = updatedPost.querySelector('.mb-postBody');
            if (postBody && !postBody.querySelector('.mb-editTextarea')) {
              updatedPost.setAttribute('data-text', payload.new.content);
              postBody.innerHTML = escapeHtml(payload.new.content) + ' <span class="mb-edited-tag">(edited)</span>';
            }
          }
        }
      }
    )
    .subscribe();
}

// --- Auth Change Handler ---
function handleAuthChange(user) {

  if (pendingAuthDebounce) {
    clearTimeout(pendingAuthDebounce);
  }

  pendingAuthDebounce = setTimeout(() => {
    pendingAuthDebounce = null;
    currentUser = user;
    updateCommunityUI(user);


    if (postsLoaded) {
      loadPosts(true);
    } else if (!authHandled) {
      authHandled = true;
      loadPosts();
    }

    if (user) {
      enableInteractions();
      updateDeleteButtons();
    }
  }, 100);
}

// --- Initialization ---
async function init() {
  if (initialized) return;
  initialized = true;

  const postBtn = document.getElementById('postBtn');
  if (postBtn) {
    postBtn.addEventListener('click', handlePost);
  }

  const postText = document.getElementById('postText');
  if (postText) {
    postText.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handlePost();
      }
    });
  }


  const mediaBtn = document.getElementById('mediaBtn');
  const mediaInput = document.getElementById('mediaInput');
  const mediaPreview = document.getElementById('mediaPreview');
  const mediaPreviewImg = document.getElementById('mediaPreviewImg');
  const removeMediaBtn = document.getElementById('removeMediaBtn');

  if (mediaBtn && mediaInput) {
    mediaBtn.addEventListener('click', () => {
      if (!currentUser) {
        alert(getTranslation('signin_required', 'Please sign in to add media'));
        return;
      }
      mediaInput.click();
    });

    mediaInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;


      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        mediaInput.value = '';
        return;
      }


      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        mediaInput.value = '';
        return;
      }

      selectedMediaFile = file;
      mediaPreviewUrl = URL.createObjectURL(file);

      if (mediaPreview && mediaPreviewImg) {
        mediaPreviewImg.src = mediaPreviewUrl;
        mediaPreview.style.display = 'block';
      }

      mediaBtn.textContent = '📎 Change';
      mediaBtn.setAttribute('data-translate', 'community_media_change');
    });
  }

  if (removeMediaBtn) {
    removeMediaBtn.addEventListener('click', () => {
      clearMediaPreview();
    });
  }

  setupRealtimeSubscription();

  if (window.MindSpaceAuth && window.MindSpaceAuth.onAuthReady) {



    window.MindSpaceAuth.onAuthChange(handleAuthChange);
  } else {

    const user = await checkAuth();
    currentUser = user;
    updateCommunityUI(user);


    if (!authHandled) {
      authHandled = true;
      await loadPosts();
    }


    const client = initSupabase();
    if (client) {
      client.auth.onAuthStateChange((event, session) => {

        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          handleAuthChange(session?.user || null);
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', init);



// ==================== FOLLOWING FEED ====================
async function loadFollowingPosts() {
  if (!currentUser) return;

  const feedList = document.getElementById('feedList');
  if (!feedList) return;

  const existingSignIn = feedList.querySelector('.mb-followingSignIn');
  if (existingSignIn) existingSignIn.remove();
  const existingEmpty = feedList.querySelector('.mb-followingEmpty');
  if (existingEmpty) existingEmpty.remove();

  const posts = Array.from(feedList.querySelectorAll('.mb-post'));
  posts.forEach(p => p.style.display = 'none');

  const client = initSupabase();
  if (!client) return;

  try {
    const { data: follows, error: followError } = await client
      .from('followers')
      .select('following_id')
      .eq('follower_id', currentUser.id);

    if (followError) {
      console.warn('Follows table may not exist yet:', followError.message);
      showFollowingEmpty(feedList, true);
      return;
    }

    const followedIds = (follows || []).map(f => f.following_id);

    if (followedIds.length === 0) {
      showFollowingEmpty(feedList, false);
      return;
    }

    let visibleCount = 0;
    posts.forEach(post => {
      const postAuthorId = post.getAttribute('data-author-id');
      if (postAuthorId && followedIds.includes(postAuthorId)) {
        post.style.display = '';
        visibleCount++;
      }
    });

    if (visibleCount === 0) {
      showFollowingEmpty(feedList, false);
    }
  } catch (err) {
    console.error('Error loading following posts:', err);
    showFollowingEmpty(feedList, true);
  }
}

function showFollowingEmpty(feedList, isError) {
  const el = document.createElement('div');
  el.className = 'mb-followingEmpty';
  if (isError) {
    el.innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        <div style="font-size:48px; margin-bottom:16px;">👥</div>
        <h3 style="margin-bottom:8px; color:#333; font-size:18px;" data-translate="community_following_empty_title">No followed posts yet</h3>
        <p style="color:#666; max-width:360px; margin:0 auto; line-height:1.5;" data-translate="community_following_empty_text">Follow members by clicking the follow button on their posts to see their updates here.</p>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        <div style="font-size:48px; margin-bottom:16px;">👥</div>
        <h3 style="margin-bottom:8px; color:#333; font-size:18px;" data-translate="community_following_empty_title">No followed posts yet</h3>
        <p style="color:#666; max-width:360px; margin:0 auto; line-height:1.5;" data-translate="community_following_empty_text">Follow members by clicking the follow button on their posts to see their updates here.</p>
      </div>
    `;
  }
  feedList.appendChild(el);
  if (typeof applyTranslations === 'function') applyTranslations();
}

// ==================== POPULAR DISCUSSIONS ====================
async function loadPopularDiscussions() {
  const container = document.getElementById('popularDiscussions');
  if (!container) return;


  let client = initSupabase();
  if (!client) {

    if (typeof supabase !== 'undefined') {
      const SUPABASE_URL = "https://cxjqessxarjayqxvhnhs.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4anFlc3N4YXJqYXlxeHZobmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjQwOTEsImV4cCI6MjA4MzYwMDA5MX0.SUI4sPOSPxDiGwqwQr19UOKtbK7KmjMqkX6HUT6-yps";
      client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  }

  if (!client) {
    container.innerHTML = '<div class="mb-miniItem"><div class="mb-miniSub">Unable to load</div></div>';
    return;
  }

  try {

    const { data: posts, error } = await client
      .from('posts')
      .select('id, content, like_count, comment_count')
      .order('like_count', { ascending: false, nullsFirst: false })
      .limit(5);

    if (error) throw error;

    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="mb-miniItem"><div class="mb-miniSub">No discussions yet</div></div>';
      return;
    }

    container.innerHTML = '';
    posts.forEach((post, index) => {
      const link = document.createElement('a');
      link.href = '#post-' + post.id;
      link.className = 'mb-miniItem mb-miniLink';
      link.onclick = (e) => {
        e.preventDefault();
        scrollToPost(post.id);
      };

      const title = document.createElement('div');
      title.className = 'mb-miniTitle';
      title.textContent = truncateText(post.content, 50);

      const sub = document.createElement('div');
      sub.className = 'mb-miniSub';
      const likes = post.like_count || 0;
      const comments = post.comment_count || 0;
      const labels = ['Most active', 'Trending', 'Popular', 'Hot', 'Discussed'];
      sub.textContent = `${likes} likes · ${comments} replies · ${labels[index] || 'Popular'}`;

      link.appendChild(title);
      link.appendChild(sub);
      container.appendChild(link);
    });
  } catch (err) {
    console.error('Error loading popular discussions:', err);
    container.innerHTML = '<div class="mb-miniItem"><div class="mb-miniSub">Unable to load</div></div>';
  }
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// --- Scroll to Post ---
function scrollToPost(postId) {
  const postEl = document.querySelector(`[data-id="${postId}"]`);
  if (postEl) {
    postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    postEl.style.transition = 'box-shadow 0.3s ease';
    postEl.style.boxShadow = '0 0 0 3px rgba(32, 104, 168, 0.5)';
    setTimeout(() => {
      postEl.style.boxShadow = '';
    }, 2000);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadPopularDiscussions, 1500);
  setTimeout(loadCommunityStats, 500);
  setTimeout(loadTopContributors, 800);
  setupMentions();
  loadNotificationCount();
});



// ==================== MENTIONS SYSTEM ====================
function setupMentions() {
  const postInput = document.getElementById('postInput');
  if (postInput) {
    postInput.addEventListener('input', handleMentionInput);
    postInput.addEventListener('keydown', handleMentionKeydown);
  }
}

async function handleMentionInput(e) {
  const input = e.target;
  const text = input.value;
  const cursorPos = input.selectionStart;


  const beforeCursor = text.substring(0, cursorPos);
  const atMatch = beforeCursor.match(/@(\w*)$/);

  if (atMatch) {
    const searchTerm = atMatch[1];
    mentionStartPos = cursorPos - searchTerm.length - 1;
    activeMentionInput = input;

    if (searchTerm.length >= 1) {
      clearTimeout(mentionSearchTimeout);
      mentionSearchTimeout = setTimeout(() => searchUsers(searchTerm, input), 200);
    } else {
      showMentionDropdown([], input);
    }
  } else {
    hideMentionDropdown();
  }
}

async function searchUsers(term, input) {
  const client = initSupabase();
  if (!client) return;

  try {
    const { data: users, error } = await client
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${term}%`)
      .limit(5);

    if (error) throw error;
    mentionUsers = users || [];
    showMentionDropdown(mentionUsers, input);
  } catch (err) {
    console.error('Error searching users:', err);
  }
}

function showMentionDropdown(users, input) {
  hideMentionDropdown();

  if (users.length === 0) return;

  mentionDropdown = document.createElement('div');
  mentionDropdown.className = 'mb-mention-dropdown';

  users.forEach((user, index) => {
    const item = document.createElement('div');
    item.className = 'mb-mention-item';
    if (index === 0) item.classList.add('active');
    item.dataset.userId = user.id;
    item.dataset.name = user.display_name || 'User';

    const avatar = document.createElement('img');
    avatar.className = 'mb-mention-avatar';
    avatar.src = user.avatar_url || '/assets/images/default-avatar.png';
    avatar.onerror = () => { avatar.src = '/assets/images/default-avatar.png'; };

    const name = document.createElement('span');
    name.className = 'mb-mention-name';
    name.textContent = user.display_name || 'User';

    item.appendChild(avatar);
    item.appendChild(name);
    item.onclick = () => selectMention(user, input);
    mentionDropdown.appendChild(item);
  });


  const rect = input.getBoundingClientRect();
  mentionDropdown.style.position = 'absolute';
  mentionDropdown.style.top = (rect.bottom + window.scrollY + 5) + 'px';
  mentionDropdown.style.left = rect.left + 'px';
  mentionDropdown.style.width = rect.width + 'px';

  document.body.appendChild(mentionDropdown);
}

function hideMentionDropdown() {
  if (mentionDropdown) {
    mentionDropdown.remove();
    mentionDropdown = null;
  }
  mentionUsers = [];
}

function selectMention(user, input) {
  const text = input.value;
  const cursorPos = input.selectionStart;
  const beforeAt = text.substring(0, mentionStartPos);
  const afterCursor = text.substring(cursorPos);

  const mentionText = `@${user.display_name || 'User'} `;
  input.value = beforeAt + mentionText + afterCursor;

  const newPos = mentionStartPos + mentionText.length;
  input.setSelectionRange(newPos, newPos);
  input.focus();

  hideMentionDropdown();
}

function handleMentionKeydown(e) {
  if (!mentionDropdown) return;

  const items = mentionDropdown.querySelectorAll('.mb-mention-item');
  if (items.length === 0) return;

  const activeIndex = Array.from(items).findIndex(i => i.classList.contains('active'));

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    items[activeIndex]?.classList.remove('active');
    const nextIndex = (activeIndex + 1) % items.length;
    items[nextIndex]?.classList.add('active');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    items[activeIndex]?.classList.remove('active');
    const prevIndex = (activeIndex - 1 + items.length) % items.length;
    items[prevIndex]?.classList.add('active');
  } else if (e.key === 'Enter' && mentionDropdown) {
    e.preventDefault();
    const activeItem = mentionDropdown.querySelector('.mb-mention-item.active');
    if (activeItem) {
      const user = {
        id: activeItem.dataset.userId,
        display_name: activeItem.dataset.name
      };
      selectMention(user, e.target);
    }
  } else if (e.key === 'Escape') {
    hideMentionDropdown();
  }
}


async function processMentions(text, postId, commentId = null) {

// ==================== NOTIFICATIONS SYSTEM ====================
  if (!currentUser) return;

  const mentionRegex = /@(\w+(?:\s\w+)?)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  if (mentions.length === 0) return;

  const client = initSupabase();
  if (!client) return;

  try {

    for (const mentionName of mentions) {
      const { data: users } = await client
        .from('profiles')
        .select('id')
        .ilike('display_name', mentionName)
        .limit(1);

      if (users && users.length > 0 && users[0].id !== currentUser.id) {

        await client.from('notifications').insert({
          user_id: users[0].id,
          type: 'mention',
          from_user_id: currentUser.id,
          from_user_name: currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Someone',
          post_id: postId,
          comment_id: commentId,
          content: text.substring(0, 100)
        });
      }
    }
  } catch (err) {
    console.error('Error processing mentions:', err);
  }
}


async function loadNotificationCount() {
  if (!currentUser) return;

  const client = initSupabase();
  if (!client) return;

  try {
    const { count, error } = await client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('read', false);

    if (error) throw error;

    updateNotificationBadge(count || 0);
  } catch (err) {
    console.error('Error loading notification count:', err);
  }
}

function updateNotificationBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }
}

async function loadNotifications() {
  if (!currentUser) return [];

  const client = initSupabase();
  if (!client) return [];

  try {
    const { data: notifications, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return notifications || [];
  } catch (err) {
    console.error('Error loading notifications:', err);
    return [];
  }
}

async function markNotificationRead(notifId) {
  const client = initSupabase();
  if (!client) return;

  try {
    await client
      .from('notifications')
      .update({ read: true })
      .eq('id', notifId);

    loadNotificationCount();
  } catch (err) {
    console.error('Error marking notification read:', err);
  }
}

async function markAllNotificationsRead() {
  if (!currentUser) return;

  const client = initSupabase();
  if (!client) return;

  try {
    await client
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id)
      .eq('read', false);

    updateNotificationBadge(0);
  } catch (err) {
    console.error('Error marking all notifications read:', err);
  }
}

let lastFocusedElement = null;

function openInbox() {
  const modal = document.getElementById('inboxModal');
// --- Inbox Modal ---
  if (modal) {
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    loadAndRenderNotifications();


    const closeBtn = modal.querySelector('.mb-inbox-close');
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 100);
    }
  }
}

function closeInbox() {
  const modal = document.getElementById('inboxModal');
  if (modal) modal.hidden = true;


  if (lastFocusedElement) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}


document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('inboxModal');
    if (modal && !modal.hidden) {
      closeInbox();
    }
  }
});


document.addEventListener('click', (e) => {
  const modal = document.getElementById('inboxModal');
  if (modal && !modal.hidden && e.target === modal) {
    closeInbox();
  }
});

async function loadAndRenderNotifications() {
  const container = document.getElementById('notificationsList');
  if (!container) return;

  container.innerHTML = '<div class="mb-inbox-loading">Loading...</div>';

  const notifications = await loadNotifications();

  if (notifications.length === 0) {
    container.innerHTML = '<div class="mb-inbox-empty">No notifications yet</div>';
    return;
  }

  container.innerHTML = '';
  notifications.forEach(notif => {
    const item = document.createElement('div');
    item.className = 'mb-notif-item' + (notif.read ? '' : ' mb-notif-unread');

    const icon = getNotificationIcon(notif.type);
    const timeAgo = formatTimeAgo(notif.created_at);

    item.innerHTML = `
      <div class="mb-notif-icon">${icon}</div>
      <div class="mb-notif-content">
        <div class="mb-notif-text"><strong>${escapeHtml(notif.from_user_name)}</strong> ${getNotificationText(notif.type)}</div>
        ${notif.content ? `<div class="mb-notif-preview">${escapeHtml(notif.content.substring(0, 60))}...</div>` : ''}
        <div class="mb-notif-time">${timeAgo}</div>
      </div>
    `;

    item.onclick = () => {
      markNotificationRead(notif.id);
      if (notif.post_id) {
        closeInbox();
        scrollToPost(notif.post_id);
      }
    };

    container.appendChild(item);
  });
}

function getNotificationIcon(type) {
  const icons = {
// --- Notification Helpers ---
    mention: '📣',
    like: '❤️',
    comment: '💬',
    follow: '👤',
    reply: '↩️'
  };
  return icons[type] || '🔔';
}

function getNotificationText(type) {
  const texts = {
    mention: 'mentioned you in a post',
    like: 'liked your post',
    comment: 'commented on your post',
    follow: 'started following you',
    reply: 'replied to your comment'
  };
  return texts[type] || 'sent you a notification';
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return date.toLocaleDateString();
}


document.addEventListener('click', (e) => {
  if (mentionDropdown && !mentionDropdown.contains(e.target) && e.target.id !== 'postInput') {
    hideMentionDropdown();
  }
});
