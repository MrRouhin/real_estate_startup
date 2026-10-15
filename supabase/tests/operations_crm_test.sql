-- Runs after booking_flow_test.sql and content_test.sql.
-- Covers milestones → project %, materials ledger, deliveries, contractor
-- usage, attendance geofence, modification quotes, CRM enquiries and wins.
\set ON_ERROR_STOP on
\set org     '''00000000-0000-0000-0000-0000000000a1'''
\set project '''00000000-0000-0000-0000-0000000000b1'''
\set seller  '''11111111-1111-1111-1111-111111111111'''
\set buyer1  '''22222222-2222-2222-2222-222222222222'''
\set buyer2  '''33333333-3333-3333-3333-333333333333'''
\set ctr_u   '''44444444-4444-4444-4444-444444444444'''
\set ven_u   '''55555555-5555-5555-5555-555555555555'''
\set emp_u   '''66666666-6666-6666-6666-666666666666'''

insert into auth.users (id, phone) values (:ctr_u, '919000000004'), (:ven_u, '919000000005'), (:emp_u, '919000000006');
update public.projects set site_lat = 13.2468, site_lng = 77.7120, geofence_m = 300 where id = :project;

-- ---------- Milestones drive the project % ---------------------------
insert into public.milestones (org_id, project_id, key, name, weight, progress, sort_order) values
  (:org, :project, 'compound_wall', 'Compound wall', 1, 100, 1),
  (:org, :project, 'roads', 'Roads', 3, 40, 2),
  (:org, :project, 'drains', 'Storm water drains', 2, 50, 3),
  (:org, :project, 'electrical', 'Electrical', 2, 0, 4),
  (:org, :project, 'water_tank', 'Overhead tank', 1, 0, 5),
  (:org, :project, 'park', 'Park', 0.5, 0, 6),
  (:org, :project, 'clubhouse', 'Clubhouse', 0.5, 0, 7);

set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
insert into public.construction_updates (org_id, project_id, title, body, milestone_id, milestone_progress)
select :org, :project, 'Roads base done', 'Wet mix laid', id, 80 from public.milestones where key = 'roads';
-- (100*1 + 80*3 + 50*2) / 10 = 44
select progress_percent = 44 as project_pct_from_milestones from public.projects where id = :project;
select (snapshot->>'roads')::numeric = 80 and progress_percent = 44 as update_has_snapshot
  from public.construction_updates where title = 'Roads base done';

-- ---------- Contractor, vendor, materials ----------------------------
reset role;
update public.profiles set role = 'contractor' where id = :ctr_u;
update public.profiles set role = 'vendor' where id = :ven_u;
update public.profiles set role = 'employee' where id = :emp_u;
set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
insert into public.contractors (org_id, company_name, trade, user_id) values (:org, 'ABC Constructions', 'civil', :ctr_u);
insert into public.vendors (org_id, company_name, categories, user_id) values (:org, 'XYZ Materials', '{cement,steel}', :ven_u);
insert into public.materials (org_id, name, category, unit, reorder_level, unit_cost) values
  (:org, 'Cement OPC 53', 'cement', 'bags', 100, 390), (:org, 'TMT steel 12mm', 'steel', 'tons', 2, 62000);
insert into public.work_packages (org_id, project_id, contractor_id, title, contract_value, due_date)
select :org, :project, id, 'Storm water drains Block A', 1800000, current_date + 30 from public.contractors;
insert into public.employees (org_id, project_id, contractor_id, employee_code, full_name, role_title, user_id)
select :org, :project, id, 'EMP-1042', 'Ravi Kumar', 'Electrician', :emp_u from public.contractors;

-- vendor records a delivery; cannot pre-accept it
select set_config('request.jwt.claim.sub', :ven_u, false);
insert into public.deliveries (org_id, project_id, vendor_id, material_id, quantity, vehicle_number, invoice_number, location)
select :org, :project, public.my_vendor_id(), id, 200, 'KA 01 AB 1234', 'INV-10234', 'Tower A store'
from public.materials where name = 'Cement OPC 53';
do $$ begin
  insert into public.deliveries (org_id, project_id, vendor_id, material_id, quantity, status, accepted_qty)
  select '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', public.my_vendor_id(), id, 5, 'accepted', 5
  from public.materials where name = 'Cement OPC 53';
  raise exception 'SHOULD HAVE FAILED';
