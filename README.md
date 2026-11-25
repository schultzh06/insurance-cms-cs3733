# Insurance Content Management Application

Content management and analytics platform built for The Hanover Insurance Group
(NYSE: THG) in CS3733 Software Engineering at WPI: **Team B, D-term 2026**,
10-person agile team.

## About this fork

**Fork Author:** Hayden Schultz (schultzh06)

This is a fork of a team repository. The full codebase is preserved here for
context; the work below is mine.

**Role:** Assistant Lead Software Engineer, Scrum Lead

**AI Insights (NL→SQL):** built end to end. OpenAI backend integration, an LLM
system prompt describing the DB schema, Zod-constrained structured outputs for
consistent request/response shapes, and an SQL safety parser that validates
generated queries before execution. Frontend chat interface plus the result
chart and scorecard renderers.

<img src="docs/screenshots/insights_multiturn.png" width="900">

*A follow-up question resolves against the previous turn — "here" refers to the prior result set — and the renderer dispatches to a scorecard instead of a chart based on the shape the model returns.*

<img src="docs/screenshots/insights_sql.png" width="900">

*Every result exposes the generated SQL. The query is validated against a read-only allowlist before it reaches the database.*

**Authentication:** integrated Auth0 with JWT, route protection, and a React
context hook exposing the current user across components. This replaced an
earlier iteration-1 system I wrote using local storage with password hashing and
a login gate.

**Employee management:** employee management page, modify/delete flows, profile
settings, and profile picture upload.

<img src="docs/screenshots/employees.png" width="900">

*Employee CRUD with Auth0 management API provisioning on create, and displays user-managed profile photos. Administrators have access to user actions to modify names and roles, and can delete employee records from the interface as well.*

**Dashboard:** widget grid setup, then a refactor to sortable and resizable
widgets. Dashboard graphs.

<img src="docs/screenshots/dashboard_customized.png" width="900">

*Widgets are toggled and sized per employee; the layout is persisted as JSON on the employee record and restored on next load.*

<img src="docs/screenshots/dashboard.png" width="900">

*The saved layout rendered — sortable, resizable widgets with the graphs in their selected sizes. The user has also opted for dark mode in this screenshot, found in settings.*

**Frontend foundation:** shadcn/ui and Tailwind setup, navigation bar, sidebar
and avatar user dropdown, home page and hero, about page, settings page, and
site themes.

**Styling:** ongoing restyling across every iteration for consistency with the
team style guide: color palette revisions and component design passes.

<img src="docs/screenshots/landing.png" width="900">

*Landing page, navigation, and hero. Unauthenticated users see the login gate; routes are protected by JWT.*

**Non-coding:** contributed to iteration documents and presentation decks,
presented iteration 2, presented the final iteration 5 demonstration to The
Hanover Insurance Group, and ran daily scrum meetings.

Everything else — global search, service requests, collections, recycle bin,
bulk upload, notifications, i18n — was built by other team members.

---

## Tech stack

- **Frontend** — React + TypeScript + Vite, Tailwind, shadcn/ui primitives, Recharts, Auth0
- **Backend** — Express 5 + TypeScript (ESM), port `3000`
- **Database** — PrismaORM against PostgreSQL + pgvector (Supabase)
- **File storage** — Cloudflare R2 (buckets for content and profile photos); browsers read files via short-lived presigned URLs
- **Auth** — Auth0 (JWT via `express-oauth2-jwt-bearer`) + Auth0 Management API for provisioning users
- **AI** — OpenRouter for Insights (NL→SQL) and image descriptions; embeddings from a local sentence-transformers sidecar (`apps/python`, FastAPI)
- **Package manager** — pnpm, exclusively (never `npm`)
- **Monorepo** — pnpm workspaces + Turborepo
- **Deployment** — Docker images, self-hosted and deployed with Komodo, served through a Cloudflare Tunnel at [cs3733.stomberg.us](https://cs3733.stomberg.us) (see [Deployment](/docs/ARCHITECTURE.md#deployment))

---

## Getting started

```bash
pnpm install
pnpm --filter @softeng-app/db exec prisma generate
cp apps/backend/.env.example apps/backend/.env       # then fill it in (see below)
(cd apps/python && uv sync)                          # embedding sidecar's Python env
pnpm dev:all                                         # ML sidecar (:3001) + backend (:3000) + frontend (:5173)
```

`pnpm dev` runs just the backend and frontend; searches and saves need the sidecar running too (`pnpm dev:python`). Backend-only: `pnpm --filter backend dev`.

Demo data: `pnpm seed` wipes and reseeds the database, R2 buckets and Auth0 users (`--reset-passwords` also resets existing demo users' passwords). It needs the sidecar running for embeddings.

### Environment variables

Everything lives in `apps/backend/.env`; [`apps/backend/.env.example`](/apps/backend/.env.example) lists and explains each key:

- **Auth0** — `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, and the Management API app's `AUTH0_MGMT_CLIENT_ID` / `AUTH0_MGMT_CLIENT_SECRET`
- **Postgres** — `DATABASE_URL` (Prisma CLI, seed), `NEXT_PUBLIC_DATABASE_URL` (the app's client; a naming quirk, not a Next.js project), `DATABASE_URL_READONLY` (read-only role that runs Insights' generated SQL)
- **Cloudflare R2** — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_CONTENT_BUCKET`, `R2_PROFILES_BUCKET`
- **OpenRouter** — `OPENROUTER_API_KEY`; optional `NL_QUERY_MODEL` (default `openai/gpt-5.4-mini`) and `IMAGE_DESCRIPTION_MODEL` (default `google/gemini-2.5-flash-lite`)
- **Seed** — `SEED_DEMO_PASSWORD`

The same file is what production runs on: `./deploy.sh` copies it to the host. Never commit it; every `.env*` file except the template is ignored by git and Docker.

---

## Full Documentation and Architecture

To view full documentation of feature suite and project architecture, please visit:

[**ARCHITECTURE.md**](/docs/ARCHITECTURE.md)
