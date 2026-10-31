-- Runs after flats_people_test.sql. Covers partner workspaces: RA bills (contractor raises,
-- developer decides, caps by progress), purchase orders (vendor accepts/dispatches, deliveries
-- close them), vendor price list, crew tasks, supervisor attendance, leave, and approving people
-- who ask to join through the invite link.
\set ON_ERROR_STOP on
\set org     '''00000000-0000-0000-0000-0000000000a1'''
\set project '''00000000-0000-0000-0000-0000000000b1'''
\set seller  '''11111111-1111-1111-1111-111111111111'''
\set buyer1  '''22222222-2222-2222-2222-222222222222'''
\set buyer2  '''33333333-3333-3333-3333-333333333333'''
\set ctr_u   '''44444444-4444-4444-4444-444444444444'''
\set ven_u   '''55555555-5555-5555-5555-555555555555'''
\set emp_u   '''66666666-6666-6666-6666-666666666666'''
\set ctr2_u  '''77777777-7777-7777-7777-777777777777'''

set role authenticated;

-- ---------- RA bills ------------------------------------------------------------
select set_config('request.jwt.claim.sub', :seller, false);
update public.work_packages set progress = 40 where title = 'Storm water drains Block A';  -- contract 18 L -> 7.2 L billable
select id as wp_id from public.work_packages where title = 'Storm water drains Block A' \gset
select set_config('test.wp', :'wp_id', false);

select set_config('request.jwt.claim.sub', :ctr_u, false);
select (b).status = 'submitted' and (b).net_payable = round(400000 * (1 + 0.18 - 0.05 - 0.01), 2) as bill_submitted_with_net
  from (select public.submit_contractor_bill(jsonb_build_object('work_package_id', current_setting('test.wp'), 'gross_amount', 400000, 'invoice_number', 'ABC/01')) as b) x;
do $$ begin
  perform public.submit_contractor_bill(jsonb_build_object('work_package_id', current_setting('test.wp'), 'gross_amount', 400000));
  raise exception 'bill above progress accepted';
exception when others then if sqlerrm not like '%BILL_EXCEEDS_PROGRESS%' then raise; end if; end $$;
select true as bill_capped_by_progress;
do $$ begin
  insert into public.contractor_bills (org_id, project_id, contractor_id, gross_amount) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', public.my_contractor_id(), 1);
  raise exception 'contractor inserted a bill directly';
exception when insufficient_privilege then null; end $$;
select true as bills_only_through_function;
do $$ begin
  perform public.decide_contractor_bill((select id from public.contractor_bills limit 1), 'verified');
  raise exception 'contractor approved own bill';
exception when others then if sqlerrm not like '%NOT_ALLOWED%' then raise; end if; end $$;
select true as contractor_cannot_approve_own_bill;

select set_config('request.jwt.claim.sub', :ctr2_u, false);
select count(*) = 0 as other_contractor_cannot_see_bill from public.contractor_bills;
do $$ begin
  perform public.submit_contractor_bill(jsonb_build_object('work_package_id', current_setting('test.wp'), 'gross_amount', 1000));
  raise exception 'billed someone else''s work';
exception when others then if sqlerrm not like '%NOT_YOUR_WORK%' and sqlerrm not like '%NOT_A_CONTRACTOR%' then raise; end if; end $$;
select true as cannot_bill_others_work;

select set_config('request.jwt.claim.sub', :seller, false);
do $$ begin
  perform public.decide_contractor_bill((select id from public.contractor_bills limit 1), 'paid', null, 'X');
  raise exception 'skipped approval';
exception when others then if sqlerrm not like '%BAD_TRANSITION%' then raise; end if; end $$;
select true as bill_steps_in_order;
select (public.decide_contractor_bill(id, 'verified')).status = 'verified' as bill_verified from public.contractor_bills;
select (public.decide_contractor_bill(id, 'approved', 'Measured on site')).status = 'approved' as bill_approved from public.contractor_bills;
do $$ begin
  perform public.decide_contractor_bill((select id from public.contractor_bills limit 1), 'paid');
  raise exception 'paid without a reference';
