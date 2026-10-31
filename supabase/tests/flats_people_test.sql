-- Runs after ai_layer_test.sql. Covers flats (booking with a construction-linked
-- plan, tower progress), profiles (employee self-service, contractor crew
-- control, company profiles), letters and access requests.
\set ON_ERROR_STOP on
\set org     '''00000000-0000-0000-0000-0000000000a1'''
\set seller  '''11111111-1111-1111-1111-111111111111'''
\set buyer1  '''22222222-2222-2222-2222-222222222222'''
\set buyer2  '''33333333-3333-3333-3333-333333333333'''
\set ctr_u   '''44444444-4444-4444-4444-444444444444'''
\set ven_u   '''55555555-5555-5555-5555-555555555555'''
\set emp_u   '''66666666-6666-6666-6666-666666666666'''
\set ctr2_u  '''77777777-7777-7777-7777-777777777777'''

insert into auth.users (id, phone) values (:ctr2_u, '919000000007');
update public.profiles set role = 'contractor' where id = :ctr2_u;

-- ---------- An apartment project with one tower and four flats ---------
set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
insert into public.projects (id, org_id, name, slug, status, is_published, kind, payment_plan)
values ('00000000-0000-0000-0000-0000000000b2', :org, 'Test Heights', 'test-heights', 'ongoing', true, 'apartments',
  '[{"label":"Booking","pct":10},{"label":"Agreement","pct":10,"days":30},{"label":"Slab 4","pct":30,"slab":4},{"label":"Possession","pct":50}]');
insert into public.towers (id, org_id, project_id, code, name, floors, units_per_floor)
values ('00000000-0000-0000-0000-0000000000c1', :org, '00000000-0000-0000-0000-0000000000b2', 'T', 'Tower T', 4, 1);
insert into public.unit_types (id, org_id, project_id, code, name, bedrooms, bathrooms, carpet_sqft, super_sqft, base_rate, layout)
values ('00000000-0000-0000-0000-0000000000d1', :org, '00000000-0000-0000-0000-0000000000b2', '2BHK', '2 BHK', 2, 2, 900, 1250, 6000, '{"rooms": []}');
insert into public.plots (org_id, project_id, plot_number, area_sqft, price, kind, tower_id, floor, stack, unit_type_id)
select :org, '00000000-0000-0000-0000-0000000000b2', 'T-' || lpad(f::text, 2, '0') || '01', 1250, 7500000 + f * 50000, 'flat',
       '00000000-0000-0000-0000-0000000000c1', f, 1, '00000000-0000-0000-0000-0000000000d1'
from generate_series(1, 4) f;
do $$ begin
  insert into public.plots (org_id, project_id, plot_number, area_sqft, price, kind)
  values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 'T-BAD', 1000, 100000, 'flat');
  raise exception 'flat without a tower was accepted';
exception when check_violation then null; end $$;
select true as flat_needs_tower_and_type;

-- buyer holds and books a flat; the schedule follows the project's construction-linked plan
select set_config('request.jwt.claim.sub', :buyer2, false);
select count(*) = 4 as buyer_sees_flats from public.plots where kind = 'flat';
select status = 'held' as flat_held from public.hold_plot((select id from public.plots where plot_number = 'T-0301'));
select b.token_amount = round(b.total_amount * 0.1, 2) as flat_token_10pct from public.start_booking((select id from public.plots where plot_number = 'T-0301')) b;
select count(*) = 4 and min(label) is not null as flat_schedule_is_project_plan
  from public.payment_schedule s join public.bookings b on b.id = s.booking_id
  join public.plots p on p.id = b.plot_id where p.plot_number = 'T-0301';
select sum(s.amount) = max(b.total_amount) as flat_schedule_adds_up
  from public.payment_schedule s join public.bookings b on b.id = s.booking_id
  join public.plots p on p.id = b.plot_id where p.plot_number = 'T-0301';

-- tower progress: staff only, and it moves the project %
select set_config('request.jwt.claim.sub', :ctr_u, false);
do $$ begin
  perform public.update_tower_progress('00000000-0000-0000-0000-0000000000c1', 2, '{"foundation": 100}', 'Slab 2');
  raise exception 'contractor posted tower progress';
