# AI Obituary Writer

A focused tool for funeral directors. Three screens:

1. **Director dashboard** — list of active cases, "New case" button.
2. **Family questionnaire** — shareable link, ~10 conversational questions on mobile, no account required.
3. **Obituary editor** — AI-generated draft, inline Tiptap editing with an audit log, PDF export.

Built with Next.js 15 (App Router), Supabase (Postgres + Auth + Storage), Tiptap, and a provider-switchable AI layer (Claude or OpenAI).

## Quick start

### Prerequisites

- Node 20+ and `pnpm` 9+
- A Supabase project (Cloud or local via the Supabase CLI)
- An Anthropic API key, an OpenAI API key, or both
- Local Chrome / Chromium installed for PDF rendering in development (Vercel uses `@sparticuz/chromium` automatically)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SITE_URL` — public origin used for share links (e.g. `https://your-app.vercel.app`)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (used in the browser)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key (used by server routes that bypass RLS for token-keyed family submissions)
- `AI_PROVIDER` — `claude` (default) or `openai`
- `CLAUDE_MODEL` — defaults to `claude-opus-4-7`
- `OPENAI_MODEL` — defaults to `gpt-4.1`
- `ANTHROPIC_API_KEY` — required when `AI_PROVIDER=claude`
- `OPENAI_API_KEY` — required when `AI_PROVIDER=openai`
- `PUPPETEER_EXECUTABLE_PATH` — optional override for the local Chrome path used by PDF render
- `RESEND_API_KEY` — optional. Enables one-click email of the share link to the family. Without it, the UI shows the "Copy link" path only.
- `RESEND_FROM_EMAIL` — optional. Verified sender address (e.g. `Obituaries <hello@yourdomain.com>`). Required if `RESEND_API_KEY` is set.

### 3. Apply the database schema

Using the [Supabase CLI](https://supabase.com/docs/guides/cli) against a local stack:

```bash
supabase start
supabase db reset      # applies supabase/migrations/*.sql and supabase/seed.sql
```

Or against a remote project:

```bash
supabase link --project-ref <ref>
supabase db push
```

If you'd rather run the SQL by hand, paste the files in `supabase/migrations/` into the Supabase SQL editor in order. Then create a public storage bucket named `director-logos` (used by the branding screen) — the migration creates it for you when run via the CLI.

### 4. Run the app

```bash
pnpm dev
```

Open `http://localhost:3000`, sign up as a director, and follow the dashboard.

## Scripts

```bash
pnpm dev               # Next.js dev server
pnpm build             # Production build
pnpm start             # Start the production server
pnpm lint              # ESLint
pnpm typecheck         # tsc --noEmit
pnpm test              # Vitest run
pnpm test:watch        # Vitest watch mode
pnpm test:providers    # Side-by-side Claude vs OpenAI dev sanity script (requires API keys)
```

## Project layout

```text
app/
  (auth)/login              Sign in / sign up (Supabase email + magic link)
  (director)/dashboard      Screen 1
  (director)/cases/new      Create case form
  (director)/cases/[id]     Screen 3 (editor + share link)
  (director)/branding       Director logo + organization name
  q/[token]                 Screen 2 (no auth, mobile-first)
  api/cases/[id]/draft      POST: generate AI draft. PATCH: save edits + audit row.
  api/cases/[id]/pdf        GET: stream PDF
  api/cases/[id]/send       POST: email the share link via Resend (no-ops without RESEND_API_KEY)
  api/q/[token]/answer      POST: persist a single answer
components/                 UI, dashboard, editor, questionnaire components
lib/ai                      Provider abstraction + Claude / OpenAI implementations
lib/db                      Typed query helpers and generated Supabase types
lib/pdf                     React-rendered HTML template + Puppeteer wrapper
lib/questions               Question definitions, branching engine
lib/supabase                Server / browser / admin clients + auth middleware
supabase/migrations         SQL migrations (schema, RLS, storage bucket)
```

## How the data flows

1. Director creates a case → row in `cases` with a 32-char `questionnaire_token`.
2. Director copies (or emails) the `/q/<token>` link.
3. Family answers questions one at a time → `/api/q/<token>/answer` upserts rows in `questionnaire_responses`. Branching skips career/passions questions when the family marks the person as "private".
4. Once all required answers are in, the case status flips to `draft_ready`.
5. Director clicks "Generate draft" → `/api/cases/<id>/draft` (POST) calls the configured AI provider, writes a row to `obituary_drafts`.
6. Director edits in Tiptap; debounced PATCH calls insert before/after rows in `obituary_edits` (audit trail).
7. Director exports via "Copy to clipboard" or "Download PDF" (Puppeteer renders the HTML template) and marks the case delivered.

## Deploying to Vercel

1. Create the Vercel project from this repo.
2. Add every variable from the table above to the Vercel project settings (Production + Preview).
3. The PDF route uses `puppeteer-core` + `@sparticuz/chromium`, which is Vercel-compatible out of the box on the Node runtime. No extra config is needed.
4. Make sure your Supabase project's "Site URL" (Auth settings) matches `NEXT_PUBLIC_SITE_URL` so magic-link callbacks resolve correctly.

## Testing

Unit tests live next to the code they cover (`*.test.ts`) and run under Vitest. The smoke-test runbook in [`SMOKE_TEST.md`](SMOKE_TEST.md) walks through the full director-and-family flow against a real Supabase project.

## License

Private / internal.
