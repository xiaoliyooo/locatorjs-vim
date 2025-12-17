document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('enableToggle');
  const status = document.getElementById('status');

  chrome.storage.sync.get(['enabled'], result => {
    toggle.checked = result.enabled !== false;
    updateStatus(toggle.checked);
  });

  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ enabled });
    updateStatus(enabled);

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle', enabled });
      }
    });
  });

  function updateStatus(enabled) {
    status.textContent = enabled ? 'Active - Hold Alt and click on components' : 'Disabled';
    status.className = enabled ? 'status active' : 'status';
  }
});
