-- Cron jobs that fire pg_net.http_post to the dispatch-ping Edge Function.
-- Requires pg_cron + pg_net extensions enabled (see SETUP.md).
--
-- IMPORTANT: before applying this file, run once in the SQL editor:
--   alter database postgres set app.supabase_url = 'https://<project-ref>.supabase.co';
--   alter database postgres set app.service_role_key = '<service-role-key>';
-- so that current_setting() can resolve them below.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.dispatch_ping_call(slot text)
returns void language plpgsql security definer as $$
declare
  base_url text;
  sr_key text;
begin
  base_url := current_setting('app.supabase_url', true);
  sr_key   := current_setting('app.service_role_key', true);
  if base_url is null or sr_key is null then
    raise notice 'dispatch_ping_call: app.supabase_url / app.service_role_key not configured';
    return;
  end if;
  perform net.http_post(
    url     := base_url || '/functions/v1/dispatch-ping',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || sr_key),
    body    := jsonb_build_object('slot_label', slot)
  );
end;
$$;

create or replace function public.generate_weekly_review_call()
returns void language plpgsql security definer as $$
declare
  base_url text;
  sr_key text;
begin
  base_url := current_setting('app.supabase_url', true);
  sr_key   := current_setting('app.service_role_key', true);
  if base_url is null or sr_key is null then return; end if;
  perform net.http_post(
    url     := base_url || '/functions/v1/generate-weekly-review',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || sr_key),
    body    := '{}'::jsonb
  );
end;
$$;

-- Unschedule any prior jobs with the same name, then (re)create.
do $$
declare
  rec record;
  jobs jsonb := '[
    {"name":"mycoach-pesee-matin",       "cron":"0 6 * * 1-6",  "slot":"pesee_matin"},
    {"name":"mycoach-petit-dej",         "cron":"30 6 * * 1-6", "slot":"petit_dej"},
    {"name":"mycoach-dejeuner",          "cron":"0 12 * * 1-6", "slot":"dejeuner"},
    {"name":"mycoach-fermeture",         "cron":"45 13 * * 1-6","slot":"fermeture"},
    {"name":"mycoach-train-lun",         "cron":"0 17 * * 1",   "slot":"entrainement_lun"},
    {"name":"mycoach-train-mar",         "cron":"0 9 * * 2",    "slot":"entrainement_mar"},
    {"name":"mycoach-train-mer",         "cron":"0 17 * * 3",   "slot":"entrainement_mer"},
    {"name":"mycoach-train-jeu",         "cron":"0 9 * * 4",    "slot":"entrainement_jeu"},
    {"name":"mycoach-train-ven",         "cron":"0 17 * * 5",   "slot":"entrainement_ven"},
    {"name":"mycoach-train-sam",         "cron":"0 9 * * 6",    "slot":"entrainement_sam"},
    {"name":"mycoach-check-in-soir",     "cron":"30 21 * * 1-6","slot":"check_in_soir"},
    {"name":"mycoach-dim-pesee",         "cron":"0 6 * * 0",    "slot":"dim_pesee"},
    {"name":"mycoach-dim-refeed",        "cron":"30 12 * * 0",  "slot":"dim_refeed"},
    {"name":"mycoach-dim-marche",        "cron":"0 17 * * 0",   "slot":"dim_marche"},
    {"name":"mycoach-dim-check",         "cron":"30 21 * * 0",  "slot":"dim_check"},
    {"name":"mycoach-bilan-hebdo",       "cron":"0 7 * * 1",    "slot":"bilan_hebdo"}
  ]'::jsonb;
begin
  for rec in select * from jsonb_array_elements(jobs) as j(value) loop
    perform cron.unschedule((rec.value->>'name'));
    perform cron.schedule(
      rec.value->>'name',
      rec.value->>'cron',
      format($f$select public.dispatch_ping_call('%s')$f$, rec.value->>'slot')
    );
  end loop;

  perform cron.unschedule('mycoach-weekly-review');
  perform cron.schedule(
    'mycoach-weekly-review',
    '0 7 * * 1',
    'select public.generate_weekly_review_call()'
  );
exception when undefined_function then
  raise notice 'pg_cron not installed; skipping scheduling';
end $$;
