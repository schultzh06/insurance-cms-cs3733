/**
 * Wipes the demo environment and rebuilds it from the fixtures in `seed-data/`.
 * Destructive: truncates every app table, empties the storage buckets, and
 * deletes every user in the Auth0 tenant (the demo tenant has no real accounts).
 *
 * Usage:
 *   pnpm seed --yes
 *
 * --yes  Required. Without it the script only prints what it would target.
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

// Dynamic imports so dotenv runs before Prisma, Supabase and the Auth0 client initialise.
const { prisma, supabase, Bucket } = await import('@softeng-app/db');
const { createSeedAuth0User, deleteAllAuth0Users } = await import('../src/helpers/auth0Management.js');
const { employees } = await import('./seed-data/employees.js');

const TEAM_PHOTOS_DIR = resolve(__dirname, '../../frontend/src/assets/Team Photos');
const BUCKETS = ['content', 'profiles'];

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
        'DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY',
        'AUTH0_DOMAIN', 'AUTH0_MGMT_CLIENT_ID', 'AUTH0_MGMT_CLIENT_SECRET',
        'SEED_DEMO_PASSWORD',
    ];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
        console.error(`Missing env keys in apps/backend/.env: ${missing.join(', ')}`);
        process.exit(1);
    }
    if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not set — image text extraction will skip the vision model.');
    }

    const dbHost = new URL(process.env.DATABASE_URL!).host;
    console.log(`Target database: ${dbHost}`);
    console.log(`Target Auth0:    ${process.env.AUTH0_DOMAIN}`);
    if (!process.argv.includes('--yes')) {
        console.log('\nThis wipes all data, storage and ALL Auth0 users. Re-run with --yes to proceed.');
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

/** Recursively lists every file path under `prefix`; Supabase lists one level at a time. */
async function listAllFiles(bucket: string, prefix = ''): Promise<string[]> {
    const paths: string[] = [];
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) throw error;
    for (const entry of data ?? []) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        // Folders come back without an id.
        if (entry.id === null) paths.push(...await listAllFiles(bucket, path));
        else paths.push(path);
    }
    return paths;
}

async function resetStorage() {
    for (const bucket of BUCKETS) {
        const paths = await listAllFiles(bucket);
        // remove() accepts many paths per call; batch to keep requests small.
        for (let i = 0; i < paths.length; i += 100) {
            const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
            if (error) throw error;
        }
        console.log(`[reset] removed ${paths.length} files from "${bucket}"`);
    }
}

async function resetAuth0() {
    const deleted = await deleteAllAuth0Users();
    console.log(`[reset] deleted ${deleted} Auth0 users (entire tenant)`);
}

// ---------------------------------------------------------------------------
// 5. Employees
// ---------------------------------------------------------------------------

async function seedEmployees(password: string) {
    for (const e of employees) {
        const auth0Id = await createSeedAuth0User(e.username, password, `${e.username}@example.com`);
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
    await resetAuth0();
    await seedEmployees(password);
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
