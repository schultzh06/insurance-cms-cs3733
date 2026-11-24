/**
 * Resolves presigned R2 URLs for content files via `GET /api/content/file-url/:id`.
 *
 * The backend decides who may see a file and hands back a short-lived URL; the
 * browser then fetches the bytes straight from R2. URLs are cached per content
 * ID until shortly before they expire so repeated previews don't re-ask the API.
 */

/** Refresh a cached URL this long before it expires, so a fetch never starts on a URL about to die. */
const EXPIRY_MARGIN_MS = 30_000;

const urlCache = new Map<number, { url: string; expiresAt: number }>();

/**
 * Returns a presigned URL for the content item's file, from cache when still fresh.
 * Throws if the API refuses (404 = no file, or a deleted file the caller can't see).
 */
export async function getFileUrl(contentId: number, token: string): Promise<string> {
    const cached = urlCache.get(contentId);
    if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return cached.url;

    const res = await fetch(`/api/content/file-url/${contentId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`file-url ${contentId}: ${res.status}`);
    const { url, expiresAt } = (await res.json()) as { url: string; expiresAt: string };
    urlCache.set(contentId, { url, expiresAt: Date.parse(expiresAt) });
    return url;
}

/**
 * Fetches the file's bytes directly from R2.
 * Deliberately sends no `Authorization` header: the presigned URL is the credential,
 * and an extra header would make R2 reject the request and force a CORS preflight.
 */
export async function fetchFile(contentId: number, token: string): Promise<Response> {
    return fetch(await getFileUrl(contentId, token));
}

/** Drops the cached URL — needed after a file edit, since the new upload lives at a new key. */
export function invalidateFileUrl(contentId: number): void {
    urlCache.delete(contentId);
}
