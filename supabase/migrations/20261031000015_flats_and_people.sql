-- =====================================================================
-- 0015  FLATS AND PEOPLE
--   * Apartment projects: towers, unit types (with a room-by-room layout
--     the 3D tour is built from) and flats. A flat is a row in `plots`
--     with kind = 'flat', so holds, bookings, payments, price history,
--     demand signals and the CRM all work for flats unchanged.
--   * Tower construction progress by stage (slabs cast, masonry, MEP,
--     finishing, facade), posted as construction updates to buyers.
--   * Construction-linked payment plans per project.
--   * Profiles for employees, contractors and vendors, filled in by them,
--     reviewed by the developer (or, for crew, by their contractor).
--   * Letters (work orders, crew compliance, delay notices, appointment
--     letters, purchase orders) issued to partners' portals.
--   * Access requests: partners join a developer with an invite link.
-- Control: the developer's staff can see and change everything in their
-- organization; contractors manage their own crew; vendors and employees
-- manage only their own profile.
-- =====================================================================

-- ---------- Projects: plotted or apartments ---------------------------
alter table public.projects
  add column kind            text not null default 'plots' check (kind in ('plots', 'apartments')),
  add column payment_plan    jsonb,      -- overrides the organization's plan (e.g. construction-linked)
  add column pricing         jsonb,      -- flats: { floor_rise, plc: {view: ₹/sq ft}, corner }
  add column possession_date date,
  add column amenities       text[] not null default '{}';

-- ---------- Towers -----------------------------------------------------
create table public.towers (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null,
  project_id          uuid not null,
  code                text not null,                 -- 'A'
  name                text not null,                 -- 'Tower A'
  floors              int not null check (floors between 1 and 80),
  units_per_floor     int not null check (units_per_floor between 1 and 16),
  floor_height_m      numeric(4,2) not null default 3.0,
  position            jsonb not null default '{"x": 0, "z": 0, "rot": 0}',   -- metres on the site, rotation in degrees
  slabs_cast          int not null default 0,
  stages              jsonb not null default '{}',   -- { foundation, structure, masonry, mep, finishing, facade } in %
  expected_completion date,
  sort_order          int not null default 0,
  updated_at          timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  unique (project_id, code),
  unique (id, org_id),
  check (slabs_cast between 0 and floors)
);

-- ---------- Unit types (floor plans) ------------------------------------
create table public.unit_types (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  project_id   uuid not null,
  code         text not null,                        -- '2BHK-A'
  name         text not null,                        -- '2 BHK · Type A'
  bedrooms     int not null check (bedrooms between 0 and 8),
  bathrooms    int not null check (bathrooms between 1 and 8),
  balconies    int not null default 1,
  carpet_sqft  numeric(8,2) not null check (carpet_sqft > 0),
  builtup_sqft numeric(8,2),
  super_sqft   numeric(8,2) not null check (super_sqft > 0),
  base_rate    numeric(10,2) not null check (base_rate > 0),   -- ₹ per sq ft of super built-up area
  layout       jsonb not null,                       -- rooms, openings, furniture (metres)
  description  text,
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  unique (project_id, code),
  unique (id, org_id)
);

-- ---------- Flats live in the same inventory table as plots -----------
alter table public.plots
  add column kind         text not null default 'plot' check (kind in ('plot', 'flat')),
  add column tower_id     uuid references public.towers (id) on delete cascade,
  add column floor        int,
  add column stack        int,
  add column unit_type_id uuid references public.unit_types (id),
  add column view         text,
  add column mirror       boolean not null default false,
  add constraint plots_flat_fields check (kind = 'plot' or (tower_id is not null and floor is not null and unit_type_id is not null));
create index plots_tower_idx on public.plots (tower_id, floor);

alter table public.construction_updates
  add column tower_id       uuid references public.towers (id) on delete set null,
  add column tower_snapshot jsonb;

-- ---------- Partner and employee profiles -----------------------------
alter table public.contractors
  add column pan                  text,
  add column license_number       text,
  add column insurance_policy     text,
  add column insurance_valid_till date,
  add column team_size            int check (team_size is null or team_size >= 0),
  add column upi_id               text,
  add column bank_ifsc            text,
  add column bank_last4           text check (bank_last4 is null or bank_last4 ~ '^[0-9]{4}$'),
  add column profile_status       text not null default 'draft' check (profile_status in ('draft', 'submitted', 'verified', 'needs_changes')),
  add column profile_note         text,
  add column profile_updated_at   timestamptz;

alter table public.vendors
  add column pan                  text,
  add column delivery_regions     text,
  add column upi_id               text,
  add column bank_ifsc            text,
  add column bank_last4           text check (bank_last4 is null or bank_last4 ~ '^[0-9]{4}$'),
  add column profile_status       text not null default 'draft' check (profile_status in ('draft', 'submitted', 'verified', 'needs_changes')),
  add column profile_note         text,
  add column profile_updated_at   timestamptz;

-- Only the last 4 digits of an ID or bank account are stored, never the full number.
create table public.employee_profiles (
  employee_id          uuid primary key references public.employees (id) on delete cascade,
  org_id               uuid not null references public.organizations (id) on delete cascade,
  date_of_birth        date,
  address              text,
  city                 text,
  home_state           text,
  emergency_name       text,
  emergency_phone      text,
  emergency_relation   text,
  id_type              text check (id_type in ('aadhaar', 'voter_id', 'driving_licence', 'pan', 'passport')),
  id_last4             text check (id_last4 is null or id_last4 ~ '^[0-9A-Z]{4}$'),
  trade                text,
  skills               text[] not null default '{}',
  experience_years     numeric(4,1) check (experience_years is null or experience_years between 0 and 60),
  languages            text[] not null default '{}',
  blood_group          text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  safety_trained       boolean not null default false,
  safety_training_date date,
  upi_id               text,
  bank_ifsc            text,
  bank_last4           text check (bank_last4 is null or bank_last4 ~ '^[0-9]{4}$'),
  photo_path           text,
  status               text not null default 'draft' check (status in ('draft', 'submitted', 'verified', 'needs_changes')),
  review_note          text,
  submitted_at         timestamptz,
  verified_by          uuid references public.profiles (id),
  verified_at          timestamptz,
  updated_at           timestamptz not null default now()
);

-- ---------- Letters -------------------------------------------------------
create table public.letters (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  project_id      uuid references public.projects (id) on delete set null,
  seq             bigint generated always as identity,
  kind            text not null check (kind in ('crew_compliance', 'work_order', 'delay_notice', 'appointment', 'purchase_order', 'general')),
  recipient_type  text not null check (recipient_type in ('contractor', 'vendor', 'employee')),
  recipient_id    uuid not null,
  subject         text not null,
  body            text not null,
  data            jsonb not null default '{}',
  source          text not null default 'rules' check (source in ('rules', 'ai')),
  status          text not null default 'draft' check (status in ('draft', 'issued', 'acknowledged', 'withdrawn')),
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  issued_by       uuid references public.profiles (id),
  issued_at       timestamptz,
  acknowledged_at timestamptz,
  ack_note        text
);
create index letters_recipient_idx on public.letters (recipient_type, recipient_id, status);
create index letters_org_idx on public.letters (org_id, created_at desc);

-- ---------- Access requests and invites --------------------------------
alter table public.organizations
  add column address         text,
  add column website         text,
  add column signatory_name  text,
  add column signatory_title text,
  add column invite_code     text unique default substr(md5(random()::text || clock_timestamp()::text), 1, 8);
grant update (address, website, signatory_name, signatory_title, invite_code) on public.organizations to authenticated;

create table public.access_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  role         text not null check (role in ('contractor', 'vendor', 'employee')),
  full_name    text not null,
  phone        text,
  email        text,
  company_name text,
  trade        text,
  categories   text[] not null default '{}',
  gst_number   text,
  message      text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note         text,
  created_at   timestamptz not null default now(),
  decided_by   uuid references public.profiles (id),
  decided_at   timestamptz,
  unique (org_id, user_id, role)
);

-- ---------- Market factors: rent assumptions for rental yield ---------
alter table public.market_factors add column value numeric(12,2);
alter table public.market_factors drop constraint market_factors_kind_check;
alter table public.market_factors add constraint market_factors_kind_check check (kind in ('trend', 'infrastructure', 'rent'));

-- ---------- Row-level security -------------------------------------------
alter table public.towers            enable row level security;
alter table public.unit_types        enable row level security;
alter table public.employee_profiles enable row level security;
alter table public.letters           enable row level security;
alter table public.access_requests   enable row level security;

create policy towers_read on public.towers for select
  using (public.project_is_public(project_id) or public.is_org_member(org_id) or public.is_admin() or public.is_org_partner(org_id));
create policy towers_write on public.towers for all
  using (public.is_org_member(org_id) or public.is_admin()) with check (public.is_org_member(org_id) or public.is_admin());
create policy unit_types_read on public.unit_types for select
  using (public.project_is_public(project_id) or public.is_org_member(org_id) or public.is_admin());
create policy unit_types_write on public.unit_types for all
  using (public.is_org_member(org_id) or public.is_admin()) with check (public.is_org_member(org_id) or public.is_admin());

-- employee profiles: the employee, their contractor and the developer can read; changes go through functions
create policy employee_profiles_read on public.employee_profiles for select
  using (public.is_org_member(org_id) or public.is_admin()
         or exists (select 1 from public.employees e where e.id = employee_id
                    and (e.user_id = auth.uid() or (e.contractor_id is not null and e.contractor_id = public.my_contractor_id()))));
