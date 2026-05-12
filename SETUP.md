# SETUP — MyCoach

Checklist d'installation. 30-45 min. À faire **avant** que Laurent commence à utiliser l'app.

## 1. Comptes

- [ ] GitHub (gratuit)
- [ ] Vercel free hobby
- [ ] Supabase free tier

## 2. Projet Supabase

1. https://supabase.com/dashboard → **New Project** → `mycoach-laurent` → région `eu-west-3` (Paris) → password fort
2. Récupérer dans **Project Settings → API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (secret absolu)
3. **Database → Extensions** : activer `pg_cron` et `pg_net`.
4. **Storage → New Bucket** : `photos`, **privé**.

### Configurer les secrets utilisés par pg_cron
Supabase Cloud n'autorise pas `alter database postgres set …`. À la place, la
migration `0006_app_config.sql` crée `private.app_config`. Une fois `db push`
exécuté (étape 4), coller dans **SQL Editor** :

```sql
insert into private.app_config(key, value) values
  ('supabase_url',     'https://<project-ref>.supabase.co'),
  ('service_role_key', '<service-role-key>')
on conflict (key) do update set value = excluded.value;
```

## 3. Clés VAPID

```bash
npx web-push generate-vapid-keys
```

→ `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
`VAPID_SUBJECT=mailto:laurent.fontaine@ascenzia.fr`.

## 4. Migrations + Edge Functions

```bash
pnpm install
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push                    # applique 0001..0005

# Secrets utilisés par les Edge Functions
npx supabase secrets set \
  VAPID_PUBLIC_KEY=<public> \
  VAPID_PRIVATE_KEY=<private> \
  VAPID_SUBJECT=mailto:laurent.fontaine@ascenzia.fr

npx supabase functions deploy dispatch-ping
npx supabase functions deploy generate-weekly-review
```

Vérifier dans **Database → Cron Jobs** que les 16 jobs `mycoach-*` sont actifs.

## 5. Brancher Vercel

1. https://vercel.com/new → import `mycoach`.
2. Framework : Next.js (détecté).
3. Environment Variables :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   - `NEXT_PUBLIC_APP_URL=https://mycoach-laurent.vercel.app` (ou ton domaine)
   - `NEXT_PUBLIC_ALLOWED_EMAIL=laurent.fontaine@ascenzia.fr`
4. **Deploy**.

## 6. Auth

**Authentication → URL Configuration** : ajouter l'URL Vercel + `http://localhost:3000` aux redirections autorisées.

**Authentication → Email** : activer Magic Link.

## 7. Installer la PWA sur iPhone (critique pour iOS push)

1. Sur l'iPhone, ouvrir **Safari** (pas Chrome).
2. URL Vercel → se connecter via magic link reçu par mail.
3. Partager → **Sur l'écran d'accueil** → Ajouter.
4. **Fermer Safari** complètement.
5. Ouvrir MyCoach depuis l'écran d'accueil (pas Safari).
6. `/settings` → **Activer les notifications** → accepter la permission iOS.
7. Bouton **Envoyer un push test** : la notification doit arriver < 10 s.

Si rien : iOS Réglages → Notifications → MyCoach → vérifier autorisé + Style **Permanent**.

## 8. Verifications

- [ ] Pesée matin saisie → ligne apparaît dans `/charts`.
- [ ] Push test reçu.
- [ ] Bilan hebdo : forcer via `/weekly` → bouton « régénérer ».
- [ ] Photo uploadée et visible dans `/photos`.
- [ ] Alerte rouge : saisir TA = 9/5 → bannière rouge sur dashboard.

## Coût

| Service | Plan | Limite | Risque |
|---|---|---|---|
| Vercel Hobby | gratuit | 100 GB / mois | nul (1 user) |
| Supabase Free | gratuit | 500 MB BDD + 1 GB Storage | nul |
| GitHub Free | gratuit | — | nul |

Total : 0 €/mois.
