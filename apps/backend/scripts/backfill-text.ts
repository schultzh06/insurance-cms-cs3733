/**
 * Backfills textContent for all content items that don't have it yet.
 * Run this before backfill.ts if you want a separate text-extraction pass.
 *
 * Usage:
 *   pnpm --filter backend exec tsx scripts/backfill-text.ts [--force] [--verbose] [--cache]
 *
 * --force    Re-extract text for rows that already have textContent
 * --verbose  Log which parser is used and any fallbacks for each item
 * --cache    Reuse text from the local seed cache (see seed-cache.ts), keyed by
 *            file MD5 or link URL, and record new extractions there
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import type { SupportedMimeType } from '../lib/extractors.js';
const { prisma, Bucket } = await import('@softeng-app/db');
const { extractText, getVisionTokensUsed, setVerbose } = await import('../lib/extractors.js');
const mime = (await import('mime-types')).default;
const { SeedCache } = await import('./seed-cache.js');

const force = process.argv.includes('--force');
const verbose = process.argv.includes('--verbose');
if (verbose) setVerbose(true);
const cache = process.argv.includes('--cache') ? new SeedCache<string | null>('text') : null;

/** Cache key for a content row: file MD5 (from R2, no download) or link URL. */
async function cacheKey(item: { fileURI: string | null; linkURL: string | null }): Promise<string | null> {
    if (item.fileURI) {
        const md5 = await Bucket.getMd5(item.fileURI);
        return md5 ? `md5:${md5}` : null;
    }
    return item.linkURL ? `url:${item.linkURL}` : null;
}

async function backfill() {
    const rows = await prisma.content.findMany({ where: force ? {} : { textContent: null } });
    console.log(`Found ${rows.length} records to process (force=${force}).\n`);

    let success = 0, skipped = 0, failed = 0, cached = 0;

    for (const item of rows) {
        try {
            let textContent: string | null = null;
            const key = cache ? await cacheKey(item) : null;
            const hit = key ? cache!.get(key) : undefined;

            // `null` is a valid cached result (nothing extractable), so test for undefined
            if (hit !== undefined) {
                await prisma.content.update({ where: { id: item.id }, data: { textContent: hit } });
                console.log(`[${item.id}] "${item.displayName}" (cached)`);
                cached++;
                continue;
            }

            if (item.fileURI) {
                let data: Buffer;
                try {
                    data = await Bucket.downloadFile(item.fileURI);
                } catch (error) {
                    console.warn(`Skipped [${item.id}] "${item.displayName}" — download failed:`, (error as Error).message);
                    skipped++; continue;
                }
                const mimeType = mime.lookup(item.fileURI) || null;
                if (!mimeType) {
                    console.warn(`Skipped [${item.id}] "${item.displayName}" — unknown MIME type`);
                    skipped++; continue;
                }
                textContent = await extractText(data, mimeType as SupportedMimeType);
            } else if (item.linkURL) {
                textContent = await extractText(null, 'url', item.linkURL);
            } else {
                console.warn(`Skipped [${item.id}] "${item.displayName}" — no fileURI or linkURL`);
                skipped++; continue;
            }

            await prisma.content.update({ where: { id: item.id }, data: { textContent } });
            if (key) cache!.set(key, textContent);
            console.log(`[${item.id}] "${item.displayName}"`);
            success++;
        } catch (err) {
            console.error(`[${item.id}] "${item.displayName}" — error:`, err);
            failed++;
        }
    }

    const visionTokens = getVisionTokensUsed();
    cache?.save();
    console.log(`\nSuccess: ${success}, Cached: ${cached}, Skipped: ${skipped}, Failed: ${failed}`);
    if (visionTokens > 0) console.log(`Vision tokens used: ${visionTokens}`);
    await prisma.$disconnect();
}

void backfill();
