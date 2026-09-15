import { CartToolResult } from '../types';

/**
 * Client for Swiggy's official Instamart MCP server (mcp.swiggy.com/instamart),
 * available through the invite-only Swiggy Builders Club program as of
 * September 2026. Access is a business/partnership step, not a signup form —
 * apply at https://mcp.swiggy.com/builders before wiring real credentials here.
 *
 * This is intentionally a stub. Filling it in for real requires:
 *   1. OAuth 2.1 + PKCE against Swiggy's auth server (per-user consent, not
 *      a static API key — each household connects their own Instamart
 *      account, the same trust model as the WebView approach).
 *   2. Calling the server's tools (search, cart, place-order, tracking) per
 *      https://mcp.swiggy.com/builders/docs.
 * Until then, isConfigured() returns false and every method rejects clearly
 * rather than failing silently, so the app can fall back to the WebView
 * path without leaving the user stuck on a dead screen.
 */

export interface InstamartMcpCredentials {
  accessToken: string;
}

let credentials: InstamartMcpCredentials | null = null;

export function setInstamartCredentials(creds: InstamartMcpCredentials | null) {
  credentials = creds;
}

export function isInstamartMcpConfigured(): boolean {
  return credentials !== null;
}

class NotConfiguredError extends Error {
  constructor() {
    super('Instamart MCP is not connected yet — Swiggy Builders Club access is pending. Falling back to the on-device flow.');
    this.name = 'NotConfiguredError';
  }
}

export async function searchAndAddItem(name: string): Promise<CartToolResult> {
  if (!isInstamartMcpConfigured()) throw new NotConfiguredError();
  // TODO once approved: call the server's search + add-to-cart tools using
  // `credentials.accessToken`, per the Builders Club tool schema.
  throw new Error('Instamart MCP tool-calling not yet implemented.');
}

export async function getCartSummary(): Promise<{ itemCount: number; totalInr: number }> {
  if (!isInstamartMcpConfigured()) throw new NotConfiguredError();
  throw new Error('Instamart MCP tool-calling not yet implemented.');
}