exception when others then if sqlerrm not like '%NOT_ALLOWED%' then raise; end if; end $$;
select true as contractor_cannot_post_tower_progress;
select set_config('request.jwt.claim.sub', :seller, false);
select (u).tower_snapshot->>'slabs_cast' = '2' as tower_update_posted
  from (select public.update_tower_progress('00000000-0000-0000-0000-0000000000c1', 2, '{"foundation": 100, "masonry": 10}', 'Second slab cast') as u) x;
select slabs_cast = 2 and (stages->>'structure')::numeric = 50 as structure_follows_slabs from public.towers where code = 'T';
select progress_percent > 0 as project_progress_from_towers from public.projects where slug = 'test-heights';
do $$ begin
  perform public.update_tower_progress('00000000-0000-0000-0000-0000000000c1', 9, '{}', 'Too many');
  raise exception 'slabs beyond the tower height were accepted';
exception when others then if sqlerrm not like '%BAD_SLABS%' then raise; end if; end $$;
select true as slabs_capped_at_floors;

-- notifications and the feed call flats "Flat"
select public.flatify_text('Plot T-0301 is booked in your name. Hold on plot T-0201 expired') = 'Flat T-0301 is booked in your name. Hold on flat T-0201 expired' as flats_named_flats;
select public.flatify_text('Plot A05 is booked') = 'Plot A05 is booked' as plots_still_plots;

-- ---------- Employee profile: self-service, reviewed by their contractor
select set_config('request.jwt.claim.sub', :emp_u, false);
do $$ begin
  perform public.save_my_employee_profile('{"date_of_birth": "2012-01-01"}', true);
  raise exception 'a minor was accepted';
exception when others then if sqlerrm not like '%AGE_NOT_ALLOWED%' then raise; end if; end $$;
select true as no_minors_on_site;
select (public.save_my_employee_profile('{"date_of_birth": "1992-05-14", "emergency_name": "Lata", "emergency_phone": "98450 11111", "id_type": "aadhaar", "id_last4": "1234 5678 9012", "skills": ["Wiring", " "], "blood_group": "O+", "safety_trained": true, "bank_ifsc": "sbin0001234", "bank_last4": "000123456789"}', true)).status = 'submitted' as employee_submitted;
select id_last4 = '9012' and bank_last4 = '6789' and bank_ifsc = 'SBIN0001234' and skills = array['Wiring'] as only_last4_digits_kept from public.employee_profiles;
do $$ begin
  update public.employee_profiles set status = 'verified';
  raise exception 'employee verified themselves';
exception when insufficient_privilege then null; end $$;
select true as employee_cannot_self_verify;

-- vendor cannot read crew profiles; another contractor cannot review them
select set_config('request.jwt.claim.sub', :ven_u, false);
select count(*) = 0 as vendor_cannot_read_profiles from public.employee_profiles;
reset role;
insert into public.contractors (org_id, company_name, trade, user_id) values (:org, 'Other Builders', 'civil', :ctr2_u);
set role authenticated;
select set_config('request.jwt.claim.sub', :ctr2_u, false);
select count(*) = 0 as other_contractor_cannot_read_profiles from public.employee_profiles;
do $$ begin
  perform public.review_employee_profile((select id from public.employees where employee_code = 'EMP-1042'), 'verified');
  raise exception 'another contractor verified crew';
exception when others then if sqlerrm not like '%NOT_FOUND%' and sqlerrm not like '%NOT_ALLOWED%' then raise; end if; end $$;
select true as other_contractor_cannot_review;
select set_config('request.jwt.claim.sub', :ctr_u, false);
select (public.review_employee_profile((select id from public.employees where employee_code = 'EMP-1042'), 'verified', 'All good')).status = 'verified' as own_contractor_verified;

