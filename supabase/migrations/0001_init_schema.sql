-- MyCoach — initial schema
-- All tables single-user, scoped by auth.uid()

create extension if not exists pgcrypto;

-- profile
create table if not exists public.profile (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Laurent',
  start_date date not null default '2026-05-12',
  target_weight_kg numeric(4,1) not null default 85.0,
  target_waist_cm integer not null default 95,
  target_bf_pct numeric(3,1) not null default 20.0,
  baseline_weight_kg numeric(4,1) not null default 97.0,
  baseline_waist_cm integer not null default 108,
  baseline_bf_pct numeric(3,1) not null default 30.0,
  doctor_phone text,
  disable_pm_coffee boolean not null default false,
  created_at timestamptz not null default now()
);

-- daily_log
create table if not exists public.daily_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric(4,1),
  waist_cm integer,
  ketones_mmol numeric(3,1),
  bp_morning_sys integer,
  bp_morning_dia integer,
  bp_evening_sys integer,
  bp_evening_dia integer,
  energy_10 integer check (energy_10 between 0 and 10),
  hunger_10 integer check (hunger_10 between 0 and 10),
  sleep_hours numeric(3,1),
  sleep_quality_10 integer check (sleep_quality_10 between 0 and 10),
  deviation boolean default false,
  deviation_detail text,
  water_l numeric(3,1),
  salt_g numeric(3,1),
  magnesium_mg integer,
  potassium_g numeric(3,1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);
create index if not exists daily_log_user_date_idx on public.daily_log (user_id, log_date desc);

-- meal_log
create table if not exists public.meal_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal_type text not null check (meal_type in ('petit_dej','dejeuner','collation','refeed','rupture_jeune')),
  taken boolean not null default true,
  deviation boolean not null default false,
  deviation_detail text,
  protein_g integer,
  veggies_g integer,
  net_carbs_g integer,
  notes text,
  logged_at timestamptz not null default now()
);
create index if not exists meal_log_user_date_idx on public.meal_log (user_id, log_date desc);

-- training_log
create table if not exists public.training_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  session_type text not null check (session_type in ('push','pull_jambes','hiit','abdos_mobilite','tapis','marche','repos','rupture_protocole')),
  completed boolean not null default false,
  duration_min integer,
  notes text,
  logged_at timestamptz not null default now()
);
create index if not exists training_log_user_date_idx on public.training_log (user_id, log_date desc);

-- ping_log
create table if not exists public.ping_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ping_slot text not null,
  scheduled_at timestamptz not null,
  acknowledged_at timestamptz,
  action_done boolean,
  sensation_global_10 integer check (sensation_global_10 between 0 and 10),
  notes text
);
create index if not exists ping_log_user_sched_idx on public.ping_log (user_id, scheduled_at desc);

-- weekly_review
create table if not exists public.weekly_review (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  weight_avg_kg numeric(4,1),
  weight_delta_kg numeric(3,1),
  waist_cm integer,
  waist_delta_cm integer,
  ketones_avg numeric(3,1),
  sessions_done integer,
  sessions_planned integer,
  deviations integer,
  sleep_avg_h numeric(3,1),
  energy_avg_10 numeric(3,1),
  verdict text check (verdict in ('on_track','retard','avance')),
  adjustments text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- photo
create table if not exists public.photo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  pose text not null check (pose in ('face','profil','dos')),
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);
create unique index if not exists photo_user_date_pose_idx on public.photo (user_id, log_date, pose);

-- push_subscription
create table if not exists public.push_subscription (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  created_at timestamptz not null default now()
);

-- notification_schedule
create table if not exists public.notification_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_label text not null,
  cron_expression text not null,
  title text not null,
  body text not null,
  enabled boolean not null default true,
  deep_link text,
  unique (user_id, slot_label)
);

-- error_log
create table if not exists public.error_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source text not null,
  type text not null,
  severity text not null check (severity in ('info','amber','red')),
  message text not null,
  context jsonb,
  created_at timestamptz not null default now()
);
create index if not exists error_log_user_created_idx on public.error_log (user_id, created_at desc);

-- updated_at trigger for daily_log
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_log_updated_at on public.daily_log;
create trigger daily_log_updated_at
before update on public.daily_log
for each row execute function public.tg_set_updated_at();
