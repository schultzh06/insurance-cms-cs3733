import { ManagementClient } from 'auth0';

const auth0 = new ManagementClient({
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_MGMT_CLIENT_ID!,
    clientSecret: process.env.AUTH0_MGMT_CLIENT_SECRET!,
})

export const createAuth0User = async (username: string, password: string, email: string) => {
    const user = await auth0.users.create({
        connection: 'Username-Password-Authentication',
        username,
        password,
        email
    })
    console.log("Auth0 response:", JSON.stringify(user, null, 2));
    return user.user_id;
};

/**
 * Creates an Auth0 user tagged with `app_metadata.seed = true`, so the seed
 * script can find and delete exactly the users it created on the next run.
 */
export const createSeedAuth0User = async (username: string, password: string, email: string) => {
    const user = await auth0.users.create({
        connection: 'Username-Password-Authentication',
        username,
        password,
        email,
        email_verified: true,
        app_metadata: { seed: true },
    });
    if (!user.user_id) throw new Error(`Auth0 returned no user_id for ${username}`);
    return user.user_id;
};

/** Counts of what {@link syncSeedAuth0Users} changed, for the seed log. */
export interface Auth0SyncResult {
    /** Auth0 `user_id` for every wanted user, keyed by lowercase email. */
    ids: Map<string, string>;
    created: number;
    kept: number;
    deleted: number;
    passwordsReset: number;
}

/**
 * Converges the Auth0 tenant onto exactly the `wanted` users, using as few
 * Management API calls as possible (the API is rate limited):
 *   - one paginated list of the tenant
 *   - create only users that are missing (matched by email)
 *   - delete users not in `wanted` — only safe because the demo tenant holds no
 *     real accounts, and their employee rows are truncated by the seed anyway
 *   - reset passwords only when `resetPasswords` is set, since Auth0 can't
 *     report whether a stored password already matches
 * A re-run against an already-seeded tenant therefore costs a single list call.
 */
export const syncSeedAuth0Users = async (
    wanted: { username: string; email: string }[],
    password: string,
    resetPasswords: boolean,
): Promise<Auth0SyncResult> => {
    const existing = new Map<string, string>(); // lowercase email → user_id
    const strays: string[] = [];
    const wantedEmails = new Set(wanted.map(w => w.email.toLowerCase()));

    // Collect everything first so deleting doesn't shift the pages being iterated.
    const page = await auth0.users.list();
    for await (const user of page) {
        if (!user.user_id) continue;
        const email = user.email?.toLowerCase();
        if (email && wantedEmails.has(email)) existing.set(email, user.user_id);
        else strays.push(user.user_id);
    }

    const result: Auth0SyncResult = { ids: new Map(), created: 0, kept: 0, deleted: 0, passwordsReset: 0 };
    for (const id of strays) {
        await auth0.users.delete(id);
        result.deleted++;
    }
    for (const w of wanted) {
        const email = w.email.toLowerCase();
        const id = existing.get(email);
        if (id) {
            if (resetPasswords) {
                await auth0.users.update(id, { password });
                result.passwordsReset++;
            }
            result.ids.set(email, id);
            result.kept++;
        } else {
            result.ids.set(email, await createSeedAuth0User(w.username, password, w.email));
            result.created++;
        }
    }
    return result;
};