-- =====================================================================
-- 0008  CRM — leads pipeline, activities, site visits
-- Buyers' enquiries from the app land here as leads. Sales staff move
-- them through stages; a confirmed booking marks the lead as won.
-- =====================================================================

create type public.lead_stage as enum ('new', 'contacted', 'site_visit', 'negotiation', 'won', 'lost');

create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations (id) on delete cascade,
  project_id          uuid references public.projects (id) on delete set null,
  full_name           text not null check (length(full_name) between 2 and 120),
  phone               text not null,                    -- digits only, e.g. 919845012345
  email               text,
  source              text not null default 'app'
                      check (source in ('app', 'website', 'walk_in', 'referral', 'portal', 'social', 'broker')),
  stage               public.lead_stage not null default 'new',
  budget_min          numeric(14,2),
  budget_max          numeric(14,2),
  preferred_size      int,
  preferred_facing    public.facing,
  interested_plot_id  uuid references public.plots (id) on delete set null,
  message             text,
  assigned_to         uuid references public.profiles (id) on delete set null,
  buyer_id            uuid references public.profiles (id) on delete set null,
  next_follow_up_at   timestamptz,
  lost_reason         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, phone)
);
create index leads_org_stage_idx on public.leads (org_id, stage);

create table public.lead_activities (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.organizations (id) on delete cascade,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  type        text not null check (type in ('note', 'call', 'whatsapp', 'email', 'site_visit', 'stage_change', 'enquiry', 'system')),
  body        text not null,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);

create table public.site_visits (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  lead_id       uuid not null references public.leads (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete set null,
  scheduled_at  timestamptz not null,
  status        text not null default 'scheduled' check (status in ('scheduled', 'completed', 'no_show', 'cancelled')),
  feedback      text,
  created_at    timestamptz not null default now()
);
create index site_visits_org_idx on public.site_visits (org_id, scheduled_at);

alter table public.leads           enable row level security;
alter table public.lead_activities enable row level security;
alter table public.site_visits     enable row level security;

create policy leads_staff on public.leads for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());
create policy lead_activities_staff on public.lead_activities for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());
create policy site_visits_staff on public.site_visits for all
  using (public.is_org_member(org_id) or public.is_admin())
  with check (public.is_org_member(org_id) or public.is_admin());

-- ---------- Public enquiry form (app / website) ----------------------
create or replace function public.submit_enquiry(
  p_project uuid, p_name text, p_phone text, p_email text default null, p_message text default null,
  p_plot uuid default null, p_visit_at timestamptz default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org   uuid;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_lead  public.leads;
begin
  if not public.project_is_public(p_project) then raise exception 'PROJECT_NOT_FOUND'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'NAME_REQUIRED'; end if;
  if length(v_phone) = 10 then v_phone := '91' || v_phone; end if;
  if length(v_phone) not between 11 and 13 then raise exception 'BAD_PHONE'; end if;
  if p_visit_at is not null and p_visit_at < now() then raise exception 'VISIT_IN_PAST'; end if;
  select org_id into v_org from public.projects where id = p_project;

  insert into public.leads (org_id, project_id, full_name, phone, email, source, message, interested_plot_id, buyer_id)
  values (v_org, p_project, trim(p_name), v_phone, nullif(trim(p_email), ''), 'app', p_message, p_plot, auth.uid())
  on conflict (org_id, phone) do update
     set message = coalesce(excluded.message, leads.message),
         interested_plot_id = coalesce(excluded.interested_plot_id, leads.interested_plot_id),
         buyer_id = coalesce(leads.buyer_id, excluded.buyer_id),
         stage = case when leads.stage = 'lost' then 'new' else leads.stage end,
         updated_at = now()
  returning * into v_lead;

  insert into public.lead_activities (org_id, lead_id, type, body, created_by)
  values (v_org, v_lead.id, 'enquiry',
          coalesce(nullif(trim(p_message), ''), 'Enquiry from the app')
          || coalesce(' · interested in plot ' || (select plot_number from public.plots where id = p_plot), ''),
          auth.uid());

  if p_visit_at is not null then
    insert into public.site_visits (org_id, lead_id, project_id, scheduled_at) values (v_org, v_lead.id, p_project, p_visit_at);
    if v_lead.stage in ('new', 'contacted') then
      update public.leads set stage = 'site_visit' where id = v_lead.id;
    end if;
  end if;
  return v_lead.id;
end $$;
grant execute on function public.submit_enquiry(uuid, text, text, text, text, uuid, timestamptz) to anon, authenticated;

-- ---------- Triggers -------------------------------------------------
create or replace function public.on_lead_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.org_id, new.project_id, 'lead',
      'New lead: ' || new.full_name || ' (' || replace(new.source, '_', ' ') || ')');
  elsif new.stage is distinct from old.stage then
    new.updated_at := now();
    insert into public.lead_activities (org_id, lead_id, type, body)
    values (new.org_id, new.id, 'stage_change',
            'Stage: ' || replace(old.stage::text, '_', ' ') || ' → ' || replace(new.stage::text, '_', ' ')
            || coalesce(' (' || new.lost_reason || ')', ''));
    perform public.log_activity(new.org_id, new.project_id,
      case new.stage when 'won' then 'booked' when 'lost' then 'alert' else 'lead' end,
      'Lead ' || new.full_name || ' moved to ' || replace(new.stage::text, '_', ' '));
  end if;
  return new;
end $$;
create trigger leads_insert_activity after insert on public.leads
  for each row execute function public.on_lead_change();
create trigger leads_stage_activity before update of stage on public.leads
  for each row execute function public.on_lead_change();

create or replace function public.on_site_visit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select full_name into v_name from public.leads where id = new.lead_id;
  if tg_op = 'INSERT' then
    insert into public.lead_activities (org_id, lead_id, type, body)
    values (new.org_id, new.lead_id, 'site_visit',
            'Site visit booked for ' || to_char(new.scheduled_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM'));
    perform public.log_activity(new.org_id, new.project_id, 'visit',
      'Site visit: ' || v_name || ' on ' || to_char(new.scheduled_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM'));
  elsif new.status is distinct from old.status then
    insert into public.lead_activities (org_id, lead_id, type, body)
    values (new.org_id, new.lead_id, 'site_visit',
            'Site visit ' || replace(new.status, '_', ' ') || coalesce(': ' || new.feedback, ''));
  end if;
  return new;
end $$;
create trigger site_visits_activity after insert or update on public.site_visits
  for each row execute function public.on_site_visit();

-- A confirmed booking wins the buyer's lead
create or replace function public.on_booking_won()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_phone text;
begin
  if new.status = 'confirmed' and old.status = 'pending_payment' then
    select regexp_replace(coalesce(phone, ''), '\D', '', 'g') into v_phone from public.profiles where id = new.buyer_id;
    update public.leads
       set stage = 'won', buyer_id = new.buyer_id,
           interested_plot_id = coalesce(interested_plot_id, new.plot_id)
     where org_id = new.org_id and stage <> 'won'
       and (buyer_id = new.buyer_id or (v_phone <> '' and phone = v_phone));
  end if;
  return new;
end $$;
create trigger bookings_win_lead after update of status on public.bookings
  for each row execute function public.on_booking_won();
