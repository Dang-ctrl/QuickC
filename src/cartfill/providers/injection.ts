import { PlatformConfig } from '../platformConfigs';

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
 * - Never clicks "the first ADD on the page". Search pages mix real results
 *   with sponsored cards and trending/recommended products (Blinkit's first
 *   card for "milk" is a rusk ad with no "Ad" label in the DOM; Zepto shows
 *   unrelated trending products next to the autocomplete list). Instead it
 *   finds every product card, reads its name, and only adds a card whose
 *   name matches the item we want. No match means "add manually", never a
 *   wrong product in the cart.
 * - Reports progress after every item so the RN side can render a live
 *   checklist and the user can watch it happen.
 * - Paces itself with randomized delays between items.
 * - Uses the native input value setter + a dispatched 'input' event to set
 *   text, because React-controlled inputs ignore a plain `.value = ...`.
 * - Every DOM lookup is wrapped so one missing/renamed element fails that
 *   single item instead of crashing the whole run.
 *
 * - Survives full page loads. Zepto's search trigger is a real link, so
 *   opening search reloads the page and destroys this script mid-run. Progress
 *   (the index of the item in flight) is kept in sessionStorage; the RN side
 *   re-injects the script after every load with resume=true and it carries on
 *   from that item.
 *
 * Written with String.raw so regex backslashes reach the page unchanged.
 * Do not use backticks or ${} inside the script body.
 */
