-- =====================================================================
-- 0002  ROW-LEVEL SECURITY — who can see and change what
-- Rule of thumb: buyers read published things + their own bookings;
-- seller staff read/write everything in their own organization;
-- admins see everything. Money and plot status change ONLY through
-- the functions in 0003, never by direct client writes.
-- =====================================================================

-- ---------- Helper functions ----------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members
                 where org_id = p_org and user_id = auth.uid());
$$;

create or replace function public.is_org_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members
                 where org_id = p_org and user_id = auth.uid()
                   and org_role in ('owner', 'manager'));
$$;

create or replace function public.project_is_public(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects p
                 join public.organizations o on o.id = p.org_id
                 where p.id = p_project and p.is_published and o.is_verified);
$$;

-- ---------- Turn RLS on everywhere ----------------------------------
alter table public.organizations         enable row level security;
alter table public.profiles              enable row level security;
alter table public.organization_members  enable row level security;
alter table public.projects              enable row level security;
alter table public.plots                 enable row level security;
alter table public.plot_price_history    enable row level security;
alter table public.bookings              enable row level security;
alter table public.payment_schedule      enable row level security;
alter table public.payments              enable row level security;
alter table public.documents             enable row level security;
alter table public.construction_updates  enable row level security;
alter table public.announcements         enable row level security;
alter table public.notifications         enable row level security;

-- ---------- organizations -------------------------------------------
create policy org_read on public.organizations for select
  using (is_verified or public.is_org_member(id) or public.is_admin());
create policy org_update on public.organizations for update
  using (public.is_org_manager(id) or public.is_admin());
create policy org_admin_insert on public.organizations for insert
  with check (public.is_admin());
-- Members may not flip their own verification
revoke update on public.organizations from authenticated;
grant update (name, gst_number, phone, email, token_percent) on public.organizations to authenticated;

-- ---------- profiles -------------------------------------------------
create policy profile_read on public.profiles for select
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (  -- sellers can see buyers who booked with them
      select 1 from public.bookings b
      where b.buyer_id = profiles.id and public.is_org_member(b.org_id))
    or exists (  -- and colleagues in their org
      select 1 from public.organization_members m
      where m.user_id = profiles.id and public.is_org_member(m.org_id))
  );
create policy profile_update_self on public.profiles for update
  using (id = auth.uid() or public.is_admin());
-- Users can edit their name/email, never their role or KYC status
revoke update on public.profiles from authenticated;
grant update (full_name, email) on public.profiles to authenticated;

-- ---------- organization_members ------------------------------------
create policy members_read on public.organization_members for select
  using (user_id = auth.uid() or public.is_org_member(org_id) or public.is_admin());
create policy members_manage on public.organization_members for all
  using (public.is_org_manager(org_id) or public.is_admin())
  with check (public.is_org_manager(org_id) or public.is_admin());

-- ---------- projects -------------------------------------------------
create policy projects_read on public.projects for select
  using (public.project_is_public(id) or public.is_org_member(org_id) or public.is_admin());
create policy projects_write on public.projects for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

-- ---------- plots ----------------------------------------------------
create policy plots_read on public.plots for select
  using (public.project_is_public(project_id) or public.is_org_member(org_id) or public.is_admin());
create policy plots_write on public.plots for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

create policy price_history_read on public.plot_price_history for select
  using (exists (select 1 from public.plots p where p.id = plot_id))  -- same visibility as the plot
;

-- ---------- bookings -------------------------------------------------
create policy bookings_read on public.bookings for select
  using (buyer_id = auth.uid() or public.is_org_member(org_id) or public.is_admin());
-- Staff update status (registered, handed_over); creation goes through start_booking()
create policy bookings_staff_update on public.bookings for update
  using (public.is_org_member(org_id) or public.is_admin());
revoke insert, update, delete on public.bookings from authenticated;
grant update (status, notes) on public.bookings to authenticated;

-- ---------- payment_schedule ----------------------------------------
create policy schedule_read on public.payment_schedule for select
  using (public.is_org_member(org_id) or public.is_admin()
         or exists (select 1 from public.bookings b
                    where b.id = booking_id and b.buyer_id = auth.uid()));
create policy schedule_write on public.payment_schedule for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

-- ---------- payments: read-only for everyone, written by the server --
create policy payments_read on public.payments for select
  using (buyer_id = auth.uid() or public.is_org_member(org_id) or public.is_admin());
revoke insert, update, delete on public.payments from authenticated, anon;

-- ---------- documents ------------------------------------------------
create policy documents_read on public.documents for select
  using (
    public.is_org_member(org_id) or public.is_admin()
    or (visibility = 'public' and public.project_is_public(project_id))
    or (visibility = 'buyer' and exists (
          select 1 from public.bookings b
          where b.id = booking_id and b.buyer_id = auth.uid()))
  );
create policy documents_write on public.documents for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

-- ---------- construction updates & announcements --------------------
create policy updates_read on public.construction_updates for select
  using (public.project_is_public(project_id) or public.is_org_member(org_id) or public.is_admin());
create policy updates_write on public.construction_updates for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

create policy announcements_read on public.announcements for select
  using (public.project_is_public(project_id) or public.is_org_member(org_id) or public.is_admin());
create policy announcements_write on public.announcements for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

-- ---------- notifications -------------------------------------------
create policy notifications_own on public.notifications for select
  using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update
  using (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