exception when others then if sqlerrm not like '%PAYMENT_REF_REQUIRED%' then raise; end if; end $$;
select true as payment_needs_reference;
select (b).status = 'paid' and (b).paid_at is not null as bill_paid
  from (select public.decide_contractor_bill(id, 'paid', null, 'NEFT123') as b from public.contractor_bills) x;
select set_config('request.jwt.claim.sub', :ctr_u, false);
select count(*) >= 3 as contractor_notified_of_bill_steps from public.notifications where user_id = :ctr_u and title like 'RA-%';

-- ---------- Purchase orders --------------------------------------------------------
select set_config('request.jwt.claim.sub', :seller, false);
insert into public.purchase_orders (org_id, project_id, vendor_id, items, required_by, delivery_location)
select :org, :project, id, jsonb_build_array(jsonb_build_object('material_id', (select id from public.materials where name = 'Cement OPC 53'), 'name', 'Cement OPC 53', 'unit', 'bag', 'qty', 100, 'rate', 380)), current_date + 5, 'Block A store'
  from public.vendors where user_id = :ven_u;
select subtotal = 38000 and total = 44840 as po_totals_computed from public.purchase_orders;

select set_config('request.jwt.claim.sub', :ven_u, false);
select count(*) = 1 as vendor_sees_po from public.purchase_orders;
select count(*) >= 1 as vendor_notified_of_po from public.notifications where user_id = :ven_u and title like 'New purchase order%';
do $$ begin
  perform public.vendor_respond_po((select id from public.purchase_orders limit 1), true, null);
  raise exception 'accepted without a date';
exception when others then if sqlerrm not like '%PROMISE_DATE_REQUIRED%' then raise; end if; end $$;
select true as accept_needs_date;
select (public.vendor_respond_po(id, true, current_date + 3, 'OK')).status = 'accepted' as vendor_accepted from public.purchase_orders;
select (public.vendor_dispatch_po(id, 'ka 01 ab 1234')).vehicle_number = 'KA 01 AB 1234' as vendor_dispatched from public.purchase_orders;
insert into public.deliveries (org_id, project_id, vendor_id, material_id, quantity, invoice_number, location, po_id)
select :org, :project, public.my_vendor_id(), (select id from public.materials where name = 'Cement OPC 53'), 100, 'INV-PO-1', 'Block A store', id from public.purchase_orders;
select status = 'delivered' as delivery_closes_po from public.purchase_orders;
do $$ begin
  update public.purchase_orders set status = 'closed';
  if exists (select 1 from public.purchase_orders where status = 'closed') then raise exception 'vendor edited the PO'; end if;
end $$;
select true as vendor_cannot_edit_po;

select set_config('request.jwt.claim.sub', :ctr2_u, false);
select count(*) = 0 as others_cannot_see_po from public.purchase_orders;

-- vendor price list: own rows only
select set_config('request.jwt.claim.sub', :ven_u, false);
insert into public.vendor_catalog (org_id, vendor_id, name, unit, rate) select :org, public.my_vendor_id(), 'Cement PPC', 'bag', 355;
select count(*) = 1 as vendor_price_list_saved from public.vendor_catalog;
do $$ begin
  insert into public.vendor_catalog (org_id, vendor_id, name, unit, rate) values ('00000000-0000-0000-0000-0000000000a1', gen_random_uuid(), 'Fake', 'bag', 1);
  raise exception 'wrote someone else''s price list';
exception when insufficient_privilege or foreign_key_violation then null; end $$;
select true as price_list_own_only;

-- paying an accepted delivery
select set_config('request.jwt.claim.sub', :seller, false);
select (public.accept_delivery(id, 100, 'OK')).status = 'accepted' as po_delivery_accepted from public.deliveries where invoice_number = 'INV-PO-1';
select (public.mark_delivery_paid(id, 'UTR998')).payment_ref = 'UTR998' as delivery_paid from public.deliveries where invoice_number = 'INV-PO-1';

