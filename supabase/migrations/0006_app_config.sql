-- Supabase Cloud refuse `alter database postgres set <param>` au rôle `postgres`.
-- On stocke supabase_url et service_role_key dans une table privée, lue par les
-- fonctions SECURITY DEFINER qui appellent les Edge Functions via pg_net.

create schema if not exists private;

create table if not exists private.app_config (
  key   text primary key,
  value text not null
);

revoke all on schema private from public, anon, authenticated;
revoke all on private.app_config from public, anon, authenticated;

create or replace function public.dispatch_ping_call(slot text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  base_url text;
  sr_key   text;
begin
  select value into base_url from private.app_config where key = 'supabase_url';
  select value into sr_key   from private.app_config where key = 'service_role_key';
  if base_url is null or sr_key is null then
    raise notice 'dispatch_ping_call: private.app_config missing supabase_url / service_role_key';
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
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  base_url text;
  sr_key   text;
begin
  select value into base_url from private.app_config where key = 'supabase_url';
  select value into sr_key   from private.app_config where key = 'service_role_key';
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
