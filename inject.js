console.log('[Locator Vim Injected] Script loaded in page context');

let lastHoveredElement = null;

document.addEventListener(
  'mousemove',
  function (e) {
    if (!e.altKey) {
      if (lastHoveredElement) {
        window.dispatchEvent(
          new CustomEvent('locator-vim-hover', {
            detail: { sourceInfo: null },
          })
        );
        lastHoveredElement = null;
      }
      return;
    }

    const element = e.target;
    if (element === lastHoveredElement) return;

    lastHoveredElement = element;
    const sourceInfo = getSourceInfo(element);

    window.dispatchEvent(
      new CustomEvent('locator-vim-hover', {
        detail: {
          sourceInfo,
          rect: element.getBoundingClientRect(),
        },
      })
    );
  },
  true
);

document.addEventListener(
  'click',
  function (e) {
    if (!e.altKey) return;

    const sourceInfo = getSourceInfo(e.target);
    if (sourceInfo) {
      e.preventDefault();
      e.stopPropagation();

      window.dispatchEvent(
        new CustomEvent('locator-vim-click', {
          detail: { sourceInfo },
        })
      );
    }
  },
  true
);

function getSourceInfo(element) {
  let current = element;

  while (current && current !== document.body) {
    // Check for Vue 3
    if (current.__vueParentComponent) {
      const component = current.__vueParentComponent;
      // console.log('[Locator Vim Injected] Found __vueParentComponent');

      if (component?.type?.__file) {
        // console.log('[Locator Vim Injected] Found __file:', component.type.__file);
        return {
          file: component.type.__file,
          line: 1,
          column: 1,
          framework: 'vue3',
        };
      }

      // parent
      if (component?.parent?.type?.__file) {
        return {
          file: component.parent.type.__file,
          line: 1,
          column: 1,
          framework: 'vue3',
        };
      }
    }

    current = current.parentElement;
  }

  // console.log('[Locator Vim Injected] No source info found');
  return null;
}

console.log('[Locator Vim Injected] Ready! Hold Alt and hover over components.');
