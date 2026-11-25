/**
 * Wipes the demo environment and rebuilds it from the fixtures in `seed-data/`.
 * Destructive: truncates every app table and empties the storage buckets.
 * The Auth0 tenant is synced rather than wiped: fixture users that already
 * exist are kept, missing ones are created, and any other user is deleted
 * (the demo tenant has no real accounts). This keeps re-runs cheap on the
 * rate-limited Management API.
 *
 * Usage:
 *   pnpm seed --yes [--reset-passwords]
 *
 * --yes              Required. Without it the script only prints what it would target.
 * --reset-passwords  Also set every kept user's password to SEED_DEMO_PASSWORD
 *                    (needed after changing it; costs one API call per user).
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

// Dynamic imports so dotenv runs before Prisma, the R2 client and the Auth0 client initialise.
const { prisma, Bucket } = await import('@softeng-app/db');
const { syncSeedAuth0Users } = await import('../src/helpers/auth0Management.js');
const { employees } = await import('./seed-data/employees.js');
const { files } = await import('./seed-data/files.js');
const { links } = await import('./seed-data/links.js');
const { collections } = await import('./seed-data/collections.js');
const { serviceRequests } = await import('./seed-data/service-requests.js');
const { applyExpirationTagsToAll } = await import('../src/jobs/autoTag.js');
const { readdir } = await import('fs/promises');

const FILES_DIR = resolve(__dirname, 'seed-data/files');

const TEAM_PHOTOS_DIR = resolve(__dirname, '../../frontend/src/assets/Team Photos');
const BUCKETS = ['content', 'profiles'] as const;

/** Every app table; TRUNCATE ... CASCADE handles foreign-key order. */
const TABLES = [
    'NotificationDismissal', 'Notification', 'ExpirationDismissal',
    'CollectionFavorite', 'CollectionItem', 'Collection',
    'Bookmark', 'Preview', 'Content', 'ServiceRequest', 'Employee',
];

// ---------------------------------------------------------------------------
// 1. Preflight
// ---------------------------------------------------------------------------

function preflight(): string {
    const required = [
        'DATABASE_URL', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
        'AUTH0_DOMAIN', 'AUTH0_MGMT_CLIENT_ID', 'AUTH0_MGMT_CLIENT_SECRET',
        'SEED_DEMO_PASSWORD',
    ];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
        console.error(`Missing env keys in apps/backend/.env: ${missing.join(', ')}`);
        process.exit(1);
    }
    if (!process.env.OPENROUTER_API_KEY) {
        console.warn('OPENROUTER_API_KEY not set — image text extraction will skip the vision model.');
    }

    const dbHost = new URL(process.env.DATABASE_URL!).host;
    console.log(`Target database: ${dbHost}`);
    console.log(`Target Auth0:    ${process.env.AUTH0_DOMAIN}`);
    if (!process.argv.includes('--yes')) {
        console.log('\nThis wipes all data and storage, and deletes every Auth0 user not in the fixtures. Re-run with --yes to proceed.');
        process.exit(0);
    }
    return process.env.SEED_DEMO_PASSWORD!;
}

/**
 * Fails before the wipe if the ML sidecar is down. Otherwise every embedding
 * in stage 8 fails only after the whole seed has run.
 */
async function checkMlService() {
    // Same default as lib/embeddings.ts.
    const url = `${process.env.ML_SERVICE_URL ?? 'http://localhost:3001'}/health`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`status ${res.status}`);
    } catch (err) {
        console.error(`ML sidecar not reachable at ${url} (${(err as Error).message}). Start it with \`pnpm dev:python\`.`);
        process.exit(1);
    }
}

// ---------------------------------------------------------------------------
// 2–4. Reset
// ---------------------------------------------------------------------------

async function resetDatabase() {
    const list = TABLES.map(t => `"${t}"`).join(', ');
    // Table names are constants above, so the unsafe variant is safe here.
    await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
    console.log(`[reset] truncated ${TABLES.length} tables`);
}

async function resetStorage() {
    for (const bucket of BUCKETS) {
        const removed = await Bucket.emptyBucket(bucket);
        console.log(`[reset] removed ${removed} files from "${bucket}"`);
    }
}

/** Fixture login email for an employee; also the key Auth0 users are matched on. */
const seedEmail = (username: string) => `${username}@example.com`;

/** Syncs the Auth0 tenant onto the fixture users and returns their ids keyed by email. */
async function syncAuth0(password: string): Promise<Map<string, string>> {
    const resetPasswords = process.argv.includes('--reset-passwords');
    const wanted = employees.map(e => ({ username: e.username, email: seedEmail(e.username) }));
    const r = await syncSeedAuth0Users(wanted, password, resetPasswords);
    console.log(`[auth0] kept ${r.kept}, created ${r.created}, deleted ${r.deleted} strays` +
        (resetPasswords ? `, reset ${r.passwordsReset} passwords` : ''));
    return r.ids;
}

