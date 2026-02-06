let sb = null;
let currentUser = null;
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

// Media upload state
let selectedMediaFile = null;
let mediaPreviewUrl = null;

// Mention state
let mentionDropdown = null;
let mentionSearchTimeout = null;
let mentionUsers = [];
let mentionStartPos = 0;
let activeMentionInput = null;

// Translation helper with English fallback
function getTranslation(key, fallback) {
  if (window.translations && window.MindBalanceSettings) {
    const lang = localStorage.getItem('mindbalance-language') || 'en';
    const langMap = { en: 'en', es: 'es', fr: 'fr', zh: 'zh', hi: 'hi' };
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

function initSupabase() {
  if (window.MindBalanceAuth && window.MindBalanceAuth.getSupabase) {
    sb = window.MindBalanceAuth.getSupabase();
  }
  
  if (!sb && typeof supabase !== 'undefined') {
    const SUPABASE_URL = "https://cxjqessxarjayqxvhnhs.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4anFlc3N4YXJqYXlxeHZobmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjQwOTEsImV4cCI6MjA4MzYwMDA5MX0.SUI4sPOSPxDiGwqwQr19UOKtbK7KmjMqkX6HUT6-yps";
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return sb;
}

async function checkAuth() {
  const client = initSupabase();
  if (!client) return null;
  
  const { data } = await client.auth.getSession();
  currentUser = data?.session?.user || null;
  return currentUser;
}

function updateCommunityUI(user) {
  currentUser = user;
  
  const authPill = document.getElementById('authStatusPill');
  const avatarCircle = document.getElementById('avatarCircle');
  const postText = document.getElementById('postText');
  const postBtn = document.getElementById('postBtn');
  const sidebarSignIn = document.querySelector('.mb-navLink[href="../auth/"]');
  
  if (user) {
    // Load notification count when user is authenticated
    loadNotificationCount();
    
    if (authPill) {
      authPill.textContent = 'Signed in';
      authPill.style.background = '#dcfce7';
      authPill.style.color = '#166534';
    }
    
    if (avatarCircle) {
      const initials = user.email ? user.email.substring(0, 2).toUpperCase() : 'ME';
      avatarCircle.textContent = initials;
      avatarCircle.style.background = '#3b82f6';
    }
    
    if (postText) {
      postText.disabled = false;
      postText.placeholder = "What's on your mind? Share with the community...";
    }
    
    if (postBtn) {
      postBtn.disabled = false;
    }
    
    if (sidebarSignIn) {
      sidebarSignIn.textContent = 'Signed in as ' + user.email.split('@')[0];
      sidebarSignIn.style.color = '#166534';
    }
    
    enableInteractions();
    updateDeleteButtons();
  } else {
    if (authPill) {
      authPill.textContent = 'Guest mode';
      authPill.style.background = '';
      authPill.style.color = '';
    }
    
    if (avatarCircle) {
      avatarCircle.textContent = 'MB';
      avatarCircle.style.background = '';
    }
    
    if (postText) {
      postText.disabled = true;
      postText.placeholder = 'Sign in to share an update...';
    }
    
    if (postBtn) {
      postBtn.disabled = true;
    }
    
    if (sidebarSignIn) {
      sidebarSignIn.textContent = 'Sign in / Register';
      sidebarSignIn.style.color = '';
    }
    
    // Enable interactions for guests too (they can view comments, share posts)
    enableInteractions();
    hideDeleteButtons();
  }
}

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
  
  // Remove from rendered tracking
  renderedPostIds.delete(postId);
  
  postElement.style.transition = 'opacity 0.3s, transform 0.3s';
  postElement.style.opacity = '0';
  postElement.style.transform = 'translateX(-20px)';
  
  setTimeout(() => {
    postElement.remove();
  }, 300);
}

function enableInteractions() {
  const posts = document.querySelectorAll('.mb-post');
  posts.forEach(post => {
    // Like button
    const likeBtn = post.querySelector('.mb-likeBtn');
    if (likeBtn && !likeBtn.dataset.bound) {
      likeBtn.dataset.bound = 'true';
      likeBtn.addEventListener('click', handleLike);
    }
    
    // Comment button
    const commentBtn = post.querySelector('.mb-commentBtn');
    if (commentBtn && !commentBtn.dataset.bound) {
      commentBtn.dataset.bound = 'true';
      commentBtn.addEventListener('click', handleComment);
    }
    
    // Share button
    const shareBtn = post.querySelector('.mb-shareBtn');
    if (shareBtn && !shareBtn.dataset.bound) {
      shareBtn.dataset.bound = 'true';
      shareBtn.addEventListener('click', handleShare);
    }
    
    // Report button
    const reportBtn = post.querySelector('.mb-reportBtn');
    if (reportBtn && !reportBtn.dataset.bound) {
      reportBtn.dataset.bound = 'true';
      reportBtn.addEventListener('click', handleReport);
    }
    
    // Edit button (own posts only)
    const editBtn = post.querySelector('.mb-editBtn');
    if (editBtn && !editBtn.dataset.bound) {
      editBtn.dataset.bound = 'true';
      editBtn.addEventListener('click', handleEdit);
    }
    
    // Fallback for old button format
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
    title: 'MindBalance Community Post',
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
  
  // Prevent double clicks
  if (btn.dataset.processing === 'true') return;
  btn.dataset.processing = 'true';
  
  let likeCountSpan = btn.querySelector('.like-count');
  const currentCount = parseInt(likeCountSpan?.textContent) || 0;
  
  if (btn.dataset.liked === 'true') {
    // Unlike
    const { error } = await client
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', currentUser.id);
    
    if (!error) {
      btn.dataset.liked = 'false';
      const newCount = currentCount - 1;
      btn.innerHTML = `<span class="heart-icon">♡</span> Like <span class="like-count">${newCount > 0 ? newCount : ''}</span>`;
      btn.classList.remove('like-animating');
    }
  } else {
    // Like with animation
    const { error } = await client
      .from('post_likes')
      .insert({ post_id: postId, user_id: currentUser.id });
    
    if (!error) {
      btn.dataset.liked = 'true';
      const newCount = currentCount + 1;
      btn.innerHTML = `<span class="heart-icon">♥</span> Liked <span class="like-count">${newCount > 0 ? newCount : ''}</span>`;
      
      // Add bounce animation
      btn.classList.add('like-animating');
      setTimeout(() => btn.classList.remove('like-animating'), 400);
      
      // Add pop effect
      const pop = document.createElement('span');
      pop.className = 'like-pop';
      pop.textContent = '+1';
      btn.appendChild(pop);
      setTimeout(() => pop.remove(), 600);
    }
  }
  
  btn.dataset.processing = 'false';
}

async function handleEdit(e) {
  if (!currentUser) return;
  
  const post = e.target.closest('.mb-post');
  const postEmail = post.getAttribute('data-email');
  
  // Only allow editing own posts
  if (currentUser.email !== postEmail) return;
  
  const postBody = post.querySelector('.mb-postBody');
  const originalContent = post.getAttribute('data-text');
  const wasEdited = post.dataset.edited === 'true' || postBody.querySelector('.mb-edited-tag') !== null;
  
  // Mark post as edited if it has the tag
  if (wasEdited) post.dataset.edited = 'true';
  
  // Already in edit mode?
  if (post.querySelector('.mb-editTextarea')) return;
  
  // Replace content with textarea - use textContent for textarea, not escaped HTML
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
  
  // Set value directly to avoid HTML encoding issues
  textarea.value = originalContent;
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  
  cancelBtn.addEventListener('click', () => {
    // Restore original content with proper escaping for display
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

function showReportModal(postId) {
  // Remove existing modal if any
  const existingModal = document.querySelector('.mb-reportModal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.className = 'mb-reportModal';
  modal.innerHTML = `
    <div class="mb-reportModalContent">
      <div class="mb-reportModalTitle">Report this post</div>
      <div class="mb-reportOptions">
        <label class="mb-reportOption">
          <input type="radio" name="reportReason" value="spam">
          <span>Spam or misleading</span>
        </label>
        <label class="mb-reportOption">
          <input type="radio" name="reportReason" value="harassment">
          <span>Harassment or bullying</span>
        </label>
        <label class="mb-reportOption">
          <input type="radio" name="reportReason" value="inappropriate">
          <span>Inappropriate content</span>
        </label>
        <label class="mb-reportOption">
          <input type="radio" name="reportReason" value="self-harm">
          <span>Self-harm or dangerous content</span>
        </label>
        <label class="mb-reportOption">
          <input type="radio" name="reportReason" value="other">
          <span>Other</span>
        </label>
      </div>
      <div class="mb-reportModalActions">
        <button class="mb-btn mb-cancelReportBtn" type="button">Cancel</button>
        <button class="mb-btn mb-submitReportBtn" type="button" disabled>Submit Report</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Animate in
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
    
    // Show success toast
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

async function handleComment(e) {
  const post = e.target.closest('.mb-post');
  const postId = post.getAttribute('data-id');
  let commentBox = post.querySelector('.mb-commentBox');
  
  if (!commentBox) {
    commentBox = document.createElement('div');
    commentBox.className = 'mb-commentBox';
    
    // Show input area only for logged-in users, sign-in prompt for guests
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
    
    // Always load and show existing comments for everyone
    await loadComments(postId, commentBox.querySelector('.mb-comments'));
    
    // Only bind send functionality for logged-in users
    if (currentUser) {
      const sendBtn = commentBox.querySelector('.mb-btnPrimary');
      const input = commentBox.querySelector('.mb-commentInput');
      
      // Add mention handlers to comment input
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
            
            // Process mentions in the comment
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
    data.forEach(comment => {
      container.appendChild(createCommentElement(comment));
    });
  }
}

function createCommentElement(commentData) {
  const comment = document.createElement('div');
  comment.className = 'mb-comment';
  comment.setAttribute('data-comment-id', commentData.id);
  
  // Generate a consistent fake username for NULL author comments based on comment ID
  const fakeUsernames = [
    'earthygreens0', 'mindfuljourney', 'calmwaters22', 'peacefulpath',
    'hopefulheart', 'serenesky', 'gentlebreeze', 'quietmind99',
    'warmthoughts', 'kindspirit', 'healingvibes', 'brightdays',
    'softglow', 'tranquilsoul', 'innerpeace21'
  ];
  
  let authorName;
  if (commentData.author_name) {
    authorName = commentData.author_name;
  } else if (commentData.author_id) {
    authorName = 'Anonymous';
  } else {
    // Use comment ID to pick a consistent fake username
    const hash = commentData.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    authorName = fakeUsernames[hash % fakeUsernames.length];
  }
  
  const userSpan = document.createElement('span');
  userSpan.className = 'mb-commentUser';
  
  const authorSpan = document.createElement('span');
  authorSpan.className = commentData.author_id ? 'mb-commentAuthorLink' : 'mb-communityMember';
  authorSpan.textContent = authorName;
  
  if (commentData.author_id) {
    const authorLink = document.createElement('a');
    authorLink.href = '/profile/?user=' + commentData.author_id;
    authorLink.className = 'mb-commentAuthorLink';
    authorLink.textContent = authorName;
    userSpan.appendChild(authorLink);
  } else {
    userSpan.appendChild(authorSpan);
  }
  
  const colonText = document.createTextNode(': ');
  userSpan.appendChild(colonText);
  
  const bodySpan = document.createElement('span');
  bodySpan.className = 'mb-commentBody';
  bodySpan.textContent = commentData.content;
  
  comment.appendChild(userSpan);
  comment.appendChild(bodySpan);
  
  return comment;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
  
  // Handle media upload if file is selected
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
      // Show error but continue with post (graceful fallback)
      if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
        alert('Media upload requires storage setup. Please create a "Post-Media" bucket in Supabase Storage. Your post will be created without the image.');
      } else {
        alert('Image upload failed: ' + (uploadError.message || 'Unknown error') + '. Your post will be created without the image.');
      }
      // Don't abort - continue posting without the media
      clearMediaPreview();
    } else {
      const { data: { publicUrl } } = client.storage
        .from('Post-Media')
        .getPublicUrl(filePath);
      uploadedMediaUrl = publicUrl;
    }
  }
  
  // Create optimistic placeholder while insert happens
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
      content: text,
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
  
  // Track server ID - realtime will check this before adding
  recentlyPostedIds.add(data.id);
  suppressRealtimeUntil = Date.now() + 1000; // Suppress realtime for 1 second after posting
  
  // Clean up tracking after 10 seconds
  setTimeout(() => recentlyPostedIds.delete(data.id), 10000);
  
  // Remove placeholder and add real post
  placeholder.remove();
  
  // Final check: only insert if not already rendered
  if (!renderedPostIds.has(data.id)) {
    renderedPostIds.add(data.id);
    const newPost = createPostElement(data, 'Just now');
    feedList.insertBefore(newPost, feedList.firstChild);
    enableInteractions();
    updateDeleteButtons();
  }
  
  // Process mentions in the post
  processMentions(text, data.id, null);
}

function createPostElement(postData, timeStr) {
  const article = document.createElement('article');
  article.className = 'mb-post card-animated hover-lift' + (postData.is_pinned ? ' mb-post-pinned' : '');
  article.setAttribute('data-text', postData.content);
  article.setAttribute('data-id', postData.id);
  article.setAttribute('data-email', postData.author_email);
  article.setAttribute('data-pinned', postData.is_pinned ? 'true' : 'false');
  
  const isOwnPost = currentUser && currentUser.email === postData.author_email;
  const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
  const showDeleteButton = canDeletePost(postData.author_email);
  const deleteButton = showDeleteButton 
    ? `<button class="mb-btn mb-deleteBtn" type="button" style="color: #dc2626;">Delete</button>`
    : '';
  const editButton = isOwnPost
    ? `<button class="mb-btn mb-editBtn" type="button">Edit</button>`
    : '';
  const pinButton = isAdmin
    ? `<button class="mb-btn mb-pinBtn" type="button" title="${postData.is_pinned ? 'Unpin post' : 'Pin post'}" data-translate="${postData.is_pinned ? 'community_unpin' : 'community_pin'}">${postData.is_pinned ? '📌 Unpin' : '📌 Pin'}</button>`
    : '';
  
  const likeCount = postData.like_count || 0;
  const commentCount = postData.comment_count || 0;
  const isEdited = postData.edited_at ? ' <span class="mb-edited-tag">(edited)</span>' : '';
  const pinnedBadge = postData.is_pinned ? '<span class="mb-pinned-badge" data-translate="community_pinned">📌 Pinned</span>' : '';
  
  // Media display
  const mediaHtml = postData.media_url ? `<div class="mb-postMedia"><img src="${escapeHtml(postData.media_url)}" alt="Post media" loading="lazy" /></div>` : '';
  
  // Track edited state for cancel behavior
  if (postData.edited_at) {
    article.dataset.edited = 'true';
  }
  
  const displayName = postData.author_name || 'MindBalance Team';
  const authorLink = postData.author_id 
    ? `<a href="/profile/?user=${postData.author_id}" class="mb-postAuthorLink">${escapeHtml(displayName)}</a>`
    : escapeHtml(displayName);
  
  article.innerHTML = `
    <div class="mb-postHead">
      <div class="mb-postMeta">
        <div class="mb-postName">${authorLink} <span class="mb-pill">Community</span> ${pinnedBadge}</div>
        <div class="mb-postTime">${timeStr || formatTime(postData.created_at)}</div>
      </div>
    </div>
    <div class="mb-postBody">${escapeHtml(postData.content)}${isEdited}</div>
    ${mediaHtml}
    <div class="mb-postFooter">
      <button class="mb-btn mb-likeBtn" type="button"><span class="heart-icon">♡</span> Like <span class="like-count">${likeCount > 0 ? likeCount : ''}</span></button>
      <button class="mb-btn mb-commentBtn" type="button">Comment ${commentCount > 0 ? `(${commentCount})` : ''}</button>
      <button class="mb-btn mb-shareBtn" type="button">Share</button>
      ${editButton}
      ${pinButton}
      ${deleteButton}
      <button class="mb-btn mb-reportBtn" type="button" title="Report post">⚑</button>
    </div>
  `;
  
  // Bind event handlers
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
  
  // Admin pin button
  if (isAdmin) {
    const pinBtn = article.querySelector('.mb-pinBtn');
    if (pinBtn) {
      pinBtn.addEventListener('click', handlePin);
    }
  }
  
  return article;
}

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
  
  // Update UI
  post.setAttribute('data-pinned', isPinned ? 'false' : 'true');
  btn.textContent = isPinned ? '📌 Pin' : '📌 Unpin';
  btn.setAttribute('data-translate', isPinned ? 'community_pin' : 'community_unpin');
  btn.title = isPinned ? 'Pin post' : 'Unpin post';
  btn.disabled = false;
  
  // Update pinned badge
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
  
  // Reload posts to reorder
  await loadPosts(true);
}

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

async function loadPosts(forceReload = false) {
  // Set loading flag FIRST to block realtime immediately
  if (loadingPosts) return;
  loadingPosts = true;
  suppressRealtimeUntil = Date.now() + 2000; // Suppress realtime for 2 seconds
  
  if (postsLoaded && !forceReload) {
    loadingPosts = false;
    return;
  }
  
  const client = initSupabase();
  if (!client) {
    loadingPosts = false;
    return;
  }
  
  const feedList = document.getElementById('feedList');
  if (!feedList) {
    loadingPosts = false;
    return;
  }
  
  // Clear existing posts and tracking
  const existingPosts = feedList.querySelectorAll('.mb-post');
  existingPosts.forEach(post => post.remove());
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
  
  if (data && data.length > 0) {
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
    
    // Track the newest post timestamp to filter stale realtime inserts
    if (data.length > 0) {
      lastLoadedTimestamp = new Date(data[0].created_at).getTime();
    }
  }
  
  postsLoaded = true;
  loadingPosts = false;
}

function setupRealtimeSubscription() {
  // Only set up once
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
        
        // Skip if realtime is suppressed (during/after load)
        if (Date.now() < suppressRealtimeUntil) return;
        
        // Skip if posts are currently loading (they'll include this post)
        if (loadingPosts) return;
        
        // Skip if already rendered (definitive check)
        if (renderedPostIds.has(payload.new.id)) return;
        
        // Skip if we just posted this (tracked by server ID)
        if (recentlyPostedIds.has(payload.new.id)) return;
        
        // Skip if post was created before our last load (already included)
        if (lastLoadedTimestamp && payload.new.created_at) {
          const postTime = new Date(payload.new.created_at).getTime();
          if (postTime <= lastLoadedTimestamp) return;
        }
        
        // Skip if already in DOM (backup check)
        const existingPost = feedList.querySelector(`[data-id="${payload.new.id}"]`);
        if (!existingPost) {
          renderedPostIds.add(payload.new.id);
          const article = createPostElement(payload.new, 'Just now');
          feedList.insertBefore(article, feedList.firstChild);
          enableInteractions();
          updateDeleteButtons();
        }
      }
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'posts' },
      (payload) => {
        const feedList = document.getElementById('feedList');
        if (!feedList) return;
        
        // Remove from rendered tracking
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
          // Update like count
          const likeBtn = updatedPost.querySelector('.mb-likeBtn');
          if (likeBtn) {
            let likeCountSpan = likeBtn.querySelector('.like-count');
            if (likeCountSpan) {
              likeCountSpan.textContent = payload.new.like_count > 0 ? payload.new.like_count : '';
            }
          }
          
          // Update comment count
          const commentBtn = updatedPost.querySelector('.mb-commentBtn');
          if (commentBtn) {
            const commentCount = payload.new.comment_count || 0;
            commentBtn.textContent = commentCount > 0 ? `Comment (${commentCount})` : 'Comment';
          }
          
          // Update post content if edited
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

function handleAuthChange(user) {
  // Debounce auth changes to prevent multiple rapid calls
  if (pendingAuthDebounce) {
    clearTimeout(pendingAuthDebounce);
  }
  
  pendingAuthDebounce = setTimeout(() => {
    pendingAuthDebounce = null;
    currentUser = user;
    updateCommunityUI(user);
    
    // Only load posts once, or force reload if auth state changed after initial load
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
  }, 100); // 100ms debounce
}

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
  
  // Media upload handling
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
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        mediaInput.value = '';
        return;
      }
      
      // Validate file size (max 5MB)
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
  
  if (window.MindBalanceAuth && window.MindBalanceAuth.onAuthReady) {
    // Only use onAuthChange - it handles both initial ready and subsequent changes
    // onAuthReady fires once, onAuthChange fires on every change including initial
    // Using just onAuthChange avoids double-firing on initial load
    window.MindBalanceAuth.onAuthChange(handleAuthChange);
  } else {
    // Fallback: check auth and load posts directly (no double handlers)
    const user = await checkAuth();
    currentUser = user;
    updateCommunityUI(user);
    
    // Only load if not already handled
    if (!authHandled) {
      authHandled = true;
      await loadPosts();
    }
    
    // Set up auth state listener for future changes only
    const client = initSupabase();
    if (client) {
      client.auth.onAuthStateChange((event, session) => {
        // Only handle actual changes, not initial event
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          handleAuthChange(session?.user || null);
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', init);

// Load popular discussions for the sidebar
async function loadPopularDiscussions() {
  const container = document.getElementById('popularDiscussions');
  if (!container) return;
  
  // Initialize a fresh client for this request to ensure anonymous access works
  let client = initSupabase();
  if (!client) {
    // Fallback: create a fresh anonymous client
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
    // Get posts with highest like counts and comment counts
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

function scrollToPost(postId) {
  const postEl = document.querySelector(`[data-id="${postId}"]`);
  if (postEl) {
    postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    postEl.style.transition = 'box-shadow 0.3s ease';
    postEl.style.boxShadow = '0 0 0 3px rgba(184, 155, 94, 0.5)';
    setTimeout(() => {
      postEl.style.boxShadow = '';
    }, 2000);
  }
}

// Load popular discussions when posts are loaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadPopularDiscussions, 1500);
  setupMentions();
  loadNotificationCount();
});

// ===== MENTIONS SYSTEM =====

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
  
  // Find @ symbol before cursor
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
  
  // Position dropdown below input
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

// Extract mentions from text and create notifications
async function processMentions(text, postId, commentId = null) {
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
    // Find users by display name
    for (const mentionName of mentions) {
      const { data: users } = await client
        .from('profiles')
        .select('id')
        .ilike('display_name', mentionName)
        .limit(1);
      
      if (users && users.length > 0 && users[0].id !== currentUser.id) {
        // Create notification
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

// ===== NOTIFICATIONS SYSTEM =====

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
  if (modal) {
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    loadAndRenderNotifications();
    
    // Focus the close button for accessibility
    const closeBtn = modal.querySelector('.mb-inbox-close');
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 100);
    }
  }
}

function closeInbox() {
  const modal = document.getElementById('inboxModal');
  if (modal) modal.hidden = true;
  
  // Restore focus to the element that opened the modal
  if (lastFocusedElement) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

// Close inbox on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('inboxModal');
    if (modal && !modal.hidden) {
      closeInbox();
    }
  }
});

// Close inbox when clicking outside the content
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

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (mentionDropdown && !mentionDropdown.contains(e.target) && e.target.id !== 'postInput') {
    hideMentionDropdown();
  }
});
