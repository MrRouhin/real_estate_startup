-- =====================================================================
-- 0006  CONSTRUCTION MILESTONES, SITE LAYOUT, ACTIVITY FEED
-- Milestones (compound wall, roads, drains…) carry their own % and
-- weight. Every construction update moves one milestone, recomputes
-- the project %, and stores a snapshot so the 3D site view can replay
-- the whole build history update by update.
-- =====================================================================

-- ---------- Site layout + geofence ----------------------------------
alter table public.projects
  add column layout     jsonb,                       -- roads, park, clubhouse… in plan units (0–1000 × 0–700)
  add column site_lat   double precision,
  add column site_lng   double precision,
  add column geofence_m int not null default 300 check (geofence_m between 50 and 5000);

-- ---------- Small helpers --------------------------------------------
create or replace function public.fmt_money(n numeric)
returns text language sql immutable as $$
  select case
    when n is null then '₹0'
    when n >= 10000000 then '₹' || to_char(n / 10000000.0, 'FM999990.00') || ' Cr'
    when n >= 100000   then '₹' || to_char(n / 100000.0, 'FM99990.0') || ' L'
    else '₹' || to_char(n, 'FM999,999,990') end
$$;

create or replace function public.notify_user(p_user uuid, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, link) values (p_user, p_title, p_body, p_link);
$$;
revoke execute on function public.notify_user(uuid, text, text, text) from public, anon, authenticated;

