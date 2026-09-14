import { PlatformConfig } from './platformConfigs';

export interface CartFillItem {
  name: string;
}

/**
 * Builds the JS source injected into the WebView via injectJavaScript().
 * This runs inside the target site's own page context (Blinkit/Zepto/
 * Instamart), not React Native — it can only use browser APIs and must
 * communicate back over window.ReactNativeWebView.postMessage.
 *
 * Design notes:
 * - Reports progress after every item so the RN side can render a live
 *   checklist and the user can watch it happen — this is a visible,
 *   user-initiated action against the site's own page, not a hidden one.
 * - Paces itself with randomized delays between items rather than firing
 *   as fast as possible, since instant machine-speed interaction is the
 *   easiest bot signal to trip.
 * - Uses the native input value setter + a dispatched 'input' event to set
 *   text, because React-controlled inputs ignore a plain `.value = ...`
 *   assignment.
 * - Every DOM lookup is wrapped so one missing/renamed element fails that
 *   single item instead of crashing the whole run — selector drift is
 *   expected here, not exceptional.
 */
export function buildInjectionScript(items: CartFillItem[], config: PlatformConfig): string {
  const payload = JSON.stringify({ items, hints: config.hints });

  return `
  (function () {
    const { items, hints } = ${payload};

    function post(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function humanDelay(minMs, maxMs) {
      return sleep(minMs + Math.random() * (maxMs - minMs));
    }

    function setNativeValue(el, value) {
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value') && Object.getOwnPropertyDescriptor(proto, 'value').set;
      if (setter) setter.call(el, value); else el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function findVisible(selector) {
      return Array.from(document.querySelectorAll(selector)).find((el) => el.offsetParent !== null) || null;
    }

    function findByExactText(root, text) {
      const target = text.trim().toLowerCase();
      const all = root.querySelectorAll('button, div[role="button"], div, span');
      for (const el of all) {
        if (el.children.length === 0 && el.textContent.trim().toLowerCase() === target && el.offsetParent !== null) {
          return el;
        }
      }
      return null;
    }

    async function ensureSearchOpen() {
      let input = findVisible(hints.searchInputSelector);
      if (input) return input;

      const candidates = document.querySelectorAll('div, span, button');
      for (const el of candidates) {
        if (el.children.length === 0 && el.textContent && el.textContent.includes(hints.searchTriggerTextIncludes)) {
          (el.closest('[role="button"]') || el).click();
          break;
        }
      }
      await sleep(600);
      return findVisible(hints.searchInputSelector);
    }

    async function addItem(name) {
      const input = await ensureSearchOpen();
      if (!input) return { name, ok: false, reason: 'search-input-not-found' };

      input.focus();
      setNativeValue(input, name);
      await sleep(hints.resultsSettleMs);

      const addBtn = findByExactText(document, hints.addButtonText);
      if (!addBtn) return { name, ok: false, reason: 'add-button-not-found' };

      addBtn.click();
      return { name, ok: true };
    }

    (async function run() {
      post({ type: 'start', total: items.length });
      for (let i = 0; i < items.length; i++) {
        try {
          const result = await addItem(items[i].name);
          post({ type: 'item-result', index: i, ...result });
        } catch (err) {
          post({ type: 'item-result', index: i, name: items[i].name, ok: false, reason: String(err && err.message || err) });
        }
        if (i < items.length - 1) await humanDelay(1500, 3000);
      }
      post({ type: 'done' });
    })();
  })();
  true;
  `;
}
