import { S3Client } from "@aws-sdk/client-s3";

/**
 * Bucket names, overridable per environment. Kept as two separate buckets so
 * content files and profile photos can get different lifecycle/CORS rules.
 */
export const R2_BUCKETS = {
    content: process.env.R2_CONTENT_BUCKET ?? "content",
    profiles: process.env.R2_PROFILES_BUCKET ?? "profiles",
} as const;

/** Logical bucket key used by callers; mapped to a real bucket name via `R2_BUCKETS`. */
export type BucketKey = keyof typeof R2_BUCKETS;

/**
 * Single S3-compatible client for Cloudflare R2. R2 ignores region but the SDK
 * requires one, so "auto" is the documented value.
 */
export const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
});
