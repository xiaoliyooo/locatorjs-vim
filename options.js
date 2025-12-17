document.addEventListener('DOMContentLoaded', () => {
  const kittyPathInput = document.getElementById('kittyPath');
  const openerInput = document.getElementById('opener');
  const saveBtn = document.getElementById('saveBtn');
  const successMessage = document.getElementById('successMessage');

  chrome.storage.sync.get(['kittyPath', 'opener'], result => {
    const { kittyPath, opener } = result;
    kittyPathInput.value = kittyPath;
    openerInput.value = opener;
  });

  saveBtn.addEventListener('click', () => {
    const settings = {
      kittyPath: kittyPathInput.value.trim(),
      opener: openerInput.value.trim(),
    };

    chrome.storage.sync.set(settings, () => {
      successMessage.classList.add('show');
      setTimeout(() => {
        successMessage.classList.remove('show');
      }, 2000);
    });
  });
});
