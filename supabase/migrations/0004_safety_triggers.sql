-- Safety triggers on daily_log: write structured alerts to error_log.
-- The Edge Function dispatch-ping can poll error_log for red alerts and push immediately.

create or replace function public.tg_daily_log_safety()
returns trigger language plpgsql as $$
declare
  prior_weight numeric(4,1);
  dev_count integer;
  bad_sleep_count integer;
begin
  -- BP out of range (use morning vals)
  if new.bp_morning_sys is not null and new.bp_morning_dia is not null then
    if new.bp_morning_sys < 110 or new.bp_morning_sys > 150
       or new.bp_morning_dia < 60 or new.bp_morning_dia > 90 then
      insert into public.error_log (user_id, source, type, severity, message, context)
      values (new.user_id, 'daily_log', 'medical_alert', 'red',
              'TA hors bornes: ' || new.bp_morning_sys || '/' || new.bp_morning_dia,
              jsonb_build_object('log_date', new.log_date,
                                 'sys', new.bp_morning_sys,
                                 'dia', new.bp_morning_dia,
                                 'code', 'bp_out_of_range'));
    end if;
  end if;

  -- Rapid weight loss vs J-7
  if new.weight_kg is not null then
    select weight_kg into prior_weight
      from public.daily_log
     where user_id = new.user_id
       and log_date = (new.log_date - 7);
    if prior_weight is not null and (new.weight_kg - prior_weight) < -2.0 then
      insert into public.error_log (user_id, source, type, severity, message, context)
      values (new.user_id, 'daily_log', 'medical_alert', 'red',
              'Perte de poids rapide (-' || round(prior_weight - new.weight_kg, 1) || ' kg en 7 jours)',
              jsonb_build_object('log_date', new.log_date,
                                 'today', new.weight_kg,
                                 'sevenDaysAgo', prior_weight,
                                 'code', 'rapid_weight_loss'));
    end if;
  end if;

  -- Deviation cluster
  select count(*) into dev_count
    from public.daily_log
   where user_id = new.user_id
     and log_date between (new.log_date - 6) and new.log_date
     and deviation = true;
  if dev_count >= 3 then
    insert into public.error_log (user_id, source, type, severity, message, context)
    values (new.user_id, 'daily_log', 'compliance_alert', 'amber',
            dev_count || ' écarts sur 7 jours — audit recommandé',
            jsonb_build_object('log_date', new.log_date,
                               'count', dev_count,
                               'code', 'frequent_deviations'));
  end if;

  -- Poor sleep streak (3 nights consecutive < 6/10) → flag disable_pm_coffee
  select count(*) into bad_sleep_count
    from public.daily_log
   where user_id = new.user_id
     and log_date between (new.log_date - 2) and new.log_date
     and sleep_quality_10 is not null
     and sleep_quality_10 < 6;
  if bad_sleep_count >= 3 then
    update public.profile set disable_pm_coffee = true where id = new.user_id;
    insert into public.error_log (user_id, source, type, severity, message, context)
    values (new.user_id, 'daily_log', 'compliance_alert', 'amber',
            'Sommeil < 6/10 sur 3 nuits — café post-déjeuner désactivé',
            jsonb_build_object('log_date', new.log_date, 'code', 'poor_sleep_streak'));
  end if;

  return new;
end;
$$;

drop trigger if exists daily_log_safety on public.daily_log;
create trigger daily_log_safety
after insert or update on public.daily_log
for each row execute function public.tg_daily_log_safety();
