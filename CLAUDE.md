# CLAUDE.md — MyCoach

Personal single-user PWA (Next.js + Supabase) tracking Laurent's 16-week keto / intermittent fasting / strength protocol. Live at https://my-coach-lauftn.vercel.app.

## Stack

- Next.js 15.5.x App Router + TypeScript strict + Tailwind 4
- React Hook Form + Zod, Recharts, date-fns / date-fns-tz, lucide-react
- Supabase: Postgres 17 hosted (`rdmebzqpiqwnlfdasnbd`, region eu-west-3), Auth Magic Link, Storage (bucket `photos` private), Edge Functions, pg_cron + pg_net
- Web Push (`web-push` + VAPID) sent from Edge Function `dispatch-ping`
- Vercel `my-coach` project under team `ascenzias-projects`, auto-deploys from `main`

## Daily commands

```bash
pnpm dev                # Next dev server
pnpm build              # full prod build — run before pushing if you touched UI
pnpm typecheck          # tsc --noEmit
pnpm test               # vitest (safety rules)
pnpm test:e2e           # playwright

# Supabase (against the linked remote project)
npx supabase db push                                                   # apply migrations
npx supabase db query --linked "<sql>"                                 # one-off query on prod DB
npx supabase functions deploy <name>                                   # redeploy an edge function
```

## Critical safety rules (Eliquis / apixaban)

Laurent is on an anticoagulant. The app enforces these and they MUST NOT be loosened:

- Hydration ≥ 3 L/day.
- Red alert if BP outside [110-150] / [60-90] mmHg.
- Red alert if weight loss > 2 kg in 7 days (dehydration risk).
- Amber alert if 3 food deviations in 7 days.
- Auto-disable post-lunch coffee after 3 nights of sleep < 6/10.
- Permanent emergency banner with `tel:15` + GP phone.

Rules are tested in `tests/safety.test.ts`. Add a test before changing a threshold.

## Repo layout

```
src/app/                  Next App Router pages
  page.tsx                dashboard (tappable metric cards)
  log/{morning,evening,hydration}/
  settings/               push subscription + protocol settings
  api/push/{subscribe,test}/, api/weekly/regenerate/
  auth/callback/
src/components/           BottomNav, SafetyBanner, MetricCard, …
supabase/
  migrations/0001..0006_*.sql
  functions/{dispatch-ping,generate-weekly-review}/
tests/safety.test.ts      vitest — safety rule invariants
```

## Operational quirks (read these before editing infra)

### Supabase Cloud forbids `ALTER DATABASE postgres SET …`

The `postgres` role on hosted Supabase can't set GUCs. Migration `0006_app_config.sql` creates `private.app_config(key, value)` and the SECURITY DEFINER functions `public.dispatch_ping_call` / `public.generate_weekly_review_call` read `supabase_url` and `service_role_key` from it.

After re-creating the project, the operator must insert the values manually via SQL Editor:

```sql
insert into private.app_config(key, value) values
  ('supabase_url',     'https://<ref>.supabase.co'),
  ('service_role_key', '<service-role-key>')
on conflict (key) do update set value = excluded.value;
```

### `cron.unschedule` errors on missing jobs

Migration `0005_seed_cron.sql` guards each unschedule with `if exists (select 1 from cron.job where jobname = …)`. Keep that pattern if you add new jobs.

### `config.toml` major_version

Set to 17 to match hosted Postgres. The Supabase CLI warns on mismatch.

### NEXT_PUBLIC_* env vars are baked at build time

If you change `NEXT_PUBLIC_APP_URL` (or any `NEXT_PUBLIC_*`), trigger a redeploy: `vercel redeploy <prod-url> --target=production`. A simple env-var edit in the Vercel UI is not enough.

### Vercel build rejects vulnerable Next.js

Vercel auto-fails deploys on Next.js versions with critical CVEs (e.g. middleware bypass). Stay on the latest `15.x` patch — bump it when Vercel rejects.

## End-to-end push test

Push delivery requires a real iOS PWA subscription (Safari → Add to Home Screen → open from icon → /settings → enable notifications). Once `select count(*) from public.push_subscription` returns ≥ 1:

```bash
npx supabase db query --linked "select public.dispatch_ping_call('pesee_matin')"
# wait ~3s
npx supabase db query --linked "select status_code, content::text from net._http_response order by created desc limit 1"
# expected: status_code=200, body like {"slot_label":"pesee_matin","sent":N,"total":N}
```

## Git workflow on this repo

- Default branch: `main`. Vercel deploys on push.
- Local git author is `lauftn-ux` (intentional). Push protocol differs by destination:
  - This repo is `ascenzia-corp/my-coach`, and `lauftn-ux` has no push rights.
  - `gh` keyring holds both accounts; before pushing, switch:
    ```bash
    gh auth switch -u ascenzia-corp
    git push origin main
    gh auth switch -u lauftn-ux        # restore default
    ```
- Don't `--amend` or force-push on `main`.
- Don't commit secrets — `.env.local` is gitignored, keep it that way. The Vercel project owns the production secrets.

## Adding a new cron / push slot

1. Add the slot to `mycoach-*` jobs in `supabase/migrations/0005_seed_cron.sql` (re-run `db push`).
2. Wire any UI for the slot's deep_link in the relevant route.
3. Edge Function `dispatch-ping` resolves `slot_label` → title/body from a static map — extend it there.
