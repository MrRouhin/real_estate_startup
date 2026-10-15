-- =====================================================================
-- 0009  REALTIME — tables the apps subscribe to for live updates.
-- Supabase creates the `supabase_realtime` publication; RLS still
-- decides which rows each subscriber receives.
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.plots, public.bookings, public.payments, public.notifications,
      public.construction_updates, public.milestones, public.activity_log,
      public.leads, public.deliveries, public.material_requests, public.attendance;
  end if;
end $$;