exception when insufficient_privilege then raise notice 'OK: vendor cannot self-accept a delivery';
end $$;
select count(*) = 1 as vendor_sees_own_delivery from public.deliveries;
do $$ begin
  perform public.accept_delivery((select id from public.deliveries limit 1), 200);
  raise exception 'SHOULD HAVE FAILED';
exception when others then
  if sqlerrm <> 'NOT_ALLOWED' then raise; end if; raise notice 'OK: vendor cannot inspect';
end $$;

-- store inspects: 190 good, 10 damaged
select set_config('request.jwt.claim.sub', :seller, false);
select status = 'partially_accepted' as partial_acceptance
  from public.accept_delivery((select id from public.deliveries limit 1), 190, '10 bags torn');
select in_store = 190 and received = 190 and rejected = 10 as stock_after_delivery
  from public.material_stock where name = 'Cement OPC 53';

-- contractor asks for more than the store has → refused at issue time
select set_config('request.jwt.claim.sub', :ctr_u, false);
insert into public.material_requests (org_id, project_id, contractor_id, material_id, quantity, purpose, location)
select :org, :project, public.my_contractor_id(), id, 300, 'Drain bed concrete', 'Block A' from public.materials where name = 'Cement OPC 53';
insert into public.material_requests (org_id, project_id, contractor_id, material_id, quantity, purpose, location)
select :org, :project, public.my_contractor_id(), id, 120, 'Drain walls', 'Block A' from public.materials where name = 'Cement OPC 53';
do $$ begin
  update public.material_requests set status = 'issued';
  raise exception 'SHOULD HAVE FAILED';
exception when insufficient_privilege then raise notice 'OK: contractor cannot mark own request issued';
end $$;
select set_config('request.jwt.claim.sub', :seller, false);
do $$ begin
  perform public.issue_material((select id from public.material_requests where quantity = 300));
  raise exception 'SHOULD HAVE FAILED';
exception when others then
  if sqlerrm <> 'INSUFFICIENT_STOCK' then raise; end if; raise notice 'OK: cannot issue more than in store';
end $$;
select status = 'issued' as issued_120 from public.issue_material((select id from public.material_requests where quantity = 120));
select in_store = 70 and at_site = 120 as stock_after_issue from public.material_stock where name = 'Cement OPC 53';

-- contractor reports usage; cannot report more than they hold
select set_config('request.jwt.claim.sub', :ctr_u, false);
select public.record_site_usage(:project, public.my_contractor_id(),
  (select id from public.materials where name = 'Cement OPC 53'), 100, 8, 'Drain walls 40 m');
do $$ begin
  perform public.record_site_usage('00000000-0000-0000-0000-0000000000b1', public.my_contractor_id(),
    (select id from public.materials where name = 'Cement OPC 53'), 50, 0, null);
  raise exception 'SHOULD HAVE FAILED';
exception when others then
  if sqlerrm <> 'NOT_ENOUGH_AT_SITE' then raise; end if; raise notice 'OK: usage capped by material at site';
end $$;
select issued = 120 and consumed = 100 and wastage = 8 and at_site = 12 and wastage_pct = 7.4 as contractor_usage
  from public.contractor_material_usage;
select count(*) = 0 as contractor_cannot_see_leads from public.leads;

-- ---------- Attendance with geofence --------------------------------
select set_config('request.jwt.claim.sub', :emp_u, false);
select inside_geofence and distance_m < 300 as checked_in_inside
  from public.check_in(13.2470, 77.7122, null, 'Street light cabling');
do $$ begin
  perform public.check_in(13.2470, 77.7122, null, null);
  raise exception 'SHOULD HAVE FAILED';
exception when others then
  if sqlerrm <> 'ALREADY_CHECKED_IN' then raise; end if; raise notice 'OK: one check-in per day';
end $$;
select check_out_at is not null as checked_out from public.check_out('Done for the day');
select count(*) = 1 as employee_sees_own_attendance from public.attendance;

-- ---------- Modification request: buyer must approve the quote -------
select set_config('request.jwt.claim.sub', :buyer1, false);
insert into public.modification_requests (org_id, booking_id, buyer_id, requirement)
select org_id, id, buyer_id, 'Change living room flooring to vitrified tiles' from public.bookings where buyer_id = :buyer1;
select set_config('request.jwt.claim.sub', :buyer2, false);
select count(*) = 0 as other_buyer_cannot_see_mod from public.modification_requests;
select set_config('request.jwt.claim.sub', :seller, false);
update public.modification_requests set quoted_cost = 85000, status = 'quoted', deadline = current_date + 20,
       contractor_id = (select id from public.contractors limit 1);
