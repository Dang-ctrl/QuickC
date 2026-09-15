import { PLATFORM_CONFIGS } from './platformConfigs';
import { CartProviderKind } from './types';
import { isInstamartMcpConfigured } from './providers/instamartMcpClient';
import { QuickCommercePlatform } from '../types';

/**
 * Decides which cart-fill mechanism actually runs for a platform. A
 * platform's configured providerKind is its *target* state — this resolves
 * to the real, working thing available right now, so the app is never
 * stuck on a "not connected yet" screen when a working fallback exists.
 */
export function resolveProviderKind(platform: QuickCommercePlatform): CartProviderKind {
  const target = PLATFORM_CONFIGS[platform].providerKind;
  if (target === 'mcp' && platform === 'instamart' && !isInstamartMcpConfigured()) {
    return 'webview';
  }
  return target;
}

export { PLATFORM_CONFIGS } from './platformConfigs';
export { default as WebViewCartFillScreen } from './providers/WebViewCartFillScreen';
export { default as McpCartFillScreen } from './providers/McpCartFillScreen';
