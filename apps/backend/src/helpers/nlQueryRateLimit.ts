import type { Request } from "express";
import { rateLimit } from "express-rate-limit";

/**
 * Per-user limits on Insights (/api/nl-query), which spends from a capped
 * OpenRouter budget. Counts live in memory, so they reset when the backend
 * restarts; OpenRouter's spend cap is the hard backstop.
 *
 * Must be mounted after checkJwt: users are keyed by their Auth0 subject.
 * Over-limit requests get a 429 whose `error` the Insights chat shows as-is.
 */

/** Auth0 user id from the verified JWT (set by express-oauth2-jwt-bearer). */
function userKey(req: Request): string {
    return req.auth?.payload.sub ?? "anonymous";
}

/** Builds a limiter with a user-facing "come back later" message. */
function perUserLimit(windowMs: number, limit: number, message: string) {
    return rateLimit({
        windowMs,
        limit,
        keyGenerator: userKey,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        handler: (req, res) => {
            console.warn(`[nl-query] rate limit hit (${limit} per ${windowMs / 1000}s) for ${userKey(req)}`);
            res.status(429).json({ error: message });
        },
    });
}

/** 10 questions per minute per user. */
export const nlQueryMinuteLimit = perUserLimit(
    60 * 1000,
    10,
    "You're asking questions quickly. Wait a minute, then try again.",
);

/** 100 questions per week per user. */
export const nlQueryWeeklyLimit = perUserLimit(
    7 * 24 * 60 * 60 * 1000,
    100,
    "You've used this week's 100 Insights questions. Come back later, or contact an admin if you need more.",
);