-- ---------- Contractor manages their crew --------------------------------
select (public.contractor_save_employee('{"full_name": "New Helper", "phone": "9845022222", "role_title": "Helper", "daily_wage": 700}')).contractor_id is not null as contractor_added_crew;
select count(*) = 1 as crew_member_visible from public.employees where full_name = 'New Helper';
reset role;
select id as helper_id from public.employees where full_name = 'New Helper' \gset
set role authenticated;
select set_config('request.jwt.claim.sub', :ctr2_u, false);
select set_config('test.helper', :'helper_id', false);
do $$ begin
  perform public.contractor_save_employee(jsonb_build_object('id', current_setting('test.helper'), 'full_name', 'Hijacked'));
  raise exception 'edited another contractor''s crew';
exception when others then if sqlerrm not like '%NOT_ALLOWED%' then raise; end if; end $$;
select true as cannot_edit_other_crew;

-- ---------- Company profiles -----------------------------------------------
select set_config('request.jwt.claim.sub', :ctr_u, false);
do $$ begin
  perform public.save_my_company_profile('{"gst_number": "12345"}');
  raise exception 'bad GSTIN accepted';
exception when others then if sqlerrm not like '%BAD_GSTIN%' then raise; end if; end $$;
select public.save_my_company_profile('{"gst_number": "29AAACA1111B1Z2", "pan": "AAACA1111B", "team_size": "24"}', true) = 'contractor' as contractor_profile_saved;
select profile_status = 'submitted' and team_size = 24 as contractor_profile_submitted from public.contractors where user_id = :ctr_u;
select set_config('request.jwt.claim.sub', :ven_u, false);
select public.save_my_company_profile('{"categories": ["Cement", " Steel "]}') = 'vendor' as vendor_profile_saved;
select categories = array['cement', 'steel'] as vendor_categories_cleaned from public.vendors where user_id = :ven_u;

-- ---------- Letters ----------------------------------------------------------
select set_config('request.jwt.claim.sub', :seller, false);
insert into public.letters (org_id, kind, recipient_type, recipient_id, subject, body)
select :org, 'work_order', 'contractor', id, 'Work order', 'Body' from public.contractors where user_id = :ctr_u;
select set_config('request.jwt.claim.sub', :ctr_u, false);
select count(*) = 0 as draft_letters_hidden from public.letters;
select set_config('request.jwt.claim.sub', :seller, false);
select (public.issue_letter(id)).status = 'issued' as letter_issued from public.letters where subject = 'Work order';
select set_config('request.jwt.claim.sub', :ctr2_u, false);
select count(*) = 0 as other_contractor_cannot_read_letter from public.letters;
do $$ begin
  perform public.acknowledge_letter((select id from public.letters limit 1));
  raise exception 'someone else acknowledged';
exception when others then if sqlerrm not like '%NOT_FOUND%' and sqlerrm not like '%NOT_ALLOWED%' then raise; end if; end $$;
select true as only_recipient_acknowledges;
select set_config('request.jwt.claim.sub', :ctr_u, false);
select (public.acknowledge_letter(id, 'Received')).status = 'acknowledged' as recipient_acknowledged from public.letters where subject = 'Work order';
select count(*) >= 1 as contractor_notified_of_letter from public.notifications where user_id = :ctr_u and title like 'New letter%';

-- ---------- Access requests ---------------------------------------------------
select set_config('request.jwt.claim.sub', :buyer1, false);
select count(*) = 1 as invite_code_resolves from public.org_by_invite((select invite_code from public.organizations where id = :org));
insert into public.access_requests (org_id, role, full_name, company_name) values (:org, 'vendor', 'Buyer One', 'One Supplies');
do $$ begin
  insert into public.access_requests (org_id, user_id, role, full_name) values ('00000000-0000-0000-0000-0000000000a1', '33333333-3333-3333-3333-333333333333', 'vendor', 'Forged');
  raise exception 'request forged for another user';
exception when insufficient_privilege then null; end $$;
select true as cannot_request_for_someone_else;
select set_config('request.jwt.claim.sub', :buyer2, false);
select count(*) = 0 as requests_private from public.access_requests;
select set_config('request.jwt.claim.sub', :seller, false);
select count(*) = 1 as developer_sees_requests from public.access_requests;
reset role;
\echo FLATS PEOPLE TESTS RAN
