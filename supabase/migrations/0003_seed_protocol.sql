-- On signup: create profile row + seed notification_schedule
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profile (id) values (new.id)
  on conflict (id) do nothing;

  insert into public.notification_schedule (user_id, slot_label, cron_expression, title, body, enabled, deep_link)
  values
    (new.id, 'pesee_matin',        '0 6 * * 1-6',  'Pesée matin',          'Poids + cétones + TT (lundi) + TA.',                                                  true, '/log/morning'),
    (new.id, 'petit_dej',          '30 6 * * 1-6', 'Fenêtre ouverte',      '3 œufs + saumon + avocat + café (2 max matin).',                                      true, '/meal/petit_dej'),
    (new.id, 'dejeuner',           '0 12 * * 1-6', 'Déjeuner',             '180g protéine + 250g verts + 40g fromage. 1 café max post-déj <13h30.',               true, '/meal/dejeuner'),
    (new.id, 'fermeture',          '45 13 * * 1-6','Dernière bouchée 15 min','Jeûne à 14h00 pile.',                                                              true, '/log/hydration'),
    (new.id, 'entrainement_lun',   '0 17 * * 1',   'Séance PUSH',          '45 min, pecs/épaules/triceps.',                                                       true, '/training'),
    (new.id, 'entrainement_mar',   '0 9 * * 2',    'Tapis 1h',             '4-5 km/h pendant travail.',                                                           true, '/training'),
    (new.id, 'entrainement_mer',   '0 17 * * 3',   'Séance PULL+JAMBES',   '50 min.',                                                                             true, '/training'),
    (new.id, 'entrainement_jeu',   '0 9 * * 4',    'Tapis 1h',             '4-5 km/h pendant travail.',                                                           true, '/training'),
    (new.id, 'entrainement_ven',   '0 17 * * 5',   'HIIT 25 min',          '8 rounds 30s/30s.',                                                                   true, '/training'),
    (new.id, 'entrainement_sam',   '0 9 * * 6',    'ABDOS + mobilité',     '40 min + marche extérieure 45 min.',                                                  true, '/training'),
    (new.id, 'check_in_soir',      '30 21 * * 1-6','Check-in soir',        'Énergie, faim, écart, sommeil. Extinction écrans 22h.',                               true, '/log/evening'),
    (new.id, 'dim_pesee',          '0 6 * * 0',    'Pesée dimanche',       'Saisie habituelle.',                                                                  true, '/log/morning'),
    (new.id, 'dim_refeed',         '30 12 * * 0',  'Refeed structuré',     '80-120g gluc nets max.',                                                              true, '/meal/refeed'),
    (new.id, 'dim_marche',         '0 17 * * 0',   'Marche famille',       '45 min minimum.',                                                                     true, '/training'),
    (new.id, 'dim_check',          '30 21 * * 0',  'Check-in + bilan demain','Prépa bilan hebdo lundi 07h.',                                                      true, '/log/evening'),
    (new.id, 'bilan_hebdo',        '0 7 * * 1',    'Bilan S-1 prêt',       'Voir résumé + ajustements.',                                                          true, '/weekly')
  on conflict (user_id, slot_label) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
