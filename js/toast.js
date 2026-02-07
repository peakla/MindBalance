// ==================== TOAST NOTIFICATIONS ====================

const ToastManager = (function() {
  let container = null;
  
  function init() {
    if (container) return;
    
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  
  function show(message, type = 'info', duration = 4000) {
    init();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconMap = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      info: '<i class="fas fa-info-circle"></i>'
    };
    
    toast.innerHTML = `
      <span class="toast-icon">${iconMap[type] || iconMap.info}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Close notification">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });
    
    if (duration > 0) {
      setTimeout(() => removeToast(toast), duration);
    }
    
    return toast;
  }
  
  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function success(message, duration) {
    return show(message, 'success', duration);
  }
  
  function error(message, duration) {
    return show(message, 'error', duration);
  }
  
  function warning(message, duration) {
    return show(message, 'warning', duration);
  }
  
  function info(message, duration) {
    return show(message, 'info', duration);
  }
  
  return {
    show,
    success,
    error,
    warning,
    info
  };
})();

if (typeof window !== 'undefined') {
  window.ToastManager = ToastManager;
}
