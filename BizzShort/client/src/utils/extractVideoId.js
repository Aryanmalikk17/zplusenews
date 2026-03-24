/**
 * extractVideoId - Shared utility to extract a clean YouTube video ID
 * from any format: full URL, short URL, embed URL, or raw 11-char ID.
 *
 * @param {string} raw - Input string (URL or ID)
 * @returns {string|null} Clean 11-char video ID or null
 */
export function extractVideoId(raw) {
  if (!raw) return null;
  const str = String(raw).trim();

  // Try URL patterns first
  try {
    const url = new URL(str);
    // youtube.com/watch?v=ID
    const v = url.searchParams.get('v');
    if (v) return v;
    // youtu.be/ID or youtube.com/embed/ID or youtube.com/shorts/ID
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  } catch {
    // Not a URL — treat as raw ID
  }

  // Match raw 11-char video ID (alphanumeric, dash, underscore)
  if (/^[a-zA-Z0-9_-]{10,12}$/.test(str)) return str;

  return str; // fallback: return as-is
}

export default extractVideoId;
