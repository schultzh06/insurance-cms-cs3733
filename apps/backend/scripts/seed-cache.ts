/**
 * Local, machine-only cache the seed uses to avoid paying for the same work
 * twice: extracted text (vision tokens, slow PDF parsing) and embeddings.
 * The backfill scripts use it only when run with `--cache`, which the seed
 * passes; run by hand they behave as before.
 *
 * Files live in `seed-data/.cache/` (gitignored). Deleting the folder forces
 * a full re-extract and re-embed on the next seed.
 */
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const CACHE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'seed-data/.cache');

/** A JSON-backed key/value map; call `save()` to persist changes. */
export class SeedCache<V> {
    private readonly path: string;
    private readonly entries: Record<string, V>;
    private dirty = false;

    constructor(name: string) {
        this.path = resolve(CACHE_DIR, `${name}.json`);
        this.entries = existsSync(this.path) ? JSON.parse(readFileSync(this.path, 'utf8')) : {};
    }

    get(key: string): V | undefined {
        return this.entries[key];
    }

    set(key: string, value: V) {
        this.entries[key] = value;
        this.dirty = true;
    }

    save() {
        if (!this.dirty) return;
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(this.path, JSON.stringify(this.entries));
        this.dirty = false;
    }
}

/** SHA-256 hex digest, used to key embeddings by their full input text. */
export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
