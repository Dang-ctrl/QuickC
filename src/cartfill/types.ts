import { QuickCommercePlatform } from '../types';

export interface CartToolResult {
  name: string;
  ok: boolean;
  reason?: string;
}

/**
 * How a platform's cart gets filled. This is the fork point in the whole
 * module:
 *
 * - 'webview': no official order-placement API exists (Blinkit, Zepto today).
 *   We drive the platform's own mobile website inside an on-device WebView,
 *   in the user's own logged-in session — nothing touches our servers.
 *   Runs entirely on the user's device, so it scales the way the user's own
 *   traffic scales; there's no shared infrastructure to become a bottleneck
 *   or a single point of ToS/liability exposure across all users.
 *
 * - 'mcp': an official, sanctioned tool API exists (Instamart, once Builders
 *   Club access is granted). No visible browser needed — it's a network
 *   call, which is also the smoother experience for the user.
 *
 * Every platform is expected to expose the same three tool-shaped
 * operations regardless of which strategy backs it, so the rest of the app
 * (shopping list -> "fill my cart") never needs to know which platform uses
 * which mechanism.
 */
export type CartProviderKind = 'webview' | 'mcp';

export interface CartFillPlatformMeta {
  id: QuickCommercePlatform;
  label: string;
  providerKind: CartProviderKind;
}
