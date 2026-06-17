/**
 * Stable client-side fallback identity used when Firebase Auth is unreachable
 * (e.g. in China). The UID is namespaced with a `nofb_` prefix so the backend
 * and database can distinguish it from real Firebase users.
 */

const STORAGE_KEY = 'svgr_fallback_uid';
const PREFIX = 'nofb_';

let inMemoryUid: string | null = null;

/** Generate `nofb_` + 32 hex chars (matches /^nofb_[A-Za-z0-9_-]{16,}$/). */
function generateFallbackUid(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${PREFIX}${random}`;
}

/**
 * Returns the persisted fallback UID, minting and storing one on first use.
 * If `localStorage` is unavailable (e.g. private mode), returns a per-session
 * in-memory UID instead.
 */
export function getOrCreateFallbackUid(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const uid = generateFallbackUid();
    localStorage.setItem(STORAGE_KEY, uid);
    return uid;
  } catch {
    if (!inMemoryUid) inMemoryUid = generateFallbackUid();
    return inMemoryUid;
  }
}
