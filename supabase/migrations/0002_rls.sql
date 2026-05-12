-- Row Level Security
alter table public.profile               enable row level security;
alter table public.daily_log             enable row level security;
alter table public.meal_log              enable row level security;
alter table public.training_log          enable row level security;
alter table public.ping_log              enable row level security;
alter table public.weekly_review         enable row level security;
alter table public.photo                 enable row level security;
alter table public.push_subscription     enable row level security;
alter table public.notification_schedule enable row level security;
alter table public.error_log             enable row level security;

-- profile: owner is id = auth.uid()
drop policy if exists "profile self" on public.profile;
create policy "profile self" on public.profile
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- helper macro: create owner policy for tables keyed by user_id
do $$
declare t text;
begin
  for t in select unnest(array[
    'daily_log','meal_log','training_log','ping_log','weekly_review',
    'photo','push_subscription','notification_schedule','error_log'
  ]) loop
    execute format($f$drop policy if exists "%1$s owner" on public.%1$s$f$, t);
    execute format($f$create policy "%1$s owner" on public.%1$s
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id)$f$, t);
  end loop;
end $$;
