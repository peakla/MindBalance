const ProfileAnalytics = (function() {
  'use strict';

  let currentUserId = null;

  function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }

  function getActionIcon(actionType) {
    const icons = {
      'page_view': 'eye-outline',
      'article_read': 'book-outline',
      'article_complete': 'checkmark-done-outline',
      'resource_view': 'folder-open-outline',
      'search': 'search-outline',
      'share': 'share-social-outline',
      'mood_entry': 'happy-outline',
      'goal_progress': 'flag-outline',
      'goal_complete': 'trophy-outline',
      'community_post': 'chatbubble-outline',
      'community_comment': 'chatbox-outline',
      'community_like': 'heart-outline',
      'follow': 'person-add-outline'
    };
    return icons[actionType] || 'ellipse-outline';
  }

  function getActionDescription(activity) {
    const meta = activity.metadata || {};
    const type = activity.action_type;
    
    const descriptions = {
      'page_view': `Visited <strong>${meta.page_title || activity.page_url}</strong>`,
      'article_read': `Started reading <strong>${meta.article_title || 'an article'}</strong>`,
      'article_complete': `Completed <strong>${meta.article_title || 'an article'}</strong>`,
      'resource_view': `Viewed resource <strong>${meta.resource_title || 'a resource'}</strong>`,
      'search': `Searched for "<strong>${meta.query || ''}</strong>"`,
      'share': `Shared ${meta.content_type || 'content'} on ${meta.platform || 'social media'}`,
      'mood_entry': `Logged mood: <strong>${meta.mood || 'recorded'}</strong>`,
      'goal_progress': `Made progress on a goal (${meta.progress || 0}%)`,
      'goal_complete': `Completed a wellness goal`,
      'community_post': `Created a new post in the community`,
      'community_comment': `Left a comment on a discussion`,
      'community_like': `Liked a post`,
      'follow': `Started following someone`
    };
    
    return descriptions[type] || `Performed ${type.replace(/_/g, ' ')}`;
  }

  async function renderCalendarHeatmap(container, userId) {
    if (!container) return;
    
    container.innerHTML = `
      <div class="mb-heatmap">
        <div class="mb-heatmap__header">
          <h3 class="mb-heatmap__title">
            <ion-icon name="calendar-outline"></ion-icon>
            Activity Calendar
          </h3>
          <div class="mb-heatmap__stats">
            <span><strong id="heatmapStreak">0</strong> day streak</span>
            <span><strong id="heatmapTotal">0</strong> active days</span>
          </div>
        </div>
        <div class="mb-heatmap__grid" id="heatmapGrid"></div>
        <div class="mb-heatmap__legend">
          <span>Less</span>
          <div class="mb-heatmap__legend-item" style="background: #f0f0f5;"></div>
          <div class="mb-heatmap__legend-item" style="background: #e8dfd4;"></div>
          <div class="mb-heatmap__legend-item" style="background: #d4c4b0;"></div>
          <div class="mb-heatmap__legend-item" style="background: #c9ad8c;"></div>
          <div class="mb-heatmap__legend-item" style="background: #d4a574;"></div>
          <span>More</span>
        </div>
      </div>
    `;

    if (typeof MBAnalytics !== 'undefined') {
      const streakData = await MBAnalytics.getStreakData(userId, 365);
      if (streakData) {
        document.getElementById('heatmapStreak').textContent = streakData.currentStreak;
        document.getElementById('heatmapTotal').textContent = streakData.totalActiveDays;
        
        const grid = document.getElementById('heatmapGrid');
        const activeDaysSet = new Set(streakData.activeDays);
        const today = new Date();
        
        const activityStats = await MBAnalytics.getActivityStats(userId, 365);
        const dailyCounts = activityStats?.dailyCounts || {};
        
        for (let week = 52; week >= 0; week--) {
          for (let day = 0; day < 7; day++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - (week * 7 + (6 - day)));
            const dateKey = checkDate.toISOString().split('T')[0];
            
            const dayEl = document.createElement('div');
            dayEl.className = 'mb-heatmap__day';
            dayEl.title = `${dateKey}: ${dailyCounts[dateKey] || 0} activities`;
            
            const count = dailyCounts[dateKey] || 0;
            if (count > 0) {
              const level = count >= 10 ? 4 : count >= 5 ? 3 : count >= 2 ? 2 : 1;
              dayEl.dataset.level = level;
            }
            
            grid.appendChild(dayEl);
          }
        }
      }
    }
  }

  async function renderActivityTimeline(container, userId) {
    if (!container) return;
    
    container.innerHTML = `
      <div class="mb-timeline">
        <div class="mb-timeline__header">
          <h3 class="mb-timeline__title">
            <ion-icon name="time-outline"></ion-icon>
            Recent Activity
          </h3>
        </div>
        <div class="mb-timeline__list" id="timelineList">
          <div class="mb-skeleton mb-skeleton--text" style="width: 80%;"></div>
          <div class="mb-skeleton mb-skeleton--text" style="width: 60%;"></div>
          <div class="mb-skeleton mb-skeleton--text" style="width: 70%;"></div>
        </div>
      </div>
    `;

    if (typeof MBAnalytics !== 'undefined') {
      const activities = await MBAnalytics.getRecentActivity(userId, 10);
      const listEl = document.getElementById('timelineList');
      
      if (activities.length === 0) {
        listEl.innerHTML = `
          <div class="mb-empty-state">
            <ion-icon name="footsteps-outline" class="mb-empty-state__icon"></ion-icon>
            <h4 class="mb-empty-state__title">No Activity Yet</h4>
            <p class="mb-empty-state__desc">Start exploring articles, resources, and the community to see your activity here.</p>
          </div>
        `;
        return;
      }
      
      listEl.innerHTML = activities.map(activity => `
        <div class="mb-timeline__item">
          <div class="mb-timeline__icon">
            <ion-icon name="${getActionIcon(activity.action_type)}"></ion-icon>
          </div>
          <div class="mb-timeline__content">
            <div class="mb-timeline__action">${getActionDescription(activity)}</div>
            <div class="mb-timeline__time">${formatTimeAgo(activity.created_at)}</div>
          </div>
        </div>
      `).join('');
    }
  }

  async function renderReadingStats(container, userId) {
    if (!container) return;
    
    container.innerHTML = `
      <div class="mb-reading-stats">
        <div class="mb-reading-stat">
          <div class="mb-reading-stat__icon">
            <ion-icon name="book-outline"></ion-icon>
          </div>
          <div class="mb-reading-stat__value" id="statArticlesStarted">0</div>
          <div class="mb-reading-stat__label">Articles Started</div>
        </div>
        <div class="mb-reading-stat">
          <div class="mb-reading-stat__icon">
            <ion-icon name="checkmark-done-outline"></ion-icon>
          </div>
          <div class="mb-reading-stat__value" id="statArticlesCompleted">0</div>
          <div class="mb-reading-stat__label">Completed</div>
        </div>
        <div class="mb-reading-stat">
          <div class="mb-reading-stat__icon">
            <ion-icon name="time-outline"></ion-icon>
          </div>
          <div class="mb-reading-stat__value" id="statReadingTime">0m</div>
          <div class="mb-reading-stat__label">Reading Time</div>
        </div>
        <div class="mb-reading-stat">
          <div class="mb-reading-stat__icon">
            <ion-icon name="trending-up-outline"></ion-icon>
          </div>
          <div class="mb-reading-stat__value" id="statAvgProgress">0%</div>
          <div class="mb-reading-stat__label">Avg Progress</div>
        </div>
      </div>
    `;

    if (typeof MBAnalytics !== 'undefined') {
      const stats = await MBAnalytics.getReadingStats(userId);
      if (stats) {
        document.getElementById('statArticlesStarted').textContent = stats.articlesStarted;
        document.getElementById('statArticlesCompleted').textContent = stats.articlesCompleted;
        document.getElementById('statReadingTime').textContent = formatDuration(stats.totalReadingTime);
        document.getElementById('statAvgProgress').textContent = stats.averageProgress + '%';
      }
    }
  }

  async function renderActivityChart(container, userId) {
    if (!container) return;
    
    container.innerHTML = `
      <div class="mb-stats-chart">
        <div class="mb-stats-chart__header">
          <h3 class="mb-stats-chart__title">Activity Trends</h3>
          <div class="mb-stats-chart__period">
            <button class="active" data-days="7">Week</button>
            <button data-days="30">Month</button>
          </div>
        </div>
        <div class="mb-stats-chart__bars" id="activityBars"></div>
        <div class="mb-stats-chart__labels" id="activityLabels"></div>
      </div>
    `;

    const periodButtons = container.querySelectorAll('.mb-stats-chart__period button');
    periodButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        periodButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        await updateChart(parseInt(btn.dataset.days), userId);
      });
    });

    await updateChart(7, userId);
  }

  async function updateChart(days, userId) {
    if (typeof MBAnalytics === 'undefined') return;
    
    const stats = await MBAnalytics.getActivityStats(userId, days);
    if (!stats) return;
    
    const barsContainer = document.getElementById('activityBars');
    const labelsContainer = document.getElementById('activityLabels');
    if (!barsContainer || !labelsContainer) return;
    
    const dailyCounts = stats.dailyCounts;
    const dates = Object.keys(dailyCounts).sort();
    const values = dates.map(d => dailyCounts[d]);
    const maxVal = Math.max(...values, 1);
    
    barsContainer.innerHTML = dates.map((date, i) => {
      const height = (values[i] / maxVal) * 100;
      return `<div class="mb-stats-chart__bar" style="height: ${Math.max(height, 4)}%;" data-value="${values[i]}"></div>`;
    }).join('');
    
    if (days <= 7) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      labelsContainer.innerHTML = dates.map(d => {
        const day = new Date(d).getDay();
        return `<span>${dayNames[day]}</span>`;
      }).join('');
    } else {
      labelsContainer.innerHTML = dates.map((d, i) => {
        if (i % 5 === 0 || i === dates.length - 1) {
          return `<span>${new Date(d).getDate()}</span>`;
        }
        return '<span></span>';
      }).join('');
    }
  }

  async function renderAchievements(container, userId) {
    if (!container) return;
    
    container.innerHTML = `
      <div class="mb-badges" id="achievementsBadges">
        ${Array(8).fill(0).map(() => `
          <div class="mb-badge">
            <div class="mb-skeleton mb-skeleton--circle" style="width: 56px; height: 56px; margin-bottom: 12px;"></div>
            <div class="mb-skeleton mb-skeleton--text" style="width: 70%;"></div>
          </div>
        `).join('')}
      </div>
    `;

    if (typeof MBAnalytics !== 'undefined') {
      const { earned, available } = await MBAnalytics.getAchievements(userId);
      const badgesContainer = document.getElementById('achievementsBadges');
      
      const unlockedBadgesEl = document.getElementById('unlockedBadges');
      const totalBadgesEl = document.getElementById('totalBadges');
      if (unlockedBadgesEl) unlockedBadgesEl.textContent = earned.length;
      if (totalBadgesEl) totalBadgesEl.textContent = earned.length + available.length;
      
      const allBadges = [
        ...earned.map(a => ({ ...a, unlocked: true })),
        ...available.map(a => ({ ...a, unlocked: false }))
      ];
      
      badgesContainer.innerHTML = allBadges.map(badge => `
        <div class="mb-badge ${badge.unlocked ? '' : 'mb-badge--locked'}">
          <div class="mb-badge__icon">
            <ion-icon name="${badge.icon || 'trophy-outline'}"></ion-icon>
          </div>
          <div class="mb-badge__name">${badge.name || 'Achievement'}</div>
          <div class="mb-badge__desc">${badge.description || ''}</div>
          ${badge.unlocked ? `<div class="mb-badge__date">Unlocked ${formatTimeAgo(badge.unlocked_at)}</div>` : ''}
        </div>
      `).join('');
    }
  }

  function createProgressRing(percent, size = 80, strokeWidth = 8) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;
    
    return `
      <div class="mb-progress-ring" style="width: ${size}px; height: ${size}px;">
        <svg width="${size}" height="${size}">
          <circle class="mb-progress-ring__track" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${strokeWidth}"/>
          <circle class="mb-progress-ring__progress" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${strokeWidth}"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
        </svg>
        <span class="mb-progress-ring__value">${percent}%</span>
      </div>
    `;
  }

  async function init(userId) {
    if (!userId) return;
    currentUserId = userId;

    const heatmapContainer = document.getElementById('profileHeatmap');
    const timelineContainer = document.getElementById('profileTimeline');
    const readingStatsContainer = document.getElementById('profileReadingStats');
    const activityChartContainer = document.getElementById('profileActivityChart');
    const achievementsContainer = document.getElementById('profileAchievements');

    await Promise.all([
      renderCalendarHeatmap(heatmapContainer, userId),
      renderActivityTimeline(timelineContainer, userId),
      renderReadingStats(readingStatsContainer, userId),
      renderActivityChart(activityChartContainer, userId),
      renderAchievements(achievementsContainer, userId)
    ]);
  }

  return {
    init,
    renderCalendarHeatmap,
    renderActivityTimeline,
    renderReadingStats,
    renderActivityChart,
    renderAchievements,
    createProgressRing
  };
})();
