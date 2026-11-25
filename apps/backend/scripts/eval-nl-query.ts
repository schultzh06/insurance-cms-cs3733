/**
 * Measures OpenRouter spend and latency per Insights question by running the
 * real answerQuestion() pipeline (LLM → SQL safety check → read-only DB).
 *
 * Usage:
 *   NL_QUERY_MODEL=openai/gpt-5.4-nano pnpm --filter backend exec tsx scripts/eval-nl-query.ts
 *
 * One model per run: the model id is read once when helpers/openai.ts loads,
 * so set NL_QUERY_MODEL (an OpenRouter id) in the environment.
 * ENV_FILE overrides the .env location (e.g. when running from a worktree).
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: process.env.ENV_FILE ?? resolve(__dirname, "../.env") });

// Dynamic imports so dotenv runs before the OpenRouter client and Prisma initialise.
const { answerQuestion } = await import("../src/services/nlQuery.js");
const { NL_QUERY_MODEL } = await import("../src/helpers/openai.js");

// Deliberately distinct from the few-shot examples baked into the system prompt.
const QUESTIONS = [
    "How many pieces of content are there of each content type?",
    "Which tags are used most often across all content?",
    "How many collections does each employee own?",
    "What percentage of collections are public?",
    "Which content is currently checked out, and by whom?",
    "Average number of items per collection",
    "Which service request types have the most overdue requests?",
    "How many pieces of content target each persona, split by status?",
    "Who bookmarked the most content?",
    "Content created per month over the last year",
    "Which employees have never previewed any content?",
    "What's the weather in Boston?", // should be declined, not answered
];

console.log(`\n=== ${NL_QUERY_MODEL} ===`);
let total = 0;
for (const question of QUESTIONS) {
    const t0 = Date.now();
    const r = await answerQuestion({ question, history: [] });
    total += r.costUsd;
    const outcome = r.error ? `error: ${r.error}` : `${r.rows?.length ?? 0} rows`;
    console.log(
        `$${r.costUsd.toFixed(5)}  ${((Date.now() - t0) / 1000).toFixed(1)}s  ${question}  → ${outcome}`,
    );
}
console.log(
    `TOTAL $${total.toFixed(5)}  avg $${(total / QUESTIONS.length).toFixed(5)}/question  ` +
    `≈ ${Math.floor(1 / (total / QUESTIONS.length))} questions per $1`,
);
process.exit(0);