-- ---------- Crew tasks, attendance, leave --------------------------------------------
select set_config('request.jwt.claim.sub', :ctr_u, false);
select id as ravi from public.employees where employee_code = 'EMP-1042' \gset
select set_config('test.ravi', :'ravi', false);
select (public.contractor_assign_task(jsonb_build_object('employee_id', current_setting('test.ravi'), 'title', 'Fix DB in Block A', 'priority', 'high'))).status = 'open' as task_assigned;
select set_config('request.jwt.claim.sub', :ctr2_u, false);
do $$ begin
  perform public.contractor_assign_task(jsonb_build_object('employee_id', current_setting('test.ravi'), 'title', 'Steal a worker'));
  raise exception 'assigned another crew''s worker';
exception when others then if sqlerrm not like '%NOT_YOUR_CREW%' and sqlerrm not like '%NOT_A_CONTRACTOR%' then raise; end if; end $$;
select true as cannot_task_other_crew;
select set_config('request.jwt.claim.sub', :emp_u, false);
select count(*) = 1 as employee_sees_task from public.crew_tasks;
select (public.update_crew_task(id, 'done', 'Done')).status = 'done' as employee_finished_task from public.crew_tasks;

select set_config('request.jwt.claim.sub', :ctr_u, false);
select public.mark_crew_attendance(current_setting('test.ravi')::uuid, (now() at time zone 'Asia/Kolkata')::date - 2, true) = 'present' as supervisor_marked_present;
do $$ begin
  perform public.mark_crew_attendance(current_setting('test.ravi')::uuid, (now() at time zone 'Asia/Kolkata')::date - 20, true);
  raise exception 'marked an old day';
exception when others then if sqlerrm not like '%DATE_OUT_OF_RANGE%' then raise; end if; end $$;
select true as attendance_window_limited;

select set_config('request.jwt.claim.sub', :emp_u, false);
select (public.request_leave(current_date + 10, current_date + 11, 'casual', 'Wedding')).status = 'pending' as leave_requested;
do $$ begin
  perform public.request_leave(current_date + 11, current_date + 12, 'casual', 'Again');
  raise exception 'overlapping leave accepted';
exception when others then if sqlerrm not like '%OVERLAPS_EXISTING_LEAVE%' then raise; end if; end $$;
select true as overlapping_leave_blocked;
select set_config('request.jwt.claim.sub', :ctr2_u, false);
select count(*) = 0 as other_contractor_cannot_see_leave from public.leave_requests;
select set_config('request.jwt.claim.sub', :ctr_u, false);
select count(*) >= 1 as contractor_notified_of_leave from public.notifications where user_id = :ctr_u and title like 'Leave request%';
select (public.decide_leave(id, true, 'Enjoy')).status = 'approved' as crew_leave_approved from public.leave_requests;
select set_config('request.jwt.claim.sub', :emp_u, false);
select count(*) >= 1 as employee_notified_of_leave from public.notifications where user_id = :emp_u and title = 'Leave approved';

-- ---------- Joining through the invite link ---------------------------------------
select set_config('request.jwt.claim.sub', :buyer2, false);
do $$ begin
  perform public.decide_access_request((select id from public.access_requests limit 1), true);
  raise exception 'buyer approved a request';
exception when others then if sqlerrm not like '%NOT_ALLOWED%' and sqlerrm not like '%NOT_FOUND%' then raise; end if; end $$;
select true as only_developer_approves;
select set_config('request.jwt.claim.sub', :seller, false);
select (public.decide_access_request(id, true)).status = 'approved' as access_approved from public.access_requests where role = 'vendor' and full_name = 'Buyer One';
select count(*) = 1 as vendor_record_created from public.vendors where user_id = :buyer1 and company_name = 'One Supplies';
reset role;
select role = 'vendor' as joiner_role_updated from public.profiles where id = :buyer1;
\echo WORKSPACES TESTS RAN
