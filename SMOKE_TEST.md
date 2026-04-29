# End-to-end smoke test

This walkthrough exercises the full director-and-family flow against a real Supabase project and a real AI provider. Run it once after fresh setup, after every schema migration, and before each release.

Estimated time: 15 minutes.

For a faster automated pass against a live stack, run `pnpm smoke`. It boots the app on a temporary port, creates two real directors, completes the token questionnaire, verifies the questionnaire rate limit, checks RLS isolation, saves a draft edit, and downloads a PDF. If `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is present it also exercises the real draft-generation route; otherwise it inserts a fixture draft so the rest of the flow can still be proven.

## Prerequisites

- A Supabase project (Cloud or local via `supabase start`).
- An Anthropic API key with access to `claude-opus-4-7`, **or** an OpenAI API key with access to `gpt-4.1`.
- Local Chrome installed (any recent version) for PDF rendering in dev. The PDF route auto-detects `Google Chrome.app`, `Google Chrome for Testing.app`, or `Chromium.app`. Override with `PUPPETEER_EXECUTABLE_PATH` if needed.
- A second email address you can sign up with (for the RLS isolation step).

## Setup

1. Apply migrations:

   ```bash
   supabase db reset            # local
   # or
   supabase db push             # remote
   ```

2. Configure `.env.local` per the README. At minimum:
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AI_PROVIDER=claude` plus `ANTHROPIC_API_KEY`

3. Start the dev server:

   ```bash
   pnpm dev
   ```

## Walkthrough

### 1. Director sign-up
- Open `http://localhost:3000/login` and sign up with a fresh email.
- Confirm via the magic link if email confirmation is enabled in Supabase Auth.
- **Expected:** redirected to `/dashboard`, empty case list, "New case" button visible.

### 2. Create a case
- Click "New case", enter `Rivera family`, submit.
- **Expected:** redirected to `/cases/<id>` with status pill "Questionnaire sent" and a copyable share link of the form `http://localhost:3000/q/<32-char token>`.

### 3. Family questionnaire (mobile branch)
- Open the share link in an incognito window.
- Toggle the device toolbar to a mobile viewport (e.g. iPhone 14).
- Answer the questions in order. When you reach **"Were they more private or more public in how they lived?"**, choose **`private`**.
- **Expected:** the next question is **"Who do they leave behind?"** — the `career` question is **skipped**. Continue to the end.
- Final screen redirects to `/q/<token>/done` with a thank-you message.

### 4. Verify state in Supabase
- In the Supabase dashboard (or via `supabase db remote-shell`), confirm:
  - One row in `cases` with `status = 'draft_ready'`.
  - Rows in `questionnaire_responses` for every answered key. There should be **no** row with `question_key = 'career'`.

### 5. Generate the AI draft
- Back in the director window, refresh `/cases/<id>`.
- **Expected:** the editor area now shows "Family responses are complete" with a "Generate draft" button.
- Click "Generate draft". Within ~10s, the Tiptap editor renders a 250–400 word obituary.
- **Expected:** a row in `obituary_drafts` with `ai_provider = 'claude'` and `model = 'claude-opus-4-7'`.

### 6. Edit + audit log
- Edit a sentence in the draft, e.g. change "loved" to "treasured".
- Wait ~2s for autosave. The save indicator flips to "All changes saved."
- **Expected:** a row in `obituary_edits` with `content_before` and `content_after` differing exactly by your edit.

### 7. Copy to clipboard
- Click the export menu, choose "Copy plain text".
- Paste into a text editor.
- **Expected:** plain prose, no HTML tags, paragraph breaks preserved.

### 8. PDF export
- Click "Download PDF".
- Open the downloaded file.
- **Expected:** Letter-size PDF with serif typography, the deceased's name centered as the heading, a thin horizontal rule, and the obituary body. No HTML escapes visible. Filename like `rivera-family-obituary.pdf`.

### 9. Mark delivered
- Click "Mark delivered".
- **Expected:** the case returns to `/dashboard` with status `Delivered`.
- In the Supabase dashboard (or `supabase db remote-shell`), confirm one row in `completed_drafts` for the case with the latest draft HTML and a `completed_by` value matching the signed-in user.

### 10. Provider switch
- Stop the dev server. Set `AI_PROVIDER=openai` and `OPENAI_API_KEY=...` in `.env.local`. Restart.
- Create a fresh case (don't reuse the Rivera one — drafts are upserted per-case). Run a brief questionnaire.
- Click "Generate draft".
- **Expected:** new `obituary_drafts` row with `ai_provider = 'openai'` and `model = 'gpt-4.1'`.

### 11. RLS isolation
- Sign out. Sign up as a second director with a different email.
- **Expected:** `/dashboard` is empty. The first director's case is **not** visible.
- Try fetching a known case ID: `http://localhost:3000/cases/<first-director-case-id>`.
- **Expected:** `404`.

### 12. Settings (optional)
- As director #1, visit `/settings`.
- Upload a small PNG/JPG (≤ 2 MB), save your full name, and save your organization name.
- Open the share link in incognito and the regenerated PDF.
- **Expected:** logo appears in the questionnaire header and the top of the PDF. The role pill is visible on the settings screen, and `/branding` redirects to `/settings`.

### 13. Send via email (optional, requires Resend)
- With `RESEND_API_KEY` and `RESEND_FROM_EMAIL` configured, on `/cases/<id>` enter a recipient address and click "Email link".
- **Expected:** the recipient receives a short message with the share URL within ~30s. Without the env vars, the email form is disabled and the copy-link UX remains the only path.

## Sanity scripts

```bash
pnpm test                 # 9/9 unit tests should pass
pnpm typecheck            # clean
pnpm lint                 # clean
pnpm build                # all routes build successfully
pnpm test:providers       # side-by-side Claude/OpenAI on a fixture set (requires API keys)
```

## Common failures

- **"Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY"** during questionnaire submission — RLS-bypassing routes need the service role key. Check `.env.local`.
- **PDF route returns 500** in dev — set `PUPPETEER_EXECUTABLE_PATH` to your Chrome binary explicitly. On macOS that's typically `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- **Magic-link email links to wrong host** — set Supabase Auth's "Site URL" to match `NEXT_PUBLIC_SITE_URL`.
- **AI route returns 400 "questionnaire is not complete yet"** — the family didn't reach the end of the flow. Re-open the share link and submit the remaining questions.
