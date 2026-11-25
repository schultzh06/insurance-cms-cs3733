import OpenAI from "openai";

if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is missing");
}

/**
 * OpenAI SDK client pointed at OpenRouter's OpenAI-compatible endpoint.
 * The demo runs on a spend-capped OpenRouter key, so the budget is enforced
 * upstream rather than by this app.
 */
export const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

/**
 * The model used for NL→SQL generation (OpenRouter id, `provider/model`).
 * Overridable via NL_QUERY_MODEL so models can be compared without a code change.
 */
export const NL_QUERY_MODEL = process.env.NL_QUERY_MODEL ?? "openai/gpt-5.4-mini";
