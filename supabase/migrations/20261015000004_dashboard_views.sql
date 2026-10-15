-- =====================================================================
-- 0004  DASHBOARD VIEWS — numbers for the seller dashboard cards
-- security_invoker = true means RLS of the person asking still applies,
-- so each developer only ever counts their own plots and money.
-- =====================================================================
create view public.project_stats with (security_invoker = true) as
select
  p.id                                                   as project_id,
  p.org_id,
  p.name,
  p.progress_percent,
  count(pl.id)                                           as total_plots,
  count(pl.id) filter (where pl.status = 'available')    as available,
  count(pl.id) filter (where pl.status = 'held')         as held,
  count(pl.id) filter (where pl.status = 'booked')       as booked,
  count(pl.id) filter (where pl.status = 'sold')         as sold,
  coalesce((select sum(pay.amount) from public.payments pay
             join public.bookings b on b.id = pay.booking_id
            where b.plot_id in (select id from public.plots where project_id = p.id)
              and pay.status = 'paid'), 0)               as amount_collected
from public.projects p
left join public.plots pl on pl.project_id = p.id
group by p.id;

-- Per-booking money summary: paid so far and balance (never stored)
create view public.booking_balances with (security_invoker = true) as
select
  b.id as booking_id, b.org_id, b.buyer_id, b.plot_id, b.status, b.total_amount,
  coalesce(sum(pay.amount) filter (where pay.status = 'paid'), 0)                  as amount_paid,
  b.total_amount - coalesce(sum(pay.amount) filter (where pay.status = 'paid'), 0) as balance
from public.bookings b
left join public.payments pay on pay.booking_id = b.id
group by b.id;

grant select on public.project_stats, public.booking_balances to authenticated;
