-- =====================================================================
-- 0014  AI LAYER — the data the AI features read and write.
--   * Baseline plan per work package (planned % by date, planned qty,
--     material budget) so progress can be judged "against the plan".
--   * Progress history (every change is logged) for velocity forecasts.
--   * ai_insights: every alert, suggestion and weekly report, with an
--     approve / dismiss trail. The AI suggests; people decide.
--   * doc_chunks: searchable text of documents and the project FAQ.
--   * plot_events: views / enquiries / holds — demand signals for pricing.
--   * market_factors: stated assumptions behind price outlooks.
-- Rule: numbers come from the database; the AI only explains them.
-- =====================================================================

-- ---------- Baseline plan ------------------------------------------
alter table public.work_packages
  add column planned_qty numeric(14,2) check (planned_qty is null or planned_qty > 0),
  add column qty_unit    text;

create table public.wp_plan_points (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  work_package_id uuid not null references public.work_packages (id) on delete cascade,
  planned_date    date not null,
  planned_pct     numeric(5,2) not null check (planned_pct between 0 and 100),
  note            text,
  unique (work_package_id, planned_date)
);

create table public.wp_material_budget (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  work_package_id uuid not null references public.work_packages (id) on delete cascade,
  material_id     uuid not null references public.materials (id) on delete cascade,
  planned_qty     numeric(12,2) not null check (planned_qty > 0),
  unique (work_package_id, material_id)
);

create table public.wp_progress_log (
  id              bigint generated always as identity primary key,
  org_id          uuid not null references public.organizations (id) on delete cascade,
  work_package_id uuid not null references public.work_packages (id) on delete cascade,
  progress        numeric(5,2) not null,
  note            text,
  logged_by       uuid default auth.uid(),
  logged_at       timestamptz not null default now()
);
create index wp_progress_log_wp_idx on public.wp_progress_log (work_package_id, logged_at);

create or replace function public.log_wp_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.progress is distinct from old.progress then
    insert into public.wp_progress_log (org_id, work_package_id, progress) values (new.org_id, new.id, new.progress);
  end if;
  return new;
end $$;
create trigger work_packages_progress_log
  after insert or update of progress on public.work_packages
  for each row execute function public.log_wp_progress();

-- ---------- AI insights, reports and suggestions ---------------------
create table public.ai_insights (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references public.organizations (id) on delete cascade,
  project_id             uuid references public.projects (id) on delete cascade,
  scope                  text not null check (scope in ('project', 'contractor', 'work_package', 'material', 'crew', 'vendor', 'lead', 'plot')),
  subject_id             uuid,
  kind                   text not null,
  severity               text not null default 'info' check (severity in ('good', 'info', 'warn', 'critical')),
  title                  text not null,
  body                   text,
  data                   jsonb not null default '{}',
  suggestion             jsonb,
  status                 text not null default 'open' check (status in ('open', 'applied', 'dismissed')),
  source                 text not null default 'rules' check (source in ('rules', 'ai')),
  shared_with_contractor boolean not null default false,
  created_by             uuid default auth.uid(),
  created_at             timestamptz not null default now(),
  decided_by             uuid references public.profiles (id),
  decided_at             timestamptz
);
create index ai_insights_org_idx on public.ai_insights (org_id, status, created_at desc);
create index ai_insights_subject_idx on public.ai_insights (subject_id, kind);

alter table public.projects add column ai_summary jsonb;   -- public project health, written by the analysis run

-- Results of photo and invoice checks. Kept out of the deliveries / construction_updates rows,
-- which vendors and buyers can read: these are for developer staff only.
create table public.ai_checks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  kind        text not null check (kind in ('photo', 'invoice')),
  subject_id  uuid not null,     -- construction_updates.id or deliveries.id
  result      jsonb not null,
  created_at  timestamptz not null default now(),
  unique (kind, subject_id)
);

create table public.ai_usage (
  id            bigint generated always as identity primary key,
  org_id        uuid references public.organizations (id) on delete cascade,
  feature       text not null,
  model         text,
  input_tokens  int,
  output_tokens int,
  actor         text,
  created_at    timestamptz not null default now()
);
create index ai_usage_actor_idx on public.ai_usage (actor, created_at desc);

