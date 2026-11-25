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
    await resetDatabase();
    await resetStorage();
    const auth0Ids = await syncAuth0(password);
    await seedEmployees(auth0Ids);
    await seedContent();
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
