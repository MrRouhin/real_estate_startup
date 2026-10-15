-- End-to-end test of schema + security + booking flow on plain Postgres.
\set ON_ERROR_STOP on
\set seller  '''11111111-1111-1111-1111-111111111111'''
\set buyer1  '''22222222-2222-2222-2222-222222222222'''
\set buyer2  '''33333333-3333-3333-3333-333333333333'''

insert into auth.users (id, phone) values
  (:seller, '+919000000001'), (:buyer1, '+919000000002'), (:buyer2, '+919000000003');
select count(*) = 3 as profiles_auto_created from public.profiles;

\i supabase/tests/fixture_seed.sql
update public.profiles set role = 'seller' where id = :seller;
insert into public.organization_members (org_id, user_id, org_role)
values ('00000000-0000-0000-0000-0000000000a1', :seller, 'owner');

-- ---- Buyer 1 browses and holds A01 --------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :buyer1, false);
select count(*) = 12 as buyer_sees_published_plots from public.plots;
select status, held_by is not null as held from public.hold_plot(
  (select id from public.plots where plot_number = 'A01'));

-- buyer cannot edit a price directly (RLS: 0 rows changed)
update public.plots set price = 1 where plot_number = 'A02';
select price > 1 as price_untouched from public.plots where plot_number = 'A02';

-- buyer cannot make themselves admin
do $$ begin
  update public.profiles set role = 'admin' where id = auth.uid();
  raise exception 'SHOULD HAVE FAILED';
exception when insufficient_privilege then raise notice 'OK: role change blocked';
end $$;

-- ---- Buyer 2 tries the same plot ----------------------------------
select set_config('request.jwt.claim.sub', :buyer2, false);
do $$ begin
  perform public.hold_plot((select id from public.plots where plot_number = 'A01'));
  raise exception 'SHOULD HAVE FAILED';
exception when others then
  if sqlerrm <> 'PLOT_NOT_AVAILABLE' then raise; end if;
  raise notice 'OK: second buyer blocked (%)', sqlerrm;
end $$;

-- ---- Buyer 1 starts the booking -----------------------------------
select set_config('request.jwt.claim.sub', :buyer1, false);
select status, total_amount, token_amount,
       token_amount = round(total_amount * 0.10, 2) as token_is_10pct
from public.start_booking((select id from public.plots where plot_number = 'A01'));

-- ---- Server (service role) creates the Razorpay order record -------
reset role;
set role service_role;
insert into public.payments (booking_id, org_id, buyer_id, amount, razorpay_order_id)
select id, org_id, buyer_id, token_amount, 'order_TEST123' from public.bookings;

-- webhook arrives twice: second call must change nothing
select status from public.mark_payment_paid('order_TEST123', 'pay_TEST999');
select status from public.mark_payment_paid('order_TEST123', 'pay_TEST999');
select status = 'booked' as plot_booked from public.plots where plot_number = 'A01';
select count(*) = 1 as one_notification from public.notifications;

-- ---- Visibility checks --------------------------------------------
reset role; set role authenticated;
select set_config('request.jwt.claim.sub', :buyer2, false);
select count(*) = 0 as buyer2_cannot_see_buyer1_booking from public.bookings;
select count(*) = 0 as buyer2_cannot_see_payments from public.payments;
select set_config('request.jwt.claim.sub', :buyer1, false);
select count(*) = 1 as buyer1_sees_own_booking from public.bookings;
select count(*) = 1 as buyer1_has_notification from public.notifications;
select set_config('request.jwt.claim.sub', :seller, false);
select count(*) = 1 as seller_sees_booking from public.bookings;
select count(*) = 1 as seller_sees_buyer_profile from public.profiles
 where id = '22222222-2222-2222-2222-222222222222';

-- buyer cannot call the webhook function
select set_config('request.jwt.claim.sub', :buyer1, false);
do $$ begin
  perform public.mark_payment_paid('order_TEST123', 'x');
  raise exception 'SHOULD HAVE FAILED';
exception when insufficient_privilege then raise notice 'OK: buyer cannot confirm payments';
end $$;

-- ---- Hold expiry ---------------------------------------------------
select set_config('request.jwt.claim.sub', :buyer2, false);
select status from public.hold_plot((select id from public.plots where plot_number = 'A03'));
reset role;
update public.plots set held_until = now() - interval '1 minute' where plot_number = 'A03';
set role service_role;
select public.release_expired_holds() = 1 as one_hold_released;
select status = 'available' as a03_free_again from public.plots where plot_number = 'A03';

-- ---- Price history logged on change -------------------------------
reset role; set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
update public.plots set price = 2600000 where plot_number = 'A04';
select count(*) = 2 as price_history_has_two_rows from public.plot_price_history ph
 join public.plots p on p.id = ph.plot_id where p.plot_number = 'A04';
reset role;
\echo ALL TESTS RAN
