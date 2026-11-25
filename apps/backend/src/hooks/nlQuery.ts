import type { Request, Response} from "express";
import { APIError } from "openai";
import {answerQuestion} from "../services/nlQuery";
import {NLQueryRequestSchema} from "../helpers/nlQuerySchema";
import { z } from "zod";

/**
 * POST /api/nl-query
 * Translates a plain-English question into a SQL query (and chart suggestion)
 * via OpenRouter, runs it read-only, and returns the rows.
 */
export async function generateNLQuery(req: Request, res: Response) {
    const parseResult = NLQueryRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid request body",
            details: z.treeifyError(parseResult.error),
        })
    }

    try {
        // Cost is for server logs only; keep it out of the client contract.
        const { costUsd, ...result } = await answerQuestion(parseResult.data);
        console.log(`[nl-query] question cost=$${costUsd.toFixed(6)}`);

        return res.json(result);
    } catch (error) {
        // OpenRouter returns 402 when the key's spend limit or credits run out,
        // and 429 when rate-limited. Both are "AI unavailable", not our bug —
        // the frontend renders `error` verbatim in the chat.
        if (error instanceof APIError && (error.status === 402 || error.status === 429)) {
            console.warn(`[nl-query] OpenRouter unavailable (${error.status}):`, error.message);
            return res.status(503).json({
                error: error.status === 402
                    ? "Insights is out of AI credits for now. Try again later, or contact an admin."
                    : "Insights is busy right now. Wait a minute and try again.",
            });
        }

        console.error("[nl-query] generation failed:", error);
        return res.status(500).json({
            error: "Something went wrong answering that. Try again, or contact an admin if it keeps happening.",
        });
    }
}
