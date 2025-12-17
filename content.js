console.log('[Locator Vim] Content script loading...');

let isEnabled = false;
let highlightOverlay = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('[Locator Vim] Initializing...');

  injectPageScript();
  createOverlay();
  loadSettings();
  listenForMessages();
  listenForPageEvents();

  console.log('[Locator Vim] Ready! Hold Alt and hover over components.');
}

function injectPageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
  console.log('[Locator Vim] Injected page script');
}

function createOverlay() {
  // element overlay
  highlightOverlay = document.createElement('div');
  highlightOverlay.id = 'locator-vim-overlay';
  highlightOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      border: 2px solid #10b981;
      background: rgba(16, 185, 129, 0.1);
      display: none;
      transition: all 0.1s ease;
    `;
  document.body.appendChild(highlightOverlay);

  // path tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'locator-vim-tooltip';
  tooltip.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.85);
      color: #10b981;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 13px;
      border-radius: 8px;
      z-index: 999999;
      display: none;
      max-width: 80vw;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(16, 185, 129, 0.3);
    `;
  document.body.appendChild(tooltip);
}

function loadSettings() {
  chrome.storage.sync.get(['enabled'], result => {
    isEnabled = result.enabled !== false;
    console.log('[Locator Vim] Extension enabled:', isEnabled);
  });
}

function listenForMessages() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'toggle') {
      isEnabled = message.enabled;
      sendResponse({ success: true });
    } else if (message.type === 'getStatus') {
      sendResponse({ enabled: isEnabled });
    }
    return true;
  });
}

/**
 * Listen for events from injected page script
 *
 */
function listenForPageEvents() {
  window.addEventListener('locator-vim-hover', function (e) {
    if (!isEnabled) return;

    const { sourceInfo, rect } = e.detail;

    if (sourceInfo && rect) {
      showOverlay(rect, sourceInfo);
    } else {
      hideOverlayAndTooltip();
    }
  });

  window.addEventListener('locator-vim-click', function (e) {
    if (!isEnabled) return;

    const { sourceInfo } = e.detail;
    if (sourceInfo) {
      openInNeovim(sourceInfo);
    }
  });
}

function showOverlay(rect, sourceInfo) {
  highlightOverlay.style.display = 'block';
  highlightOverlay.style.left = rect.left + 'px';
  highlightOverlay.style.top = rect.top + 'px';
  highlightOverlay.style.width = rect.width + 'px';
  highlightOverlay.style.height = rect.height + 'px';

  const tooltip = document.getElementById('locator-vim-tooltip');
  if (tooltip) {
    const filePath = sourceInfo.file;
    const fileName = filePath.split('/').pop();
    tooltip.innerHTML = `<span style="color: #6ee7b7;">${fileName}</span><span style="color: #9ca3af;">:${sourceInfo.line}:${sourceInfo.column}</span><br><span style="color: #6b7280; font-size: 11px;">${filePath}</span>`;
    tooltip.style.display = 'block';
  }
}

function hideOverlayAndTooltip() {
  if (highlightOverlay) {
    highlightOverlay.style.display = 'none';
  }

  const tooltip = document.getElementById('locator-vim-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

function openInNeovim(sourceInfo) {
  chrome.runtime.sendMessage(
    {
      type: 'openFile',
      file: sourceInfo.file,
      line: sourceInfo.line,
      column: sourceInfo.column,
    },
    response => {
      if (chrome.runtime.lastError) {
        console.error('[Locator Vim] Error:', chrome.runtime.lastError);
        showNotification('Failed to open file. Make sure the native host is installed.', 'error');
      } else if (response && !response.success) {
        showNotification(response?.error || 'Unknown error', 'error');
      }
    }
  );
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = 'locator-vim-notification';
  notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 999999;
      animation: slideIn 0.3s ease;
      max-width: 400px;
      word-break: break-all;
      background: ${type === 'error' ? '#ef4444' : '#10b981'};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
document.head.appendChild(style);
