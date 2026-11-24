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
    return user.user_id;
};

/**
 * Deletes EVERY user in the Auth0 tenant, seeded or not. Only safe because the
 * demo tenant holds no real accounts — used by the seed script's reset step.
 * Returns the number deleted.
 */
export const deleteAllAuth0Users = async (): Promise<number> => {
    // Collect ids first so deleting doesn't shift the pages we're iterating.
    const ids: string[] = [];
    const page = await auth0.users.list();
    for await (const user of page) {
        if (user.user_id) ids.push(user.user_id);
    }
    for (const id of ids) await auth0.users.delete(id);
    return ids.length;
};