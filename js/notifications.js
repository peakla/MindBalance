(function() {
  'use strict';
  
  let notificationsLoaded = false;
  let currentUser = null;
  
  function getSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof window.getSupabase === 'function') {
      return window.getSupabase();
    }
    return null;
  }
  
  async function loadNotificationCount() {
    const client = getSupabaseClient();
    if (!client || !currentUser) return;
    
    try {
      const { count, error } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);
      
      if (error) throw error;
      updateAllBadges(count || 0);
    } catch (err) {
      console.error('Error loading notification count:', err);
    }
  }
  
  function updateAllBadges(count) {
    document.querySelectorAll('.notif-badge, #notifBadge, #mobileNotifBadge, #userMenuBadge, #userMenuNotifBadge, .user-menu-badge, .menu-item-badge').forEach(badge => {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.hidden = false;
        badge.style.display = 'flex';
      } else {
        badge.hidden = true;
        badge.style.display = 'none';
      }
    });
  }
  
  async function loadNotifications() {
    const client = getSupabaseClient();
    if (!client || !currentUser) return [];
    
    try {
      const { data: notifications, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return notifications || [];
    } catch (err) {
      console.error('Error loading notifications:', err);
      return [];
    }
  }
  
  async function markNotificationRead(notifId) {
    const client = getSupabaseClient();
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
  
  async function markAllRead() {
    const client = getSupabaseClient();
    if (!client || !currentUser) return;
    
    try {
      await client
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);
      
      loadNotificationCount();
      renderNotificationsList();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  }
  
  function getNotificationText(type) {
    const texts = {
      'mention': 'mentioned you in a post',
      'like': 'liked your post',
      'comment': 'commented on your post',
      'follow': 'started following you',
      'reply': 'replied to your comment'
    };
    return texts[type] || 'sent you a notification';
  }
  
  function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
  
  async function renderNotificationsList() {
    const container = document.getElementById('globalNotificationsList');
    if (!container) return;
    
    container.innerHTML = '<div class="inbox-loading"><div class="inbox-spinner"></div><span>Loading notifications...</span></div>';
    
    const notifications = await loadNotifications();
    
    if (notifications.length === 0) {
      container.innerHTML = `
        <div class="inbox-empty">
          <ion-icon name="notifications-off-outline"></ion-icon>
          <span>No notifications yet</span>
          <p>When someone mentions you or interacts with your posts, you'll see it here.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = notifications.map(notif => `
      <div class="inbox-item ${notif.read ? '' : 'unread'}" data-notif-id="${notif.id}" data-post-id="${notif.post_id || ''}">
        <div class="inbox-item__icon">
          <ion-icon name="${getNotificationIcon(notif.type)}"></ion-icon>
        </div>
        <div class="inbox-item__content">
          <div class="inbox-item__header">
            <span class="inbox-item__from">${escapeHtml(notif.from_user_name)}</span>
            <span class="inbox-item__time">${formatTimeAgo(notif.created_at)}</span>
          </div>
          <p class="inbox-item__text">${getNotificationText(notif.type)}</p>
          ${notif.content ? `<p class="inbox-item__preview">"${escapeHtml(notif.content.substring(0, 80))}${notif.content.length > 80 ? '...' : ''}"</p>` : ''}
        </div>
        ${!notif.read ? '<span class="inbox-item__dot"></span>' : ''}
      </div>
    `).join('');
    
    container.querySelectorAll('.inbox-item').forEach(item => {
      item.addEventListener('click', async () => {
        const notifId = item.dataset.notifId;
        const postId = item.dataset.postId;
        
        if (notifId) {
          await markNotificationRead(notifId);
          item.classList.remove('unread');
          item.querySelector('.inbox-item__dot')?.remove();
        }
        
        if (postId) {
          window.location.href = `/community/?post=${postId}`;
        }
      });
    });
  }
  
  function getNotificationIcon(type) {
    const icons = {
      'mention': 'at-outline',
      'like': 'heart-outline',
      'comment': 'chatbubble-outline',
      'follow': 'person-add-outline',
      'reply': 'return-down-forward-outline'
    };
    return icons[type] || 'notifications-outline';
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function createInboxModal() {
    if (document.getElementById('globalInboxModal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'globalInboxModal';
    modal.className = 'inbox-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'globalInboxTitle');
    
    modal.innerHTML = `
      <div class="inbox-backdrop"></div>
      <div class="inbox-panel">
        <div class="inbox-header">
          <h3 class="inbox-title" id="globalInboxTitle">
            <ion-icon name="notifications-outline"></ion-icon>
            Notifications
          </h3>
          <div class="inbox-header__actions">
            <button class="inbox-mark-all" title="Mark all as read">
              <ion-icon name="checkmark-done-outline"></ion-icon>
              <span>Mark all read</span>
            </button>
            <button class="inbox-close" aria-label="Close notifications">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>
        </div>
        <div class="inbox-body" id="globalNotificationsList">
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.inbox-backdrop').addEventListener('click', closeInbox);
    modal.querySelector('.inbox-close').addEventListener('click', closeInbox);
    modal.querySelector('.inbox-mark-all').addEventListener('click', markAllRead);
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) {
        closeInbox();
      }
    });
  }
  
  function openInbox() {
    const modal = document.getElementById('globalInboxModal');
    if (!modal) {
      createInboxModal();
    }
    
    const m = document.getElementById('globalInboxModal');
    if (m) {
      m.hidden = false;
      m.classList.add('open');
      document.body.style.overflow = 'hidden';
      renderNotificationsList();
    }
  }
  
  function closeInbox() {
    const modal = document.getElementById('globalInboxModal');
    if (modal) {
      modal.classList.remove('open');
      setTimeout(() => {
        modal.hidden = true;
        document.body.style.overflow = '';
      }, 200);
    }
  }
  
  async function init() {
    const client = getSupabaseClient();
    if (!client) {
      setTimeout(init, 500);
      return;
    }
    
    try {
      const { data: { user } } = await client.auth.getUser();
      currentUser = user;
      
      if (currentUser) {
        createInboxModal();
        loadNotificationCount();
        
        setInterval(loadNotificationCount, 60000);
      }
    } catch (err) {
      console.error('Error initializing notifications:', err);
    }
  }
  
  window.openGlobalInbox = openInbox;
  window.closeGlobalInbox = closeInbox;
  window.loadGlobalNotificationCount = loadNotificationCount;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
  } else {
    setTimeout(init, 300);
  }
})();
