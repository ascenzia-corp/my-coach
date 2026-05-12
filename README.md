# MyCoach

Application personnelle de pilotage du programme keto / jeûne intermittent / musculation de Laurent. PWA Next.js 15 + Supabase, déploiement Vercel, single-user.

## Stack
- Next.js 15 App Router + TypeScript strict
- Tailwind CSS 4 + composants shadcn-style
- Supabase (Postgres 15, Auth Magic Link, Storage, Edge Functions, pg_cron, pg_net)
- Web Push (`web-push` + VAPID) servi via Edge Function
- React Hook Form + Zod, Recharts, date-fns / date-fns-tz

## Démarrage local

```bash
pnpm install
cp .env.local.example .env.local   # remplir les valeurs
node scripts/generate-icons.mjs    # une seule fois — génère les icônes PWA
pnpm dev
```

Tests & types :

```bash
pnpm typecheck
pnpm test                          # Vitest — règles de sécurité Eliquis
pnpm test:e2e                      # Playwright (chunk 3)
```

## Variables d'environnement

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon publique |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service-role (jamais côté client) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clé publique VAPID Web Push |
| `VAPID_PRIVATE_KEY` | Clé privée VAPID (secret) |
| `VAPID_SUBJECT` | `mailto:laurent.fontaine@ascenzia.fr` |
| `NEXT_PUBLIC_APP_URL` | URL canonique de l'app |
| `NEXT_PUBLIC_ALLOWED_EMAIL` | Email autorisé à se connecter |

## Déploiement

Voir `SETUP.md` (fourni séparément) : création projet Supabase, génération VAPID, migrations, Edge Functions, cron, Vercel.

## Sécurité — Eliquis (apixaban)

Laurent prend un anticoagulant. Contraintes non négociables intégrées dans l'app :
- Hydratation 3 L/j minimum.
- Alerte rouge si TA hors `[110-150] / [60-90]`.
- Alerte rouge si perte > 2 kg en 7 jours (déshydratation suspectée).
- Alerte amber si 3 écarts alimentaires / 7 jours.
- Désactivation automatique du café post-déjeuner après 3 nuits de sommeil < 6/10.
- Bandeau d'urgence permanent avec lien `tel:15` et numéro médecin traitant.

Les règles sont testées dans `tests/safety.test.ts`.
