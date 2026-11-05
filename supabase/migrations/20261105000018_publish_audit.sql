-- 0018 PUBLISH AUDIT
-- Every change to a project's publish flag lands in the activity log with who
-- made it, whether it came from the console, the API, a script or the Supabase
-- table editor. A project that disappears from the public site is never a mystery.

create or replace function public.log_project_publish()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_who text;
begin
  if new.is_published is not distinct from old.is_published then
    return new;
  end if;
  if auth.uid() is not null then
    select coalesce(nullif(trim(full_name), ''), email, phone) into v_who
      from public.profiles where id = auth.uid();
  end if;
  insert into public.activity_log (org_id, project_id, kind, message, actor_id)
  values (new.org_id, new.id, 'publish',
          new.name
            || case when new.is_published then ' published' else ' hidden from buyers' end
            || case when auth.uid() is null then ' (changed outside the app)'
                    else ' by ' || coalesce(v_who, 'a team member') end,
          auth.uid());
  return new;
end $$;

create trigger projects_publish_audit after update of is_published on public.projects
  for each row execute function public.log_project_publish();

revoke execute on function public.log_project_publish() from public, anon, authenticated;
