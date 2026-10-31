-- REMMO 0017: real people from day one.
--   * Any signed-up person can register a developer company and gets an empty console.
--     Projects of a new company go public once the platform verifies the company.
--   * Buyers keep a profile and submit KYC (only the last 4 characters of an ID are stored;
--     the document itself sits in the private 'kyc' bucket). The developer they booked with,
--     or the platform admin, verifies it.
--   * The demo company is flagged so the public site can label it as a sample.

alter table public.organizations add column is_demo boolean not null default false;
update public.organizations set is_demo = true where invite_code = 'GVDEMO26';
grant update (address, website, signatory_name, signatory_title) on public.organizations to authenticated;

alter table public.profiles
  add column address            text,
  add column city               text,
  add column pincode            text check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),
  add column date_of_birth      date,
  add column occupation         text,
  add column preferred_language text,
  add column id_type            text check (id_type is null or id_type in ('Aadhaar', 'PAN', 'Passport', 'Voter ID', 'Driving licence')),
  add column id_last4           text check (id_last4 is null or id_last4 ~ '^[A-Z0-9]{4}$'),
  add column kyc_doc_path       text,
  add column kyc_note           text,
  add column kyc_submitted_at   timestamptz,
  add column kyc_verified_at    timestamptz;
-- people edit their own contact details; KYC fields change only through the functions below
grant update (address, city, pincode, date_of_birth, occupation, preferred_language) on public.profiles to authenticated;

-- names typed at sign-up land on the profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, email, full_name)
  values (new.id, new.phone, new.email, nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''));
  return new;
end $$;

-- ---------------------------------------------------------------- KYC
create or replace function public.submit_my_kyc(p_id_type text, p_id_number text, p_doc_path text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare r public.profiles; v_last4 text := upper(right(regexp_replace(coalesce(p_id_number, ''), '[^A-Za-z0-9]', '', 'g'), 4));
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if length(v_last4) <> 4 then raise exception 'BAD_ID_NUMBER'; end if;
  if p_doc_path is null or split_part(p_doc_path, '/', 1) <> auth.uid()::text then raise exception 'BAD_DOCUMENT'; end if;
  select * into r from public.profiles where id = auth.uid() for update;
  if r.kyc_status = 'verified' then raise exception 'ALREADY_VERIFIED'; end if;
  update public.profiles set id_type = p_id_type, id_last4 = v_last4, kyc_doc_path = p_doc_path, kyc_status = 'submitted',
         kyc_submitted_at = now(), kyc_note = null
   where id = auth.uid() returning * into r;
  return r;
end $$;

-- The developer a buyer has booked with (or the platform admin) verifies the buyer's KYC.
create or replace function public.review_kyc(p_user uuid, p_approve boolean, p_note text default null)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare r public.profiles;
begin
  if not (public.is_admin() or exists (select 1 from public.bookings b where b.buyer_id = p_user and public.is_org_member(b.org_id))) then
    raise exception 'NOT_ALLOWED';
  end if;
  select * into r from public.profiles where id = p_user for update;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if r.kyc_status <> 'submitted' then raise exception 'NOTHING_TO_REVIEW'; end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then raise exception 'NOTE_REQUIRED'; end if;
  update public.profiles set kyc_status = case when p_approve then 'verified' else 'rejected' end,
         kyc_verified_at = case when p_approve then now() end, kyc_note = nullif(trim(p_note), '')
   where id = p_user returning * into r;
  perform public.notify_user(p_user, case when p_approve then 'Your ID is verified' else 'Your ID needs another look' end,
    case when p_approve then 'You can complete bookings without waiting.' else p_note end, '/me/profile');
  return r;
end $$;

-- ---------------------------------------------------------------- developer self sign-up
create or replace function public.create_my_organization(p jsonb)
returns public.organizations language plpgsql security definer set search_path = public as $$
declare o public.organizations; v_role public.app_role; v_name text := trim(coalesce(p->>'name', '')); v_gst text := nullif(upper(trim(coalesce(p->>'gst_number', ''))), ''); v_code text;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('buyer', 'seller') then raise exception 'NOT_ALLOWED'; end if;
  if exists (select 1 from public.organization_members where user_id = auth.uid()) then raise exception 'ALREADY_IN_A_COMPANY'; end if;
  if exists (select 1 from public.bookings where buyer_id = auth.uid() and status not in ('cancelled')) then raise exception 'HAS_BOOKINGS'; end if;
  if length(v_name) < 3 then raise exception 'NAME_REQUIRED'; end if;
  if v_gst is not null and v_gst !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then raise exception 'BAD_GSTIN'; end if;
  loop
    v_code := upper(left(regexp_replace(v_name, '[^A-Za-z]', '', 'g') || 'XXXX', 4)) || (1000 + floor(random() * 9000))::int;
    exit when not exists (select 1 from public.organizations where invite_code = v_code);
  end loop;
  insert into public.organizations (name, gst_number, phone, email, address, website, is_verified, invite_code, signatory_name, signatory_title)
  values (v_name, v_gst, nullif(trim(p->>'phone'), ''), nullif(trim(p->>'email'), ''), nullif(trim(p->>'address'), ''), nullif(trim(p->>'website'), ''), false, v_code,
          (select full_name from public.profiles where id = auth.uid()), coalesce(nullif(trim(p->>'signatory_title'), ''), 'Director'))
  returning * into o;
  insert into public.organization_members (org_id, user_id, org_role) values (o.id, auth.uid(), 'owner');
  update public.profiles set role = 'seller' where id = auth.uid();
  perform public.log_activity(o.id, null, 'info', 'Company created on REMMO');
  return o;
end $$;

-- Platform admin checks RERA/GST and verifies a company, which lets its published projects go public.
create or replace function public.verify_organization(p_org uuid, p_verified boolean)
returns public.organizations language plpgsql security definer set search_path = public as $$
declare o public.organizations; m record;
begin
  if not public.is_admin() then raise exception 'NOT_ALLOWED'; end if;
  update public.organizations set is_verified = p_verified where id = p_org returning * into o;
  if o.id is null then raise exception 'NOT_FOUND'; end if;
  for m in select user_id from public.organization_members where org_id = o.id loop
    perform public.notify_user(m.user_id, case when p_verified then 'Your company is verified' else 'Company verification paused' end,
      case when p_verified then 'Published projects are now visible to buyers.' else 'Your projects are hidden from buyers until verification is restored.' end, '/console');
  end loop;
  return o;
end $$;

revoke execute on function public.submit_my_kyc(text, text, text) from public, anon;
revoke execute on function public.review_kyc(uuid, boolean, text) from public, anon;
revoke execute on function public.create_my_organization(jsonb) from public, anon;
revoke execute on function public.verify_organization(uuid, boolean) from public, anon;
grant execute on function public.submit_my_kyc(text, text, text) to authenticated;
grant execute on function public.review_kyc(uuid, boolean, text) to authenticated;
grant execute on function public.create_my_organization(jsonb) to authenticated;
grant execute on function public.verify_organization(uuid, boolean) to authenticated;

-- The developer a buyer has booked with may open that buyer's KYC document to verify it.
create policy "kyc read by booked developer" on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and exists (select 1 from public.bookings b
                                        where b.buyer_id::text = (storage.foldername(name))[1] and public.is_org_member(b.org_id)));

-- numbering helpers get a fixed search_path like every other function
alter function public.letter_number(bigint, timestamptz) set search_path = public;
alter function public.bill_number(bigint, timestamptz) set search_path = public;
alter function public.po_number(bigint, timestamptz) set search_path = public;