-- ---------- Knowledge for document Q&A -------------------------------
create table public.doc_chunks (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.organizations (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  document_id uuid references public.documents (id) on delete cascade,
  booking_id  uuid references public.bookings (id) on delete cascade,
  visibility  public.doc_visibility not null default 'public',
  title       text not null,
  heading     text,
  content     text not null,
  tsv         tsvector generated always as (
                setweight(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(heading, '')), 'A')
                || setweight(to_tsvector('english', content), 'B')) stored,
  check (visibility <> 'buyer' or booking_id is not null)
);
create index doc_chunks_tsv_idx on public.doc_chunks using gin (tsv);
create index doc_chunks_project_idx on public.doc_chunks (project_id);

-- ---------- Demand signals and market assumptions --------------------
create table public.plot_events (
  id         bigint generated always as identity primary key,
  org_id     uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  plot_id    uuid not null references public.plots (id) on delete cascade,
  kind       text not null check (kind in ('view', 'compare', 'match', 'enquiry', 'hold')),
  created_at timestamptz not null default now()
);
create index plot_events_plot_idx on public.plot_events (plot_id, kind, created_at desc);

create table public.market_factors (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  kind          text not null default 'infrastructure' check (kind in ('trend', 'infrastructure')),
  label         text not null,
  status        text not null default 'existing' check (status in ('existing', 'under_construction', 'planned')),
  impact_pct    numeric(5,2) not null default 0,   -- % per year this adds (trend: the base rate itself)
  expected_year int,
  source        text,
  sort_order    int not null default 0
);

-- ---------- Row-level security ---------------------------------------
alter table public.wp_plan_points     enable row level security;
alter table public.wp_material_budget enable row level security;
alter table public.wp_progress_log    enable row level security;
alter table public.ai_insights        enable row level security;
alter table public.ai_usage           enable row level security;
alter table public.doc_chunks         enable row level security;
alter table public.plot_events        enable row level security;
alter table public.market_factors     enable row level security;
alter table public.ai_checks          enable row level security;

create or replace function public.wp_is_mine(p_wp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.work_packages w where w.id = p_wp and w.contractor_id = public.my_contractor_id());
$$;

create policy plan_read on public.wp_plan_points for select
  using (public.is_org_member(org_id) or public.is_admin() or public.wp_is_mine(work_package_id));
create policy plan_write on public.wp_plan_points for all
  using (public.is_org_member(org_id) or public.is_admin()) with check (public.is_org_member(org_id) or public.is_admin());
create policy budget_read on public.wp_material_budget for select
  using (public.is_org_member(org_id) or public.is_admin() or public.wp_is_mine(work_package_id));
create policy budget_write on public.wp_material_budget for all
  using (public.is_org_member(org_id) or public.is_admin()) with check (public.is_org_member(org_id) or public.is_admin());
create policy progress_log_read on public.wp_progress_log for select
  using (public.is_org_member(org_id) or public.is_admin() or public.wp_is_mine(work_package_id));
revoke insert, update, delete on public.wp_progress_log from anon, authenticated;

create policy insights_read on public.ai_insights for select
  using (public.is_org_member(org_id) or public.is_admin()
         or (shared_with_contractor and scope = 'contractor' and subject_id = public.my_contractor_id()));
create policy insights_write on public.ai_insights for all
  using (public.is_org_member(org_id) or public.is_admin()) with check (public.is_org_member(org_id) or public.is_admin());

create policy checks_staff on public.ai_checks for all
  using (public.is_org_member(org_id) or public.is_admin()) with check (public.is_org_member(org_id) or public.is_admin());

create policy usage_read on public.ai_usage for select using (public.is_org_member(org_id) or public.is_admin());
revoke insert, update, delete on public.ai_usage from anon, authenticated;

create policy chunks_read on public.doc_chunks for select
  using (public.is_org_member(org_id) or public.is_admin()
         or (visibility = 'public' and public.project_is_public(project_id))
         or (visibility = 'buyer' and exists (select 1 from public.bookings b where b.id = booking_id and b.buyer_id = auth.uid())));