-- ---------- Activity feed (developer console) -----------------------
create table public.activity_log (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.organizations (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete cascade,
  kind        text not null,          -- held, booked, paid, price, lead, visit, update, delivery, stock, attendance, alert, info
  message     text not null,
  actor_id    uuid,
  created_at  timestamptz not null default now()
);
create index activity_log_org_idx on public.activity_log (org_id, created_at desc);
alter table public.activity_log enable row level security;
create policy activity_read on public.activity_log for select
  using (public.is_org_member(org_id) or public.is_admin());
revoke insert, update, delete on public.activity_log from anon, authenticated;

create or replace function public.log_activity(p_org uuid, p_project uuid, p_kind text, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into public.activity_log (org_id, project_id, kind, message, actor_id)
  values (p_org, p_project, p_kind, p_message, auth.uid());
$$;
revoke execute on function public.log_activity(uuid, uuid, text, text) from public, anon, authenticated;

-- ---------- Milestones -----------------------------------------------
create table public.milestones (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  project_id  uuid not null,
  key         text not null check (key in
                ('compound_wall', 'roads', 'drains', 'electrical', 'water_tank', 'park', 'clubhouse')),
  name        text not null,
  weight      numeric(5,2) not null default 1 check (weight > 0),
  progress    numeric(5,2) not null default 0 check (progress between 0 and 100),
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  unique (project_id, key)
);
alter table public.milestones enable row level security;
create policy milestones_read on public.milestones for select
  using (public.project_is_public(project_id) or public.is_org_member(org_id) or public.is_admin());
create policy milestones_write on public.milestones for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

alter table public.construction_updates
  add column milestone_id       uuid references public.milestones (id) on delete set null,
  add column milestone_progress numeric(5,2) check (milestone_progress between 0 and 100),
  add column snapshot           jsonb;   -- { "roads": 70, "park": 20, … } right after this update

-- BEFORE INSERT: move the milestone, recompute the project %, take a snapshot
create or replace function public.apply_construction_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_overall numeric;
  v_snap    jsonb;
begin
  if new.milestone_id is not null and new.milestone_progress is not null then
    update public.milestones
       set progress = new.milestone_progress, updated_at = now()
     where id = new.milestone_id and project_id = new.project_id;
  end if;

  select round(sum(weight * progress) / nullif(sum(weight), 0), 2),
         jsonb_object_agg(key, progress)
    into v_overall, v_snap
    from public.milestones where project_id = new.project_id;

  if v_overall is null then v_overall := new.progress_percent; end if;  -- project without milestones
  if v_overall is not null then
    update public.projects set progress_percent = v_overall where id = new.project_id;
  end if;
  new.progress_percent := v_overall;
  new.snapshot := v_snap;
  return new;
end $$;

drop trigger if exists construction_update_notify on public.construction_updates;

create trigger construction_update_apply
  before insert on public.construction_updates
  for each row execute function public.apply_construction_update();

create or replace function public.on_construction_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_project_buyers(new.project_id, 'Construction update: ' || new.title,
                                       left(coalesce(new.body, ''), 140), '/project/' || new.project_id);
  perform public.log_activity(new.org_id, new.project_id, 'update',
    'Posted update "' || new.title || '" — project now ' || coalesce(round(new.progress_percent)::text, '?') || '%');
  return new;
end $$;

create trigger construction_update_notify
  after insert on public.construction_updates
  for each row execute function public.on_construction_update();

-- ---------- Activity triggers on the sales side ----------------------
create or replace function public.on_plot_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'held' and old.status <> 'held' then
    perform public.log_activity(new.org_id, new.project_id, 'held',
      'Plot ' || new.plot_number || ' is being booked (15-minute hold)');
  elsif old.status = 'held' and new.status = 'available' then
    perform public.log_activity(new.org_id, new.project_id, 'info',
      'Hold on plot ' || new.plot_number || ' expired — back on sale');
  elsif new.status = 'blocked' and old.status <> 'blocked' then
    perform public.log_activity(new.org_id, new.project_id, 'info', 'Plot ' || new.plot_number || ' blocked (kept off sale)');
  end if;
  if new.price is distinct from old.price then
    perform public.log_activity(new.org_id, new.project_id, 'price',
      'Price of ' || new.plot_number || ' changed ' || public.fmt_money(old.price) || ' → ' || public.fmt_money(new.price));
  end if;
  return new;
end $$;

create trigger plots_activity
  after update on public.plots
  for each row execute function public.on_plot_change();

create or replace function public.on_booking_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plot  public.plots;
  v_buyer text;
begin
  if new.status = old.status then return new; end if;
  select * into v_plot from public.plots where id = new.plot_id;
  select coalesce(full_name, 'A buyer') into v_buyer from public.profiles where id = new.buyer_id;
  perform public.log_activity(new.org_id, v_plot.project_id,
    case new.status when 'confirmed' then 'booked' when 'refund_due' then 'alert' else 'info' end,
    case new.status
      when 'confirmed'   then v_buyer || ' booked plot ' || v_plot.plot_number || ' (token paid)'
      when 'registered'  then 'Sale deed registered for plot ' || v_plot.plot_number || ' — ' || v_buyer
      when 'handed_over' then 'Plot ' || v_plot.plot_number || ' handed over to ' || v_buyer
      when 'refund_due'  then 'Refund due to ' || v_buyer || ': payment for ' || v_plot.plot_number || ' arrived after the hold expired'
      when 'cancelled'   then 'Booking for plot ' || v_plot.plot_number || ' cancelled'
      else 'Booking for ' || v_plot.plot_number || ' is now ' || new.status end);
  if new.status in ('registered', 'handed_over') then
    perform public.notify_user(new.buyer_id,
      case new.status when 'registered' then 'Sale deed registered' else 'Plot handed over' end,
      'Plot ' || v_plot.plot_number || '. Congratulations!', '/my-property/' || new.id);
    if new.status = 'registered' then
      update public.plots set status = 'sold' where id = new.plot_id;
    end if;
  end if;
  return new;
end $$;

create trigger bookings_activity
  after update of status on public.bookings
  for each row execute function public.on_booking_change();

create or replace function public.on_payment_paid()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plot  text;
  v_label text;
  v_proj  uuid;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    select pl.plot_number, pl.project_id into v_plot, v_proj
      from public.bookings b join public.plots pl on pl.id = b.plot_id where b.id = new.booking_id;
    select label into v_label from public.payment_schedule where id = new.installment_id;
    perform public.log_activity(new.org_id, v_proj, 'paid',
      public.fmt_money(new.amount) || ' received for plot ' || v_plot || coalesce(' · ' || v_label, ''));
  end if;
  return new;
end $$;

create trigger payments_activity
  after update of status on public.payments
  for each row execute function public.on_payment_paid();

-- Mark the matching installment paid for any installment payment, not just the token
create or replace function public.on_payment_installment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and old.status <> 'paid' and new.installment_id is not null then
    update public.payment_schedule set status = 'paid' where id = new.installment_id;
  end if;
  return new;
end $$;

create trigger payments_installment
  after update of status on public.payments
  for each row execute function public.on_payment_installment();

-- ---------- mark_payment_paid v2: handles later installments too -----
-- (v1 in 0003 only knew about the token; a paid "Agreement" installment on a
--  confirmed booking must not be treated as a late token payment.)
create or replace function public.mark_payment_paid(p_order_id text, p_payment_id text)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_pay     public.payments;
  v_booking public.bookings;
  v_plot    public.plots;
  v_label   text;
begin
  select * into v_pay from public.payments where razorpay_order_id = p_order_id for update;
  if v_pay.id is null then raise exception 'UNKNOWN_ORDER'; end if;

  select * into v_booking from public.bookings where id = v_pay.booking_id for update;
  if v_pay.status = 'paid' then return v_booking; end if;   -- webhook retry: no-op

  update public.payments
     set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
   where id = v_pay.id;

  select * into v_plot from public.plots where id = v_booking.plot_id for update;
  select label into v_label from public.payment_schedule where id = v_pay.installment_id;

  if v_booking.status = 'pending_payment' then
    if v_plot.status = 'available' or (v_plot.status = 'held' and v_plot.held_by = v_booking.buyer_id) then
      update public.plots set status = 'booked', held_by = null, held_until = null where id = v_plot.id;
      update public.bookings set status = 'confirmed', confirmed_at = now()
       where id = v_booking.id returning * into v_booking;
      perform public.notify_user(v_booking.buyer_id, 'Booking confirmed',
        'Plot ' || v_plot.plot_number || ' is booked in your name.', '/my-property/' || v_booking.id);
    else
      update public.bookings set status = 'refund_due' where id = v_booking.id returning * into v_booking;
    end if;
  elsif v_booking.status in ('confirmed', 'registered', 'handed_over') then
    perform public.notify_user(v_booking.buyer_id, 'Payment received',
      coalesce(v_label, 'Installment') || ' of ' || public.fmt_money(v_pay.amount) || ' for plot ' || v_plot.plot_number || '.',
      '/my-property/' || v_booking.id);
  end if;

  return v_booking;
end $$;
revoke execute on function public.mark_payment_paid(text, text) from public, anon, authenticated;
grant  execute on function public.mark_payment_paid(text, text) to service_role;

-- ---------- Payment plan per developer + start_booking v2 ------------
-- v1 created only the token installment. v2 builds the full schedule from
-- the developer's plan; the token % is still capped at 10 (RERA s.13).
alter table public.organizations
  add column payment_plan jsonb not null default
    '[{"label":"Token","pct":10,"note":"At booking"},
      {"label":"Agreement for sale","pct":20,"note":"Within 30 days","days":30},
      {"label":"Development milestone","pct":30,"note":"When roads and drains are complete"},
      {"label":"Registration","pct":40,"note":"At sale deed registration"}]'::jsonb;
alter table public.payment_schedule add column due_note text;

create or replace function public.start_booking(p_plot_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_plot    public.plots;
  v_org     public.organizations;
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
  v_token := round(v_plot.price * least(v_org.token_percent, 10) / 100, 2);

  select * into v_booking from public.bookings
   where plot_id = p_plot_id and buyer_id = auth.uid() and status = 'pending_payment';

  if v_booking.id is null then
    insert into public.bookings (org_id, plot_id, buyer_id, total_amount, token_amount)
    values (v_plot.org_id, v_plot.id, auth.uid(), v_plot.price, v_token)
    returning * into v_booking;

    v_n := jsonb_array_length(v_org.payment_plan);
    for v_step in select value from jsonb_array_elements(v_org.payment_plan) loop
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