revoke insert, update, delete on public.employee_profiles from anon, authenticated;

create or replace function public.letter_visible(p_type text, p_recipient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case p_type
    when 'contractor' then p_recipient = public.my_contractor_id()
    when 'vendor' then p_recipient = public.my_vendor_id()
    when 'employee' then p_recipient = public.my_employee_id()
      or exists (select 1 from public.employees e where e.id = p_recipient and e.contractor_id is not null and e.contractor_id = public.my_contractor_id())
    else false end;
$$;
create policy letters_read on public.letters for select
  using (public.is_org_member(org_id) or public.is_admin()
         or (status in ('issued', 'acknowledged') and public.letter_visible(recipient_type, recipient_id)));
create policy letters_write on public.letters for all
  using (public.is_org_member(org_id) or public.is_admin()) with check (public.is_org_member(org_id) or public.is_admin());

create policy access_requests_read on public.access_requests for select
  using (user_id = auth.uid() or public.is_org_member(org_id) or public.is_admin());
create policy access_requests_insert on public.access_requests for insert
  with check (user_id = auth.uid() and status = 'pending');
create policy access_requests_decide on public.access_requests for update
  using (public.is_org_member(org_id) or public.is_admin()) with check (public.is_org_member(org_id) or public.is_admin());

-- ---------- Flats in notifications and the activity feed ----------------
-- Older triggers write "Plot <number>"; flat numbers look like A-1203, so say "Flat" for those.
create or replace function public.flatify_text(t text)
returns text language sql immutable set search_path = public as $$
  select regexp_replace(regexp_replace(t, '\mPlot ([A-Z]{1,3}-[0-9]{3,4})', 'Flat \1', 'g'), '\mplot ([A-Z]{1,3}-[0-9]{3,4})', 'flat \1', 'g');
$$;
create or replace function public.flatify_notification()
returns trigger language plpgsql set search_path = public as $$
begin
  new.title := public.flatify_text(new.title);
  new.body := public.flatify_text(new.body);
  return new;
end $$;
create or replace function public.flatify_activity()
returns trigger language plpgsql set search_path = public as $$
begin
  new.message := public.flatify_text(new.message);
  return new;
end $$;
create trigger notifications_flatify before insert on public.notifications for each row execute function public.flatify_notification();
create trigger activity_flatify before insert on public.activity_log for each row execute function public.flatify_activity();
revoke execute on function public.flatify_notification(), public.flatify_activity() from public, anon, authenticated;

-- ---------- Booking: per-project payment plans (construction-linked for flats)
create or replace function public.start_booking(p_plot_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_plot    public.plots;
  v_org     public.organizations;
  v_plan    jsonb;
  v_token   numeric(14,2);
  v_booking public.bookings;
  v_step    jsonb;
  v_i       int := 0;
  v_used    numeric(14,2) := 0;
  v_amount  numeric(14,2);
  v_n       int;
begin
  select * into v_plot from public.plots where id = p_plot_id for update;
  if v_plot.id is null or v_plot.status <> 'held'
     or v_plot.held_by is distinct from auth.uid() or v_plot.held_until < now() then
    raise exception 'HOLD_EXPIRED_OR_MISSING';
  end if;
  if (select kyc_status from public.profiles where id = auth.uid()) = 'rejected' then
    raise exception 'KYC_REJECTED';
  end if;

  select * into v_org from public.organizations where id = v_plot.org_id;
  select coalesce(p.payment_plan, v_org.payment_plan) into v_plan from public.projects p where p.id = v_plot.project_id;
  v_token := round(v_plot.price * least(v_org.token_percent, 10) / 100, 2);

  select * into v_booking from public.bookings
   where plot_id = p_plot_id and buyer_id = auth.uid() and status = 'pending_payment';

  if v_booking.id is null then
    insert into public.bookings (org_id, plot_id, buyer_id, total_amount, token_amount)
    values (v_plot.org_id, v_plot.id, auth.uid(), v_plot.price, v_token)
    returning * into v_booking;

    v_n := jsonb_array_length(v_plan);
    for v_step in select value from jsonb_array_elements(v_plan) loop
      v_amount := case
        when v_i = 0 then v_token                                   -- first step is always the token
        when v_i = v_n - 1 then v_plot.price - v_used               -- last step takes the remainder
        else round(v_plot.price * (v_step->>'pct')::numeric / 100, 2) end;
      insert into public.payment_schedule (booking_id, org_id, label, amount, due_date, sort_order, due_note)
      values (v_booking.id, v_plot.org_id, v_step->>'label', v_amount,
              case when v_i = 0 then current_date
                   when v_step ? 'days' then current_date + (v_step->>'days')::int end,
              v_i, v_step->>'note');
      v_used := v_used + v_amount;
      v_i := v_i + 1;
    end loop;
  end if;

  update public.plots set held_until = now() + interval '20 minutes' where id = p_plot_id;
  return v_booking;
end $$;
revoke execute on function public.start_booking(uuid) from public, anon;
grant  execute on function public.start_booking(uuid) to authenticated;

-- ---------- Tower progress -------------------------------------------------
create or replace function public.tower_percent(p_stages jsonb)
returns numeric language sql immutable set search_path = public as $$
  select round((coalesce((p_stages->>'foundation')::numeric, 0) * 10 + coalesce((p_stages->>'structure')::numeric, 0) * 35
              + coalesce((p_stages->>'masonry')::numeric, 0) * 15 + coalesce((p_stages->>'mep')::numeric, 0) * 15
              + coalesce((p_stages->>'finishing')::numeric, 0) * 20 + coalesce((p_stages->>'facade')::numeric, 0) * 5) / 100, 1);
$$;

-- Staff record slabs cast and stage %; buyers of the project are notified.
create or replace function public.update_tower_progress(p_tower uuid, p_slabs int, p_stages jsonb, p_title text, p_body text default null)
returns public.construction_updates language plpgsql security definer set search_path = public as $$
declare t public.towers; v_stages jsonb; v_pct numeric; u public.construction_updates; k text;
begin
  select * into t from public.towers where id = p_tower for update;
  if t.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(t.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if p_slabs is null or p_slabs < 0 or p_slabs > t.floors then raise exception 'BAD_SLABS'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'TITLE_REQUIRED'; end if;
  v_stages := coalesce(t.stages, '{}'::jsonb) || coalesce(p_stages, '{}'::jsonb);
  for k in select jsonb_object_keys(v_stages) loop
    if k not in ('foundation', 'structure', 'masonry', 'mep', 'finishing', 'facade') or (v_stages->>k)::numeric not between 0 and 100 then
      raise exception 'BAD_STAGE';
    end if;
  end loop;
  v_stages := v_stages || jsonb_build_object('structure', round(100.0 * p_slabs / t.floors, 1));
  update public.towers set slabs_cast = p_slabs, stages = v_stages, updated_at = now() where id = t.id returning * into t;
  select round(sum(public.tower_percent(stages) * floors * units_per_floor) / nullif(sum(floors * units_per_floor), 0), 2)
    into v_pct from public.towers where project_id = t.project_id;
  insert into public.construction_updates (org_id, project_id, title, body, created_by, tower_id, tower_snapshot, progress_percent)
  values (t.org_id, t.project_id, p_title, p_body, auth.uid(), t.id,
          jsonb_build_object('code', t.code, 'slabs_cast', t.slabs_cast, 'floors', t.floors, 'stages', t.stages, 'percent', public.tower_percent(t.stages)), v_pct)
  returning * into u;
  return u;
end $$;
revoke execute on function public.update_tower_progress(uuid, int, jsonb, text, text) from public, anon;
grant execute on function public.update_tower_progress(uuid, int, jsonb, text, text) to authenticated;

-- ---------- Profiles: self-service and review --------------------------
create or replace function public.save_my_employee_profile(p jsonb, p_submit boolean default false)
returns public.employee_profiles language plpgsql security definer set search_path = public as $$
declare e public.employees; r public.employee_profiles; v_dob date;
begin
  select * into e from public.employees where user_id = auth.uid() and active limit 1;
  if e.id is null then raise exception 'NOT_AN_EMPLOYEE'; end if;
  v_dob := nullif(p->>'date_of_birth', '')::date;
  if v_dob is not null and (v_dob > current_date - interval '18 years' or v_dob < current_date - interval '80 years') then
    raise exception 'AGE_NOT_ALLOWED';   -- no one under 18 on a construction site
  end if;
  if nullif(p->>'emergency_phone', '') is not null and regexp_replace(p->>'emergency_phone', '\D', '', 'g') !~ '^(91)?[6-9][0-9]{9}$' then
    raise exception 'BAD_PHONE';
  end if;
  if nullif(p->>'bank_ifsc', '') is not null and upper(p->>'bank_ifsc') !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then raise exception 'BAD_IFSC'; end if;
  if nullif(p->>'upi_id', '') is not null and p->>'upi_id' !~ '^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$' then raise exception 'BAD_UPI'; end if;
  insert into public.employee_profiles as ep (employee_id, org_id) values (e.id, e.org_id) on conflict (employee_id) do nothing;
  -- only the keys that were sent are changed, so the wizard can save one step at a time
  update public.employee_profiles set
    date_of_birth = case when p ? 'date_of_birth' then v_dob else date_of_birth end,
    address = case when p ? 'address' then nullif(trim(p->>'address'), '') else address end,
    city = case when p ? 'city' then nullif(trim(p->>'city'), '') else city end,
    home_state = case when p ? 'home_state' then nullif(trim(p->>'home_state'), '') else home_state end,
    emergency_name = case when p ? 'emergency_name' then nullif(trim(p->>'emergency_name'), '') else emergency_name end,
    emergency_phone = case when p ? 'emergency_phone' then nullif(regexp_replace(coalesce(p->>'emergency_phone', ''), '\D', '', 'g'), '') else emergency_phone end,
    emergency_relation = case when p ? 'emergency_relation' then nullif(trim(p->>'emergency_relation'), '') else emergency_relation end,
    id_type = case when p ? 'id_type' then nullif(p->>'id_type', '') else id_type end,
    id_last4 = case when p ? 'id_last4' then nullif(upper(right(regexp_replace(coalesce(p->>'id_last4', ''), '\s', '', 'g'), 4)), '') else id_last4 end,
    trade = case when p ? 'trade' then nullif(trim(p->>'trade'), '') else trade end,
    skills = case when p ? 'skills' then coalesce(array(select trim(x) from jsonb_array_elements_text(coalesce(p->'skills', '[]')) x where trim(x) <> ''), '{}') else skills end,
    languages = case when p ? 'languages' then coalesce(array(select trim(x) from jsonb_array_elements_text(coalesce(p->'languages', '[]')) x where trim(x) <> ''), '{}') else languages end,
    experience_years = case when p ? 'experience_years' then nullif(p->>'experience_years', '')::numeric else experience_years end,
    blood_group = case when p ? 'blood_group' then nullif(p->>'blood_group', '') else blood_group end,
    safety_trained = case when p ? 'safety_trained' then coalesce((p->>'safety_trained')::boolean, false) else safety_trained end,
    safety_training_date = case when p ? 'safety_training_date' then nullif(p->>'safety_training_date', '')::date else safety_training_date end,
    upi_id = case when p ? 'upi_id' then nullif(trim(p->>'upi_id'), '') else upi_id end,
    bank_ifsc = case when p ? 'bank_ifsc' then nullif(upper(trim(p->>'bank_ifsc')), '') else bank_ifsc end,
    bank_last4 = case when p ? 'bank_last4' then nullif(right(regexp_replace(coalesce(p->>'bank_last4', ''), '\D', '', 'g'), 4), '') else bank_last4 end,
    photo_path = coalesce(nullif(p->>'photo_path', ''), photo_path),
    status = case when p_submit then 'submitted' when status = 'verified' and (p - 'photo_path') <> '{}'::jsonb then 'draft' else status end,
    submitted_at = case when p_submit then now() else submitted_at end,
    updated_at = now()
  where employee_id = e.id returning * into r;
  if nullif(p->>'phone', '') is not null then
    update public.employees set phone = regexp_replace(p->>'phone', '\D', '', 'g') where id = e.id;
  end if;
  if p_submit then
    perform public.log_activity(e.org_id, e.project_id, 'info', e.full_name || ' submitted their profile for verification');
  end if;
  return r;
end $$;
revoke execute on function public.save_my_employee_profile(jsonb, boolean) from public, anon;
grant execute on function public.save_my_employee_profile(jsonb, boolean) to authenticated;

-- The developer, or the employee's own contractor, verifies or sends back a profile.
create or replace function public.review_employee_profile(p_employee uuid, p_status text, p_note text default null)
returns public.employee_profiles language plpgsql security definer set search_path = public as $$
declare e public.employees; r public.employee_profiles;
begin
  select * into e from public.employees where id = p_employee;
  if e.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(e.org_id) or public.is_admin() or (e.contractor_id is not null and e.contractor_id = public.my_contractor_id())) then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_status not in ('verified', 'needs_changes') then raise exception 'BAD_STATUS'; end if;
  insert into public.employee_profiles (employee_id, org_id) values (e.id, e.org_id) on conflict (employee_id) do nothing;
  update public.employee_profiles set status = p_status, review_note = nullif(trim(p_note), ''),
         verified_by = case when p_status = 'verified' then auth.uid() end, verified_at = case when p_status = 'verified' then now() end, updated_at = now()
   where employee_id = e.id returning * into r;
  if e.user_id is not null then
    perform public.notify_user(e.user_id, case when p_status = 'verified' then 'Your profile is verified' else 'Please update your profile' end,
                               coalesce(nullif(trim(p_note), ''), case when p_status = 'verified' then 'You are cleared for site work.' else 'Some details need changes.' end), '/employee/profile');
  end if;
  return r;
end $$;
revoke execute on function public.review_employee_profile(uuid, text, text) from public, anon;
grant execute on function public.review_employee_profile(uuid, text, text) to authenticated;

-- Contractors and vendors keep their own company profile up to date.
create or replace function public.save_my_company_profile(p jsonb, p_submit boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare v_c uuid := public.my_contractor_id(); v_v uuid := public.my_vendor_id(); v_gst text; v_pan text;
begin
  v_gst := nullif(upper(trim(p->>'gst_number')), '');
  v_pan := nullif(upper(trim(p->>'pan')), '');
  if v_gst is not null and v_gst !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then raise exception 'BAD_GSTIN'; end if;
  if v_pan is not null and v_pan !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then raise exception 'BAD_PAN'; end if;
  if nullif(p->>'bank_ifsc', '') is not null and upper(p->>'bank_ifsc') !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then raise exception 'BAD_IFSC'; end if;
  if v_c is not null then
    update public.contractors set
      contact_person = coalesce(nullif(trim(p->>'contact_person'), ''), contact_person), phone = coalesce(nullif(trim(p->>'phone'), ''), phone),
      email = coalesce(nullif(trim(p->>'email'), ''), email), address = nullif(trim(p->>'address'), ''), gst_number = v_gst, pan = v_pan,
      license_number = nullif(trim(p->>'license_number'), ''), insurance_policy = nullif(trim(p->>'insurance_policy'), ''),
      insurance_valid_till = nullif(p->>'insurance_valid_till', '')::date, team_size = nullif(p->>'team_size', '')::int,
      upi_id = nullif(trim(p->>'upi_id'), ''), bank_ifsc = nullif(upper(trim(p->>'bank_ifsc')), ''),
      bank_last4 = nullif(right(regexp_replace(coalesce(p->>'bank_last4', ''), '\D', '', 'g'), 4), ''),
      profile_status = case when p_submit then 'submitted' when profile_status = 'verified' then 'draft' else profile_status end,
      profile_updated_at = now()
    where id = v_c;
    return 'contractor';
  elsif v_v is not null then
    update public.vendors set
      contact_person = coalesce(nullif(trim(p->>'contact_person'), ''), contact_person), phone = coalesce(nullif(trim(p->>'phone'), ''), phone),
      email = coalesce(nullif(trim(p->>'email'), ''), email), address = nullif(trim(p->>'address'), ''), gst_number = v_gst, pan = v_pan,
      categories = case when p ? 'categories' then array(select lower(trim(x)) from jsonb_array_elements_text(p->'categories') x where trim(x) <> '') else categories end,
      delivery_regions = nullif(trim(p->>'delivery_regions'), ''),
      upi_id = nullif(trim(p->>'upi_id'), ''), bank_ifsc = nullif(upper(trim(p->>'bank_ifsc')), ''),
      bank_last4 = nullif(right(regexp_replace(coalesce(p->>'bank_last4', ''), '\D', '', 'g'), 4), ''),
      profile_status = case when p_submit then 'submitted' when profile_status = 'verified' then 'draft' else profile_status end,
      profile_updated_at = now()
    where id = v_v;
    return 'vendor';
  end if;
  raise exception 'NOT_A_PARTNER';
end $$;
revoke execute on function public.save_my_company_profile(jsonb, boolean) from public, anon;
grant execute on function public.save_my_company_profile(jsonb, boolean) to authenticated;

-- Contractors add and manage their own crew (never the login link, which the developer controls).
create or replace function public.contractor_save_employee(p jsonb)
returns public.employees language plpgsql security definer set search_path = public as $$
declare v_c public.contractors; e public.employees; v_code text; v_project uuid;
begin
  select * into v_c from public.contractors where id = public.my_contractor_id();
  if v_c.id is null then raise exception 'NOT_A_CONTRACTOR'; end if;
  if coalesce(trim(p->>'full_name'), '') = '' then raise exception 'NAME_REQUIRED'; end if;
  if nullif(p->>'phone', '') is not null and regexp_replace(p->>'phone', '\D', '', 'g') !~ '^(91)?[6-9][0-9]{9}$' then raise exception 'BAD_PHONE'; end if;
  if nullif(p->>'id', '') is not null then
    update public.employees set full_name = trim(p->>'full_name'), phone = nullif(regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g'), ''),
           role_title = nullif(trim(p->>'role_title'), ''), daily_wage = nullif(p->>'daily_wage', '')::numeric,
           active = coalesce((p->>'active')::boolean, active)
     where id = (p->>'id')::uuid and contractor_id = v_c.id returning * into e;
    if e.id is null then raise exception 'NOT_ALLOWED'; end if;
  else
    select id into v_project from public.projects where org_id = v_c.org_id and status = 'ongoing' order by created_at limit 1;
    v_code := coalesce(nullif(upper(trim(p->>'employee_code')), ''),
      'C' || upper(left(regexp_replace(v_c.company_name, '[^A-Za-z]', '', 'g'), 3)) || '-' || lpad((count_crew + 1)::text, 3, '0'))
      from (select count(*) as count_crew from public.employees where contractor_id = v_c.id) x;
    insert into public.employees (org_id, contractor_id, project_id, employee_code, full_name, phone, role_title, daily_wage)
    values (v_c.org_id, v_c.id, v_project, v_code, trim(p->>'full_name'), nullif(regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g'), ''),
            nullif(trim(p->>'role_title'), ''), nullif(p->>'daily_wage', '')::numeric)
    returning * into e;
    perform public.log_activity(v_c.org_id, v_project, 'info', v_c.company_name || ' added ' || e.full_name || ' (' || coalesce(e.role_title, 'crew') || ') to their crew');
  end if;
  return e;
end $$;
revoke execute on function public.contractor_save_employee(jsonb) from public, anon;
grant execute on function public.contractor_save_employee(jsonb) to authenticated;

-- ---------- Letters: issue and acknowledge -----------------------------
create or replace function public.letter_number(p_seq bigint, p_created timestamptz)
returns text language sql immutable as $$ select 'LTR-' || to_char(p_created, 'YYYY') || '-' || lpad(p_seq::text, 4, '0') $$;

create or replace function public.issue_letter(p_letter uuid)
returns public.letters language plpgsql security definer set search_path = public as $$
declare l public.letters; v_user uuid;
begin
  select * into l from public.letters where id = p_letter for update;
  if l.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(l.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if l.status not in ('draft', 'withdrawn') then raise exception 'ALREADY_ISSUED'; end if;
  update public.letters set status = 'issued', issued_by = auth.uid(), issued_at = now() where id = l.id returning * into l;
  v_user := case l.recipient_type
    when 'contractor' then (select user_id from public.contractors where id = l.recipient_id)
    when 'vendor' then (select user_id from public.vendors where id = l.recipient_id)
    else (select user_id from public.employees where id = l.recipient_id) end;
  if v_user is not null then
    perform public.notify_user(v_user, 'New letter: ' || l.subject, public.letter_number(l.seq, l.created_at) || ' needs your acknowledgement.', '/letters/' || l.id);
  end if;
  perform public.log_activity(l.org_id, l.project_id, 'info', 'Issued ' || public.letter_number(l.seq, l.created_at) || ': ' || l.subject);
  return l;
end $$;
revoke execute on function public.issue_letter(uuid) from public, anon;
grant execute on function public.issue_letter(uuid) to authenticated;

create or replace function public.acknowledge_letter(p_letter uuid, p_note text default null)
returns public.letters language plpgsql security definer set search_path = public as $$
declare l public.letters; ok boolean;
begin
  select * into l from public.letters where id = p_letter for update;
  if l.id is null then raise exception 'NOT_FOUND'; end if;
  ok := case l.recipient_type when 'contractor' then l.recipient_id = public.my_contractor_id()
          when 'vendor' then l.recipient_id = public.my_vendor_id() else l.recipient_id = public.my_employee_id() end;
  if not coalesce(ok, false) then raise exception 'NOT_ALLOWED'; end if;
  if l.status <> 'issued' then raise exception 'NOT_ISSUED'; end if;
  update public.letters set status = 'acknowledged', acknowledged_at = now(), ack_note = nullif(trim(p_note), '') where id = l.id returning * into l;
  perform public.log_activity(l.org_id, l.project_id, 'info', public.letter_number(l.seq, l.created_at) || ' acknowledged' || coalesce(': ' || l.ack_note, ''));
  return l;
end $$;
revoke execute on function public.acknowledge_letter(uuid, text) from public, anon;
grant execute on function public.acknowledge_letter(uuid, text) to authenticated;

-- Partners join with the developer's invite link.
create or replace function public.org_by_invite(p_code text)
returns table (id uuid, name text) language sql stable security definer set search_path = public as $$
  select o.id, o.name from public.organizations o where o.invite_code = p_code and coalesce(p_code, '') <> '';
$$;
grant execute on function public.org_by_invite(text) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.towers, public.letters;
  end if;
end $$;

-- ---------- Demo content: an apartment project and partner profiles ----
-- Called by scripts/seed.mjs after the main seed; service role only. Skips
-- the apartment project if it already exists, so it is safe to re-run.
create or replace function public.seed_flats_demo(p_org uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_plotted public.projects; v_proj uuid; v_a uuid; v_b uuid; v_t2 uuid; v_t3 uuid; t record; f int; s int;
  v_type uuid; v_super numeric; v_base numeric; v_view text; v_facing text; v_corner boolean; v_price numeric; v_num text;
  v_status text; v_h int; v_thr int; v_buyer uuid; v_plot uuid; v_booking uuid; v_i int; v_amount numeric; v_used numeric;
  v_step jsonb; v_inst uuid; v_today date := (now() at time zone 'Asia/Kolkata')::date; v_abc uuid; v_xyz uuid; v_sri uuid; v_xyzm uuid;
  v_wp uuid; v_cement uuid; v_emp record; v_k int := 0; v_states text[] := array['Karnataka', 'Bihar', 'Odisha', 'West Bengal', 'Tamil Nadu', 'Uttar Pradesh', 'Andhra Pradesh'];
  v_cities text[] := array['Devanahalli', 'Patna', 'Cuttack', 'Malda', 'Hosur', 'Gorakhpur', 'Anantapur'];
  v_langs text[] := array['Kannada', 'Hindi', 'Odia', 'Bengali', 'Tamil', 'Hindi', 'Telugu'];
  v_blood text[] := array['O+', 'B+', 'A+', 'AB+', 'O-', 'B-', 'A-'];
  v_plan jsonb := '[
    {"label": "Booking amount", "pct": 10, "note": "At booking"},
    {"label": "Agreement for sale", "pct": 10, "note": "Within 30 days", "days": 30},
    {"label": "On completion of foundation", "pct": 15, "note": "Foundation complete", "stage": "foundation"},
    {"label": "On casting of the 4th slab", "pct": 10, "note": "4th floor slab cast", "slab": 4},
    {"label": "On casting of the 8th slab", "pct": 10, "note": "8th floor slab cast", "slab": 8},
    {"label": "On casting of the 12th slab", "pct": 10, "note": "12th floor slab cast", "slab": 12},
    {"label": "On casting of the roof slab", "pct": 10, "note": "Roof slab cast", "slab": "top"},
    {"label": "On completion of masonry", "pct": 10, "note": "Blockwork and plastering complete", "stage": "masonry"},
    {"label": "On flooring and finishing", "pct": 10, "note": "Flooring, doors and windows complete", "stage": "finishing"},
    {"label": "On possession", "pct": 5, "note": "At handover and registration"}]';
  v_pricing jsonb := '{"floor_rise": 35, "plc": {"park": 150, "pool": 200, "garden": 100, "road": 0}, "corner": 75, "maintenance": 3.5, "car_parks": {"2": 1, "3": 2}}';
begin
  select * into v_plotted from public.projects where org_id = p_org and kind = 'plots' order by created_at limit 1;

  -- organization profile used on letters
  update public.organizations set address = coalesce(address, 'No. 42, 2nd Floor, Bellary Road, Hebbal, Bengaluru 560024'),
         website = coalesce(website, 'demodevelopers.dev'), signatory_name = coalesce(signatory_name, 'Ananya Sharma'),
         signatory_title = coalesce(signatory_title, 'Director, Sales and Projects'), invite_code = 'GVDEMO26'
   where id = p_org;

  if exists (select 1 from public.projects where org_id = p_org and slug = 'green-valley-heights') then
    return 'apartment project already exists';
  end if;

  insert into public.projects (org_id, name, slug, city, address, description, rera_number, status, is_published, kind,
                               site_lat, site_lng, geofence_m, payment_plan, pricing, possession_date, amenities, progress_percent)
  values (p_org, 'Green Valley Heights', 'green-valley-heights', 'Devanahalli, Bengaluru North',
          'Next to Green Valley Residency, off NH 44, Devanahalli, Bengaluru 562110',
          'Two towers of 2 and 3 BHK homes beside Green Valley Residency: east-facing park views, a pool deck between the towers, a clubhouse and EV-ready parking. Walk through any flat in 3D, see how far your floor has been built, and pay only as each slab is cast.',
          'PRM/KA/RERA/1250/303/PR/SAMPLE/0002', 'ongoing', true, 'apartments',
          coalesce(v_plotted.site_lat, 13.2468) + 0.0021, coalesce(v_plotted.site_lng, 77.7120) + 0.0018, 250, v_plan, v_pricing, '2028-03-31',
          array['Swimming pool', 'Clubhouse with gym', 'Children''s play area', 'Jogging track', 'Indoor games', 'EV charging', '24x7 security', 'Power backup', 'Rainwater harvesting', 'Sewage treatment plant'], 0)
  returning id into v_proj;

  insert into public.unit_types (org_id, project_id, code, name, bedrooms, bathrooms, balconies, carpet_sqft, builtup_sqft, super_sqft, base_rate, layout, description)
  values (p_org, v_proj, '2BHK-A', '2 BHK · Type A', 2, 2, 1, 913, 1035, 1285, 6400, $j${"w":10.4,"d":9.8,"height":3,"rooms":[{"id":"kitchen","kind":"kitchen","name":"Kitchen","x":0,"y":0,"w":3.2,"d":3.4},{"id":"foyer","kind":"foyer","name":"Foyer","x":3.2,"y":0,"w":1.8,"d":3.4},{"id":"bath2","kind":"bath","name":"Common bathroom","x":5,"y":0,"w":2.2,"d":2.2},{"id":"passage","kind":"passage","name":"Passage","x":5,"y":2.2,"w":2.2,"d":1.2},{"id":"bath1","kind":"bath","name":"Master bathroom","x":7.2,"y":0.8,"w":3.2,"d":2.6},{"id":"bed2","kind":"bedroom","name":"Bedroom 2","x":0,"y":3.4,"w":3.4,"d":5},{"id":"living","kind":"living","name":"Living and dining","x":3.4,"y":3.4,"w":3.8,"d":5},{"id":"master","kind":"bedroom","name":"Master bedroom","x":7.2,"y":3.4,"w":3.2,"d":5},{"id":"balcony","kind":"balcony","name":"Balcony","x":3.4,"y":8.4,"w":3.8,"d":1.4}],"openings":[{"type":"entry","room":"foyer","side":"n","at":4.1,"width":1},{"type":"door","rooms":["kitchen","foyer"],"at":2.2,"width":0.9},{"type":"open","rooms":["foyer","living"]},{"type":"open","rooms":["passage","foyer"]},{"type":"open","rooms":["passage","living"]},{"type":"door","rooms":["bath2","passage"],"at":6.1,"width":0.75},{"type":"door","rooms":["bed2","living"],"at":4.2,"width":0.9},{"type":"door","rooms":["master","living"],"at":4.2,"width":0.9},{"type":"door","rooms":["bath1","master"],"at":7.9,"width":0.75},{"type":"slider","rooms":["living","balcony"],"at":5.3,"width":3},{"type":"window","room":"kitchen","side":"w","at":1.9,"width":1.2,"sill":1.05,"head":2.1},{"type":"window","room":"bed2","side":"w","at":6.4,"width":1.6,"sill":0.9,"head":2.1},{"type":"window","room":"bed2","side":"s","at":1.7,"width":1.4,"sill":0.9,"head":2.1},{"type":"window","room":"master","side":"s","at":8.8,"width":1.6,"sill":0.9,"head":2.1},{"type":"window","room":"master","side":"e","at":7.6,"width":0.9,"sill":1,"head":2.1},{"type":"window","room":"bath1","side":"e","at":1.7,"width":0.6,"sill":1.6,"head":2.1}],"furniture":[{"type":"counter","room":"kitchen","x":0.462,"y":2.022,"rot":90,"w":2.5,"sink":true},{"type":"counter","room":"kitchen","x":1.292,"y":0.462,"rot":0,"w":2.28,"hob":true,"upper":true},{"type":"fridge","room":"kitchen","x":2.778,"y":0.492,"rot":0},{"type":"shoe_cabinet","room":"foyer","x":4.753,"y":1.1,"rot":-90,"w":1},{"type":"plant","room":"foyer","x":3.462,"y":3.1},{"type":"sofa","room":"living","x":3.922,"y":6.5,"rot":90,"w":2.2},{"type":"tv_unit","room":"living","x":6.918,"y":6.5,"rot":-90,"w":1.8},{"type":"rug","room":"living","x":5.2,"y":6.5,"rot":90,"w":2.6,"d":1.9},{"type":"coffee_table","room":"living","x":5,"y":6.5,"rot":90},{"type":"dining","room":"living","x":5.4,"y":4.55,"rot":0,"w":1.4,"d":0.85,"seats":4},{"type":"floor_lamp","room":"living","x":3.7,"y":7.95},{"type":"plant","room":"living","x":6.85,"y":8.05},{"type":"art","room":"living","x":3.462,"y":6.5,"rot":90,"w":1.2},{"type":"bed","room":"bed2","x":1.2,"y":4.532,"rot":0,"size":"double"},{"type":"side_table","room":"bed2","x":2.33,"y":3.672},{"type":"wardrobe","room":"bed2","x":3.028,"y":6,"rot":-90,"w":2},{"type":"desk","room":"bed2","x":1.7,"y":7.948,"rot":180,"w":1.2},{"type":"bed","room":"master","x":9.188,"y":5.6,"rot":-90,"size":"queen"},{"type":"side_table","room":"master","x":10.023,"y":4.45},{"type":"side_table","room":"master","x":10.023,"y":6.75},{"type":"wardrobe","room":"master","x":7.572,"y":6.2,"rot":90,"w":2.4},{"type":"armchair","room":"master","x":9.7,"y":7.848,"rot":180},{"type":"rug","room":"master","x":8.9,"y":5.6,"rot":0,"w":1.8,"d":2.4},{"type":"vanity","room":"bath1","x":7.522,"y":1.6,"rot":90,"w":0.9},{"type":"wc","room":"bath1","x":9.848,"y":2.75,"rot":-90},{"type":"shower","room":"bath1","x":9.598,"y":1.502,"w":1.3,"d":1.1},{"type":"vanity","room":"bath2","x":5.322,"y":0.8,"rot":90,"w":0.8},{"type":"wc","room":"bath2","x":6.648,"y":1.65,"rot":-90},{"type":"shower","room":"bath2","x":6.448,"y":0.702,"w":1.2,"d":1.1},{"type":"balcony_set","room":"balcony","x":6.138,"y":9.1},{"type":"planter","room":"balcony","x":4.25,"y":9.578,"rot":180,"w":1.2},{"type":"washer","room":"balcony","x":3.762,"y":8.772,"rot":0}]}$j$::jsonb,
          'Compact 2 BHK with an open living and dining room, a balcony off the living room and an attached bath for the master bedroom.')
  returning id into v_t2;
  insert into public.unit_types (org_id, project_id, code, name, bedrooms, bathrooms, balconies, carpet_sqft, builtup_sqft, super_sqft, base_rate, layout, description)
  values (p_org, v_proj, '3BHK-B', '3 BHK · Type B', 3, 2, 1, 1326, 1500, 1860, 6250, $j${"w":14,"d":10.3,"height":3,"rooms":[{"id":"kitchen","kind":"kitchen","name":"Kitchen","x":0,"y":0,"w":3.4,"d":3.6},{"id":"bath2","kind":"bath","name":"Common bathroom","x":3.4,"y":0,"w":2,"d":2.2},{"id":"passage","kind":"passage","name":"Passage","x":3.4,"y":2.2,"w":2,"d":1.4},{"id":"foyer","kind":"foyer","name":"Foyer","x":5.4,"y":0,"w":2,"d":3.6},{"id":"bed3","kind":"bedroom","name":"Bedroom 3","x":7.4,"y":0,"w":3.4,"d":3.6},{"id":"bath1","kind":"bath","name":"Master bathroom","x":10.8,"y":0,"w":3.2,"d":2.4},{"id":"dress","kind":"dress","name":"Dressing","x":10.8,"y":2.4,"w":3.2,"d":1.2},{"id":"bed2","kind":"bedroom","name":"Bedroom 2","x":0,"y":3.6,"w":3.6,"d":5.2},{"id":"living","kind":"living","name":"Living and dining","x":3.6,"y":3.6,"w":6.8,"d":5.2},{"id":"master","kind":"bedroom","name":"Master bedroom","x":10.4,"y":3.6,"w":3.6,"d":5.2},{"id":"balcony","kind":"balcony","name":"Balcony","x":4.4,"y":8.8,"w":5.2,"d":1.5}],"openings":[{"type":"entry","room":"foyer","side":"n","at":6.4,"width":1},{"type":"open","rooms":["foyer","living"]},{"type":"open","rooms":["passage","foyer"]},{"type":"open","rooms":["passage","living"]},{"type":"door","rooms":["kitchen","passage"],"at":2.9,"width":0.9},{"type":"door","rooms":["bath2","passage"],"at":4.4,"width":0.75},{"type":"door","rooms":["bed3","foyer"],"at":2.6,"width":0.9},{"type":"door","rooms":["bed2","living"],"at":4.4,"width":0.9},{"type":"door","rooms":["master","living"],"at":4.4,"width":0.9},{"type":"open","rooms":["dress","master"]},{"type":"door","rooms":["bath1","dress"],"at":11.6,"width":0.75},{"type":"slider","rooms":["living","balcony"],"at":7,"width":3.6},{"type":"window","room":"kitchen","side":"w","at":1.8,"width":1.4,"sill":1.05,"head":2.1},{"type":"window","room":"bed3","side":"n","at":9.1,"width":1.6,"sill":0.9,"head":2.1},{"type":"window","room":"bath1","side":"e","at":1.2,"width":0.6,"sill":1.6,"head":2.1},{"type":"window","room":"bed2","side":"w","at":6.4,"width":1.6,"sill":0.9,"head":2.1},{"type":"window","room":"bed2","side":"s","at":1.8,"width":1.4,"sill":0.9,"head":2.1},{"type":"window","room":"master","side":"s","at":12.2,"width":1.8,"sill":0.9,"head":2.1},{"type":"window","room":"master","side":"e","at":6.2,"width":1.4,"sill":0.9,"head":2.1}],"furniture":[{"type":"counter","room":"kitchen","x":0.462,"y":2.122,"rot":90,"w":2.7,"sink":true},{"type":"counter","room":"kitchen","x":1.384,"y":0.462,"rot":0,"w":2.46,"hob":true,"upper":true},{"type":"fridge","room":"kitchen","x":2.978,"y":0.492,"rot":0},{"type":"vanity","room":"bath2","x":3.722,"y":0.9,"rot":90,"w":0.8},{"type":"wc","room":"bath2","x":4.928,"y":1.65,"rot":-90},{"type":"shower","room":"bath2","x":4.728,"y":0.702,"w":1.2,"d":1.1},{"type":"shoe_cabinet","room":"foyer","x":5.647,"y":1.1,"rot":90,"w":1.2},{"type":"plant","room":"foyer","x":7.138,"y":0.35},{"type":"bed","room":"bed3","x":9.668,"y":1.9,"rot":-90,"size":"double"},{"type":"desk","room":"bed3","x":8.03,"y":0.452,"rot":0,"w":1.1},{"type":"wardrobe","room":"bed3","x":8.8,"y":3.228,"rot":180,"w":1.8},{"type":"side_table","room":"bed3","x":10.503,"y":0.8},{"type":"vanity","room":"bath1","x":11.122,"y":1.1,"rot":90,"w":1},{"type":"wc","room":"bath1","x":13.448,"y":1.95,"rot":-90},{"type":"shower","room":"bath1","x":13.198,"y":0.752,"w":1.3,"d":1.2},{"type":"wardrobe","room":"dress","x":12.948,"y":2.772,"rot":0,"w":1.8},{"type":"bed","room":"bed2","x":1.3,"y":4.732,"rot":0,"size":"double"},{"type":"side_table","room":"bed2","x":2.43,"y":3.872},{"type":"wardrobe","room":"bed2","x":3.228,"y":6.4,"rot":-90,"w":2.2},{"type":"desk","room":"bed2","x":1.8,"y":8.348,"rot":180,"w":1.2},{"type":"dining","room":"living","x":5,"y":5,"rot":0,"w":1.8,"d":0.95,"seats":6},{"type":"sofa","room":"living","x":7.55,"y":6.6,"rot":90,"w":2.4},{"type":"tv_unit","room":"living","x":10.118,"y":6.6,"rot":-90,"w":1.8},{"type":"coffee_table","room":"living","x":8.75,"y":6.6,"rot":90},{"type":"rug","room":"living","x":8.8,"y":6.6,"rot":90,"w":2.8,"d":2.2},{"type":"armchair","room":"living","x":8.8,"y":5,"rot":0},{"type":"floor_lamp","room":"living","x":7.1,"y":8.4},{"type":"plant","room":"living","x":3.95,"y":8.45},{"type":"plant","room":"living","x":10.05,"y":8.45},{"type":"bookshelf","room":"living","x":3.832,"y":7.2,"rot":90,"w":0.9},{"type":"art","room":"living","x":8.8,"y":3.662,"rot":0,"w":1.4},{"type":"bed","room":"master","x":11.532,"y":6.2,"rot":90,"size":"queen"},{"type":"side_table","room":"master","x":10.697,"y":4.98},{"type":"side_table","room":"master","x":10.697,"y":7.42},{"type":"armchair","room":"master","x":13.4,"y":8.2,"rot":180},{"type":"plant","room":"master","x":13.658,"y":4},{"type":"rug","room":"master","x":11.8,"y":6.2,"rot":90,"w":2.6,"d":2},{"type":"balcony_set","room":"balcony","x":8.538,"y":9.6},{"type":"planter","room":"balcony","x":5.6,"y":10.05,"rot":180,"w":2},{"type":"washer","room":"balcony","x":4.762,"y":9.172,"rot":0}]}$j$::jsonb,
          'Corner 3 BHK with a 22 ft living and dining room, a walk-in dressing area for the master bedroom and a wide balcony.')
  returning id into v_t3;

  insert into public.towers (org_id, project_id, code, name, floors, units_per_floor, position, slabs_cast, stages, expected_completion, sort_order)
  values (p_org, v_proj, 'A', 'Tower A', 16, 4, '{"x": -26, "z": 0, "rot": 90}', 11,
          '{"foundation": 100, "structure": 68.8, "masonry": 44, "mep": 25, "finishing": 8, "facade": 0}', '2027-12-31', 1)
  returning id into v_a;
  insert into public.towers (org_id, project_id, code, name, floors, units_per_floor, position, slabs_cast, stages, expected_completion, sort_order)
  values (p_org, v_proj, 'B', 'Tower B', 12, 4, '{"x": 24, "z": 6, "rot": 0}', 12,
          '{"foundation": 100, "structure": 100, "masonry": 83, "mep": 58, "finishing": 34, "facade": 25}', '2027-08-31', 2)
  returning id into v_b;

  -- flats: Tower A has 3 BHK corner units (stacks 1 and 4) and 2 BHK in between; Tower B is all 2 BHK
  for t in select * from public.towers where project_id = v_proj order by sort_order loop
    for f in 1..t.floors loop
      for s in 1..t.units_per_floor loop
        v_type := case when t.code = 'A' and s in (1, 4) then v_t3 else v_t2 end;
        select super_sqft, base_rate into v_super, v_base from public.unit_types where id = v_type;
        v_view := case when t.code = 'A' then (case when s <= 2 then 'park' else 'pool' end) else (case when s <= 2 then 'garden' else 'road' end) end;
        v_facing := case when t.code = 'A' then (case when s <= 2 then 'east' else 'west' end) else (case when s <= 2 then 'south' else 'north' end) end;
        v_corner := s in (1, t.units_per_floor);
        v_price := round(v_super * (v_base + 35 * (f - 1) + (v_pricing->'plc'->>v_view)::numeric + case when v_corner then 75 else 0 end) / 1000) * 1000;
        v_num := t.code || '-' || lpad(f::text, 2, '0') || lpad(s::text, 2, '0');
        v_h := abs(hashtext(v_num)) % 100;
        v_thr := greatest(8, 64 - f * 3 + case when v_view in ('park', 'pool') then 10 else 0 end);
        v_status := case when v_h < v_thr * 0.35 then 'sold' when v_h < v_thr then 'booked' else 'available' end;
        if v_num in ('B-0102', 'A-1604') then v_status := 'blocked'; end if;
        insert into public.plots (org_id, project_id, plot_number, area_sqft, facing, is_corner, price, status, kind, tower_id, floor, stack, unit_type_id, view, mirror)
        values (p_org, v_proj, v_num, v_super, v_facing::public.facing, v_corner, v_price, v_status::public.plot_status, 'flat', t.id, f, s, v_type, v_view, s >= 3)
        returning id into v_plot;
        insert into public.plot_price_history (plot_id, org_id, price, changed_at) values
          (v_plot, p_org, round(v_price * 0.86 / 1000) * 1000, now() - interval '16 months'),
          (v_plot, p_org, round(v_price * 0.93 / 1000) * 1000, now() - interval '7 months');
      end loop;
    end loop;
  end loop;

  -- tower construction updates (oldest first)
  insert into public.construction_updates (org_id, project_id, title, body, tower_id, tower_snapshot, progress_percent, created_at) values
    (p_org, v_proj, 'Tower B: roof slab cast', 'All 12 slabs of Tower B are cast. Blockwork has reached the 10th floor.', v_b,
     '{"code": "B", "slabs_cast": 12, "floors": 12, "stages": {"foundation": 100, "structure": 100, "masonry": 70, "mep": 40, "finishing": 15, "facade": 0}}', 38, now() - interval '45 days'),
    (p_org, v_proj, 'Tower A: 10th floor slab cast', 'Shuttering has moved to the 11th floor. Plumbing sleeves are in up to the 8th floor.', v_a,
     '{"code": "A", "slabs_cast": 10, "floors": 16, "stages": {"foundation": 100, "structure": 62.5, "masonry": 38, "mep": 20, "finishing": 5, "facade": 0}}', 42, now() - interval '19 days'),
    (p_org, v_proj, 'Tower A: 11th slab done, Tower B flooring started', 'Vitrified flooring has started on the lower floors of Tower B; sample flat finishing is under way.', v_a,
     '{"code": "A", "slabs_cast": 11, "floors": 16, "stages": {"foundation": 100, "structure": 68.8, "masonry": 44, "mep": 25, "finishing": 8, "facade": 0}}', 47.5, now() - interval '3 days');
  update public.projects set progress_percent = (
    select round(sum(public.tower_percent(stages) * floors * units_per_floor) / sum(floors * units_per_floor), 2) from public.towers where project_id = v_proj)
   where id = v_proj;

  -- market assumptions and the apartment FAQ
  insert into public.market_factors (org_id, project_id, kind, label, status, impact_pct, value, expected_year, source, sort_order) values
    (p_org, v_proj, 'trend', 'Bengaluru North apartments, long-run trend', 'existing', 6.0, null, null, 'Demo assumption: replace with your own market research', 0),
    (p_org, v_proj, 'infrastructure', 'Airport metro line', 'under_construction', 2.0, null, 2027, 'Demo assumption: check the latest BMRCL timeline', 1),
    (p_org, v_proj, 'infrastructure', 'Satellite town ring road', 'under_construction', 1.0, null, 2027, 'Demo assumption', 2),
    (p_org, v_proj, 'infrastructure', 'Proposed business park nearby', 'planned', 1.5, null, 2029, 'Demo assumption: plans can change', 3),
    (p_org, v_proj, 'rent', 'Typical rent for similar flats nearby', 'existing', 0, 17, null, 'Demo assumption: ₹ per sq ft of super area per month; check local listings', 4);
  insert into public.doc_chunks (org_id, project_id, visibility, title, heading, content)
  select p_org, v_proj, 'public', 'Green Valley Heights FAQ (sample)', x.h, x.c from (values
    ('Payment plan', 'Green Valley Heights follows a construction-linked plan: 10% at booking, 10% at the agreement for sale, 15% on completion of the foundation, 10% each on casting the 4th, 8th, 12th and roof slabs, 10% when masonry is complete, 10% on flooring and finishing, and 5% at possession. You only pay a stage once that stage of your tower is complete.'),
    ('Possession', 'Tower B is expected to be ready by August 2027 and Tower A by December 2027. The committed possession date in the agreement for sale is 31 March 2028. Delays beyond that date attract interest as required under RERA Section 18.'),
    ('Car parking', 'Each 2 BHK comes with one covered car park and each 3 BHK with two, in the basement. EV charging points are provided for every covered car park.'),
    ('Maintenance', 'Maintenance is charged at Rs 3.5 per sq ft of super built-up area per month from possession. The first year of maintenance is collected at possession.'),
    ('Specifications', 'Flooring: 800 x 800 mm vitrified tiles in living, dining and bedrooms, laminated wooden flooring in the master bedroom, anti-skid tiles in bathrooms and balconies. Windows: UPVC sliding windows with mosquito mesh. Doors: engineered wood main door with digital lock. Kitchen: granite counter with stainless steel sink; modular kitchen is optional. Bathrooms: wall-hung WC, glass shower partition in the master bathroom.'),
    ('Floor rise and preferred location charges', 'Prices rise by Rs 35 per sq ft for every floor above the first. Park-facing flats carry Rs 150 per sq ft, pool-facing Rs 200 and garden-facing Rs 100 per sq ft as preferred location charges. Corner flats carry Rs 75 per sq ft.'),
    ('Super built-up area', 'Prices are quoted on super built-up area, which includes the carpet area, walls, balconies and a share of common areas such as lobbies, staircases and the clubhouse. The carpet area of every flat is shown on its floor plan, as required by RERA.'),
    ('Cancellation', 'If a buyer cancels before the agreement for sale, the booking amount is refunded minus a processing fee of Rs 50,000. After the agreement, 10% of the flat price is retained and the balance paid is refunded within 45 days.'),
    ('Home loans', 'The project is approved by leading banks. Banks disburse construction-linked loans stage by stage, in step with the payment plan, so interest is paid only on the amount disbursed until possession.')
  ) x(h, c);

  -- work packages for the towers, with baselines for the AI plan-vs-actual
  select id into v_abc from public.contractors where org_id = p_org and company_name = 'ABC Constructions';
  select id into v_xyz from public.contractors where org_id = p_org and company_name = 'XYZ Electricals';
  select id into v_sri from public.contractors where org_id = p_org and company_name = 'Sri Lakshmi Roadways';
  if v_abc is not null then
    insert into public.work_packages (org_id, project_id, contractor_id, title, scope, contract_value, start_date, due_date, progress, status, planned_qty, qty_unit)
    values (p_org, v_proj, v_abc, 'Tower A: RCC structure', 'Foundation, columns and 16 slabs', 52000000, v_today - 400, v_today + 210, 68.8, 'in_progress', 16, 'slabs')
    returning id into v_wp;
    insert into public.wp_plan_points (org_id, work_package_id, planned_date, planned_pct) values
      (p_org, v_wp, v_today - 400, 0), (p_org, v_wp, v_today - 200, 38), (p_org, v_wp, v_today, 74), (p_org, v_wp, v_today + 100, 90), (p_org, v_wp, v_today + 210, 100);
  end if;
  if v_xyz is not null then
    insert into public.work_packages (org_id, project_id, contractor_id, title, scope, contract_value, start_date, due_date, progress, status)
    values (p_org, v_proj, v_xyz, 'Tower B: electrical and plumbing (MEP)', 'Conduits, wiring, plumbing risers and fixtures for 48 flats', 18500000, v_today - 160, v_today + 180, 58, 'in_progress')
    returning id into v_wp;
    insert into public.wp_plan_points (org_id, work_package_id, planned_date, planned_pct) values
      (p_org, v_wp, v_today - 160, 0), (p_org, v_wp, v_today - 60, 30), (p_org, v_wp, v_today, 56), (p_org, v_wp, v_today + 180, 100);
  end if;

  -- leads interested in flats
  insert into public.leads (org_id, project_id, full_name, phone, email, source, stage, budget_min, budget_max, message, interested_plot_id, next_follow_up_at, created_at)
  select p_org, v_proj, x.n, x.ph, x.e, x.src, x.st::public.lead_stage, x.bmin, x.bmax, x.msg,
         (select id from public.plots where project_id = v_proj and plot_number = x.unit), now() + (x.fu || ' hours')::interval, now() - (x.ago || ' days')::interval
  from (values
    ('Aditya Kulkarni', '919845500101', 'aditya.k@example.com', 'website', 'new', 7500000, 9000000, 'Looking for a 2 BHK on a high floor with a pool view.', 'A-1403', 3, 1),
    ('Shreya Iyer', '919845500102', 'shreya.i@example.com', 'portal', 'contacted', 11000000, 13500000, '3 BHK, east facing, park view. Want to see the sample flat.', 'A-0901', 26, 4),
    ('Imran Sheikh', '919845500103', 'imran.s@example.com', 'referral', 'site_visit', 8000000, 9500000, 'Investment flat, interested in rental yield. Tower B preferred for early possession.', 'B-0703', 20, 9)
  ) x(n, ph, e, src, st, bmin, bmax, msg, unit, fu, ago)
  on conflict do nothing;

  -- the demo buyer has booked a 2 BHK in Tower A, paying as slabs are cast
  select id into v_buyer from public.profiles where email in ('buyer@remmo.dev', 'buyer@plotline.dev') order by email = 'buyer@remmo.dev' desc limit 1;
  select id, price into v_plot, v_price from public.plots where project_id = v_proj and plot_number = 'A-1203';
  if v_buyer is not null and v_plot is not null then
    update public.plots set status = 'booked' where id = v_plot;
    insert into public.bookings (org_id, plot_id, buyer_id, status, total_amount, token_amount, created_at, confirmed_at)
    values (p_org, v_plot, v_buyer, 'confirmed', v_price, round(v_price * 0.1), now() - interval '150 days', now() - interval '150 days')
    returning id into v_booking;
    v_i := 0; v_used := 0;
    for v_step in select value from jsonb_array_elements(v_plan) loop
      v_amount := case when v_i = 0 then round(v_price * 0.1) when v_i = jsonb_array_length(v_plan) - 1 then v_price - v_used
                       else round(v_price * (v_step->>'pct')::numeric / 100) end;
      v_used := v_used + v_amount;
      insert into public.payment_schedule (booking_id, org_id, label, amount, sort_order, due_note, status, due_date)
      values (v_booking, p_org, v_step->>'label', v_amount, v_i, v_step->>'note', (case when v_i <= 4 then 'paid' else 'due' end)::public.installment_status,
              case when v_i = 0 then v_today - 150 when v_i = 1 then v_today - 120 end)
      returning id into v_inst;
      if v_i <= 4 then
        insert into public.payments (booking_id, installment_id, org_id, buyer_id, amount, status, razorpay_order_id, razorpay_payment_id, paid_at, created_at)
        values (v_booking, v_inst, p_org, v_buyer, v_amount, 'paid', 'order_flat' || v_i || substr(md5(v_booking::text), 1, 8), 'pay_flat' || v_i || substr(md5(v_booking::text), 1, 8),
                now() - ((150 - v_i * 30) || ' days')::interval, now() - ((150 - v_i * 30) || ' days')::interval);
      end if;
      v_i := v_i + 1;
    end loop;
    insert into public.doc_chunks (org_id, project_id, booking_id, visibility, title, heading, content) values
      (p_org, v_proj, v_booking, 'buyer', 'Agreement for sale · A-1203', 'Flat and price',
       'Flat A-1203 on the 12th floor of Tower A (2 BHK, super built-up area 1,285 sq ft, carpet area 913 sq ft) with one covered car park, for a total price of Rs ' || to_char(v_price, 'FM99,99,99,999') || '.'),
      (p_org, v_proj, v_booking, 'buyer', 'Agreement for sale · A-1203', 'Possession', 'The developer will hand over flat A-1203 on or before 31 March 2028. For any delay, interest is paid on the amount received as per RERA Section 18.'),
      (p_org, v_proj, v_booking, 'buyer', 'Agreement for sale · A-1203', 'Cancellation by the buyer', 'If the buyer cancels flat A-1203 after signing this agreement, 10% of the total price is retained and the balance paid is refunded within 45 days without interest.');
  end if;

  -- partner profiles
  update public.contractors set pan = substr(gst_number, 3, 10), license_number = 'BBMP/CL-I/2019/0' || (100 + abs(hashtext(company_name)) % 800),
         insurance_policy = 'CAR-' || (2026000 + abs(hashtext(company_name)) % 9000), insurance_valid_till = v_today + 220, team_size = 6 + abs(hashtext(company_name)) % 30,
         upi_id = lower(regexp_replace(company_name, '[^A-Za-z]', '', 'g')) || '@okhdfcbank', bank_ifsc = 'HDFC0001234', bank_last4 = lpad((abs(hashtext(company_name)) % 10000)::text, 4, '0'),
         address = coalesce(address, 'Devanahalli, Bengaluru North'),
         profile_status = case company_name when 'ABC Constructions' then 'verified' when 'Sri Lakshmi Roadways' then 'submitted' else 'draft' end, profile_updated_at = now() - interval '10 days'
   where org_id = p_org and gst_number is not null;
  update public.vendors set pan = substr(gst_number, 3, 10), delivery_regions = 'Bengaluru North, Devanahalli, Doddaballapur',
         upi_id = lower(regexp_replace(company_name, '[^A-Za-z]', '', 'g')) || '@okicici', bank_ifsc = 'ICIC0004321', bank_last4 = lpad((abs(hashtext(company_name)) % 10000)::text, 4, '0'),
         profile_status = case when company_name = 'XYZ Materials' then 'verified' else 'draft' end, profile_updated_at = now() - interval '20 days'
   where org_id = p_org and gst_number is not null;

  -- employee profiles: some verified, some waiting for review, some still incomplete
  for v_emp in select e.* from public.employees e where e.org_id = p_org order by e.employee_code loop
    v_k := v_k + 1;
    if v_k % 6 = 0 then continue; end if;   -- a few people have not started their profile
    insert into public.employee_profiles (employee_id, org_id, date_of_birth, address, city, home_state, emergency_name, emergency_phone, emergency_relation,
      id_type, id_last4, trade, skills, experience_years, languages, blood_group, safety_trained, safety_training_date, upi_id, bank_ifsc, bank_last4,
      status, submitted_at, verified_at, updated_at)
    values (v_emp.id, p_org, make_date(1978 + v_k * 3 % 22, 1 + v_k % 12, 1 + v_k * 7 % 27),
      case when v_k % 5 = 4 then null else 'Labour quarters, ' || v_cities[1 + v_k % 7] end, v_cities[1 + v_k % 7], v_states[1 + v_k % 7],
      case when v_k % 5 = 4 then null else 'Family contact ' || v_k end,
      case when v_k % 5 = 4 then null else '9' || lpad((880000000 + v_k * 1234567 % 99999999)::text, 9, '0') end,
      case when v_k % 5 = 4 then null else (array['Spouse', 'Brother', 'Father', 'Mother'])[1 + v_k % 4] end,
      'aadhaar', lpad((v_k * 4729 % 10000)::text, 4, '0'), v_emp.role_title,
      case when v_emp.role_title ilike '%electric%' or v_emp.role_title ilike '%line%' then array['Wiring', 'Conduit laying', 'DB fixing']
           when v_emp.role_title ilike '%mason%' then array['Blockwork', 'Plastering', 'Tiling']
           when v_emp.role_title ilike '%bar%' then array['Bar bending', 'Shuttering']
           when v_emp.role_title ilike '%engineer%' or v_emp.role_title ilike '%in-charge%' then array['Site supervision', 'AutoCAD', 'Quantity checks']
           when v_emp.role_title ilike '%garden%' then array['Planting', 'Irrigation']
           when v_emp.role_title ilike '%roller%' or v_emp.role_title ilike '%paver%' then array['Road roller', 'Paver block laying']
           else array['General site work'] end,
      2 + v_k * 3 % 15, array[v_langs[1 + v_k % 7], case when v_langs[1 + v_k % 7] = 'Hindi' then 'Kannada' else 'Hindi' end], v_blood[1 + v_k % 7],
      v_k % 4 <> 3, case when v_k % 4 <> 3 then v_today - (30 + v_k * 11 % 300) end,
      lower(regexp_replace(split_part(v_emp.full_name, ' ', 1), '[^A-Za-z]', '', 'g')) || v_k || '@okaxis', 'SBIN000' || lpad((1000 + v_k * 37 % 9000)::text, 4, '0'), lpad((v_k * 6151 % 10000)::text, 4, '0'),
      case when v_k % 5 = 4 then 'draft' when v_k % 3 = 0 then 'submitted' else 'verified' end,
      case when v_k % 5 = 4 then null else now() - ((5 + v_k) || ' days')::interval end,
      case when v_k % 5 <> 4 and v_k % 3 <> 0 then now() - ((2 + v_k) || ' days')::interval end, now() - ((2 + v_k) || ' days')::interval)
    on conflict (employee_id) do nothing;
  end loop;

  -- letters already exchanged
  select id into v_xyzm from public.vendors where org_id = p_org and company_name = 'XYZ Materials';
  select id into v_cement from public.materials where org_id = p_org and name = 'Cement OPC 53';
  if v_abc is not null then
    insert into public.letters (org_id, project_id, kind, recipient_type, recipient_id, subject, body, data, status, issued_at, acknowledged_at, created_at, ack_note)
    values (p_org, v_proj, 'work_order', 'contractor', v_abc, 'Work order: Tower A RCC structure, Green Valley Heights',
      'Dear Sir/Madam,' || chr(10) || chr(10) ||
      'We are pleased to award you the RCC structure works for Tower A of Green Valley Heights (foundation, columns and 16 slabs) for a contract value of Rs 5,20,00,000 (Rupees Five Crore Twenty Lakh only), exclusive of GST.' || chr(10) || chr(10) ||
      '## Schedule' || chr(10) || '• Start: ' || to_char(v_today - 400, 'DD Mon YYYY') || chr(10) || '• Completion: ' || to_char(v_today + 210, 'DD Mon YYYY') || chr(10) || '• One slab every 4 weeks after the foundation, as per the baseline plan shared on your portal.' || chr(10) || chr(10) ||
      '## Terms' || chr(10) || '• Running bills are certified monthly against measured work; 5% retention is released after the defects liability period of 12 months.' || chr(10) ||
      '• Cement and steel are issued from our store against material requests; usage beyond the agreed budget is recovered at cost.' || chr(10) ||
      '• All workers must be registered on the site portal with verified profiles and must wear PPE at all times.' || chr(10) || chr(10) ||
      'Please acknowledge this work order on your portal.',
      '{"work_package": "Tower A: RCC structure", "value": 52000000}', 'acknowledged', now() - interval '398 days', now() - interval '396 days', now() - interval '400 days', 'Accepted. Mobilising from Monday.');
  end if;
  if v_sri is not null then
    insert into public.letters (org_id, project_id, kind, recipient_type, recipient_id, subject, body, status, issued_at, created_at)
    values (p_org, v_plotted.id, 'crew_compliance', 'contractor', v_sri, 'Crew registration and safety compliance',
      'Dear Sir/Madam,' || chr(10) || chr(10) ||
      'Our records show that some members of your crew at Green Valley Residency have incomplete profiles on the site portal.' || chr(10) || chr(10) ||
      '## What is needed' || chr(10) || '• Emergency contact and ID details for every worker' || chr(10) || '• Safety induction for anyone not yet trained' || chr(10) ||
      '• Check-ins only from inside the site boundary' || chr(10) || chr(10) ||
      'Please complete these within 7 days. Workers without a verified profile will not be issued site ID cards after that date.',
      'issued', now() - interval '2 days', now() - interval '2 days');
  end if;
  if v_xyzm is not null and v_cement is not null then
    insert into public.letters (org_id, project_id, kind, recipient_type, recipient_id, subject, body, data, status, issued_at, created_at)
    values (p_org, v_plotted.id, 'purchase_order', 'vendor', v_xyzm, 'Purchase order: 650 bags of Cement OPC 53',
      'Dear Sir/Madam,' || chr(10) || chr(10) || 'Please supply the following to Green Valley Residency, Devanahalli:' || chr(10) || chr(10) ||
      '• Cement OPC 53 grade: 650 bags at Rs 390 per bag (Rs 2,53,500 + GST)' || chr(10) || '• Delivery: within 7 days, between 8 am and 5 pm, at the main store' || chr(10) || chr(10) ||
      '## Terms' || chr(10) || '• Tax invoice and vehicle number at the gate; quantity is counted and accepted at inspection.' || chr(10) ||
      '• Payment within 30 days of accepted delivery.' || chr(10) || chr(10) || 'Please acknowledge this order on your portal.',
      jsonb_build_object('material_id', v_cement, 'qty', 650, 'rate', 390, 'unit', 'bags'), 'issued', now() - interval '1 day', now() - interval '1 day');
  end if;
  insert into public.letters (org_id, project_id, kind, recipient_type, recipient_id, subject, body, status, issued_at, created_at)
  select p_org, v_plotted.id, 'appointment', 'employee', e.id, 'Site appointment: ' || e.role_title || ', Green Valley Residency',
    'Dear ' || e.full_name || ',' || chr(10) || chr(10) || 'You are appointed as ' || e.role_title || ' at Green Valley Residency, Devanahalli, through ' ||
    coalesce((select company_name from public.contractors where id = e.contractor_id), 'Demo Developers Pvt Ltd') || ', at a daily wage of Rs ' || to_char(e.daily_wage, 'FM99,999') || '.' || chr(10) || chr(10) ||
    '## Site rules' || chr(10) || '• Check in and out on the site portal every day, from inside the site.' || chr(10) || '• Wear your helmet, shoes and reflective vest at all times.' || chr(10) ||
    '• Report any injury or unsafe condition to the site in-charge immediately.' || chr(10) || chr(10) || 'Welcome to the team.',
    'issued', now() - interval '30 days', now() - interval '30 days'
  from public.employees e where e.org_id = p_org and e.user_id is not null;

  return 'ok';
end $$;
revoke execute on function public.seed_flats_demo(uuid) from public, anon, authenticated;
grant execute on function public.seed_flats_demo(uuid) to service_role;
