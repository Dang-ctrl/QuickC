import { QuickCommercePlatform } from '../types';
import { CartProviderKind } from './types';

export interface PlatformConfig {
  id: QuickCommercePlatform;
  label: string;
  /** See CartProviderKind in ./types for what each value means and why. */
  providerKind: CartProviderKind;
  url: string;
  /**
   * DOM hints, kept separate from the injection engine so they can be
   * updated independently as each site's markup changes. Verified against
   * the live site on 2026-09-14 — Blinkit and Zepto use hashed utility
   * classes with no stable IDs, so matching leans on visible text/role
   * rather than class names. Re-check these whenever add-to-cart silently
   * stops working; that's a "site changed its markup" signal, not a bug
   * in the engine.
   *
   * searchInputSelector is deliberately a bare 'input', not
   * 'input[type="text"]' — confirmed live on 2026-09-15 that Blinkit's
   * search box has no `type` HTML attribute at all (only the browser's IDL
   * default makes `.type` read "text" in JS), so the attribute selector
   * silently matched nothing. Zepto/Instamart haven't hit this specific
   * failure yet but use the same safe selector preemptively.
   */
  hints: {
    /** Text shown on the homepage search bar before it's activated (e.g. `Search "milk"`). Clicking it (or its container) opens real search. */
    searchTriggerTextIncludes: string;
    /** Once search is active, the real text input to type into. */
    searchInputSelector: string;
    /** Exact (case-insensitive) text on the add-to-cart control for an unpurchased item. */
    addButtonText: string;
    /** Milliseconds to wait after typing before results are assumed rendered. */
    resultsSettleMs: number;
  };
}

export const PLATFORM_CONFIGS: Record<QuickCommercePlatform, PlatformConfig> = {
  blinkit: {
    id: 'blinkit',
    label: 'Blinkit',
    providerKind: 'webview',
    url: 'https://blinkit.com',
    hints: {
      searchTriggerTextIncludes: 'Search "',
      searchInputSelector: 'input',
      addButtonText: 'ADD',
      resultsSettleMs: 2000,
    },
  },
  zepto: {
    id: 'zepto',
    label: 'Zepto',
    providerKind: 'webview',
    url: 'https://www.zeptonow.com',
    hints: {
      searchTriggerTextIncludes: 'Search for',
      searchInputSelector: 'input',
      addButtonText: 'ADD',
      resultsSettleMs: 2000,
    },
  },
  instamart: {
    id: 'instamart',
    // Target state once Swiggy Builders Club access is granted: 'mcp'.
    // Falls back to 'webview' automatically at runtime until then — see
    // resolveProviderKind() in ./index.ts.
    label: 'Swiggy Instamart',
    providerKind: 'mcp',
    url: 'https://www.swiggy.com/instamart',
    hints: {
      searchTriggerTextIncludes: 'Search for',
      searchInputSelector: 'input',
      addButtonText: 'Add',
      resultsSettleMs: 2000,
    },
  },
};
