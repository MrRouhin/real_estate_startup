-- =====================================================================
-- 0005  CONTENT + NOTIFICATIONS
-- Storage rules for documents/media, push tokens, and automatic
-- notifications to buyers when the developer posts news.
-- =====================================================================

-- ---------- Push tokens (one per device) -----------------------------
create table public.push_tokens (
  token      text primary key,               -- Expo push token
  user_id    uuid not null references public.profiles (id) on delete cascade,
  platform   text check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy push_tokens_own on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Notify every buyer of a project --------------------------
create or replace function public.notify_project_buyers(
  p_project uuid, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, link)
  select distinct b.buyer_id, p_title, p_body, p_link
  from public.bookings b
  join public.plots pl on pl.id = b.plot_id
  where pl.project_id = p_project
    and b.status in ('confirmed', 'registered', 'handed_over');
$$;
revoke execute on function public.notify_project_buyers(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.on_construction_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.progress_percent is not null then
    update public.projects set progress_percent = new.progress_percent where id = new.project_id;
  end if;
  perform public.notify_project_buyers(new.project_id, 'Construction update: ' || new.title,
                                       left(coalesce(new.body, ''), 140), '/project/' || new.project_id);
  return new;
end $$;

create trigger construction_update_notify
  after insert on public.construction_updates
  for each row execute function public.on_construction_update();

create or replace function public.on_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_project_buyers(new.project_id, new.title,
                                       left(coalesce(new.body, ''), 140), '/project/' || new.project_id);
  return new;
end $$;

create trigger announcement_notify
  after insert on public.announcements
  for each row execute function public.on_announcement();

-- ---------- Storage rules -------------------------------------------
-- Bucket 'documents' (private). Files live at  <org_id>/<project_id>/<file>
-- Anyone may read a file exactly when they may see its row in public.documents.
create policy "documents read via table" on storage.objects for select to anon, authenticated
  using (bucket_id = 'documents'
         and exists (select 1 from public.documents d where d.storage_path = storage.objects.name));
create policy "documents write own org" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents'
              and public.is_org_member(((storage.foldername(name))[1])::uuid));
create policy "media write own org" on storage.objects for insert to authenticated
  with check (bucket_id in ('project-media', 'layouts')
              and public.is_org_member(((storage.foldername(name))[1])::uuid));
create policy "org files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('documents', 'project-media', 'layouts')
         and public.is_org_member(((storage.foldername(name))[1])::uuid));

-- Bucket 'kyc' (private). Files live at  <user_id>/<file>
create policy "kyc upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kyc read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and ((storage.foldername(name))[1] = auth.uid()::text
         or public.is_admin()));
