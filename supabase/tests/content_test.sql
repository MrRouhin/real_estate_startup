\set ON_ERROR_STOP on
-- runs after booking_flow_test.sql (buyer1 owns A01, seller is org owner)
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
insert into public.construction_updates (org_id, project_id, title, body, progress_percent)
values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','Roads laid','Internal roads complete.',70);
insert into public.announcements (org_id, project_id, title, body)
values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','Site visit Sunday','Open house 10am-4pm.');
select progress_percent = 70 as project_progress_updated from public.projects;
-- seller uploads a public brochure and a private agreement for buyer1
insert into storage.objects (bucket_id, name) values
 ('documents','00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-0000000000b1/brochure.pdf'),
 ('documents','00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-0000000000b1/agreement-a01.pdf');
insert into public.documents (org_id, project_id, title, category, storage_path, visibility)
values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','Brochure','brochure',
        '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-0000000000b1/brochure.pdf','public');
insert into public.documents (org_id, project_id, booking_id, title, category, storage_path, visibility)
select org_id, '00000000-0000-0000-0000-0000000000b1', id, 'Agreement A01', 'agreement',
       '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-0000000000b1/agreement-a01.pdf','buyer'
from public.bookings;
-- buyer cannot upload into a developer folder
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
do $$ begin
  insert into storage.objects (bucket_id, name) values ('documents','00000000-0000-0000-0000-0000000000a1/x/hack.pdf');
  raise exception 'SHOULD HAVE FAILED';
exception when insufficient_privilege then raise notice 'OK: buyer blocked from developer folder';
end $$;
select count(*) = 1 as buyer2_sees_only_brochure_file from storage.objects where bucket_id='documents';
select count(*) = 0 as buyer2_has_no_notifications from public.notifications;
insert into storage.objects (bucket_id, name) values ('kyc','33333333-3333-3333-3333-333333333333/pan.jpg');
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select count(*) = 2 as buyer1_sees_brochure_and_agreement from storage.objects where bucket_id='documents';
select count(*) = 3 as buyer1_got_booking_update_announcement from public.notifications;
select count(*) = 0 as buyer1_cannot_see_others_kyc from storage.objects where bucket_id='kyc';
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select count(*) = 1 as anon_sees_public_brochure from storage.objects where bucket_id='documents';
reset role;
\echo CONTENT TESTS RAN