// ---------------------------------------------------------------------------
// 5. Employees
// ---------------------------------------------------------------------------

async function seedEmployees(auth0Ids: Map<string, string>) {
    for (const e of employees) {
        const auth0Id = auth0Ids.get(seedEmail(e.username).toLowerCase())!;
        await prisma.employee.create({
            data: { id: e.id, firstName: e.firstName, lastName: e.lastName, persona: e.persona, auth0Id },
        });

        if (e.photo) {
            const photoPath = resolve(TEAM_PHOTOS_DIR, e.photo);
            if (existsSync(photoPath)) {
                // Same `<employeeId>/<uuid>/<filename>` scheme as buildPhotoURI in hooks/employee.ts.
                const uri = `${e.id}/${randomUUID()}/${e.photo}`;
                const { path } = await Bucket.uploadFile(await readFile(photoPath), uri, 'profiles');
                await prisma.employee.update({ where: { id: e.id }, data: { profilePhotoURI: path } });
            } else {
                console.warn(`[employees] photo not found for ${e.username}: ${photoPath}`);
            }
        }
        console.log(`[employees] ${e.firstName} ${e.lastName} (${e.persona}) → ${e.username}`);
    }
}

// ---------------------------------------------------------------------------
// 6. Content (files + links)
// ---------------------------------------------------------------------------

/**
 * Fails before anything is uploaded if `files.ts` and `seed-data/files/` disagree,
 * so a renamed or newly built file can't silently go unseeded.
 */
async function checkFileManifest() {
    const onDisk = new Set(await readdir(FILES_DIR));
    const listed = new Set(files.map(f => f.file));
    const missing = [...listed].filter(f => !onDisk.has(f));
    const unlisted = [...onDisk].filter(f => !listed.has(f));
    if (missing.length || unlisted.length) {
        throw new Error(
            `seed-data/files.ts is out of sync with seed-data/files/` +
            (missing.length ? `\n  listed but not on disk (run build-content.sh?): ${missing.join(', ')}` : '') +
            (unlisted.length ? `\n  on disk but not listed: ${unlisted.join(', ')}` : ''),
        );
    }
}

/**
 * Uploads every fixture file to R2 and inserts file and link content rows.
 * Text extraction and embeddings are left null on purpose: stage 8 runs the
 * existing backfill scripts, which pick up exactly those null rows.
 */
async function seedContent() {
    await checkFileManifest();
    const employeeIds = new Map(employees.map(e => [e.key, e.id]));
    // Links have no owner in their fixture; give each to the first employee of its persona.
    const personaOwner = new Map<string, number>();
    for (const e of employees) if (!personaOwner.has(e.persona)) personaOwner.set(e.persona, e.id);
    const now = new Date();
    const DAY_MS = 24 * 60 * 60 * 1000;

    for (const f of files) {
        const ownerId = employeeIds.get(f.owner);
        if (ownerId === undefined) throw new Error(`files.ts: unknown owner "${f.owner}" for ${f.file}`);
        // Same `<ownerId>/<uuid>/<filename>` key scheme as buildFileURI in hooks/content.ts.
        const { path } = await Bucket.uploadFile(await readFile(resolve(FILES_DIR, f.file)), `${ownerId}/${randomUUID()}/${f.file}`);
        await prisma.content.create({
            data: {
                displayName: f.displayName,
                fileURI: path,
                ownerId,
                contentType: f.contentType,
                status: f.status,
                targetPersona: f.targetPersona,
                tags: f.tags,
                created: now,
                lastModified: now,
                expiration: f.expiresInDays === undefined ? null : new Date(now.getTime() + f.expiresInDays * DAY_MS),
            },
        });
    }
    console.log(`[content] uploaded ${files.length} files`);

    for (const l of links) {
        await prisma.content.create({
            data: {
                displayName: l.displayName,
                linkURL: l.url,
                ownerId: personaOwner.get(l.targetPersona) ?? null,
                contentType: 'reference',
                status: 'complete',
                targetPersona: l.targetPersona,
                tags: l.tags,
                created: now,
                lastModified: now,
            },
        });
    }
    console.log(`[content] created ${links.length} links`);

    // Same job the server runs nightly, so expiry tags show immediately after a seed.
    await applyExpirationTagsToAll();
    console.log('[content] applied expiration tags');
}

// ---------------------------------------------------------------------------
// 7. Relations (service requests, collections, bookmarks, previews)
// ---------------------------------------------------------------------------

/**
 * Small seeded PRNG (mulberry32) so generated bookmarks and previews are the
 * same on every re-seed. Returns floats in [0, 1).
 */
