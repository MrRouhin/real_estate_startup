-- =====================================================================
-- 0012  One-off setup tooling. The hosted project used the `http`
-- extension once, to upload the demo PDFs into Storage. The app never
-- uses it; 0013 removes it again.
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'http') then
    create extension if not exists http with schema extensions;
  end if;
end $$;
