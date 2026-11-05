-- Runs after real_users_test.sql. Every publish change is logged with who made it.
\set ON_ERROR_STOP on
\set org    '''00000000-0000-0000-0000-0000000000a1'''
\set seller '''11111111-1111-1111-1111-111111111111'''

reset role;
create temp table t_proj as select id from public.projects where org_id = :org order by created_at limit 1;
grant select on t_proj to authenticated;

-- ---------- staff hide and republish from the console ------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
update public.projects set is_published = false where id = (select id from t_proj);
select count(*) = 1 as unpublish_logged
  from public.activity_log
 where project_id = (select id from t_proj) and kind = 'publish'
   and message like '%hidden from buyers by %' and actor_id = :seller;

update public.projects set is_published = true where id = (select id from t_proj);
select count(*) = 1 as republish_logged
  from public.activity_log
 where project_id = (select id from t_proj) and kind = 'publish'
   and message like '% published by %' and actor_id = :seller;

-- saving a project without changing the flag adds nothing
update public.projects set is_published = true where id = (select id from t_proj);
select count(*) = 2 as no_op_not_logged
  from public.activity_log where project_id = (select id from t_proj) and kind = 'publish';

-- ---------- a change made outside the app (table editor, script) -------------
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.projects set is_published = false where id = (select id from t_proj);
select count(*) = 1 as outside_change_logged
  from public.activity_log
 where project_id = (select id from t_proj) and kind = 'publish'
   and message like '%(changed outside the app)' and actor_id is null;
update public.projects set is_published = true where id = (select id from t_proj);

-- ---------- nobody can write the log directly ---------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :seller, false);
do $$ begin
  perform public.log_project_publish();
  raise exception 'trigger function callable over the API';
exception when insufficient_privilege or feature_not_supported then null; end $$;
select true as audit_function_not_callable;
reset role;
