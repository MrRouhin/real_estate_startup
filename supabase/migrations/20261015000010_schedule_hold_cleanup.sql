-- =====================================================================
-- 0010  Release expired 15-minute holds every minute (pg_cron).
-- On Supabase pg_cron is available; elsewhere (plain Postgres, CI) this is a no-op.
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('release-expired-holds', '* * * * *', 'select public.release_expired_holds()');
  end if;
end $$;
