-- =====================================================================
-- 0007  OPERATIONS — contractors, work packages, materials ledger,
-- vendors & deliveries, material requests, employees & attendance,
-- buyer modification requests.
-- Stock is never typed in: it is the sum of stock_movements rows.
-- =====================================================================

create type public.trade as enum ('civil', 'roads', 'electrical', 'plumbing', 'landscaping', 'other');
create type public.stock_move as enum ('opening', 'received', 'rejected', 'issued', 'consumed', 'wastage', 'returned');
create type public.delivery_status as enum ('pending_inspection', 'accepted', 'partially_accepted', 'rejected');
create type public.request_status as enum ('requested', 'approved', 'issued', 'rejected');

-- ---------- Contractors & their work --------------------------------
create table public.contractors (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  company_name   text not null,
  contact_person text,
  phone          text,
  email          text,
  address        text,
  gst_number     text,
  trade          public.trade not null default 'civil',
  contract_type  text not null default 'item_rate'
                 check (contract_type in ('item_rate', 'lump_sum', 'labour_only', 'turnkey')),
  status         text not null default 'active' check (status in ('active', 'on_hold', 'completed')),
  rating         numeric(2,1) check (rating between 0 and 5),
  user_id        uuid unique references public.profiles (id) on delete set null,  -- portal login
  created_at     timestamptz not null default now()
);

create table public.work_packages (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null,
  project_id     uuid not null,
  contractor_id  uuid not null references public.contractors (id) on delete cascade,
  milestone_id   uuid references public.milestones (id) on delete set null,
  title          text not null,
  scope          text,
  contract_value numeric(14,2) not null default 0 check (contract_value >= 0),
  start_date     date,
  due_date       date,
  progress       numeric(5,2) not null default 0 check (progress between 0 and 100),
  status         text not null default 'in_progress'
                 check (status in ('not_started', 'in_progress', 'completed', 'delayed')),
  updated_at     timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade
);
create index work_packages_contractor_idx on public.work_packages (contractor_id);

-- ---------- Materials, vendors, deliveries ---------------------------
create table public.materials (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  name          text not null,
  category      text not null check (category in
                  ('cement', 'steel', 'aggregate', 'masonry', 'pipes', 'electrical', 'finishing', 'other')),
  unit          text not null,                  -- bags, tons, cu m, nos, m
  reorder_level numeric(12,2) not null default 0 check (reorder_level >= 0),
  unit_cost     numeric(12,2) check (unit_cost >= 0),
  unique (org_id, name)
);

