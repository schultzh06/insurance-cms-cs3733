/**
 * Module-level cache for downloaded file content.
 *
 * Avoids re-fetching the same file when the user navigates between
 * ViewContent (inline preview) and ViewSingleFile (full-page preview).
 * Both caches are keyed by content ID. (They used to be keyed by the download
 * URL, but presigned R2 URLs change on every request, so the ID is the stable key.)
 *
 * The cache lives for the entire browser session and is never automatically
 * evicted — call {@link invalidateFileCacheById} after a file is edited so the
 * stale bytes don't show up in the next preview.
 */

import { invalidateFileUrl } from "@/features/content/previews/file-url.ts";

const textCache = new Map<number, string>();
const blobCache = new Map<number, Blob>();

/**
 * Returns the cached text content for the given content ID, or `undefined` if it
 * has not been fetched yet.
 */
export function getCachedText(id: number): string | undefined {
    return textCache.get(id);
}

/**
 * Stores text content in the cache under the given content ID.
 * Called by {@link FilePreview} after a successful text fetch.
 */
export function setCachedText(id: number, text: string): void {
    textCache.set(id, text);
}

/**
 * Returns the cached Blob for the given content ID, or `undefined` if it has not
 * been fetched yet. Used for binary formats (images, PDFs, spreadsheets, etc.).
 */
export function getCachedBlob(id: number): Blob | undefined {
    return blobCache.get(id);
}

/**
 * Stores a Blob in the cache under the given content ID.
 * Called by {@link FilePreview} after a successful binary fetch.
 */
export function setCachedBlob(id: number, blob: Blob): void {
    blobCache.set(id, blob);
}

/**
 * Removes the text, blob and presigned-URL cache entries for the content item
 * with the given database ID. Call this after saving a file edit so the next
 * preview re-fetches the updated file instead of showing the old version.
 */
export function invalidateFileCacheById(id: number): void {
    textCache.delete(id);
    blobCache.delete(id);
    invalidateFileUrl(id);
}
