-- Runs after workspaces_test.sql. Covers developer self sign-up, KYC and the demo flag.
\set ON_ERROR_STOP on
\set org     '''00000000-0000-0000-0000-0000000000a1'''
\set seller  '''11111111-1111-1111-1111-111111111111'''
\set buyer1  '''22222222-2222-2222-2222-222222222222'''
\set buyer2  '''33333333-3333-3333-3333-333333333333'''
\set newdev  '''88888888-8888-8888-8888-888888888888'''
\set admin   '''99999999-9999-9999-9999-999999999999'''

insert into auth.users (id, email, raw_user_meta_data) values (:newdev, 'dev@new.test', '{"full_name": "Meera Rao"}'), (:admin, 'admin@remmo.test', '{}');
select full_name = 'Meera Rao' as signup_name_kept from public.profiles where id = :newdev;
update public.profiles set role = 'admin' where id = :admin;

-- ---------- a new developer registers a company ----------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :newdev, false);
do $$ begin
  perform public.create_my_organization('{"name": "Ra"}');
  raise exception 'short name accepted';
exception when others then if sqlerrm not like '%NAME_REQUIRED%' then raise; end if; end $$;
select true as company_needs_a_name;
select (o).is_verified = false and length((o).invite_code) = 8 as company_created_unverified
  from (select public.create_my_organization('{"name": "Rao Homes", "phone": "9845000000", "gst_number": "29ABCDE1234F1Z5"}') as o) x;
select role = 'seller' as creator_is_now_developer from public.profiles where id = :newdev;
select count(*) = 1 as creator_is_owner from public.organization_members where user_id = :newdev and org_role = 'owner';
do $$ begin
  perform public.create_my_organization('{"name": "Second Co"}');
  raise exception 'second company accepted';
exception when others then if sqlerrm not like '%ALREADY_IN_A_COMPANY%' and sqlerrm not like '%NOT_ALLOWED%' then raise; end if; end $$;
select true as one_company_per_person;

-- the new company's published project stays hidden until the platform verifies the company
insert into public.projects (org_id, name, slug, status, is_published, kind)
select org_id, 'Rao Residency', 'rao-residency', 'upcoming', true, 'apartments' from public.organization_members where user_id = :newdev;
select set_config('request.jwt.claim.sub', :buyer2, false);
select count(*) = 0 as unverified_project_hidden from public.projects where slug = 'rao-residency';
do $$ begin
  perform public.verify_organization((select id from public.organizations where name = 'Rao Homes'), true);
  raise exception 'buyer verified a company';
exception when others then if sqlerrm not like '%NOT_ALLOWED%' then raise; end if; end $$;
select true as only_admin_verifies;
select set_config('request.jwt.claim.sub', :admin, false);
select (public.verify_organization(id, true)).is_verified as admin_verified from public.organizations where name = 'Rao Homes';
select set_config('request.jwt.claim.sub', :buyer2, false);
select count(*) = 1 as verified_project_public from public.projects where slug = 'rao-residency';
select set_config('request.jwt.claim.sub', :newdev, false);
select count(*) >= 1 as developer_told_verified from public.notifications where user_id = :newdev and title = 'Your company is verified';

-- ---------- buyer profile and KYC -------------------------------------------
select set_config('request.jwt.claim.sub', :buyer2, false);
update public.profiles set city = 'Bengaluru', pincode = '560064', occupation = 'Engineer' where id = :buyer2;
select city = 'Bengaluru' as buyer_edits_own_profile from public.profiles where id = :buyer2;
do $$ begin
  update public.profiles set kyc_status = 'verified' where id = '33333333-3333-3333-3333-333333333333';
  raise exception 'buyer verified own KYC';
exception when insufficient_privilege then null; end $$;
select true as kyc_status_not_editable;
do $$ begin
  perform public.submit_my_kyc('PAN', 'ABCDE1234F', '22222222-2222-2222-2222-222222222222/id.pdf');
  raise exception 'used someone else''s document';
exception when others then if sqlerrm not like '%BAD_DOCUMENT%' then raise; end if; end $$;
select true as kyc_document_must_be_own;
select (p).kyc_status = 'submitted' and (p).id_last4 = '234F' as kyc_submitted_last4_only
  from (select public.submit_my_kyc('PAN', 'abcde 1234f', '33333333-3333-3333-3333-333333333333/pan.pdf') as p) x;

-- the developer the buyer booked with reviews it; another developer cannot
select set_config('request.jwt.claim.sub', :newdev, false);
do $$ begin
  perform public.review_kyc('33333333-3333-3333-3333-333333333333', true);
  raise exception 'unrelated developer verified KYC';
exception when others then if sqlerrm not like '%NOT_ALLOWED%' then raise; end if; end $$;
select true as unrelated_developer_cannot_review;
select set_config('request.jwt.claim.sub', :seller, false);
do $$ begin
  perform public.review_kyc('33333333-3333-3333-3333-333333333333', false);
  raise exception 'rejected without a reason';
exception when others then if sqlerrm not like '%NOTE_REQUIRED%' then raise; end if; end $$;
select true as rejection_needs_reason;
select (public.review_kyc(:buyer2, true)).kyc_status = 'verified' as booked_developer_verified_kyc;
reset role;
select count(*) >= 1 as buyer_told_kyc_verified from public.notifications where user_id = :buyer2 and title = 'Your ID is verified';
\echo REAL USERS TESTS RAN