create policy chunks_write on public.doc_chunks for all
  using (public.is_org_member(org_id) or public.is_admin()) with check (public.is_org_member(org_id) or public.is_admin());

create policy plot_events_read on public.plot_events for select using (public.is_org_member(org_id) or public.is_admin());
revoke insert, update, delete on public.plot_events from anon, authenticated;

create policy factors_read on public.market_factors for select
  using (public.project_is_public(project_id) or public.is_org_member(org_id) or public.is_admin());
create policy factors_write on public.market_factors for all
  using (public.is_org_member(org_id) or public.is_admin()) with check (public.is_org_member(org_id) or public.is_admin());

-- ---------- Functions -------------------------------------------------
-- Buyers' browsers record views / compares / matches (no personal data).
create or replace function public.track_plot_event(p_plot uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.plots;
begin
  if p_kind not in ('view', 'compare', 'match') then raise exception 'BAD_KIND'; end if;
  select * into v from public.plots where id = p_plot;
  if v.id is null or not public.project_is_public(v.project_id) then return; end if;
  insert into public.plot_events (org_id, project_id, plot_id, kind) values (v.org_id, v.project_id, v.id, p_kind);
end $$;
revoke execute on function public.track_plot_event(uuid, text) from public;
grant execute on function public.track_plot_event(uuid, text) to anon, authenticated;

create or replace function public.on_plot_demand()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'plots' then
    if new.status = 'held' and old.status <> 'held' then
      insert into public.plot_events (org_id, project_id, plot_id, kind) values (new.org_id, new.project_id, new.id, 'hold');
    end if;
  elsif new.interested_plot_id is not null and new.project_id is not null then
    insert into public.plot_events (org_id, project_id, plot_id, kind) values (new.org_id, new.project_id, new.interested_plot_id, 'enquiry');
  end if;
  return new;
end $$;
create trigger plots_demand_hold after update of status on public.plots
  for each row execute function public.on_plot_demand();
create trigger leads_demand_enquiry after insert on public.leads
  for each row execute function public.on_plot_demand();

-- Ranked full-text search over the documents a caller may read (RLS applies).
-- Passages containing every word come first; passages with any of the words fill the rest.
create or replace function public.search_docs(p_project uuid, p_query text, p_limit int default 6)
returns table (id bigint, title text, heading text, content text, visibility public.doc_visibility, document_id uuid, rank real)
language sql stable security invoker set search_path = public as $$
  with q as (
    select websearch_to_tsquery('english', coalesce(p_query, '')) as q_all,
           (select to_tsquery('english', string_agg(quote_literal(x.lexeme) || ':*', ' | '))
              from unnest(to_tsvector('english', coalesce(p_query, ''))) x) as q_any
  )
  select c.id, c.title, c.heading, c.content, c.visibility, c.document_id,
         (2 * ts_rank_cd(c.tsv, q.q_all) + coalesce(ts_rank_cd(c.tsv, q.q_any), 0))::real as rank
  from public.doc_chunks c, q
  where c.project_id = p_project and (c.tsv @@ q.q_all or (q.q_any is not null and c.tsv @@ q.q_any))
  order by (c.tsv @@ q.q_all) desc, rank desc
  limit p_limit;
$$;
grant execute on function public.search_docs(uuid, text, int) to anon, authenticated;

revoke execute on function public.log_wp_progress(), public.on_plot_demand() from public, anon, authenticated;

-- ---------- Demo content for the AI features --------------------------
-- Baseline plans, budgets, progress history, demand signals, market
-- assumptions and the project FAQ, derived from the demo organization's
-- existing rows. Called by scripts/seed.mjs; service role only.
create or replace function public.seed_ai_demo(p_org uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  w record; p record; b record; i int; n int; t0 date; t1 date; today date := (now() at time zone 'Asia/Kolkata')::date;
  planned_now numeric; offset_pp numeric; gamma numeric; v_project uuid; d date; k int; s text;
begin
  select id into v_project from public.projects where org_id = p_org and status = 'ongoing' order by created_at limit 1;
  if v_project is null then return 'no ongoing project'; end if;

  delete from public.wp_plan_points where org_id = p_org;
  delete from public.wp_material_budget where org_id = p_org;
  delete from public.wp_progress_log where org_id = p_org;
  delete from public.plot_events where org_id = p_org;
  delete from public.market_factors where org_id = p_org;
  delete from public.doc_chunks where org_id = p_org and document_id is null;
  delete from public.ai_insights where org_id = p_org;

  for w in select wp.*, c.company_name from public.work_packages wp join public.contractors c on c.id = wp.contractor_id
           where wp.org_id = p_org and wp.start_date is not null and wp.due_date is not null loop
    -- planned quantity (BOQ) by package type
    update public.work_packages set
      planned_qty = case when w.title ilike '%drain%' then 1850 when w.title ilike '%road%' then 2400 when w.title ilike '%light%' then 64
                         when w.title ilike '%tank%' then 1 when w.title ilike '%clubhouse%' then 4200 when w.title ilike '%park%' then 9500
                         when w.title ilike '%wall%' then 1150 end,
      qty_unit = case when w.title ilike '%drain%' then 'm of drain' when w.title ilike '%road%' then 'm of road' when w.title ilike '%light%' then 'poles'
                      when w.title ilike '%tank%' then 'tank' when w.title ilike '%clubhouse%' then 'sq ft built' when w.title ilike '%park%' then 'sq ft landscaped'
                      when w.title ilike '%wall%' then 'm of wall' end
    where id = w.id;

    -- how far the plan says it should be today, relative to actual (mix of on-track / at-risk / behind / ahead)
    offset_pp := case when w.title ilike '%drain%' then 1 when w.title ilike '%road%' then 12 when w.title ilike '%tank%' then 18
                      when w.title ilike '%clubhouse%' then -6 when w.title ilike '%park%' then -1 else 0 end;
    gamma := case when w.title ilike '%road%' or w.title ilike '%tank%' or w.title ilike '%light%' then 0.65
                  when w.title ilike '%clubhouse%' then 1.3 when w.title ilike '%park%' then 1.2 else 1.0 end;
    t0 := w.start_date; t1 := w.due_date;
    -- give open packages dates consistent with their pace: f < 1 means the plan asks for more than the
    -- current pace (behind), f > 1 leaves slack (ahead); the overdue street-light package keeps its date
    if w.progress < 100 and w.due_date > today then
      if w.title ilike '%park%' then t0 := today - 70; end if;
      planned_now := gamma * w.progress / greatest(1, today - t0);       -- recent pace, points per day
      t1 := today + ceil((100 - w.progress) / greatest(planned_now, 0.05)
                         * case when w.title ilike '%road%' then 0.7 when w.title ilike '%tank%' then 0.72
                                when w.title ilike '%clubhouse%' then 1.25 when w.title ilike '%park%' then 1.05 else 1.0 end)::int;
      update public.work_packages set start_date = t0, due_date = t1 where id = w.id;
    end if;
    if w.progress >= 100 then
      insert into public.wp_plan_points (org_id, work_package_id, planned_date, planned_pct)
      values (p_org, w.id, t0, 0), (p_org, w.id, t0 + (least(t1, today) - t0) / 2, 55), (p_org, w.id, least(t1, today - 30), 100)
      on conflict do nothing;
    elsif t1 <= today then
      insert into public.wp_plan_points (org_id, work_package_id, planned_date, planned_pct)
      values (p_org, w.id, t0, 0), (p_org, w.id, t0 + (t1 - t0) / 4, 18), (p_org, w.id, t0 + (t1 - t0) / 2, 50),
             (p_org, w.id, t0 + 3 * (t1 - t0) / 4, 82), (p_org, w.id, t1, 100);
    else
      planned_now := greatest(1, least(97, w.progress + offset_pp));
      insert into public.wp_plan_points (org_id, work_package_id, planned_date, planned_pct)
      values (p_org, w.id, t0, 0),
             (p_org, w.id, t0 + greatest(1, (today - t0) / 2), round(planned_now * 0.42, 1)),
             (p_org, w.id, today, round(planned_now, 1)),
             (p_org, w.id, today + greatest(1, (t1 - today) / 2), round(planned_now + (100 - planned_now) * 0.6, 1)),
             (p_org, w.id, t1, 100)
      on conflict do nothing;
    end if;

    -- weekly progress history that ends at today's actual progress
    d := case when w.progress >= 100 then least(t1, today - 30) else today end;
    n := greatest(2, (d - t0) / 7);
    for k in 1..n loop
      d := t0 + k * 7;
      insert into public.wp_progress_log (org_id, work_package_id, progress, note, logged_at)
      values (p_org, w.id, round(w.progress * power(k::numeric / n, gamma), 1), null, (d::timestamp + interval '17 hours') at time zone 'Asia/Kolkata');
    end loop;
  end loop;

  -- material budgets (planned quantity for the whole package)
  insert into public.wp_material_budget (org_id, work_package_id, material_id, planned_qty)
  select p_org, wp.id, m.id, x.qty
  from public.work_packages wp
  join (values ('%drain%', 'Cement OPC 53', 330), ('%drain%', 'RCC pipes 600 mm', 40), ('%drain%', 'TMT steel 12 mm', 2),
               ('%tank%', 'Cement OPC 53', 200), ('%tank%', 'TMT steel 12 mm', 3),
               ('%clubhouse%', 'Cement OPC 53', 360), ('%clubhouse%', 'Concrete blocks 6"', 12000), ('%clubhouse%', 'TMT steel 12 mm', 8),
               ('%light%', 'XLPE cable 4C 25 sq mm', 2600), ('%light%', 'Street light poles 7 m', 30),
               ('%road%', '20 mm aggregate', 20), ('%road%', 'M-sand', 22)) x(pat, mat, qty) on wp.title ilike x.pat
  join public.materials m on m.org_id = p_org and m.name = x.mat
  where wp.org_id = p_org
  on conflict do nothing;

  -- demand signals over the last 30 days (views, compares, matches, enquiries)
  insert into public.plot_events (org_id, project_id, plot_id, kind, created_at)
  select pl.org_id, pl.project_id, pl.id, 'view', now() - (g.n || ' hours')::interval * 7.3
  from public.plots pl
  cross join lateral generate_series(1, (3 + abs(hashtext(pl.plot_number)) % 9
      + case when pl.plot_number in ('B05', 'A04', 'C06', 'D05', 'B06') then 26 when pl.is_corner then 8 when pl.facing in ('east', 'north') then 5 else 0 end
      - case when pl.plot_number in ('D04', 'A07', 'C02') then 3 else 0 end)) g(n)
  where pl.project_id = v_project and pl.status = 'available';
  insert into public.plot_events (org_id, project_id, plot_id, kind, created_at)
  select pl.org_id, pl.project_id, pl.id, k.kind, now() - (g.n || ' days')::interval
  from public.plots pl
  cross join (values ('compare'), ('match')) k(kind)
  cross join lateral generate_series(1, case when pl.plot_number in ('B05', 'A04', 'C06', 'D05') then 4 when pl.is_corner then 2 else 1 end) g(n)
  where pl.project_id = v_project and pl.status = 'available';
  insert into public.plot_events (org_id, project_id, plot_id, kind, created_at)
  select l.org_id, l.project_id, l.interested_plot_id, 'enquiry', l.created_at
  from public.leads l where l.org_id = p_org and l.interested_plot_id is not null;
  insert into public.plot_events (org_id, project_id, plot_id, kind, created_at)
  select pl.org_id, pl.project_id, pl.id, 'hold', now() - (g.n * 5 || ' days')::interval
  from public.plots pl cross join generate_series(1, 2) g(n)
  where pl.project_id = v_project and pl.plot_number in ('B05', 'D05', 'A04');

  -- market assumptions behind the price outlook (clearly marked as demo)
  insert into public.market_factors (org_id, project_id, kind, label, status, impact_pct, expected_year, source, sort_order) values
    (p_org, v_project, 'trend', 'Bengaluru North plotted land, long-run trend', 'existing', 6.5, null, 'Demo assumption: replace with your own market research', 0),
    (p_org, v_project, 'infrastructure', 'International airport about 15 minutes away', 'existing', 1.0, null, 'Demo assumption', 1),
    (p_org, v_project, 'infrastructure', 'Airport metro line', 'under_construction', 2.0, 2027, 'Demo assumption: check the latest BMRCL timeline', 2),
    (p_org, v_project, 'infrastructure', 'Satellite town ring road', 'under_construction', 1.0, 2027, 'Demo assumption', 3),
    (p_org, v_project, 'infrastructure', 'Proposed business park nearby', 'planned', 1.5, 2029, 'Demo assumption: plans can change', 4);

  -- project knowledge base for document Q&A (public)
  insert into public.doc_chunks (org_id, project_id, visibility, title, heading, content)
  select p_org, v_project, 'public', 'Project FAQ (sample)', x.h, x.c from (values
    ('Booking and token', 'You can hold a plot online for 15 minutes and pay a booking token of 10% of the plot price. The token confirms the booking in your name. The plot is then marked Booked on the site map.'),
    ('Payment plan', 'The standard payment plan is: 10% token at booking, 20% at the agreement for sale within 30 days, 30% when the internal roads and drains are complete, and the remaining 40% at sale deed registration. Each installment can be paid online from the My property page.'),
    ('Cancellation and refund', 'If a buyer cancels after booking and before the agreement for sale, the full token is refunded minus a processing fee of Rs 25,000. After the agreement for sale, 10% of the plot price is retained as cancellation charges and the balance is refunded within 45 days, as per the agreement. If the developer cannot hand over the plot, the full amount is refunded with interest as required under RERA Section 18.'),
    ('Delay in handover', 'If handover is delayed beyond the date in the agreement, the developer pays interest on the amount paid for every month of delay, at the rate prescribed under the Karnataka RERA rules, as required by RERA Section 18.'),
    ('Possession and registration', 'The sale deed is registered at the sub-registrar office once the development milestone is reached and the final installment is paid. Stamp duty and registration charges are paid by the buyer at the time of registration. Possession is handed over after registration.'),
    ('Approvals and RERA', 'The layout plan is approved by the local planning authority and the land has been converted for residential use (DC conversion order). The project is registered with Karnataka RERA; the registration number is shown on every listing. Copies of the approvals and title documents are in the Documents section.'),
    ('Infrastructure and amenities', 'The layout has 40 ft main roads and 30 ft internal roads, underground drainage, storm water drains, street lights with underground cabling, an overhead water tank, a central park, a clubhouse and a compound wall with a gated entrance and security cabin.'),
    ('Maintenance charges', 'Maintenance of common areas (roads, street lights, park, security) is charged at Rs 3 per sq ft per month from handover, billed yearly. The first year of maintenance is included in the plot price.'),
    ('Building on your plot', 'Buyers can start construction after registration and possession. Building plans must follow the approved layout setbacks and height rules. Water and electricity connections are applied for through the association after possession.'),
    ('Home loans', 'Plot loans and composite plot-plus-construction loans are available from most banks for approved layouts. Banks typically lend up to 70 to 75 percent of the plot value. The developer can share approval documents with your bank.'),
    ('Resale and transfer', 'Before registration, a booking can be transferred to another buyer with the developer''s consent and a transfer fee of 1% of the plot price. After registration, the plot is freely transferable by the owner.'),
    ('Site visits', 'Site visits are available every day from 10 am to 6 pm. Book a visit from any project page and our team will confirm the time and share the location.')
  ) x(h, c);

  -- buyer-specific agreement terms for each live booking (visible only to that buyer)
  for b in select bk.id, bk.total_amount, bk.token_amount, bk.created_at, pl.plot_number, pl.area_sqft, pl.dimensions, pr.full_name
           from public.bookings bk join public.plots pl on pl.id = bk.plot_id left join public.profiles pr on pr.id = bk.buyer_id
           where bk.org_id = p_org and bk.status in ('confirmed', 'registered', 'handed_over') loop
    select string_agg(ps.label || ': Rs ' || to_char(ps.amount, 'FM99,99,99,999') || coalesce(' due ' || to_char(ps.due_date, 'DD Mon YYYY'), coalesce(' (' || ps.due_note || ')', ''))
                      || case when ps.status = 'paid' then ' (paid)' else '' end, '; ' order by ps.sort_order)
      into s from public.payment_schedule ps where ps.booking_id = b.id;
    insert into public.doc_chunks (org_id, project_id, booking_id, visibility, title, heading, content) values
      (p_org, v_project, b.id, 'buyer', 'Agreement for sale · ' || b.plot_number, 'Plot and price',
       'Plot ' || b.plot_number || ' measuring ' || b.area_sqft || ' sq ft (' || coalesce(b.dimensions, '') || ') is sold to ' || coalesce(b.full_name, 'the buyer')
       || ' for a total price of Rs ' || to_char(b.total_amount, 'FM99,99,99,999') || '. The booking token of Rs ' || to_char(b.token_amount, 'FM99,99,99,999')
       || ' was paid on ' || to_char(b.created_at, 'DD Mon YYYY') || '.'),
      (p_org, v_project, b.id, 'buyer', 'Agreement for sale · ' || b.plot_number, 'Payment schedule', 'Installments for plot ' || b.plot_number || ': ' || coalesce(s, 'as per the standard plan') || '.'),
      (p_org, v_project, b.id, 'buyer', 'Agreement for sale · ' || b.plot_number, 'Cancellation by the buyer',
       'If the buyer cancels plot ' || b.plot_number || ' after signing this agreement, 10% of the total price (Rs ' || to_char(round(b.total_amount * 0.1), 'FM99,99,99,999')
       || ') is retained and the balance paid is refunded within 45 days without interest.'),
      (p_org, v_project, b.id, 'buyer', 'Agreement for sale · ' || b.plot_number, 'Handover date',
       'The developer will complete the layout development and hand over plot ' || b.plot_number || ' on or before 31 December 2027. For any delay, interest is paid on the amount received as per RERA Section 18.');
  end loop;

  -- two deliveries with problems for the invoice checks: a reused invoice number at a higher rate,
  -- and an unusually large load on a truck with an invalid number plate
  delete from public.deliveries where org_id = p_org and location = 'Gate 1' and status = 'pending_inspection';
  insert into public.deliveries (org_id, project_id, vendor_id, material_id, quantity, unit_cost, vehicle_number, invoice_number, location, created_at, delivered_at)
  select p_org, v_project, v.id, m.id, x.qty, round(coalesce(m.unit_cost, 390) * x.rate_f), x.vehicle, x.inv, 'Gate 1', now() - x.ago, now() - x.ago
  from (values ('INV-10199', 200::numeric, 1.18::numeric, 'KA 01 AB 1234', interval '3 hours'),
               ('INV-10241', 700::numeric, 1.0::numeric, 'KA5 B 77', interval '26 hours')) x(inv, qty, rate_f, vehicle, ago)
  join public.vendors v on v.org_id = p_org and v.company_name = 'XYZ Materials'
  join public.materials m on m.org_id = p_org and m.name = 'Cement OPC 53';

  return 'ok';
end $$;
revoke execute on function public.seed_ai_demo(uuid) from public, anon, authenticated;
grant execute on function public.seed_ai_demo(uuid) to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.ai_insights;
  end if;
end $$;

-- ---------- Sharing reports with contractors -------------------------
-- Staff share a report or alert; the contractor's portal login is notified.
create or replace function public.share_ai_insight(p_insight uuid)
returns public.ai_insights language plpgsql security definer set search_path = public as $$
declare i public.ai_insights; c public.contractors;
begin
  select * into i from public.ai_insights where id = p_insight for update;
  if i.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_org_member(i.org_id) or public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  if i.scope <> 'contractor' or i.subject_id is null then raise exception 'NOT_SHAREABLE'; end if;
  update public.ai_insights set shared_with_contractor = true where id = i.id returning * into i;
  select * into c from public.contractors where id = i.subject_id;
  if c.user_id is not null then
    perform public.notify_user(c.user_id, i.title, left(coalesce(i.body, ''), 160), '/portal#reports');
  end if;
  perform public.log_activity(i.org_id, i.project_id, 'info', 'Shared with ' || coalesce(c.company_name, 'contractor') || ': ' || i.title);
  return i;
end $$;
revoke execute on function public.share_ai_insight(uuid) from public, anon;
grant execute on function public.share_ai_insight(uuid) to authenticated;

