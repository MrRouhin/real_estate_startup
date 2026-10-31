-- REMMO 0016: workspaces for contractors, vendors and site employees.
--   * Contractors raise running-account (RA) bills against their work packages; the developer
--     verifies, approves and pays them. Contractors assign tasks to their crew, mark crew
--     attendance for days the app was not used, and decide leave for their crew.
--   * Vendors keep a catalogue and price list, accept or decline purchase orders, promise and
--     record dispatch, and see which deliveries have been paid.
--   * Employees see their tasks, ask for leave and see their wages.
--   * The developer approves people who ask to join through the invite link.
-- Control stays with the developer: partners act only through the functions below, only on
-- their own records, and every step is logged and notified.

-- ---------------------------------------------------------------- RA bills
create table public.contractor_bills (
  id               uuid primary key default gen_random_uuid(),
  seq              bigint generated always as identity,
  org_id           uuid not null references public.organizations (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  contractor_id    uuid not null references public.contractors (id) on delete cascade,
  work_package_id  uuid references public.work_packages (id) on delete set null,
  period_from      date,
  period_to        date,
  progress_claimed numeric(5,2) check (progress_claimed between 0 and 100),
  gross_amount     numeric(14,2) not null check (gross_amount > 0),
  gst_pct          numeric(5,2) not null default 18 check (gst_pct between 0 and 28),
  retention_pct    numeric(5,2) not null default 5 check (retention_pct between 0 and 10),
  tds_pct          numeric(5,2) not null default 1 check (tds_pct between 0 and 10),
  net_payable      numeric(14,2) generated always as (round(gross_amount * (1 + gst_pct / 100 - retention_pct / 100 - tds_pct / 100), 2)) stored,
  invoice_number   text,
  note             text,
  status           text not null default 'submitted' check (status in ('submitted', 'verified', 'approved', 'paid', 'rejected')),
  decided_by       uuid references public.profiles (id),
  decided_at       timestamptz,
  decision_note    text,
  paid_at          timestamptz,
  payment_ref      text,
  created_by       uuid default auth.uid() references public.profiles (id),
  created_at       timestamptz not null default now(),
  check (period_to is null or period_from is null or period_to >= period_from)
);
create index contractor_bills_contractor_idx on public.contractor_bills (contractor_id, created_at desc);
create index contractor_bills_org_idx on public.contractor_bills (org_id, status);

-- ---------------------------------------------------------------- purchase orders
create table public.purchase_orders (
  id                  uuid primary key default gen_random_uuid(),
  seq                 bigint generated always as identity,
  org_id              uuid not null references public.organizations (id) on delete cascade,
  project_id          uuid not null references public.projects (id) on delete cascade,
  vendor_id           uuid not null references public.vendors (id) on delete cascade,
  material_request_id uuid references public.material_requests (id) on delete set null,
  items               jsonb not null default '[]' check (jsonb_typeof(items) = 'array'),
  subtotal            numeric(14,2) not null default 0,
  gst_pct             numeric(5,2) not null default 18,
  total               numeric(14,2) generated always as (round(subtotal * (1 + gst_pct / 100), 2)) stored,
  required_by         date,
  delivery_location   text,
  terms               text,
  status              text not null default 'issued' check (status in ('issued', 'accepted', 'declined', 'dispatched', 'delivered', 'closed', 'cancelled')),
  vendor_note         text,
  promised_date       date,
  accepted_at         timestamptz,
  dispatched_at       timestamptz,
  vehicle_number      text,
  created_by          uuid default auth.uid() references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index purchase_orders_vendor_idx on public.purchase_orders (vendor_id, created_at desc);

-- items: [{ material_id, name, unit, qty, rate }] -> subtotal
create or replace function public.po_subtotal()
returns trigger language plpgsql set search_path = public as $$
begin
  new.subtotal := coalesce((select round(sum((i->>'qty')::numeric * (i->>'rate')::numeric), 2) from jsonb_array_elements(new.items) i), 0);
  new.updated_at := now();
  return new;
end $$;
create trigger purchase_orders_subtotal before insert or update of items on public.purchase_orders
  for each row execute function public.po_subtotal();

alter table public.deliveries
  add column po_id      uuid references public.purchase_orders (id) on delete set null,
  add column paid_at    timestamptz,
  add column payment_ref text;
grant update (po_id) on public.deliveries to authenticated;

-- ---------------------------------------------------------------- vendor catalogue
create table public.vendor_catalog (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  vendor_id   uuid not null references public.vendors (id) on delete cascade,
  material_id uuid references public.materials (id) on delete set null,
  name        text not null check (length(name) between 2 and 120),
  brand       text,
  unit        text not null,
  rate        numeric(12,2) not null check (rate >= 0),
  min_order   numeric(12,2),
  lead_days   integer check (lead_days between 0 and 180),
  in_stock    boolean not null default true,
  updated_at  timestamptz not null default now(),
  unique (vendor_id, name)
);

-- ---------------------------------------------------------------- crew tasks
create table public.crew_tasks (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  project_id      uuid references public.projects (id) on delete cascade,
  contractor_id   uuid references public.contractors (id) on delete cascade,
  employee_id     uuid references public.employees (id) on delete cascade,  -- null = the whole crew
  work_package_id uuid references public.work_packages (id) on delete set null,
  title           text not null check (length(title) between 3 and 140),
  details         text,
  due_date        date,
  priority        text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status          text not null default 'open' check (status in ('open', 'done', 'blocked')),
  done_at         timestamptz,
  done_note       text,
  created_by      uuid default auth.uid() references public.profiles (id),
  created_at      timestamptz not null default now()
);
create index crew_tasks_employee_idx on public.crew_tasks (employee_id, status);
create index crew_tasks_contractor_idx on public.crew_tasks (contractor_id, status);

-- ---------------------------------------------------------------- leave
create table public.leave_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  employee_id   uuid not null references public.employees (id) on delete cascade,
  from_date     date not null,
  to_date       date not null,
  kind          text not null default 'casual' check (kind in ('casual', 'sick', 'emergency', 'festival')),
  reason        text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by    uuid references public.profiles (id),
  decided_at    timestamptz,
  decision_note text,
  created_at    timestamptz not null default now(),
  check (to_date >= from_date and to_date - from_date <= 30)
);
create index leave_requests_employee_idx on public.leave_requests (employee_id, from_date desc);

-- ---------------------------------------------------------------- helpers
-- Is this employee in my (contractor) crew?
create or replace function public.in_my_crew(p_employee uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.employees e where e.id = p_employee and e.contractor_id is not null and e.contractor_id = public.my_contractor_id());
$$;
-- The contractor whose crew I (an employee) belong to
create or replace function public.my_crew_contractor()
returns uuid language sql stable security definer set search_path = public as $$
  select contractor_id from public.employees where user_id = auth.uid() and active limit 1;
$$;
create or replace function public.bill_number(p_seq bigint, p_created timestamptz)
returns text language sql immutable as $$ select 'RA-' || to_char(p_created at time zone 'Asia/Kolkata', 'YYYY') || '-' || lpad(p_seq::text, 4, '0') $$;
create or replace function public.po_number(p_seq bigint, p_created timestamptz)
returns text language sql immutable as $$ select 'PO-' || to_char(p_created at time zone 'Asia/Kolkata', 'YYYY') || '-' || lpad(p_seq::text, 4, '0') $$;

-- ---------------------------------------------------------------- RLS
alter table public.contractor_bills enable row level security;
alter table public.purchase_orders  enable row level security;
alter table public.vendor_catalog   enable row level security;
alter table public.crew_tasks       enable row level security;
alter table public.leave_requests   enable row level security;

create policy bills_read on public.contractor_bills for select
  using (public.is_org_member(org_id) or public.is_admin() or contractor_id = public.my_contractor_id());
revoke insert, update, delete on public.contractor_bills from anon, authenticated; -- functions only

create policy po_read on public.purchase_orders for select
  using (public.is_org_member(org_id) or public.is_admin() or vendor_id = public.my_vendor_id());
create policy po_staff_write on public.purchase_orders for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

create policy catalog_read on public.vendor_catalog for select
  using (public.is_org_member(org_id) or public.is_admin() or vendor_id = public.my_vendor_id());
create policy catalog_vendor_write on public.vendor_catalog for all
  using (vendor_id = public.my_vendor_id() or public.is_org_member(org_id) or public.is_admin())
  with check ((vendor_id = public.my_vendor_id() and org_id = (select v.org_id from public.vendors v where v.id = vendor_id))
              or public.is_org_member(org_id) or public.is_admin());

create policy tasks_read on public.crew_tasks for select
  using (public.is_org_member(org_id) or public.is_admin()
         or (contractor_id is not null and contractor_id = public.my_contractor_id())
         or employee_id = public.my_employee_id()
         or (employee_id is null and contractor_id is not null and contractor_id = public.my_crew_contractor()));
create policy tasks_staff_write on public.crew_tasks for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

create policy leave_read on public.leave_requests for select
  using (public.is_org_member(org_id) or public.is_admin() or employee_id = public.my_employee_id() or public.in_my_crew(employee_id));
revoke insert, update, delete on public.leave_requests from anon, authenticated; -- functions only

-- ---------------------------------------------------------------- contractor functions
create or replace function public.submit_contractor_bill(p jsonb)
returns public.contractor_bills
language plpgsql security definer set search_path = public as $$
declare
  c public.contractors; w public.work_packages; b public.contractor_bills;
  v_gross numeric := (p->>'gross_amount')::numeric; v_billed numeric; v_cap numeric;
begin
  select * into c from public.contractors where id = public.my_contractor_id();
  if c.id is null then raise exception 'NOT_A_CONTRACTOR'; end if;
  select * into w from public.work_packages where id = (p->>'work_package_id')::uuid;
  if w.id is null or w.contractor_id <> c.id then raise exception 'NOT_YOUR_WORK'; end if;
  if v_gross is null or v_gross <= 0 then raise exception 'BAD_AMOUNT'; end if;
  -- cumulative bills may not run ahead of verified progress (2% tolerance for rounding)
  select coalesce(sum(gross_amount), 0) into v_billed from public.contractor_bills where work_package_id = w.id and status <> 'rejected';
  v_cap := coalesce(w.contract_value, 0) * least(100, coalesce(w.progress, 0)) / 100 * 1.02;
  if w.contract_value is not null and v_billed + v_gross > v_cap then
    raise exception 'BILL_EXCEEDS_PROGRESS';
  end if;
  insert into public.contractor_bills (org_id, project_id, contractor_id, work_package_id, period_from, period_to, progress_claimed,
    gross_amount, gst_pct, retention_pct, tds_pct, invoice_number, note)
  values (w.org_id, w.project_id, c.id, w.id, nullif(p->>'period_from', '')::date, nullif(p->>'period_to', '')::date, w.progress,
    v_gross, coalesce(nullif(p->>'gst_pct', '')::numeric, 18), 5, 1, nullif(trim(p->>'invoice_number'), ''), nullif(trim(p->>'note'), ''))
  returning * into b;
  perform public.log_activity(b.org_id, b.project_id, 'info',
    c.company_name || ' raised ' || public.bill_number(b.seq, b.created_at) || ' for ' || public.fmt_money(b.gross_amount) || ' on "' || w.title || '"');
  return b;
end $$;

create or replace function public.decide_contractor_bill(p_bill uuid, p_status text, p_note text default null, p_ref text default null)
returns public.contractor_bills
language plpgsql security definer set search_path = public as $$
declare b public.contractor_bills; v_user uuid; v_no text;
begin
  select * into b from public.contractor_bills where id = p_bill for update;
  if b.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(b.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if not ((b.status = 'submitted' and p_status in ('verified', 'rejected'))
       or (b.status = 'verified' and p_status in ('approved', 'rejected'))
       or (b.status = 'approved' and p_status = 'paid')) then raise exception 'BAD_TRANSITION'; end if;
  if p_status = 'paid' and coalesce(trim(p_ref), '') = '' then raise exception 'PAYMENT_REF_REQUIRED'; end if;
  update public.contractor_bills
     set status = p_status, decided_by = auth.uid(), decided_at = now(), decision_note = coalesce(nullif(trim(p_note), ''), decision_note),
         paid_at = case when p_status = 'paid' then now() else paid_at end, payment_ref = case when p_status = 'paid' then trim(p_ref) else payment_ref end
   where id = b.id returning * into b;
  v_no := public.bill_number(b.seq, b.created_at);
  select user_id into v_user from public.contractors where id = b.contractor_id;
  if v_user is not null then
    perform public.notify_user(v_user, v_no || ': ' || p_status,
      case p_status when 'paid' then public.fmt_money(b.net_payable) || ' paid, reference ' || b.payment_ref
                    when 'rejected' then coalesce(p_note, 'The bill was returned. Check the note and raise it again.')
                    else 'Your bill is now ' || p_status || '.' end, '/contractor/bills');
  end if;
  perform public.log_activity(b.org_id, b.project_id, case when p_status = 'rejected' then 'alert' else 'info' end, v_no || ' ' || p_status);
  return b;
end $$;

create or replace function public.contractor_assign_task(p jsonb)
returns public.crew_tasks
language plpgsql security definer set search_path = public as $$
declare v_c uuid := public.my_contractor_id(); c public.contractors; t public.crew_tasks; v_emp uuid := nullif(p->>'employee_id', '')::uuid; v_wp uuid := nullif(p->>'work_package_id', '')::uuid; v_user uuid; v_proj uuid;
begin
  select * into c from public.contractors where id = v_c;
  if c.id is null then raise exception 'NOT_A_CONTRACTOR'; end if;
  if v_emp is not null and not public.in_my_crew(v_emp) then raise exception 'NOT_YOUR_CREW'; end if;
  if v_wp is not null and not exists (select 1 from public.work_packages where id = v_wp and contractor_id = c.id) then raise exception 'NOT_YOUR_WORK'; end if;
  select coalesce((select project_id from public.work_packages where id = v_wp), (select project_id from public.employees where id = v_emp)) into v_proj;
  insert into public.crew_tasks (org_id, project_id, contractor_id, employee_id, work_package_id, title, details, due_date, priority)
  values (c.org_id, v_proj, c.id, v_emp, v_wp, trim(p->>'title'), nullif(trim(p->>'details'), ''), nullif(p->>'due_date', '')::date, coalesce(nullif(p->>'priority', ''), 'normal'))
  returning * into t;
  if v_emp is not null then
    select user_id into v_user from public.employees where id = v_emp;
    if v_user is not null then perform public.notify_user(v_user, 'New task: ' || t.title, coalesce(t.details, 'From ' || c.company_name), '/employee'); end if;
  end if;
  return t;
end $$;

create or replace function public.update_crew_task(p_task uuid, p_status text, p_note text default null)
returns public.crew_tasks
language plpgsql security definer set search_path = public as $$
declare t public.crew_tasks;
begin
  select * into t from public.crew_tasks where id = p_task for update;
  if t.id is null then raise exception 'NOT_FOUND'; end if;
  if not (t.employee_id = public.my_employee_id()
          or (t.employee_id is null and t.contractor_id = public.my_crew_contractor())
          or (t.contractor_id is not null and t.contractor_id = public.my_contractor_id())
          or public.is_org_member(t.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if p_status not in ('open', 'done', 'blocked') then raise exception 'BAD_STATUS'; end if;
  update public.crew_tasks set status = p_status, done_at = case when p_status = 'done' then now() end, done_note = nullif(trim(p_note), '')
   where id = t.id returning * into t;
  return t;
end $$;

-- Attendance for a day the app was not used (no phone, network down). Own crew, last 7 days only.
create or replace function public.mark_crew_attendance(p_employee uuid, p_date date, p_present boolean, p_note text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare e public.employees;
begin
  select * into e from public.employees where id = p_employee;
  if e.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.in_my_crew(e.id) or public.is_org_member(e.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if p_date > (now() at time zone 'Asia/Kolkata')::date or p_date < (now() at time zone 'Asia/Kolkata')::date - 7 then raise exception 'DATE_OUT_OF_RANGE'; end if;
  if p_present then
    insert into public.attendance (org_id, employee_id, project_id, work_date, check_in_at, check_out_at, inside_geofence, work_note)
    values (e.org_id, e.id, e.project_id, p_date, (p_date + time '09:00') at time zone 'Asia/Kolkata', (p_date + time '18:00') at time zone 'Asia/Kolkata', null,
            coalesce(nullif(trim(p_note), ''), 'Marked by supervisor'))
    on conflict (employee_id, work_date) do nothing;
    return 'present';
  else
    delete from public.attendance where employee_id = e.id and work_date = p_date and selfie_path is null and lat is null; -- never deletes a real check-in
    return 'absent';
  end if;
end $$;

-- ---------------------------------------------------------------- vendor functions
create or replace function public.vendor_respond_po(p_po uuid, p_accept boolean, p_promised date default null, p_note text default null)
returns public.purchase_orders
language plpgsql security definer set search_path = public as $$
declare po public.purchase_orders; v_name text;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if po.id is null or po.vendor_id <> public.my_vendor_id() then raise exception 'NOT_FOUND'; end if;
  if po.status <> 'issued' then raise exception 'ALREADY_ANSWERED'; end if;
  if p_accept and p_promised is null then raise exception 'PROMISE_DATE_REQUIRED'; end if;
  if p_accept and p_promised < (now() at time zone 'Asia/Kolkata')::date then raise exception 'DATE_IN_PAST'; end if;
  update public.purchase_orders
     set status = case when p_accept then 'accepted' else 'declined' end, accepted_at = case when p_accept then now() end,
         promised_date = case when p_accept then p_promised end, vendor_note = nullif(trim(p_note), ''), updated_at = now()
   where id = po.id returning * into po;
  select company_name into v_name from public.vendors where id = po.vendor_id;
  perform public.log_activity(po.org_id, po.project_id, case when p_accept then 'info' else 'alert' end,
    v_name || case when p_accept then ' accepted ' else ' declined ' end || public.po_number(po.seq, po.created_at)
    || case when p_accept then ', delivery by ' || to_char(p_promised, 'DD Mon') else coalesce(': ' || po.vendor_note, '') end);
  return po;
end $$;

create or replace function public.vendor_dispatch_po(p_po uuid, p_vehicle text, p_note text default null)
returns public.purchase_orders
language plpgsql security definer set search_path = public as $$
declare po public.purchase_orders; v_name text;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if po.id is null or po.vendor_id <> public.my_vendor_id() then raise exception 'NOT_FOUND'; end if;
  if po.status <> 'accepted' then raise exception 'NOT_ACCEPTED'; end if;
  update public.purchase_orders set status = 'dispatched', dispatched_at = now(), vehicle_number = upper(nullif(trim(p_vehicle), '')),
         vendor_note = coalesce(nullif(trim(p_note), ''), vendor_note), updated_at = now()
   where id = po.id returning * into po;
  select company_name into v_name from public.vendors where id = po.vendor_id;
  perform public.log_activity(po.org_id, po.project_id, 'delivery', v_name || ' dispatched ' || public.po_number(po.seq, po.created_at) || coalesce(' on ' || po.vehicle_number, ''));
  return po;
end $$;

-- A delivery recorded against a PO marks the PO delivered
create or replace function public.on_delivery_po()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.po_id is not null then
    if not exists (select 1 from public.purchase_orders where id = new.po_id and vendor_id = new.vendor_id) then raise exception 'PO_MISMATCH'; end if;
    update public.purchase_orders set status = 'delivered', updated_at = now() where id = new.po_id and status in ('accepted', 'dispatched');
  end if;
  return new;
end $$;
create trigger deliveries_po after insert on public.deliveries for each row execute function public.on_delivery_po();

create or replace function public.notify_new_po()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if new.status = 'issued' then
    select user_id into v_user from public.vendors where id = new.vendor_id;
    if v_user is not null then
      perform public.notify_user(v_user, 'New purchase order ' || public.po_number(new.seq, new.created_at),
        public.fmt_money(new.total) || case when new.required_by is not null then ', needed by ' || to_char(new.required_by, 'DD Mon') else '' end || '. Accept it with a delivery date.', '/vendor/orders');
    end if;
  end if;
  return new;
end $$;
create trigger purchase_orders_notify after insert on public.purchase_orders for each row execute function public.notify_new_po();

create or replace function public.mark_delivery_paid(p_delivery uuid, p_ref text)
returns public.deliveries
language plpgsql security definer set search_path = public as $$
declare d public.deliveries; v_user uuid;
begin
  select * into d from public.deliveries where id = p_delivery for update;
  if d.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(d.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if d.status = 'pending_inspection' or d.status = 'rejected' then raise exception 'NOT_ACCEPTED'; end if;
  if coalesce(trim(p_ref), '') = '' then raise exception 'PAYMENT_REF_REQUIRED'; end if;
  update public.deliveries set paid_at = now(), payment_ref = trim(p_ref) where id = d.id returning * into d;
  select user_id into v_user from public.vendors where id = d.vendor_id;
  if v_user is not null then perform public.notify_user(v_user, 'Payment sent', 'Invoice ' || coalesce(d.invoice_number, '') || ' paid, reference ' || d.payment_ref, '/vendor/invoices'); end if;
  return d;
end $$;

-- ---------------------------------------------------------------- employee functions
create or replace function public.request_leave(p_from date, p_to date, p_kind text, p_reason text default null)
returns public.leave_requests
language plpgsql security definer set search_path = public as $$
declare e public.employees; r public.leave_requests; v_user uuid;
begin
  select * into e from public.employees where id = public.my_employee_id();
  if e.id is null then raise exception 'NOT_AN_EMPLOYEE'; end if;
  if p_from < (now() at time zone 'Asia/Kolkata')::date - 3 then raise exception 'DATE_IN_PAST'; end if;
  if exists (select 1 from public.leave_requests where employee_id = e.id and status in ('pending', 'approved') and daterange(from_date, to_date, '[]') && daterange(p_from, p_to, '[]')) then
    raise exception 'OVERLAPS_EXISTING_LEAVE';
  end if;
  insert into public.leave_requests (org_id, employee_id, from_date, to_date, kind, reason)
  values (e.org_id, e.id, p_from, p_to, coalesce(p_kind, 'casual'), nullif(trim(p_reason), '')) returning * into r;
  if e.contractor_id is not null then
    select user_id into v_user from public.contractors where id = e.contractor_id;
    if v_user is not null then perform public.notify_user(v_user, 'Leave request from ' || e.full_name, to_char(p_from, 'DD Mon') || ' to ' || to_char(p_to, 'DD Mon') || coalesce(': ' || r.reason, ''), '/contractor/crew'); end if;
  end if;
  return r;
end $$;

create or replace function public.decide_leave(p_leave uuid, p_approve boolean, p_note text default null)
returns public.leave_requests
language plpgsql security definer set search_path = public as $$
declare r public.leave_requests; v_user uuid;
begin
  select * into r from public.leave_requests where id = p_leave for update;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.in_my_crew(r.employee_id) or public.is_org_member(r.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if r.status <> 'pending' then raise exception 'ALREADY_DECIDED'; end if;
  update public.leave_requests set status = case when p_approve then 'approved' else 'rejected' end, decided_by = auth.uid(), decided_at = now(), decision_note = nullif(trim(p_note), '')
   where id = r.id returning * into r;
  select user_id into v_user from public.employees where id = r.employee_id;
  if v_user is not null then perform public.notify_user(v_user, 'Leave ' || r.status, to_char(r.from_date, 'DD Mon') || ' to ' || to_char(r.to_date, 'DD Mon') || coalesce(': ' || r.decision_note, ''), '/employee/leave'); end if;
  return r;
end $$;

create or replace function public.cancel_my_leave(p_leave uuid)
returns public.leave_requests
language plpgsql security definer set search_path = public as $$
declare r public.leave_requests;
begin
  update public.leave_requests set status = 'cancelled' where id = p_leave and employee_id = public.my_employee_id() and status = 'pending' returning * into r;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  return r;
end $$;

-- ---------------------------------------------------------------- joining through the invite link
create or replace function public.decide_access_request(p_request uuid, p_approve boolean, p_note text default null, p_contractor uuid default null)
returns public.access_requests
language plpgsql security definer set search_path = public as $$
declare a public.access_requests; v_code text; v_n int;
begin
  select * into a from public.access_requests where id = p_request for update;
  if a.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_manager(a.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if a.status <> 'pending' then raise exception 'ALREADY_DECIDED'; end if;
  if p_approve then
    if a.role = 'contractor' then
      if exists (select 1 from public.contractors where user_id = a.user_id) then raise exception 'ALREADY_LINKED'; end if;
      insert into public.contractors (org_id, company_name, contact_person, phone, email, gst_number, trade, user_id, profile_status)
      values (a.org_id, coalesce(a.company_name, a.full_name), a.full_name, a.phone, a.email, a.gst_number,
              coalesce((select t::public.trade from unnest(enum_range(null::public.trade)) t where t::text = a.trade), 'other'), a.user_id, 'draft');
    elsif a.role = 'vendor' then
      if exists (select 1 from public.vendors where user_id = a.user_id) then raise exception 'ALREADY_LINKED'; end if;
      insert into public.vendors (org_id, company_name, contact_person, phone, email, gst_number, categories, user_id, profile_status)
      values (a.org_id, coalesce(a.company_name, a.full_name), a.full_name, a.phone, a.email, a.gst_number, a.categories, a.user_id, 'draft');
    else
      if exists (select 1 from public.employees where user_id = a.user_id and active) then raise exception 'ALREADY_LINKED'; end if;
      select count(*) + 1 into v_n from public.employees where org_id = a.org_id;
      v_code := 'EMP-' || lpad(v_n::text, 3, '0');
      while exists (select 1 from public.employees where org_id = a.org_id and employee_code = v_code) loop v_n := v_n + 1; v_code := 'EMP-' || lpad(v_n::text, 3, '0'); end loop;
      insert into public.employees (org_id, contractor_id, project_id, employee_code, full_name, phone, role_title, daily_wage, user_id)
      values (a.org_id, p_contractor, (select id from public.projects where org_id = a.org_id and status = 'ongoing' order by created_at limit 1),
              v_code, a.full_name, a.phone, coalesce(nullif(a.trade, ''), 'Helper'), 700, a.user_id);
    end if;
    update public.profiles set role = a.role::public.app_role where id = a.user_id and role = 'buyer';
  end if;
  update public.access_requests set status = case when p_approve then 'approved' else 'rejected' end, note = nullif(trim(p_note), ''), decided_by = auth.uid(), decided_at = now()
   where id = a.id returning * into a;
  perform public.notify_user(a.user_id, case when p_approve then 'You are in' else 'Request not approved' end,
    case when p_approve then 'Your ' || a.role || ' account is ready. Sign in again to open your workspace.' else coalesce(p_note, 'The developer did not approve this request.') end,
    case when p_approve then '/' || a.role else '/' end);
  return a;
end $$;

-- ---------------------------------------------------------------- grants
revoke execute on function public.submit_contractor_bill(jsonb) from public, anon;
revoke execute on function public.decide_contractor_bill(uuid, text, text, text) from public, anon;
revoke execute on function public.contractor_assign_task(jsonb) from public, anon;
revoke execute on function public.update_crew_task(uuid, text, text) from public, anon;
revoke execute on function public.mark_crew_attendance(uuid, date, boolean, text) from public, anon;
revoke execute on function public.vendor_respond_po(uuid, boolean, date, text) from public, anon;
revoke execute on function public.vendor_dispatch_po(uuid, text, text) from public, anon;
revoke execute on function public.mark_delivery_paid(uuid, text) from public, anon;
revoke execute on function public.request_leave(date, date, text, text) from public, anon;
revoke execute on function public.decide_leave(uuid, boolean, text) from public, anon;
revoke execute on function public.cancel_my_leave(uuid) from public, anon;
revoke execute on function public.decide_access_request(uuid, boolean, text, uuid) from public, anon;
revoke execute on function public.on_delivery_po() from public, anon, authenticated;
revoke execute on function public.notify_new_po() from public, anon, authenticated;
grant execute on function public.submit_contractor_bill(jsonb) to authenticated;
grant execute on function public.decide_contractor_bill(uuid, text, text, text) to authenticated;
grant execute on function public.contractor_assign_task(jsonb) to authenticated;
grant execute on function public.update_crew_task(uuid, text, text) to authenticated;
grant execute on function public.mark_crew_attendance(uuid, date, boolean, text) to authenticated;
grant execute on function public.vendor_respond_po(uuid, boolean, date, text) to authenticated;
grant execute on function public.vendor_dispatch_po(uuid, text, text) to authenticated;
grant execute on function public.mark_delivery_paid(uuid, text) to authenticated;
grant execute on function public.request_leave(date, date, text, text) to authenticated;
grant execute on function public.decide_leave(uuid, boolean, text) to authenticated;
grant execute on function public.cancel_my_leave(uuid) to authenticated;
grant execute on function public.decide_access_request(uuid, boolean, text, uuid) to authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.purchase_orders, public.contractor_bills, public.crew_tasks, public.leave_requests;
  end if;
end $$;

-- ---------------------------------------------------------------- demo content
create or replace function public.seed_workspaces_demo(p_org uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_proj uuid; v_flats uuid; v_abc uuid; v_xyz uuid; v_vendor uuid; v_wp uuid; v_wp2 uuid; v_emp uuid; v_staff uuid; e record; i int := 0;
  v_cement uuid; v_steel uuid; v_sand uuid; v_po uuid; v_po2 uuid;
begin
  if exists (select 1 from public.contractor_bills where org_id = p_org) then return 'workspaces already seeded'; end if;
  select id into v_proj from public.projects where org_id = p_org and kind = 'plots' order by created_at limit 1;
  select id into v_flats from public.projects where org_id = p_org and kind = 'apartments' order by created_at limit 1;
  select id into v_abc from public.contractors where org_id = p_org and company_name = 'ABC Constructions';
  select id into v_xyz from public.contractors where org_id = p_org and company_name ilike 'XYZ Electricals%';
  select id into v_vendor from public.vendors where org_id = p_org and company_name = 'XYZ Materials';
  select user_id into v_staff from public.organization_members where org_id = p_org order by (org_role = 'owner') desc limit 1;
  select id into v_wp from public.work_packages where contractor_id = v_abc order by (title ilike 'Tower%') desc, progress desc nulls last limit 1;
  select id into v_wp2 from public.work_packages where contractor_id = v_xyz order by (title ilike 'Tower%') desc, progress desc nulls last limit 1;
  select id into v_cement from public.materials where org_id = p_org and name ilike 'cement%' limit 1;
  select id into v_steel from public.materials where org_id = p_org and (name ilike '%steel%' or name ilike '%tmt%') limit 1;
  select id into v_sand from public.materials where org_id = p_org and name ilike '%sand%' limit 1;

  -- RA bills: one paid, one approved, one waiting for verification
  if v_wp is not null then
    insert into public.contractor_bills (org_id, project_id, contractor_id, work_package_id, period_from, period_to, progress_claimed, gross_amount, invoice_number, note, status, decided_by, decided_at, paid_at, payment_ref, created_by, created_at)
    select w.org_id, w.project_id, w.contractor_id, w.id, current_date - 75, current_date - 46, round(w.progress * 0.4), round(w.contract_value * w.progress / 100 * 0.35, -3), 'ABC/RA/01', 'Excavation, footings and plinth beams',
           'paid', v_staff, now() - interval '38 days', now() - interval '36 days', 'NEFT HDFCN52026' || lpad((extract(doy from now())::int)::text, 3, '0'), (select user_id from public.contractors where id = v_abc), now() - interval '45 days'
      from public.work_packages w where w.id = v_wp;
    insert into public.contractor_bills (org_id, project_id, contractor_id, work_package_id, period_from, period_to, progress_claimed, gross_amount, invoice_number, note, status, decided_by, decided_at, created_by, created_at)
    select w.org_id, w.project_id, w.contractor_id, w.id, current_date - 45, current_date - 16, round(w.progress * 0.75), round(w.contract_value * w.progress / 100 * 0.3, -3), 'ABC/RA/02', 'Columns and slabs, levels 1 to 6',
           'approved', v_staff, now() - interval '6 days', (select user_id from public.contractors where id = v_abc), now() - interval '15 days'
      from public.work_packages w where w.id = v_wp;
    insert into public.contractor_bills (org_id, project_id, contractor_id, work_package_id, period_from, period_to, progress_claimed, gross_amount, invoice_number, note, status, created_by, created_at)
    select w.org_id, w.project_id, w.contractor_id, w.id, current_date - 15, current_date - 1, w.progress, round(w.contract_value * w.progress / 100 * 0.2, -3), 'ABC/RA/03', 'Slabs 7 to 11 with shuttering and reinforcement',
           'submitted', (select user_id from public.contractors where id = v_abc), now() - interval '1 day'
      from public.work_packages w where w.id = v_wp;
  end if;
  if v_wp2 is not null then
    insert into public.contractor_bills (org_id, project_id, contractor_id, work_package_id, period_from, period_to, progress_claimed, gross_amount, invoice_number, note, status, created_by, created_at)
    select w.org_id, w.project_id, w.contractor_id, w.id, current_date - 30, current_date - 2, w.progress, round(greatest(w.contract_value * w.progress / 100 * 0.5, 50000), -3), 'XYZ/2026/114', 'Conduits and DBs, floors 1 to 6',
           'verified', (select user_id from public.contractors where id = v_xyz), now() - interval '3 days'
      from public.work_packages w where w.id = v_wp2;
  end if;

  -- purchase orders to the vendor in every state
  if v_vendor is not null and v_cement is not null then
    insert into public.purchase_orders (org_id, project_id, vendor_id, items, required_by, delivery_location, terms, status, created_by, created_at)
    values (p_org, coalesce(v_flats, v_proj), v_vendor, jsonb_build_array(jsonb_build_object('material_id', v_cement, 'name', 'Cement OPC 53', 'unit', 'bag', 'qty', 600, 'rate', 385)),
            current_date + 6, 'Tower A store', 'Payment 30 days from accepted delivery. Test certificate with each lot.', 'issued', v_staff, now() - interval '5 hours')
    returning id into v_po;
    if v_steel is not null then
      insert into public.purchase_orders (org_id, project_id, vendor_id, items, required_by, delivery_location, terms, status, promised_date, accepted_at, vendor_note, created_by, created_at)
      values (p_org, coalesce(v_flats, v_proj), v_vendor, jsonb_build_array(jsonb_build_object('material_id', v_steel, 'name', 'TMT steel Fe550D 12 mm', 'unit', 'tonne', 'qty', 18, 'rate', 61500),
                jsonb_build_object('material_id', v_steel, 'name', 'TMT steel Fe550D 16 mm', 'unit', 'tonne', 'qty', 12, 'rate', 60800)),
              current_date + 3, 'Tower A yard', 'Mill test certificates required.', 'accepted', current_date + 2, now() - interval '1 day', 'Loading from the Hosur depot.', v_staff, now() - interval '2 days')
      returning id into v_po2;
    end if;
    if v_sand is not null then
      insert into public.purchase_orders (org_id, project_id, vendor_id, items, required_by, delivery_location, status, promised_date, accepted_at, dispatched_at, vehicle_number, created_by, created_at)
      values (p_org, coalesce(v_flats, v_proj), v_vendor, jsonb_build_array(jsonb_build_object('material_id', v_sand, 'name', 'M-sand', 'unit', 'cu m', 'qty', 40, 'rate', 1450)),
              current_date + 1, 'Tower B mixer', 'dispatched', current_date + 1, now() - interval '3 days', now() - interval '2 hours', 'KA 05 MN 4471', v_staff, now() - interval '4 days');
    end if;
    -- older delivered PO linked to existing deliveries, and paid invoices
    update public.deliveries set paid_at = delivered_at + interval '12 days', payment_ref = 'NEFT ' || upper(substr(md5(id::text), 1, 10))
     where vendor_id = v_vendor and status in ('accepted', 'partially_accepted') and delivered_at < now() - interval '14 days';
    -- price list
    insert into public.vendor_catalog (org_id, vendor_id, material_id, name, brand, unit, rate, min_order, lead_days, in_stock) values
      (p_org, v_vendor, v_cement, 'Cement OPC 53', 'UltraTech', 'bag', 385, 100, 2, true),
      (p_org, v_vendor, v_cement, 'Cement PPC', 'ACC', 'bag', 360, 100, 2, true),
      (p_org, v_vendor, v_steel, 'TMT steel Fe550D 8–16 mm', 'JSW Neosteel', 'tonne', 61500, 2, 3, true),
      (p_org, v_vendor, v_steel, 'TMT steel Fe550D 20–32 mm', 'JSW Neosteel', 'tonne', 60500, 2, 4, true),
      (p_org, v_vendor, v_sand, 'M-sand (concrete grade)', null, 'cu m', 1450, 10, 1, true),
      (p_org, v_vendor, v_sand, 'P-sand (plastering)', null, 'cu m', 1650, 10, 1, true),
      (p_org, v_vendor, null, 'AAC blocks 600×200×200', 'Magicrete', 'cu m', 4300, 20, 5, true),
      (p_org, v_vendor, null, 'Aggregate 20 mm', null, 'cu m', 1300, 10, 1, false)
    on conflict (vendor_id, name) do nothing;
  end if;

  -- crew tasks, leave and a few supervisor-marked days
  for e in select id, full_name, contractor_id, project_id from public.employees where org_id = p_org and contractor_id = v_abc and active order by employee_code limit 6 loop
    i := i + 1;
    insert into public.crew_tasks (org_id, project_id, contractor_id, employee_id, work_package_id, title, details, due_date, priority, status, done_at, done_note, created_by, created_at)
    values (p_org, e.project_id, v_abc, e.id, v_wp,
      (array['Bar bending for slab 12, Tower A', 'Shuttering check before pour', 'Curing: slab 11, twice a day', 'Clear debris from level 9', 'Cube samples for slab 11', 'Barricade the lift shaft, level 10'])[i],
      (array['Follow the bar bending schedule sheet BBS-12. Mark each bundle.', 'Check props, levels and joints with the engineer before 3 pm.', 'Ponding water on all bays; log it in the curing register.', 'Stack usable shuttering; scrap goes to the yard.', '6 cubes, label with date and grade, keep in the curing tank.', 'Use the red mesh barricade from the store. Safety first.'])[i],
      current_date + (i % 3), (array['high', 'high', 'normal', 'low', 'normal', 'high'])[i],
      case when i in (3, 4) then 'done' else 'open' end, case when i in (3, 4) then now() - interval '3 hours' end,
      case when i = 3 then 'Done morning and evening' when i = 4 then 'Cleared, 2 trolleys of scrap' end,
      (select user_id from public.contractors where id = v_abc), now() - (i || ' hours')::interval);
  end loop;
  insert into public.crew_tasks (org_id, project_id, contractor_id, employee_id, title, details, due_date, priority, created_by)
  values (p_org, v_flats, v_abc, null, 'Toolbox talk at 8:45: working at height', 'Everyone attends. Harness check before climbing.', current_date + 1, 'high', (select user_id from public.contractors where id = v_abc));
  select id into v_emp from public.employees where user_id = (select id from public.profiles where email in ('employee@remmo.dev', 'employee@plotline.dev') order by email = 'employee@remmo.dev' desc limit 1);
  if v_emp is not null then
    insert into public.crew_tasks (org_id, project_id, contractor_id, employee_id, work_package_id, title, details, due_date, priority, created_by)
    select p_org, coalesce(project_id, v_flats), contractor_id, id, v_wp, 'Check scaffolding ties on the north face', 'Report loose ties to the site engineer before noon.', current_date, 'high', coalesce((select user_id from public.contractors where id = employees.contractor_id), v_staff)
      from public.employees where id = v_emp;
    insert into public.leave_requests (org_id, employee_id, from_date, to_date, kind, reason, status, decided_by, decided_at, decision_note, created_at)
    values (p_org, v_emp, current_date - 40, current_date - 39, 'sick', 'Fever', 'approved', v_staff, now() - interval '41 days', 'Get well soon', now() - interval '42 days'),
           (p_org, v_emp, current_date + 12, current_date + 14, 'festival', 'Going home for Diwali', 'pending', null, null, null, now() - interval '1 day');
  end if;
  insert into public.leave_requests (org_id, employee_id, from_date, to_date, kind, reason, created_at)
  select p_org, id, current_date + 5, current_date + 6, 'casual', 'Family function in Mandya', now() - interval '5 hours'
    from public.employees where org_id = p_org and contractor_id = v_abc and active and id is distinct from v_emp order by employee_code limit 1;
  return 'workspaces seeded';
end $$;
revoke execute on function public.seed_workspaces_demo(uuid) from public, anon, authenticated;
grant execute on function public.seed_workspaces_demo(uuid) to service_role;
