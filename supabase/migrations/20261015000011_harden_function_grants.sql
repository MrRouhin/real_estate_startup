-- =====================================================================
-- 0011  Hardening from the Supabase security advisor:
-- trigger functions are never meant to be called over the API, and every
-- function gets a fixed search_path. (Triggers keep firing: EXECUTE is
-- only checked when a trigger is created.)
-- =====================================================================
alter function public.fmt_money(numeric) set search_path = public;
revoke execute on function
  public.handle_new_user(), public.log_plot_price(), public.apply_construction_update(),
  public.on_construction_update(), public.on_announcement(), public.on_plot_change(),
  public.on_booking_change(), public.on_payment_paid(), public.on_payment_installment(),
  public.on_delivery_insert(), public.on_request_insert(), public.on_modification_change(),
  public.on_lead_change(), public.on_site_visit(), public.on_booking_won()
from public, anon, authenticated;