export function buildInjectionScript(
  items: CartFillItem[],
  config: PlatformConfig,
  options: { resume?: boolean } = {}
): string {
  const payload = JSON.stringify({ items, hints: config.hints });
  const resume = options.resume ? 'true' : 'false';

  return String.raw`
  (function () {
    const { items, hints } = ${payload};
    const addLabel = hints.addButtonText.trim().toLowerCase();
    const RESUME = ${resume};
    const STATE_KEY = '__cartfill_state__';

    // onLoadEnd can fire more than once per page, so a resume is ignored while
    // a run is already alive here. A fresh Start always takes over: its run
    // token supersedes any older loop still running in this page.
    if (RESUME && window.__cartfillActive) return;
    const runId = Math.random();
    window.__cartfillActive = true;
    window.__cartfillRunId = runId;
    const superseded = () => window.__cartfillRunId !== runId;

    function loadState() {
      try { return JSON.parse(sessionStorage.getItem(STATE_KEY)); } catch (e) { return null; }
    }
    function saveState(state) {
      try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
    }

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

    // Sites like Blinkit re-render parts of the page on their own timers, so a
    // single check-and-give-up treats a momentary gap as permanent failure.
    async function pollFor(fn, { intervalMs = 250, timeoutMs = 4000 } = {}) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const result = fn();
        if (result) return result;
        await sleep(intervalMs);
      }
      return null;
    }

    function setNativeValue(el, value) {
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value') && Object.getOwnPropertyDescriptor(proto, 'value').set;
      if (setter) setter.call(el, value); else el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function pressEnter(el) {
      for (const type of ['keydown', 'keypress', 'keyup']) {
        el.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }
    }

    // getBoundingClientRect instead of offsetParent: offsetParent is null for
    // position:fixed elements, which would hide perfectly visible controls.
    function isVisible(el) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    }

    function findVisible(selector) {
      return Array.from(document.querySelectorAll(selector)).find(isVisible) || null;
    }

    // ---- product cards -------------------------------------------------

    function findAddControls() {
      const matches = [];
      for (const el of document.querySelectorAll('button, [role="button"], div, span')) {
        if (el.childElementCount > 1) continue;
        if (el.textContent.trim().toLowerCase() !== addLabel) continue;
        if (!isVisible(el)) continue;
        matches.push(el);
      }
      // Keep only the innermost match so a <button><span>ADD</span></button>
      // counts once, not twice.
      return matches.filter((el) => !matches.some((m) => m !== el && el.contains(m)));
    }

    // A card is the largest ancestor of an ADD control that doesn't yet
    // contain another ADD control.
    function cardOf(addEl, allAdds) {
      let n = addEl;
      while (n.parentElement && n.parentElement !== document.body) {
        const p = n.parentElement;
        if (allAdds.some((a) => a !== addEl && p.contains(a))) break;
        if (p.textContent.length > 400) break;
        n = p;
      }
      return n;
    }

    const NAME_NOISE = [/^add$/i, /^\d/, /^₹/, /^(ad|sponsored|promoted|new|bestseller)$/i];

    // The product name is the longest leaf text that isn't a price, weight,
    // delivery time, discount badge or the add label itself.
    function cardName(card) {
      let best = '';
      for (const el of card.querySelectorAll('*')) {
        if (el.childElementCount !== 0) continue;
        const t = el.textContent.trim();
        if (t.length < 3 || !/[a-z]{3}/i.test(t)) continue;
        if (NAME_NOISE.some((re) => re.test(t))) continue;
        if (t.length > best.length) best = t;
      }
      return best;
    }

    function isSponsored(card) {
      return Array.from(card.querySelectorAll('*')).some(
        (el) => el.childElementCount === 0 && /^(ad|sponsored|promoted)$/i.test(el.textContent.trim())
      );
    }

    function currentCards() {
      const adds = findAddControls();
      return adds.map((addEl) => {
        const card = cardOf(addEl, adds);
        return { addEl, name: cardName(card), sponsored: isSponsored(card) };
      });
    }

    function snapshotKey() {
      return currentCards().map((c) => c.name).join('|');
    }

    function tokens(query) {
      return query
        .toLowerCase()
        .replace(/\(.*?\)/g, ' ')
        .split(/[^a-z]+/)
        .filter((t) => t.length >= 3)
        .map((t) => (t.length > 4 ? t.replace(/(es|s)$/, '') : t.replace(/s$/, '')));
    }

    // Best non-sponsored card whose name contains at least half of the query's
    // words. Ties go to the earliest card, i.e. the site's own ranking.
    function pickBest(query) {
      const toks = tokens(query);
      if (!toks.length) return null;
      const need = Math.max(1, Math.ceil(toks.length / 2));
      let best = null;
      for (const c of currentCards()) {
        if (c.sponsored) continue;
        const nm = c.name.toLowerCase();
        const hit = toks.filter((t) => nm.includes(t)).length;
        if (hit < need) continue;
        const score = hit / toks.length;
        if (!best || score > best.score) best = { addEl: c.addEl, name: c.name, score };
      }
      return best;
    }

    // ---- search + add --------------------------------------------------

    async function ensureSearchOpen() {
      const existing = await pollFor(() => findVisible(hints.searchInputSelector), { timeoutMs: 800 });
      if (existing) return existing;

      for (const el of document.querySelectorAll('div, span, button')) {
        if (el.childElementCount === 0 && el.textContent && el.textContent.includes(hints.searchTriggerTextIncludes)) {
          (el.closest('[role="button"], a') || el).click();
          break;
        }
      }
      // The trigger can be a full route change (Blinkit goes to /s/), so this
      // needs real polling headroom rather than one fixed wait.
      return pollFor(() => findVisible(hints.searchInputSelector), { timeoutMs: 4000 });
    }

    async function addItem(rawName) {
      const query = rawName.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();

      const input = await ensureSearchOpen();
      if (!input) return { name: rawName, ok: false, reason: 'search-input-not-found' };

      const before = snapshotKey();
      input.focus();
      setNativeValue(input, query);

      // Zepto only shows autocomplete suggestions while typing; real results
      // need the search to be submitted.
      if (hints.pressEnterAfterTyping) {
        await sleep(600);
        pressEnter(input);
      }

      // Wait for the results to actually change, so we never match a card
      // left over from the previous item's search.
      await pollFor(() => snapshotKey() !== before, { timeoutMs: hints.resultsSettleMs + 2000 });

      let match = await pollFor(() => pickBest(query), { timeoutMs: 3000 });
      if (!match && !hints.pressEnterAfterTyping) {
        pressEnter(input);
        await sleep(800);
        match = await pollFor(() => pickBest(query), { timeoutMs: 4000 });
      }
      if (!match) return { name: rawName, ok: false, reason: 'no-matching-product' };

      match.addEl.click();

      // The ADD control turns into a quantity stepper once the item is in the
      // cart; if it's still there, the click didn't register.
      const confirmed = await pollFor(
        () => !document.contains(match.addEl) || !isVisible(match.addEl) || match.addEl.textContent.trim().toLowerCase() !== addLabel,
        { timeoutMs: 2500 }
      );
      if (!confirmed) return { name: rawName, ok: false, reason: 'add-not-confirmed', matched: match.name };

      return { name: rawName, ok: true, matched: match.name };
    }

    function withTimeout(promise, ms) {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timed-out')), ms)),
      ]);
    }

    (async function run() {
      window.__cartfillCancelled = false;
      let startIndex = 0;

      if (RESUME) {
        const saved = loadState();
        // No saved state means the run finished or was cancelled; nothing to resume.
        if (!saved || saved.done) { window.__cartfillActive = false; return; }
        startIndex = saved.index;
        post({ type: 'resumed', index: startIndex });
      } else {
        post({ type: 'start', total: items.length });
      }
      saveState({ index: startIndex });

      for (let i = startIndex; i < items.length; i++) {
        if (superseded()) return;
        if (window.__cartfillCancelled) {
          post({ type: 'cancelled', atIndex: i });
          window.__cartfillActive = false;
          return;
        }
        let outcome;
        try {
          // Bounded per item so one stuck step can't hang the whole run.
          outcome = await withTimeout(addItem(items[i].name), 30000);
        } catch (err) {
          outcome = { name: items[i].name, ok: false, reason: String((err && err.message) || err) };
        }
        if (superseded()) return;
        post({ type: 'item-result', index: i, ...outcome });
        saveState({ index: i + 1 });
        if (i < items.length - 1) await humanDelay(1500, 3000);
      }
      saveState({ done: true });
      window.__cartfillActive = false;
      post({ type: 'done' });
    })();
  })();
  true;
  `;
}
