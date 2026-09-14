import { QuickCommercePlatform } from '../types';

export interface PlatformConfig {
  id: QuickCommercePlatform;
  label: string;
  url: string;
  /**
   * DOM hints, kept separate from the injection engine so they can be
   * updated independently as each site's markup changes. Verified against
   * the live site on 2026-09-14 — Blinkit and Zepto use hashed utility
   * classes with no stable IDs, so matching leans on visible text/role
   * rather than class names. Re-check these whenever add-to-cart silently
   * stops working; that's a "site changed its markup" signal, not a bug
   * in the engine.
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
    url: 'https://blinkit.com',
    hints: {
      searchTriggerTextIncludes: 'Search "',
      searchInputSelector: 'input[type="text"]',
      addButtonText: 'ADD',
      resultsSettleMs: 1200,
    },
  },
  zepto: {
    id: 'zepto',
    label: 'Zepto',
    url: 'https://www.zeptonow.com',
    hints: {
      searchTriggerTextIncludes: 'Search for',
      searchInputSelector: 'input[type="text"]',
      addButtonText: 'ADD',
      resultsSettleMs: 1200,
    },
  },
  instamart: {
    id: 'instamart',
    label: 'Swiggy Instamart',
    url: 'https://www.swiggy.com/instamart',
    hints: {
      searchTriggerTextIncludes: 'Search for',
      searchInputSelector: 'input[type="text"]',
      addButtonText: 'Add',
      resultsSettleMs: 1200,
    },
  },
};
