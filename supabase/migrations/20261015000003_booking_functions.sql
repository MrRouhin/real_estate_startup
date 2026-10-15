-- =====================================================================
-- 0003  BOOKING FLOW — hold a plot, start a booking, confirm payment
-- These run inside the database, so two buyers can never book the
-- same plot, even if they tap "Book" in the same millisecond.
-- =====================================================================

-- 1) Buyer taps "Book": hold the plot for 15 minutes ------------------
create or replace function public.hold_plot(p_plot_id uuid)
returns public.plots
language plpgsql security definer set search_path = public as $$
declare
  v_plot public.plots;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  -- A buyer holds one plot at a time: release any other hold they have
  update public.plots
     set status = 'available', held_by = null, held_until = null
   where held_by = auth.uid() and status = 'held' and id <> p_plot_id;

  -- Atomic: succeeds only if the plot is free (or its old hold expired)
  update public.plots
     set status = 'held', held_by = auth.uid(),
         held_until = now() + interval '15 minutes'
   where id = p_plot_id
     and public.project_is_public(project_id)
     and (status = 'available'
          or (status = 'held' and (held_until < now() or held_by = auth.uid())))
  returning * into v_plot;

  if not found then
    raise exception 'PLOT_NOT_AVAILABLE';
  end if;
  return v_plot;
end $$;

-- 2) Buyer confirms details: create the booking + token installment ---
create or replace function public.start_booking(p_plot_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_plot    public.plots;
  v_pct     numeric;
  v_token   numeric(14,2);
  v_booking public.bookings;
begin
  select * into v_plot from public.plots where id = p_plot_id for update;

  if v_plot.id is null or v_plot.status <> 'held'
     or v_plot.held_by is distinct from auth.uid() or v_plot.held_until < now() then
    raise exception 'HOLD_EXPIRED_OR_MISSING';
  end if;

  if (select kyc_status from public.profiles where id = auth.uid()) = 'rejected' then
    raise exception 'KYC_REJECTED';
  end if;

  -- Token is a % of price set per developer, capped at 10% (RERA s.13)
  select token_percent into v_pct from public.organizations where id = v_plot.org_id;
  v_token := round(v_plot.price * v_pct / 100, 2);

  -- Re-use the buyer's own unpaid booking if they come back
  select * into v_booking from public.bookings
   where plot_id = p_plot_id and buyer_id = auth.uid() and status = 'pending_payment';

  if v_booking.id is null then
    insert into public.bookings (org_id, plot_id, buyer_id, total_amount, token_amount)
    values (v_plot.org_id, v_plot.id, auth.uid(), v_plot.price, v_token)
    returning * into v_booking;

    insert into public.payment_schedule (booking_id, org_id, label, amount, due_date, sort_order)
    values (v_booking.id, v_plot.org_id, 'Token', v_token, current_date, 0);
  end if;

  -- Give the buyer time to finish paying
  update public.plots set held_until = now() + interval '20 minutes' where id = p_plot_id;

  return v_booking;
end $$;

-- 3) Razorpay webhook (server, service role) marks the payment paid ---
create or replace function public.mark_payment_paid(p_order_id text, p_payment_id text)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_pay     public.payments;
  v_booking public.bookings;
  v_plot    public.plots;
begin
  select * into v_pay from public.payments where razorpay_order_id = p_order_id for update;
  if v_pay.id is null then
    raise exception 'UNKNOWN_ORDER';
  end if;

  select * into v_booking from public.bookings where id = v_pay.booking_id for update;

  if v_pay.status = 'paid' then        -- webhook retried: do nothing twice
    return v_booking;
  end if;

  update public.payments
     set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
   where id = v_pay.id;

  update public.payment_schedule set status = 'paid'
   where booking_id = v_booking.id and label = 'Token';

  select * into v_plot from public.plots where id = v_booking.plot_id for update;

  if v_booking.status = 'pending_payment'
     and (v_plot.status = 'available'
          or (v_plot.status = 'held' and v_plot.held_by = v_booking.buyer_id)) then
    update public.plots
       set status = 'booked', held_by = null, held_until = null
     where id = v_plot.id;
    update public.bookings
       set status = 'confirmed', confirmed_at = now()
     where id = v_booking.id
    returning * into v_booking;

    insert into public.notifications (user_id, title, body, link)
    values (v_booking.buyer_id, 'Booking confirmed',
            'Plot ' || v_plot.plot_number || ' is booked in your name.',
            '/my-property/' || v_booking.id);
  else
    -- Someone else got the plot after this buyer's hold ran out:
    -- keep the money record, flag it for a refund by the seller.
    update public.bookings set status = 'refund_due'
     where id = v_booking.id
    returning * into v_booking;
  end if;

  return v_booking;
end $$;

-- 4) Every minute: free expired holds and abandoned bookings ----------
create or replace function public.release_expired_holds()
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update public.bookings b
     set status = 'cancelled'
    from public.plots p
   where b.plot_id = p.id
     and b.status = 'pending_payment'
     and (p.held_by is distinct from b.buyer_id or p.held_until < now())
     and not exists (select 1 from public.payments x
                     where x.booking_id = b.id and x.status = 'paid');

  update public.plots
     set status = 'available', held_by = null, held_until = null
   where status = 'held' and held_until < now();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------- Who may call what ---------------------------------------
revoke execute on function public.hold_plot(uuid)              from public, anon;
revoke execute on function public.start_booking(uuid)          from public, anon;
revoke execute on function public.mark_payment_paid(text, text) from public, anon, authenticated;
revoke execute on function public.release_expired_holds()      from public, anon, authenticated;
grant  execute on function public.hold_plot(uuid)              to authenticated;
grant  execute on function public.start_booking(uuid)          to authenticated;
grant  execute on function public.mark_payment_paid(text, text) to service_role;
grant  execute on function public.release_expired_holds()      to service_role;

-- Schedule the cleanup (Supabase: enable the pg_cron extension first,
-- Dashboard -> Database -> Extensions -> pg_cron). Then run once:
--   select cron.schedule('release-expired-holds', '* * * * *',
--                        'select public.release_expired_holds()');
