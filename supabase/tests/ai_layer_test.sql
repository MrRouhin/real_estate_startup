-- Runs after operations_crm_test.sql. Covers the AI layer's data rules:
-- progress history, demand signals, document search visibility, insight
-- sharing with contractors, and staff-only check results.
\set ON_ERROR_STOP on
\set org     '''00000000-0000-0000-0000-0000000000a1'''
\set project '''00000000-0000-0000-0000-0000000000b1'''
\set seller  '''11111111-1111-1111-1111-111111111111'''
\set buyer1  '''22222222-2222-2222-2222-222222222222'''
\set ctr_u   '''44444444-4444-4444-4444-444444444444'''
\set ven_u   '''55555555-5555-5555-5555-555555555555'''

-- ---------- Progress history and the baseline plan --------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
select (public.update_work_progress(id, 35, 'walls up')).progress = 35 as progress_updated from public.work_packages limit 1;
select count(*) >= 1 as progress_logged from public.wp_progress_log where progress = 35;
insert into public.wp_plan_points (org_id, work_package_id, planned_date, planned_pct)
select :org, id, current_date, 40 from public.work_packages limit 1;
select count(*) = 1 as staff_can_write_plan from public.wp_plan_points;

-- contractor reads its own plan but cannot change it or write history
select set_config('request.jwt.claim.sub', :ctr_u, false);
select count(*) = 1 as contractor_reads_own_plan from public.wp_plan_points;
update public.wp_plan_points set planned_pct = 1;
select planned_pct = 40 as contractor_cannot_edit_plan from public.wp_plan_points;
do $$ begin
  insert into public.wp_progress_log (org_id, work_package_id, progress) select org_id, id, 99 from public.work_packages limit 1;
  raise exception 'contractor wrote progress history';
exception when insufficient_privilege then null; end $$;
select true as contractor_cannot_forge_history;

-- ---------- Insights: staff only, unless shared with the contractor ---
select set_config('request.jwt.claim.sub', :seller, false);
insert into public.ai_insights (org_id, project_id, scope, subject_id, kind, title, body)
select :org, :project, 'contractor', id, 'weekly_report', 'Weekly report', 'Body' from public.contractors;
insert into public.ai_insights (org_id, project_id, scope, subject_id, kind, title)
values (:org, :project, 'lead', null, 'lead_action', 'Call Priya');
select set_config('request.jwt.claim.sub', :ctr_u, false);
select count(*) = 0 as contractor_cannot_see_unshared from public.ai_insights;
select set_config('request.jwt.claim.sub', :seller, false);
select (public.share_ai_insight(id)).shared_with_contractor as staff_shared from public.ai_insights where kind = 'weekly_report';
select set_config('request.jwt.claim.sub', :ctr_u, false);
select count(*) = 1 as contractor_sees_shared_report from public.ai_insights;
select count(*) >= 1 as contractor_notified from public.notifications where title = 'Weekly report';
do $$ begin
  perform public.share_ai_insight(id) from public.ai_insights;
  raise exception 'contractor shared an insight';
exception when others then if sqlerrm not in ('NOT_ALLOWED') and sqlerrm not like '%NOT_ALLOWED%' then raise; end if; end $$;
select true as contractor_cannot_share;
select set_config('request.jwt.claim.sub', :buyer1, false);
select count(*) = 0 as buyer_cannot_see_insights from public.ai_insights;

-- ---------- Check results are staff-only -----------------------------
select set_config('request.jwt.claim.sub', :seller, false);
insert into public.ai_checks (org_id, kind, subject_id, result)
select :org, 'invoice', id, '{"flags": [{"id": "qty_mismatch"}]}' from public.deliveries limit 1;
select set_config('request.jwt.claim.sub', :ven_u, false);
select count(*) = 0 as vendor_cannot_read_checks from public.ai_checks;
do $$ begin
  insert into public.ai_checks (org_id, kind, subject_id, result) values ('00000000-0000-0000-0000-0000000000a1', 'invoice', gen_random_uuid(), '{}');
  raise exception 'vendor wrote a check';
exception when insufficient_privilege then null; end $$;
select true as vendor_cannot_write_checks;

-- ---------- Demand signals -------------------------------------------
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select public.track_plot_event(id, 'view') from public.plots where project_id = :project limit 2;
select count(*) = 0 as anon_cannot_read_events from public.plot_events;
do $$ begin
  perform public.track_plot_event(id, 'hold') from public.plots limit 1;
  raise exception 'anon logged a hold';
exception when others then if sqlerrm not like '%BAD_KIND%' then raise; end if; end $$;
select true as anon_cannot_fake_holds;
reset role; set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
select count(*) >= 2 as views_recorded from public.plot_events where kind = 'view';
select count(*) >= 1 as enquiries_recorded from public.plot_events where kind = 'enquiry' or kind = 'hold';

-- ---------- Document search: public FAQ for all, agreement for its buyer only
insert into public.doc_chunks (org_id, project_id, visibility, title, heading, content)
values (:org, :project, 'public', 'FAQ', 'Cancellation', 'If a buyer cancels before the agreement, the token is refunded minus a processing fee.');
insert into public.doc_chunks (org_id, project_id, booking_id, visibility, title, heading, content)
select :org, :project, b.id, 'buyer', 'Agreement', 'Cancellation by the buyer', 'Ten percent is retained if the buyer cancels after the agreement.'
from public.bookings b where b.buyer_id = :buyer1 limit 1;
select set_config('request.jwt.claim.sub', :buyer1, false);
select count(*) = 2 as buyer_finds_faq_and_own_agreement from public.search_docs(:project, 'cancel refund', 5);
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select count(*) = 1 and bool_and(visibility = 'public') as anon_finds_only_public from public.search_docs(:project, 'cancel', 5);
reset role;
\echo AI LAYER TESTS RAN
