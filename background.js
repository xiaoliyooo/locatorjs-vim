// Locator Vim - Background Service Worker
// Handles native messaging with the host application

const NATIVE_HOST_NAME = 'com.locatorvim.host';

/**
 * Listen for messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'openFile') {
    chrome.storage.sync.get(['kittyPath', 'opener'], result => {
      const { kittyPath, opener } = result;
      openFileInVim(message.file, message.line, message.column, {
        kittyPath,
        opener,
      })
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    // Keep channel open for async response
    return true;
  }
});

/**
 * Open file in Vim via native messaging
 */
async function openFileInVim(file, line, column, settings) {
  const { kittyPath, opener } = settings;
  return new Promise((resolve, reject) => {
    try {
      const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

      port.onMessage.addListener(response => {
        if (response.success) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: response.error || 'Unknown error' });
        }
        port.disconnect();
      });

      port.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError;
        if (error) {
          console.error('[Locator Vim] Native host error:', error.message);
          resolve({
            success: false,
            error: `Native host error: ${error.message}. Make sure the native host is installed.`,
          });
        }
      });

      port.postMessage({
        action: 'openFile',
        file: file,
        line: line,
        column: column,
        kittyPath,
        opener,
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Handle extension icon click
chrome.action.onClicked.addListener(tab => {
  chrome.tabs.sendMessage(tab.id, { type: 'toggle', enabled: true });
});
