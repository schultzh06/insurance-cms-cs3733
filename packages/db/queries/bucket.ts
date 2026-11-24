import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    NotFound,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mime from "mime-types";
import { r2, R2_BUCKETS, type BucketKey } from "../lib/r2";

/**
 * Cloudflare R2 storage operations (S3 API). Callers pass a logical bucket key
 * ("content" by default, or "profiles"); errors are thrown, not returned.
 *
 * Object keys are the same paths stored in `Content.fileURI` and
 * `Employee.profilePhotoURI`, so no database change is needed.
 */
export class Bucket {

    /**
     * Creates a presigned GET URL valid for `expiresIn` seconds (default 1 hour).
     * The response is forced to `inline` with a MIME type derived from the key,
     * so browsers preview the file instead of downloading it.
     */
    public static async createSignedUrl(path: string, expiresIn: number = 3600, bucket: BucketKey = "content"): Promise<string> {
        const filename = path.split("/").pop() ?? "download";
        return getSignedUrl(r2, new GetObjectCommand({
            Bucket: R2_BUCKETS[bucket],
            Key: path,
            ResponseContentType: mime.lookup(filename) || "application/octet-stream",
            // encodeURIComponent keeps non-ASCII filenames valid in the header (RFC 5987)
            ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
        }), { expiresIn });
    }

    /**
     * Uploads a file. Throws if the key already exists — R2 honours `If-None-Match: *`,
     * which preserves the old Supabase "no overwrite" behaviour. Use `updateFile` to replace.
     */
    public static async uploadFile(file: Buffer, path: string, bucket: BucketKey = "content"): Promise<{ path: string }> {
        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKETS[bucket],
            Key: path,
            Body: file,
            ContentType: mime.lookup(path) || "application/octet-stream",
            IfNoneMatch: "*",
        }));
        return { path };
    }

    /** Replaces (or creates) the object at `path`. */
    public static async updateFile(file: Buffer, path: string, bucket: BucketKey = "content"): Promise<{ path: string }> {
        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKETS[bucket],
            Key: path,
            Body: file,
            ContentType: mime.lookup(path) || "application/octet-stream",
        }));
        return { path };
    }

    /** Downloads a file into memory. Used server-side only (text extraction / embeddings). */
    public static async downloadFile(path: string, bucket: BucketKey = "content"): Promise<Buffer> {
        const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKETS[bucket], Key: path }));
        return Buffer.from(await res.Body!.transformToByteArray());
    }

    /**
     * Returns `{ size, mimetype }` for an object, or null if it doesn't exist.
     * Field names match the old Supabase metadata so the frontend is unaffected.
     */
    public static async getFileMetadata(path: string, bucket: BucketKey = "content"): Promise<{ size: number; mimetype: string | null } | null> {
        try {
            const head = await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKETS[bucket], Key: path }));
            return { size: head.ContentLength ?? 0, mimetype: head.ContentType ?? null };
        } catch (error) {
            if (error instanceof NotFound) return null;
            throw error;
        }
    }

    /**
     * Deletes every object in a bucket and returns how many were removed.
     * Destructive — used only by the demo seed script. R2 has no folders, so a
     * flat paginated listing finds everything; each page (max 1000 keys) is
     * removed with one DeleteObjects call.
     */
    public static async emptyBucket(bucket: BucketKey): Promise<number> {
        let removed = 0;
        let token: string | undefined;
        do {
            const page = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKETS[bucket], ContinuationToken: token }));
            const keys = (page.Contents ?? []).map(o => ({ Key: o.Key! }));
            if (keys.length) {
                const res = await r2.send(new DeleteObjectsCommand({ Bucket: R2_BUCKETS[bucket], Delete: { Objects: keys, Quiet: true } }));
                // Quiet mode only reports failures; surface them rather than silently leaving files behind
                if (res.Errors?.length) throw new Error(`emptyBucket(${bucket}): ${res.Errors.length} deletes failed, first: ${res.Errors[0].Message}`);
                removed += keys.length;
            }
            token = page.NextContinuationToken;
        } while (token);
        return removed;
    }

    /** Deletes an object. S3 semantics: deleting a missing key succeeds silently. */
    public static async deleteFile(path: string, bucket: BucketKey = "content"): Promise<void> {
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKETS[bucket], Key: path }));
    }
}