create table public.vendors (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  company_name   text not null,
  contact_person text,
  phone          text,
  email          text,
  address        text,
  gst_number     text,
  categories     text[] not null default '{}',
  rating         numeric(2,1) check (rating between 0 and 5),
  user_id        uuid unique references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

create table public.deliveries (
  id              uuid primary key default gen_random_uuid(),
  seq             bigint generated always as identity,
  org_id          uuid not null,
  project_id      uuid not null,
  vendor_id       uuid not null references public.vendors (id) on delete cascade,
  material_id     uuid not null references public.materials (id),
  quantity        numeric(12,2) not null check (quantity > 0),
  unit_cost       numeric(12,2) check (unit_cost >= 0),
  vehicle_number  text,
  invoice_number  text,
  location        text,
  delivered_at    timestamptz not null default now(),
  status          public.delivery_status not null default 'pending_inspection',
  accepted_qty    numeric(12,2),
  inspection_note text,
  inspected_by    uuid references public.profiles (id),
  inspected_at    timestamptz,
  photo_paths     text[] not null default '{}',
  invoice_path    text,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  check (accepted_qty is null or (accepted_qty >= 0 and accepted_qty <= quantity))
);
create index deliveries_vendor_idx on public.deliveries (vendor_id, delivered_at desc);

create table public.material_requests (
  id               uuid primary key default gen_random_uuid(),
  seq              bigint generated always as identity,
  org_id           uuid not null,
  project_id       uuid not null,
  contractor_id    uuid not null references public.contractors (id) on delete cascade,
  work_package_id  uuid references public.work_packages (id) on delete set null,
  material_id      uuid not null references public.materials (id),
  quantity         numeric(12,2) not null check (quantity > 0),
  purpose          text,
  location         text,
  needed_by        date,
  status           public.request_status not null default 'requested',
  decided_by       uuid references public.profiles (id),
  decided_at       timestamptz,
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade
);

create table public.stock_movements (
  id             bigint generated always as identity primary key,
  org_id         uuid not null,
  project_id     uuid not null,
  material_id    uuid not null references public.materials (id),
  type           public.stock_move not null,
  quantity       numeric(12,2) not null check (quantity > 0),
  contractor_id  uuid references public.contractors (id),
  vendor_id      uuid references public.vendors (id),
  delivery_id    uuid references public.deliveries (id),
  request_id     uuid references public.material_requests (id),
  location       text,
  note           text,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  -- movements to/from a contractor must name the contractor
  check ((type in ('issued', 'consumed', 'wastage', 'returned')) = (contractor_id is not null))
);
create index stock_movements_material_idx on public.stock_movements (project_id, material_id);
create index stock_movements_contractor_idx on public.stock_movements (contractor_id) where contractor_id is not null;

-- ---------- Employees & attendance -----------------------------------
create table public.employees (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  contractor_id  uuid references public.contractors (id) on delete set null,  -- null = developer's own staff
  project_id     uuid references public.projects (id) on delete set null,     -- assigned site
  employee_code  text not null,
  full_name      text not null,
  phone          text,
  role_title     text,                     -- Mason, Electrician, Site supervisor…
  daily_wage     numeric(10,2) check (daily_wage >= 0),
  active         boolean not null default true,
  user_id        uuid unique references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (org_id, employee_code)
);

create table public.attendance (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  employee_id      uuid not null references public.employees (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete set null,
  work_date        date not null,
  check_in_at      timestamptz not null default now(),
  check_out_at     timestamptz,
  lat              double precision,
  lng              double precision,
  distance_m       int,
  inside_geofence  boolean,
  selfie_path      text,
  work_note        text,
  unique (employee_id, work_date)
);
create index attendance_org_date_idx on public.attendance (org_id, work_date desc);

-- ---------- Buyer modification requests ------------------------------
create table public.modification_requests (
  id                 uuid primary key default gen_random_uuid(),
  seq                bigint generated always as identity (start with 1024),
  org_id             uuid not null references public.organizations (id) on delete cascade,
  booking_id         uuid not null references public.bookings (id) on delete cascade,
  buyer_id           uuid not null references public.profiles (id),
  requirement        text not null check (length(requirement) between 5 and 1000),
  quoted_cost        numeric(12,2) check (quoted_cost >= 0),
  deadline           date,
  contractor_id      uuid references public.contractors (id) on delete set null,
  status             text not null default 'requested'
                     check (status in ('requested', 'quoted', 'approved', 'rejected', 'in_progress', 'done')),
  buyer_approved_at  timestamptz,
  created_at         timestamptz not null default now()
);

-- ---------- Who is this user on site? --------------------------------
create or replace function public.my_contractor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.contractors where user_id = auth.uid() limit 1;
$$;
create or replace function public.my_vendor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.vendors where user_id = auth.uid() limit 1;
$$;
create or replace function public.my_employee_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.employees where user_id = auth.uid() and active limit 1;
$$;
-- Contractors, vendors and site employees of an organization
create or replace function public.is_org_partner(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.contractors where org_id = p_org and user_id = auth.uid())
      or exists (select 1 from public.vendors     where org_id = p_org and user_id = auth.uid())
      or exists (select 1 from public.employees   where org_id = p_org and user_id = auth.uid() and active);
$$;

-- Partners need to read the project they work on, even before it is published
create policy projects_partner_read on public.projects for select using (public.is_org_partner(org_id));
create policy milestones_partner_read on public.milestones for select using (public.is_org_partner(org_id));

-- ---------- Views: stock and contractor usage ------------------------
create view public.material_stock with (security_invoker = true) as
select
  m.id as material_id, m.org_id, p.id as project_id, m.name, m.category, m.unit,
  m.reorder_level, m.unit_cost,
  coalesce(sum(s.quantity) filter (where s.type = 'opening'), 0)  as opening,
  coalesce(sum(s.quantity) filter (where s.type = 'received'), 0) as received,
  coalesce(sum(s.quantity) filter (where s.type = 'rejected'), 0) as rejected,
  coalesce(sum(s.quantity) filter (where s.type = 'issued'), 0)   as issued,
  coalesce(sum(s.quantity) filter (where s.type = 'consumed'), 0) as consumed,
  coalesce(sum(s.quantity) filter (where s.type = 'wastage'), 0)  as wastage,
  coalesce(sum(s.quantity) filter (where s.type = 'returned'), 0) as returned,
  coalesce(sum(s.quantity) filter (where s.type in ('opening', 'received', 'returned')), 0)
    - coalesce(sum(s.quantity) filter (where s.type = 'issued'), 0)                     as in_store,
  coalesce(sum(s.quantity) filter (where s.type = 'issued'), 0)
    - coalesce(sum(s.quantity) filter (where s.type in ('consumed', 'wastage', 'returned')), 0) as at_site
from public.materials m
join public.projects p on p.org_id = m.org_id
left join public.stock_movements s on s.material_id = m.id and s.project_id = p.id
group by m.id, p.id;

create view public.contractor_material_usage with (security_invoker = true) as
select
  s.org_id, s.project_id, s.contractor_id, s.material_id, m.name, m.unit, m.category, m.unit_cost,
  coalesce(sum(s.quantity) filter (where s.type = 'issued'), 0)   as issued,
  coalesce(sum(s.quantity) filter (where s.type = 'consumed'), 0) as consumed,
  coalesce(sum(s.quantity) filter (where s.type = 'wastage'), 0)  as wastage,
  coalesce(sum(s.quantity) filter (where s.type = 'returned'), 0) as returned,
  coalesce(sum(s.quantity) filter (where s.type = 'issued'), 0)
    - coalesce(sum(s.quantity) filter (where s.type in ('consumed', 'wastage', 'returned')), 0) as at_site,
  round(100.0 * coalesce(sum(s.quantity) filter (where s.type = 'wastage'), 0)
        / nullif(coalesce(sum(s.quantity) filter (where s.type in ('consumed', 'wastage')), 0), 0), 1) as wastage_pct
from public.stock_movements s
join public.materials m on m.id = s.material_id
where s.contractor_id is not null
group by s.org_id, s.project_id, s.contractor_id, s.material_id, m.name, m.unit, m.category, m.unit_cost;

grant select on public.material_stock, public.contractor_material_usage to authenticated;

-- ---------- Row-level security ---------------------------------------
alter table public.contractors           enable row level security;
alter table public.work_packages         enable row level security;
alter table public.materials             enable row level security;
alter table public.vendors               enable row level security;
alter table public.deliveries            enable row level security;
alter table public.material_requests     enable row level security;
alter table public.stock_movements       enable row level security;
alter table public.employees             enable row level security;
alter table public.attendance            enable row level security;
alter table public.modification_requests enable row level security;

create policy contractors_read on public.contractors for select
  using (public.is_org_member(org_id) or public.is_admin() or user_id = auth.uid());
create policy contractors_write on public.contractors for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

create policy wp_read on public.work_packages for select
  using (public.is_org_member(org_id) or public.is_admin() or contractor_id = public.my_contractor_id());
create policy wp_write on public.work_packages for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

create policy materials_read on public.materials for select
  using (public.is_org_member(org_id) or public.is_admin() or public.is_org_partner(org_id));
create policy materials_write on public.materials for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

create policy vendors_read on public.vendors for select
  using (public.is_org_member(org_id) or public.is_admin() or user_id = auth.uid());
create policy vendors_write on public.vendors for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

create policy deliveries_read on public.deliveries for select
  using (public.is_org_member(org_id) or public.is_admin() or vendor_id = public.my_vendor_id());
create policy deliveries_vendor_insert on public.deliveries for insert
  with check ((vendor_id = public.my_vendor_id() and status = 'pending_inspection' and accepted_qty is null)
              or public.is_org_member(org_id) or public.is_admin());
-- inspection goes through accept_delivery(); staff may still fix typos
create policy deliveries_staff_update on public.deliveries for update
  using (public.is_org_member(org_id) or public.is_admin());
revoke update on public.deliveries from authenticated;
grant update (vehicle_number, invoice_number, location, unit_cost, photo_paths, invoice_path) on public.deliveries to authenticated;

create policy mr_read on public.material_requests for select
  using (public.is_org_member(org_id) or public.is_admin() or contractor_id = public.my_contractor_id());
create policy mr_contractor_insert on public.material_requests for insert
  with check ((contractor_id = public.my_contractor_id() and status = 'requested')
              or public.is_org_member(org_id) or public.is_admin());
revoke update, delete on public.material_requests from authenticated;  -- decisions go through functions

create policy stock_read on public.stock_movements for select
  using (public.is_org_member(org_id) or public.is_admin() or contractor_id = public.my_contractor_id());
revoke insert, update, delete on public.stock_movements from anon, authenticated;  -- functions only

create policy employees_read on public.employees for select
  using (public.is_org_member(org_id) or public.is_admin() or user_id = auth.uid()
         or (contractor_id is not null and contractor_id = public.my_contractor_id()));
create policy employees_write on public.employees for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

create policy attendance_read on public.attendance for select
  using (public.is_org_member(org_id) or public.is_admin() or employee_id = public.my_employee_id()
         or exists (select 1 from public.employees e
                    where e.id = employee_id and e.contractor_id is not null
                      and e.contractor_id = public.my_contractor_id()));
revoke insert, update, delete on public.attendance from anon, authenticated;  -- check_in()/check_out() only

create policy mods_read on public.modification_requests for select
  using (public.is_org_member(org_id) or public.is_admin() or buyer_id = auth.uid()
         or (contractor_id is not null and contractor_id = public.my_contractor_id()));
create policy mods_buyer_insert on public.modification_requests for insert
  with check (buyer_id = auth.uid() and status = 'requested' and quoted_cost is null
              and exists (select 1 from public.bookings b
                          where b.id = booking_id and b.buyer_id = auth.uid() and b.org_id = org_id
                            and b.status in ('confirmed', 'registered', 'handed_over')));
create policy mods_staff_update on public.modification_requests for update
  using (public.is_org_member(org_id) or public.is_admin());

-- ---------- Functions: the only way stock moves ----------------------
create or replace function public.accept_delivery(p_delivery uuid, p_accepted numeric, p_note text default null)
returns public.deliveries
language plpgsql security definer set search_path = public as $$
declare
  d public.deliveries;
  v_material text; v_unit text; v_vendor text; v_vendor_user uuid;
begin
  select * into d from public.deliveries where id = p_delivery for update;
  if d.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(d.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if d.status <> 'pending_inspection' then raise exception 'ALREADY_INSPECTED'; end if;
  if p_accepted < 0 or p_accepted > d.quantity then raise exception 'BAD_QUANTITY'; end if;

  update public.deliveries
     set accepted_qty = p_accepted, inspection_note = p_note, inspected_by = auth.uid(), inspected_at = now(),
         status = case when p_accepted = d.quantity then 'accepted'::public.delivery_status
                       when p_accepted = 0 then 'rejected'::public.delivery_status
                       else 'partially_accepted'::public.delivery_status end
   where id = d.id returning * into d;

  if p_accepted > 0 then
    insert into public.stock_movements (org_id, project_id, material_id, type, quantity, vendor_id, delivery_id, location, note)
    values (d.org_id, d.project_id, d.material_id, 'received', p_accepted, d.vendor_id, d.id, d.location, 'Delivery ' || coalesce(d.invoice_number, ''));
  end if;
  if p_accepted < d.quantity then
    insert into public.stock_movements (org_id, project_id, material_id, type, quantity, vendor_id, delivery_id, location, note)
    values (d.org_id, d.project_id, d.material_id, 'rejected', d.quantity - p_accepted, d.vendor_id, d.id, d.location, p_note);
  end if;

  select name, unit into v_material, v_unit from public.materials where id = d.material_id;
  select company_name, user_id into v_vendor, v_vendor_user from public.vendors where id = d.vendor_id;
  perform public.log_activity(d.org_id, d.project_id, 'delivery',
    'Accepted ' || trim(to_char(p_accepted, 'FM999999990.##')) || ' ' || v_unit || ' ' || v_material || ' from ' || v_vendor
    || case when p_accepted < d.quantity then ' (' || trim(to_char(d.quantity - p_accepted, 'FM999999990.##')) || ' rejected)' else '' end);
  if v_vendor_user is not null then
    perform public.notify_user(v_vendor_user, 'Delivery inspected',
      v_material || ': ' || trim(to_char(p_accepted, 'FM999999990.##')) || ' of ' || trim(to_char(d.quantity, 'FM999999990.##')) || ' ' || v_unit || ' accepted.', '/portal');
  end if;
  return d;
end $$;

create or replace function public.decide_material_request(p_request uuid, p_approve boolean)
returns public.material_requests
language plpgsql security definer set search_path = public as $$
declare r public.material_requests;
begin
  select * into r from public.material_requests where id = p_request for update;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(r.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if r.status <> 'requested' then raise exception 'ALREADY_DECIDED'; end if;
  update public.material_requests
     set status = case when p_approve then 'approved'::public.request_status else 'rejected'::public.request_status end,
         decided_by = auth.uid(), decided_at = now()
   where id = r.id returning * into r;
  return r;
end $$;

-- Issue from the store to a contractor; refuses to go below zero
create or replace function public.issue_material(p_request uuid)
returns public.material_requests
language plpgsql security definer set search_path = public as $$
declare
  r public.material_requests;
  v_store numeric; v_name text; v_unit text; v_company text; v_user uuid;
begin
  select * into r from public.material_requests where id = p_request for update;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(r.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if r.status not in ('requested', 'approved') then raise exception 'NOT_ISSUABLE'; end if;

  perform pg_advisory_xact_lock(hashtext(r.project_id::text || r.material_id::text));
  select in_store into v_store from public.material_stock where material_id = r.material_id and project_id = r.project_id;
  if coalesce(v_store, 0) < r.quantity then raise exception 'INSUFFICIENT_STOCK'; end if;

  insert into public.stock_movements (org_id, project_id, material_id, type, quantity, contractor_id, request_id, location, note)
  values (r.org_id, r.project_id, r.material_id, 'issued', r.quantity, r.contractor_id, r.id, r.location, r.purpose);
  update public.material_requests
     set status = 'issued', decided_by = coalesce(decided_by, auth.uid()), decided_at = coalesce(decided_at, now())
   where id = r.id returning * into r;

  select name, unit into v_name, v_unit from public.materials where id = r.material_id;
  select company_name, user_id into v_company, v_user from public.contractors where id = r.contractor_id;
  perform public.log_activity(r.org_id, r.project_id, 'stock',
    'Issued ' || trim(to_char(r.quantity, 'FM999999990.##')) || ' ' || v_unit || ' ' || v_name || ' to ' || v_company);
  if v_user is not null then
    perform public.notify_user(v_user, 'Material issued',
      trim(to_char(r.quantity, 'FM999999990.##')) || ' ' || v_unit || ' ' || v_name || ' is ready at the store.', '/portal');
  end if;
  return r;
end $$;

-- Contractor (or site staff) reports what was used and wasted at site
create or replace function public.record_site_usage(
  p_project uuid, p_contractor uuid, p_material uuid, p_consumed numeric, p_wastage numeric, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_at_site numeric; v_name text; v_unit text; v_company text;
begin
  select org_id into v_org from public.contractors where id = p_contractor;
  if v_org is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(v_org) or public.is_admin() or public.my_contractor_id() = p_contractor) then
    raise exception 'NOT_ALLOWED';
  end if;
  if coalesce(p_consumed, 0) < 0 or coalesce(p_wastage, 0) < 0 or coalesce(p_consumed, 0) + coalesce(p_wastage, 0) = 0 then
    raise exception 'BAD_QUANTITY';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_project::text || p_material::text || p_contractor::text));
  select at_site into v_at_site from public.contractor_material_usage
   where project_id = p_project and contractor_id = p_contractor and material_id = p_material;
  if coalesce(v_at_site, 0) < coalesce(p_consumed, 0) + coalesce(p_wastage, 0) then
    raise exception 'NOT_ENOUGH_AT_SITE';
  end if;
  if coalesce(p_consumed, 0) > 0 then
    insert into public.stock_movements (org_id, project_id, material_id, type, quantity, contractor_id, note)
    values (v_org, p_project, p_material, 'consumed', p_consumed, p_contractor, p_note);
  end if;
  if coalesce(p_wastage, 0) > 0 then
    insert into public.stock_movements (org_id, project_id, material_id, type, quantity, contractor_id, note)
    values (v_org, p_project, p_material, 'wastage', p_wastage, p_contractor, p_note);
  end if;
  select name, unit into v_name, v_unit from public.materials where id = p_material;
  select company_name into v_company from public.contractors where id = p_contractor;
  perform public.log_activity(v_org, p_project,
    case when coalesce(p_wastage, 0) > 0.05 * (coalesce(p_consumed, 0) + coalesce(p_wastage, 0)) then 'alert' else 'stock' end,
    v_company || ' used ' || trim(to_char(coalesce(p_consumed, 0), 'FM999999990.##')) || ' ' || v_unit || ' ' || v_name
    || case when coalesce(p_wastage, 0) > 0 then ', wasted ' || trim(to_char(p_wastage, 'FM999999990.##')) else '' end);
end $$;

create or replace function public.record_opening_stock(p_project uuid, p_material uuid, p_qty numeric, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from public.projects where id = p_project;
  if not (public.is_org_member(v_org) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if p_qty <= 0 then raise exception 'BAD_QUANTITY'; end if;
  insert into public.stock_movements (org_id, project_id, material_id, type, quantity, note)
  values (v_org, p_project, p_material, 'opening', p_qty, p_note);
end $$;

-- Contractor updates progress on their own work package
create or replace function public.update_work_progress(p_package uuid, p_progress numeric, p_note text default null)
returns public.work_packages
language plpgsql security definer set search_path = public as $$
declare w public.work_packages; v_company text;
begin
  select * into w from public.work_packages where id = p_package for update;
  if w.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(w.org_id) or public.is_admin() or w.contractor_id = public.my_contractor_id()) then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_progress < 0 or p_progress > 100 then raise exception 'BAD_PROGRESS'; end if;
  update public.work_packages
     set progress = p_progress, updated_at = now(),
         status = case when p_progress >= 100 then 'completed'
                       when w.due_date is not null and w.due_date < current_date then 'delayed'
                       when p_progress > 0 then 'in_progress' else status end
   where id = w.id returning * into w;
  select company_name into v_company from public.contractors where id = w.contractor_id;
  perform public.log_activity(w.org_id, w.project_id, 'info',
    v_company || ': "' || w.title || '" now ' || p_progress || '%' || coalesce(' — ' || p_note, ''));
  return w;
end $$;

-- Employee self check-in with geofence check
create or replace function public.check_in(p_lat double precision, p_lng double precision,
                                           p_selfie text default null, p_note text default null)
returns public.attendance
language plpgsql security definer set search_path = public as $$
declare
  e public.employees; pr public.projects; a public.attendance; v_dist int;
begin
  select * into e from public.employees where user_id = auth.uid() and active;
  if e.id is null then raise exception 'NOT_AN_EMPLOYEE'; end if;
  select * into pr from public.projects where id = e.project_id;
  if pr.site_lat is not null and p_lat is not null then
    v_dist := round(6371000 * 2 * asin(sqrt(
      power(sin(radians(p_lat - pr.site_lat) / 2), 2)
      + cos(radians(pr.site_lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - pr.site_lng) / 2), 2))));
  end if;
  begin
    insert into public.attendance (org_id, employee_id, project_id, work_date, lat, lng, distance_m, inside_geofence, selfie_path, work_note)
    values (e.org_id, e.id, e.project_id, (now() at time zone 'Asia/Kolkata')::date, p_lat, p_lng, v_dist,
            case when v_dist is null then null else v_dist <= pr.geofence_m end, p_selfie, p_note)
    returning * into a;
  exception when unique_violation then
    raise exception 'ALREADY_CHECKED_IN';
  end;
  perform public.log_activity(e.org_id, e.project_id,
    case when a.inside_geofence is false then 'alert' else 'attendance' end,
    e.employee_code || ' ' || e.full_name || ' checked in'
    || case when a.inside_geofence is false then ' OUTSIDE the site (' || v_dist || ' m away)'
            when a.inside_geofence then ' at site' else ' (no location)' end);
  return a;
end $$;

create or replace function public.check_out(p_note text default null)
returns public.attendance
language plpgsql security definer set search_path = public as $$
declare a public.attendance;
begin
  update public.attendance
     set check_out_at = now(), work_note = coalesce(p_note, work_note)
   where employee_id = public.my_employee_id()
     and work_date = (now() at time zone 'Asia/Kolkata')::date
     and check_out_at is null
  returning * into a;
  if a.id is null then raise exception 'NOT_CHECKED_IN'; end if;
  return a;
end $$;

-- Buyer approves or rejects the developer's quote
create or replace function public.respond_to_quote(p_request uuid, p_approve boolean)
returns public.modification_requests
language plpgsql security definer set search_path = public as $$
declare m public.modification_requests;
begin
  select * into m from public.modification_requests where id = p_request for update;
  if m.id is null or m.buyer_id <> auth.uid() then raise exception 'NOT_FOUND'; end if;
  if m.status <> 'quoted' then raise exception 'NOT_QUOTED'; end if;
  update public.modification_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         buyer_approved_at = case when p_approve then now() end
   where id = m.id returning * into m;
  perform public.log_activity(m.org_id, null, case when p_approve then 'info' else 'alert' end,
    'MOD-' || m.seq || ': buyer ' || case when p_approve then 'approved' else 'rejected' end || ' the quote of ' || public.fmt_money(m.quoted_cost));
  return m;
end $$;

-- Activity for new deliveries and requests
create or replace function public.on_delivery_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_m text; v_u text; v_v text;
begin
  select name, unit into v_m, v_u from public.materials where id = new.material_id;
  select company_name into v_v from public.vendors where id = new.vendor_id;
  perform public.log_activity(new.org_id, new.project_id, 'delivery',
    v_v || ' delivered ' || trim(to_char(new.quantity, 'FM999999990.##')) || ' ' || v_u || ' ' || v_m
    || coalesce(' (vehicle ' || new.vehicle_number || ')', '') || ' — waiting for inspection');
  return new;
end $$;
create trigger deliveries_activity after insert on public.deliveries
  for each row execute function public.on_delivery_insert();

create or replace function public.on_request_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_m text; v_u text; v_c text;
begin
  select name, unit into v_m, v_u from public.materials where id = new.material_id;
  select company_name into v_c from public.contractors where id = new.contractor_id;
  perform public.log_activity(new.org_id, new.project_id, 'stock',
    v_c || ' requested ' || trim(to_char(new.quantity, 'FM999999990.##')) || ' ' || v_u || ' ' || v_m
    || coalesce(' for ' || new.purpose, ''));
  return new;
end $$;
create trigger material_requests_activity after insert on public.material_requests
  for each row execute function public.on_request_insert();

create or replace function public.on_modification_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.org_id, null, 'info', 'MOD-' || new.seq || ' requested: ' || left(new.requirement, 80));
  elsif new.status = 'quoted' and old.status <> 'quoted' then
    perform public.notify_user(new.buyer_id, 'Quote ready for MOD-' || new.seq,
      left(new.requirement, 60) || ' — ' || public.fmt_money(new.quoted_cost) || '. Approve it in My property.',
      '/my-property/' || new.booking_id);
  end if;
  return new;
end $$;
create trigger modifications_activity after insert or update on public.modification_requests
  for each row execute function public.on_modification_change();

-- ---------- Execute rights -------------------------------------------
revoke execute on function public.accept_delivery(uuid, numeric, text)         from public, anon;
revoke execute on function public.decide_material_request(uuid, boolean)        from public, anon;
revoke execute on function public.issue_material(uuid)                          from public, anon;
revoke execute on function public.record_site_usage(uuid, uuid, uuid, numeric, numeric, text) from public, anon;
revoke execute on function public.record_opening_stock(uuid, uuid, numeric, text) from public, anon;
revoke execute on function public.update_work_progress(uuid, numeric, text)     from public, anon;
revoke execute on function public.check_in(double precision, double precision, text, text) from public, anon;
revoke execute on function public.check_out(text)                               from public, anon;
revoke execute on function public.respond_to_quote(uuid, boolean)               from public, anon;
grant execute on function public.accept_delivery(uuid, numeric, text)         to authenticated;
grant execute on function public.decide_material_request(uuid, boolean)        to authenticated;
grant execute on function public.issue_material(uuid)                          to authenticated;
grant execute on function public.record_site_usage(uuid, uuid, uuid, numeric, numeric, text) to authenticated;
grant execute on function public.record_opening_stock(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.update_work_progress(uuid, numeric, text)     to authenticated;
grant execute on function public.check_in(double precision, double precision, text, text) to authenticated;
grant execute on function public.check_out(text)                               to authenticated;
grant execute on function public.respond_to_quote(uuid, boolean)               to authenticated;

-- Storage: site selfies, delivery photos and invoices (bucket 'site', private)
-- Path: <org_id>/<anything>. Partners and staff of that org may upload; staff read all, uploaders read their own.
create policy "site upload org people" on storage.objects for insert to authenticated
  with check (bucket_id = 'site'
              and (public.is_org_member(((storage.foldername(name))[1])::uuid)
                   or public.is_org_partner(((storage.foldername(name))[1])::uuid)));
create policy "site read staff or owner" on storage.objects for select to authenticated
  using (bucket_id = 'site'
         and (public.is_org_member(((storage.foldername(name))[1])::uuid) or owner = auth.uid()));