select set_config('request.jwt.claim.sub', :buyer1, false);
select count(*) >= 1 as buyer_notified_of_quote from public.notifications where title like 'Quote ready%';
select status = 'approved' as buyer_approved from public.respond_to_quote((select id from public.modification_requests limit 1), true);

-- ---------- CRM -----------------------------------------------------
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select public.submit_enquiry(:project, 'Kiran Rao', '98450 77777', 'kiran@example.com', 'Looking for east facing',
                             null, now() + interval '3 days') is not null as anon_enquiry_ok;
do $$ begin
  perform public.submit_enquiry('00000000-0000-0000-0000-0000000000b1', 'X', '123', null, null, null, null);
  raise exception 'SHOULD HAVE FAILED';
exception when others then
  if sqlerrm <> 'NAME_REQUIRED' then raise; end if; raise notice 'OK: enquiry validated';
end $$;
select count(*) = 0 as anon_cannot_read_leads from public.leads;
reset role; set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
select stage = 'site_visit' and phone = '919845077777' as lead_created_with_visit from public.leads where full_name = 'Kiran Rao';
select count(*) = 1 as visit_scheduled from public.site_visits;
update public.leads set stage = 'negotiation' where full_name = 'Kiran Rao';
select count(*) = 4 as lead_timeline from public.lead_activities
  where lead_id = (select id from public.leads where full_name = 'Kiran Rao');   -- enquiry, visit, new→site_visit, site_visit→negotiation

-- the same buyer enquires again → same lead, no duplicate
reset role; set role anon;
select public.submit_enquiry(:project, 'Kiran Rao', '+91 98450-77777', null, 'Second message', null, null) is not null;
reset role; set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
select count(*) = 1 as no_duplicate_lead from public.leads where full_name = 'Kiran Rao';

-- a confirmed booking wins the lead (buyer2 enquires while signed in, then books)
select set_config('request.jwt.claim.sub', :buyer2, false);
select public.submit_enquiry(:project, 'Buyer Two', '9000000003', null, 'Plot A04 please', null, null) is not null;
select status = 'held' from public.hold_plot((select id from public.plots where plot_number = 'A04'));
select status = 'pending_payment' from public.start_booking((select id from public.plots where plot_number = 'A04'));
reset role; set role service_role;
insert into public.payments (booking_id, org_id, buyer_id, amount, razorpay_order_id, installment_id)
select b.id, b.org_id, b.buyer_id, b.token_amount, 'order_WIN', s.id
from public.bookings b join public.payment_schedule s on s.booking_id = b.id and s.label = 'Token'
where b.buyer_id = :buyer2;
select status = 'confirmed' as booking2_confirmed from public.mark_payment_paid('order_WIN', 'pay_WIN');
-- a later installment on a confirmed booking must NOT become refund_due
insert into public.payments (booking_id, org_id, buyer_id, amount, razorpay_order_id, installment_id)
select b.id, b.org_id, b.buyer_id, s.amount, 'order_AGR', s.id
from public.bookings b join public.payment_schedule s on s.booking_id = b.id and s.label = 'Agreement for sale'
where b.buyer_id = :buyer2;
select status = 'confirmed' as installment_keeps_booking from public.mark_payment_paid('order_AGR', 'pay_AGR');
select s.status = 'paid' as installment_marked_paid from public.payment_schedule s
  join public.bookings b on b.id = s.booking_id where b.buyer_id = :buyer2 and s.label = 'Agreement for sale';
reset role; set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
select stage = 'won' as lead_won_on_booking from public.leads where phone = '919000000003';

-- ---------- Activity feed --------------------------------------------
select count(*) >= 10 as activity_feed_populated from public.activity_log;
select count(*) >= 1 as feed_has_delivery from public.activity_log where kind = 'delivery';
select count(*) >= 1 as feed_has_wastage_or_stock from public.activity_log where kind in ('stock', 'alert');
select set_config('request.jwt.claim.sub', :buyer1, false);
select count(*) = 0 as buyer_cannot_read_feed from public.activity_log;
reset role;
\echo OPS CRM TESTS RAN
