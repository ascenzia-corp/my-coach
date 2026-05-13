-- Move scheduling to Europe/Paris by ticking every minute and matching
-- notification_schedule rows against Paris local time. pg_cron 1.6 on Supabase
-- does not expose a per-job timezone, and ALTER DATABASE SET is blocked, so we
-- can't shift the GUC. Doing the timezone math at fire time also fixes a
-- pre-existing bug: the Settings UI was editing notification_schedule.cron_expression
-- but pg_cron was reading hardcoded values, so user time edits never took effect.

-- 1. Parses the limited cron shape we use ('mm hh * * dow') and returns whether
--    the given Paris-local timestamp matches. dow: '*' | n | n-n | n,n,...
create or replace function public.cron_matches(expr text, paris_ts timestamp)
returns boolean
language plpgsql
immutable as $$
declare
  parts text[];
  mm_part text;
  hh_part text;
  dow_part text;
  cur_mm int := extract(minute from paris_ts)::int;
  cur_hh int := extract(hour from paris_ts)::int;
  cur_dow int := extract(dow from paris_ts)::int;
  tok text;
  a int;
  b int;
begin
  parts := regexp_split_to_array(trim(expr), '\s+');
  if array_length(parts, 1) < 5 then
    return false;
  end if;
  mm_part := parts[1];
  hh_part := parts[2];
  dow_part := parts[5];

  if mm_part <> '*' and mm_part::int <> cur_mm then return false; end if;
  if hh_part <> '*' and hh_part::int <> cur_hh then return false; end if;
  if dow_part = '*' then return true; end if;

  foreach tok in array string_to_array(dow_part, ',') loop
    if position('-' in tok) > 0 then
      a := split_part(tok, '-', 1)::int;
      b := split_part(tok, '-', 2)::int;
      if cur_dow between a and b then return true; end if;
    elsif tok::int = cur_dow then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

-- 2. Per-minute dispatcher. Picks up all enabled schedule rows whose
--    cron_expression matches the current minute in Paris.
create or replace function public.dispatch_tick()
returns void
language plpgsql
security definer as $$
declare
  paris_now timestamp := timezone('Europe/Paris', now());
  rec record;
begin
  for rec in
    select distinct slot_label
    from public.notification_schedule
    where enabled = true
      and public.cron_matches(cron_expression, paris_now)
  loop
    perform public.dispatch_ping_call(rec.slot_label);
  end loop;

  -- Weekly review: Monday 07:00 Paris.
  if extract(dow from paris_now)::int = 1
     and extract(hour from paris_now)::int = 7
     and extract(minute from paris_now)::int = 0 then
    perform public.generate_weekly_review_call();
  end if;
end;
$$;

-- 3. Drop all old per-slot jobs + the weekly-review job in favour of one tick.
do $$
declare
  old_names text[] := array[
    'mycoach-pesee-matin', 'mycoach-petit-dej', 'mycoach-dejeuner', 'mycoach-fermeture',
    'mycoach-train-lun', 'mycoach-train-mar', 'mycoach-train-mer', 'mycoach-train-jeu',
    'mycoach-train-ven', 'mycoach-train-sam', 'mycoach-check-in-soir',
    'mycoach-dim-pesee', 'mycoach-dim-refeed', 'mycoach-dim-marche', 'mycoach-dim-check',
    'mycoach-bilan-hebdo', 'mycoach-weekly-review'
  ];
  n text;
begin
  foreach n in array old_names loop
    if exists (select 1 from cron.job where jobname = n) then
      perform cron.unschedule(n);
    end if;
  end loop;

  if exists (select 1 from cron.job where jobname = 'mycoach-tick') then
    perform cron.unschedule('mycoach-tick');
  end if;
  perform cron.schedule('mycoach-tick', '* * * * *', 'select public.dispatch_tick()');
exception when undefined_function then
  raise notice 'pg_cron not installed; skipping rescheduling';
end $$;