function seededRandom(seed: number): () => number {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Picks `n` distinct elements from `pool` (or all of it, if smaller). */
function sample<T>(pool: T[], n: number, rand: () => number): T[] {
    const copy = [...pool];
    // Partial Fisher–Yates: shuffle only the first n slots.
    for (let i = 0; i < Math.min(n, copy.length); i++) {
        const j = i + Math.floor(rand() * (copy.length - i));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
}

/**
 * Seeds everything that connects employees and content. Fixture references
 * (employee keys, content and collection names) are resolved through lookups
 * that throw on a miss, so a typo fails the seed instead of silently dropping a link.
 */
async function seedRelations() {
    const employeeIds = new Map(employees.map(e => [e.key, e.id]));
    const rows = await prisma.content.findMany({ select: { id: true, displayName: true, targetPersona: true } });
    const contentIds = new Map(rows.map(r => [r.displayName, r.id]));

    const lookup = <V>(map: Map<string, V>, key: string, what: string): V => {
        const v = map.get(key);
        if (v === undefined) throw new Error(`seed relations: unknown ${what} "${key}"`);
        return v;
    };
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Collections first so service requests can link to them.
    const collectionIds = new Map<string, number>();
    let itemCount = 0, favoriteCount = 0;
    for (const c of collections) {
        const { id } = await prisma.collection.create({
            data: { displayName: c.displayName, ownerId: lookup(employeeIds, c.owner, 'employee'), public: c.public },
        });
        collectionIds.set(c.displayName, id);
        await prisma.collectionItem.createMany({
            data: c.items.map((name, position) => ({ collectionId: id, contentId: lookup(contentIds, name, 'content'), position })),
        });
        await prisma.collectionFavorite.createMany({
            data: (c.favoritedBy ?? []).map(k => ({ collectionId: id, employeeId: lookup(employeeIds, k, 'employee') })),
        });
        itemCount += c.items.length;
        favoriteCount += c.favoritedBy?.length ?? 0;
    }
    console.log(`[relations] ${collections.length} collections, ${itemCount} items, ${favoriteCount} favorites`);

    // The FK lives on Content / Collection, so create the request, then point the link at it.
    for (const s of serviceRequests) {
        const { id } = await prisma.serviceRequest.create({
            data: {
                name: s.name,
                type: s.type,
                notes: s.notes,
                ownerId: lookup(employeeIds, s.owner, 'employee'),
                assigneeId: s.assignee ? lookup(employeeIds, s.assignee, 'employee') : null,
                deadline: s.deadlineInDays === undefined ? null : new Date(now + s.deadlineInDays * DAY_MS),
            },
        });
        if (s.linkedContent) {
            await prisma.content.update({ where: { id: lookup(contentIds, s.linkedContent, 'content') }, data: { serviceRequestId: id } });
        }
        if (s.linkedCollection) {
            await prisma.collection.update({ where: { id: lookup(collectionIds, s.linkedCollection, 'collection') }, data: { serviceRequestId: id } });
        }
    }
    console.log(`[relations] ${serviceRequests.length} service requests`);

    // Generated activity: each employee bookmarks 3–5 items aimed at their persona,
    // and previewed 4–8 such items at random times over the last 30 days.
    const rand = seededRandom(28);
    let bookmarkCount = 0, previewCount = 0;
    for (const e of employees) {
        const pool = rows.filter(r => r.targetPersona === e.persona).map(r => r.id);
        const bookmarked = sample(pool, 3 + Math.floor(rand() * 3), rand);
        await prisma.bookmark.createMany({
            data: bookmarked.map(contentId => ({ bookmarkerId: e.id, bookmarkedContentId: contentId })),
        });
        const previewed = sample(pool, 4 + Math.floor(rand() * 5), rand);
        await prisma.preview.createMany({
            data: previewed.map(contentId => ({
                previewerId: e.id,
                previewedContentId: contentId,
                previewDate: new Date(now - rand() * 30 * DAY_MS),
            })),
        });
        bookmarkCount += bookmarked.length;
        previewCount += previewed.length;
    }
    console.log(`[relations] ${bookmarkCount} bookmarks, ${previewCount} previews (generated)`);
}

// ---------------------------------------------------------------------------
// 8. Backfill text + embeddings
// ---------------------------------------------------------------------------

/** Runs an existing backfill script as a child process so its logic isn't duplicated here. */
function runScript(script: string, args: string[] = []) {
    console.log(`\n[backfill] ${script} ${args.join(' ')}`);
    const result = spawnSync('pnpm', ['exec', 'tsx', resolve(__dirname, script), ...args], {
        cwd: resolve(__dirname, '..'),
        stdio: 'inherit',
    });
    if (result.status !== 0) throw new Error(`${script} exited with status ${result.status}`);
}

// ---------------------------------------------------------------------------

async function main() {
    const password = preflight();
    await checkMlService();
    await resetDatabase();
    await resetStorage();
    const auth0Ids = await syncAuth0(password);
    await seedEmployees(auth0Ids);
    await seedContent();
    await seedRelations();
    runScript('backfill-text.ts');
    runScript('backfill.ts');
    console.log('\nSeed complete.');
}

main()
    .catch(err => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
