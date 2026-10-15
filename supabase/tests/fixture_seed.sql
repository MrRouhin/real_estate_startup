-- Sample data for the dev project: one verified developer, one published
-- project ("Green Valley Residency") and 12 plots. Run in the SQL editor
-- or with `npx supabase db reset` locally.
insert into public.organizations (id, name, phone, is_verified, token_percent)
values ('00000000-0000-0000-0000-0000000000a1', 'Demo Developers Pvt Ltd', '+919800000000', true, 10);

insert into public.projects (id, org_id, name, slug, city, address, description,
                             rera_number, status, progress_percent, is_published)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1',
        'Green Valley Residency', 'green-valley-residency', 'Bengaluru',
        'Sample address, Bengaluru North', 'Gated plotted development (sample data).',
        'PRM/KA/RERA/SAMPLE/0001', 'ongoing', 63, true);

insert into public.plots (org_id, project_id, plot_number, area_sqft, dimensions, facing, is_corner, price, svg_shape_id)
select '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
       'A' || lpad(n::text, 2, '0'),
       case when n % 3 = 0 then 1500 when n % 3 = 1 then 1200 else 2400 end,
       case when n % 3 = 0 then '30x50' when n % 3 = 1 then '30x40' else '40x60' end,
       (array['east','west','north','south']::public.facing[])[(n % 4) + 1],
       n in (1, 6, 7, 12),
       case when n % 3 = 0 then 3150000 when n % 3 = 1 then 2520000 else 5040000 end,
       'plot-A' || lpad(n::text, 2, '0')
from generate_series(1, 12) as n;
