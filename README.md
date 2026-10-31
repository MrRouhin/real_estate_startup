# REMMO

**REMMO** (Real Estate Management and Marketing Organisation) is a real estate platform for plotted layouts and apartment towers. Buyers pick a flat or a plot in 3D, walk through the finished home before it is built, see how far their floor has been built today, hold it for 15 minutes and pay the booking amount online. The developer runs sales, CRM, towers, construction, contractors, materials, suppliers and site attendance from one console; contractors, suppliers and site workers each get their own workspace. Everyone works on the same live data.

Live demo: https://real-estate-startup-rmgroups.vercel.app (moving to https://remmo.vercel.app).

![Walk through flat A-1203 before it is built](docs/screenshots/flat-tour.webp)

## What's in it

| Who | Where | What they can do |
| --- | --- | --- |
| Buyer | `/`, `/projects/…`, `/flats/…`, `/plots/…`, `/me` | Explore apartment towers in 3D (live construction or availability), filter flats by BHK, floor, view and budget, see a stacking plan; **walk through any flat in 3D** (finished and furnished in three styles, or as it stands on site today), real sun for the flat’s facing and time of day; price build-up, construction-linked payment plan with expected dates, rental yield, price outlook; plots in a 3D/2D site map; AI matchmaker for flats and plots; hold, KYC, pay; profile and KYC page; payments, documents and notifications |
| Developer staff | `/console` | Everything below plus: **project switcher**, **new-project wizard** (plotted layout, or towers with 2/3 BHK plans and auto-priced flats), **towers** (post slab/stage progress; buyers see their floor update), **approvals inbox** (RA bills, KYC, join requests, partner profiles), **people directory** with invite code, **letters** drafted from records (work orders, delay notices, crew compliance, purchase orders, appointments), **purchase orders** with supplier price comparison and payments, settings |
| Contractor | `/contractor` | Dashboard; work packages with daily progress, plan vs actual; material requests and usage; **crew**: add workers, verify their profiles, assign tasks, attendance grid, mark a missed day, approve leave, wages; **running bills** (RA) through verified → approved → paid; letters to acknowledge; company profile (GST, PAN, licence, insurance, bank) |
| Supplier | `/vendor` | Dashboard; **purchase orders**: accept with a delivery date, mark dispatched, log the delivery against the order; deliveries with invoice photos and inspection results; **payments** due and paid; **price list**; letters; company profile |
| Site employee | `/employee` | Today: selfie + GPS check-in, tasks, safety tip; **5-step profile** (18+ only, ID and bank kept as last 4 digits); attendance calendar and wages; leave requests; **site ID card with QR**; letters |
| New developer | `/start` | Register a company, become its owner and get an empty console; projects go public once the platform admin verifies the company |
| Anyone joining a team | `/join` | Enter the developer’s invite code and ask to join as contractor, supplier or worker; the developer approves |

Each role signs in from its own page (`/login` → pick a role). The demo company is labelled *Sample project* on the public site, so real projects can sit next to it.

### Flats and the 3D tour
A flat is a row in `plots` with `kind = 'flat'`, so holds, bookings, payments, price history and the CRM work unchanged. `towers` hold floors, slabs cast and stage progress (foundation, structure, masonry, MEP, finishing, facade); every floor’s state is derived bottom-up. `unit_types` carry the floor plan as data (rooms, doors, windows, furniture in metres), and everything is built from it:

- `src/lib/flats/layout.ts` – walls with openings cut out, walkable space, viewpoints, mirroring; `nav.ts` – A* paths for click-to-walk
- `src/components/three/flat/flat-scene.tsx` – the tour: Street View–style walking (drag to look, tap the floor, arrow keys), dollhouse view, sun position from date, time and facing, sky and stars, the view from the flat’s floor, ambient occlusion and bloom, today-on-site stages (slab, blockwork, conduits, ghost outlines of future walls)
- `src/components/three/tower-scene.tsx` – towers with each floor as built, cranes on rising towers, flats clickable and coloured by status
- `src/lib/flats/tower.ts` – floor stages, pace and forecasts, construction-linked plan status, price build-up, rental yield

### AI layer
The database computes the numbers; the AI only explains them, and **people approve every change**. Everything works without an AI key (built-in rules write plainer text); add one for plain-language reports, photo and invoice reading, multilingual chat and personalised messages.

| For | Feature | Where |
| --- | --- | --- |
| Developer | **Plan vs actual**: baseline plan per work package (planned % by date, BOQ quantity, material budget), S-curve chart, earned-schedule forecast finish, pace needed vs pace achieved | Contractor → *Plan vs actual* tab |
| Developer | **Daily briefing + insights** with one-tap actions (mark delayed, create baseline, raise price, schedule follow-up, send order, share report). Dismissed items stay quiet for a week; every decision is logged | `/console/insights`, Overview |
| Developer | **Weekly contractor reports**, shared to the contractor's portal with a notification | Insights, Contractor tab, Portal |
| Developer | **Material intelligence**: use vs what the work done should need, run-out forecast, reorder quantity, drafted WhatsApp order to the best-rated vendor | Materials, Contractor tab |
| Developer | **Photo checks**: EXIF time and place vs the site; with AI, does the photo show the claimed work, estimated % and visible safety issues | Construction |
| Developer | **Crew vs output** and **suspicious check-ins** (repeated off-site, same GPS spot for many people, reused selfies) | Employees |
| Developer | **Gate checks for deliveries**: duplicate invoice, rate above normal, unusual quantity, bad vehicle number, GSTIN format; with AI, the invoice photo is read and compared | Vendors |
| Developer | **Lead scoring** with reasons, next best action, WhatsApp follow-up draft (English/Hindi/Kannada), call-note summary that sets the follow-up date | Leads |
| Developer | **Demand-based price suggestions** from views, comparisons, matchmaker picks, enquiries and holds | Plots and prices |
| Developer | **Ask your site**: chat over today's numbers | Floating button in the console |
| Buyer | **Plot matchmaker** in English, Hindi or Kannada (voice in/out): picks are ranked from real plot data and highlighted on the 3D map | Plot explorer, *Find my plot with AI* |
| Buyer | **Price outlook as a range** (cautious / middle / strong) with every assumption written out, plus a *Before you buy* checklist. No single number and no buy/don't-buy verdict (RERA rules on promised returns) | Plot page |
| Buyer | **True cost and EMI**: stamp duty, cess, registration, legal; loan planner | Plot page |
| Buyer | **Dream home preview**: describe a house, see it in 3D on the plot with setbacks, floor area and an indicative build cost | Plot page |
| Buyer | **Near your plot**: the road, drain, lights, park and tank near *their* plot, with progress and plan status | My booking |
| Buyer | **Ask the documents**: answers quote the FAQ and the buyer's own agreement | Project page, My booking |

Turn on the AI: add `ANTHROPIC_API_KEY` in Vercel's environment variables (default model `claude-haiku-5-5`; change with `AI_MODEL`). Any OpenAI-compatible provider also works: set `AI_PROVIDER=openai`, `AI_API_KEY`, `AI_BASE_URL` and `AI_MODEL`. The daily analysis runs at 6:00 IST through Vercel Cron once you add a `CRON_SECRET`. Calls are rate-limited per visitor and logged in `ai_usage`.

Code: `src/lib/ai/` (pure analytics + one model client with fallbacks), `src/components/ai/`, `src/app/api/ai/*`, migration `20261024000014_ai_layer.sql`.

### The 3D site
`src/components/three/site-scene.tsx` (React Three Fiber). Every element is driven by milestone progress (0–100): the compound wall rises, asphalt spreads along the roads with a road roller working the front, drains extend, street lights pop up pole by pole, the overhead tank and clubhouse rise (with a tower crane while it's being built), and the park greens up with trees. Each construction update stores a snapshot, so the project page can **replay the whole build** with the Replay button. Plots are extruded from their outline and coloured by live status; held plots pulse. It pauses when off screen, falls back to the 2D map without WebGL, and fits any screen size.

## Screens

| | |
| --- | --- |
| ![Landing page: live 3D towers](docs/screenshots/home.webp) Landing page: live 3D towers | ![Apartment project: towers as built today](docs/screenshots/project.webp) Apartment project: towers as built today |
| ![Walk through a flat (furnished, real sun)](docs/screenshots/flat-tour.webp) Walk through a flat (furnished, real sun) | ![Dollhouse view of the same flat](docs/screenshots/flat-dollhouse.webp) Dollhouse view of the same flat |
| ![Flat explorer: filters, stacking plan, 3D](docs/screenshots/flats-explorer.webp) Flat explorer: filters, stacking plan, 3D | ![Plot explorer for plotted layouts](docs/screenshots/explorer.webp) Plot explorer for plotted layouts |
| ![Separate sign-in for each role](docs/screenshots/login.webp) Separate sign-in for each role | ![Developer console: overview and AI briefing](docs/screenshots/console-overview.webp) Developer console: overview and AI briefing |
| ![Towers: post slab and stage progress](docs/screenshots/console-towers.webp) Towers: post slab and stage progress | ![Approvals: RA bills, KYC, join requests](docs/screenshots/console-approvals.webp) Approvals: RA bills, KYC, join requests |
| ![CRM pipeline with drag-and-drop](docs/screenshots/console-leads.webp) CRM pipeline with drag-and-drop | ![Letters drafted from records](docs/screenshots/console-letters.webp) Letters drafted from records |
| ![Contractor: plan vs actual, materials](docs/screenshots/console-contractor-materials.webp) Contractor: plan vs actual, materials | ![Materials ledger and reorder forecast](docs/screenshots/console-materials.webp) Materials ledger and reorder forecast |
| ![Employees: crew vs output, check-in patterns](docs/screenshots/console-employees.webp) Employees: crew vs output, check-in patterns | ![Contractor workspace](docs/screenshots/contractor.webp) Contractor workspace |
| ![Running bills: submitted to paid](docs/screenshots/contractor-bills.webp) Running bills: submitted to paid | ![Supplier: purchase orders to accept and dispatch](docs/screenshots/vendor-orders.webp) Supplier: purchase orders to accept and dispatch |
| ![Site employee: check-in and tasks (phone)](docs/screenshots/employee.webp) Site employee: check-in and tasks (phone) | ![Site ID card with QR (phone)](docs/screenshots/employee-id-card.webp) Site ID card with QR (phone) |
| ![Phone, dark mode](docs/screenshots/phone-home-dark.webp) Phone, dark mode | |

## Stack

- **Next.js 15** (App Router, server components, server actions) + TypeScript + Tailwind CSS 4
- **Supabase**: Postgres with row-level security on every table, Auth (email + phone OTP), Storage, Realtime
- **React Three Fiber / three.js** for 3D, **framer-motion** for UI motion, **dnd-kit** for the CRM board
- **Razorpay** Orders API + Checkout + webhooks (or a built-in simulator for demos)

All business rules live in the database (`supabase/migrations`), so the web app, a future mobile app and any integration get the same guarantees: no double booking, token capped at 10%, stock that can't go negative, contractors who can only see their own records.

## Run it locally (about 15 minutes)

### 1. Create a Supabase project
[supabase.com](https://supabase.com) → New project (region: **Mumbai**). Then, in **Project Settings → API**, copy the Project URL, the `anon`/publishable key and the `service_role`/secret key.

### 2. Configure and install
```bash
git clone https://github.com/MrRouhin/remmo.git && cd remmo
cp .env.example .env.local     # paste the three Supabase values
npm install
```

### 3. Create the database
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push            # runs the migrations in supabase/migrations
```
Migration 0010 schedules the every-minute hold cleanup with pg_cron automatically. Then in the Supabase dashboard:
- **Authentication → Providers → Phone**: enable, and for testing add test numbers with fixed OTPs (for example `919999900001` → `123456`). Real SMS in India needs DLT registration; start that early.

### 4. Seed the demo and start
```bash
npm run seed       # logins, a plotted layout (27 plots), an apartment project (2 towers, 112 flats), bookings, CRM, partners, bills, orders…
npm run dev        # http://localhost:3000
```
Run `npm run seed -- --reset` any time to wipe the demo organization and start fresh.

### Demo logins (password `Remmo@2026`)

| Role | Email |
| --- | --- |
| Developer console | `sales@demodevelopers.dev` |
| Buyer | `buyer@remmo.dev` (or phone `+91 99999 00001` with your test OTP); owns flat A-1203 |
| Contractor | `contractor@abcconstructions.dev` |
| Supplier | `vendor@xyzmaterials.dev` |
| Site employee | `employee@remmo.dev` |
| Platform admin | `admin@remmo.dev` |

Invite code for the demo company: `GVDEMO26`.

The login page lists these. Set `NEXT_PUBLIC_SHOW_DEMO_LOGINS=false` to hide them.

## Payments

- `PAYMENTS_MODE=simulated` (default): a clearly labelled test checkout stands in for Razorpay, so the full booking flow works without a merchant account. **Never use this in production.**
- `PAYMENTS_MODE=razorpay`: add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (test keys first). In the Razorpay dashboard set payment capture to automatic and add a webhook to `https://<your-domain>/api/webhooks/razorpay` for `payment.captured` and `payment.failed`, with the secret in `RAZORPAY_WEBHOOK_SECRET`.

The amount always comes from the database. The webhook is the source of truth and is safe to receive twice. A payment that lands after the hold expired, when another buyer has taken the plot, becomes `refund_due` instead of double-selling it.

## Put it online (Vercel + Supabase, free tiers)

GitHub stores the code; it can't run it (GitHub Pages only serves static files, and this app needs a server and a database). **Supabase** runs the database and **Vercel** runs the website; Vercel redeploys by itself on every push to `main`.

**The database is already live**: the hosted Supabase project (Mumbai) has the migrations, the demo data, the documents and the every-minute hold cleanup. The public connection settings for it are in `.env.production`, so the site needs only one secret.

1. **Deploy the website**: [vercel.com/new](https://vercel.com/new) → *Continue with GitHub* → **Import** `remmo` → **Deploy**. Nothing to fill in. In about two minutes you get a link like `https://remmo.vercel.app`.
2. **Add the one secret** (needed for token payments, ID upload and linking portal logins): Supabase → Project Settings → **API Keys** → copy the **secret** key (or the legacy `service_role` key). In Vercel → your project → Settings → **Environment Variables** add `SUPABASE_SERVICE_ROLE_KEY` = that key → Deployments → ⋯ → **Redeploy**.
3. **Tell Supabase the site's address**: Supabase → Authentication → **URL Configuration** → Site URL = your Vercel link, and add `https://<your-domain>/**` under Redirect URLs (used by sign-up confirmation emails).

Then sign in with any demo login above.

**Using a different Supabase project** (your own copy, or a staging one): run the migrations there (`npx supabase link` + `npx supabase db push`, then `npm run seed`) and override `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel's environment variables; those win over `.env.production`.

**No Node on your laptop?** On the GitHub repo page: **Code → Codespaces → Create codespace on main**. It opens VS Code in the browser with Node ready, so you can run `npm install`, `npx supabase db push`, `npm run seed` and even `npm run dev` there; Codespaces gives you a preview link for port 3000.

**AI (optional)**: add `ANTHROPIC_API_KEY` (and `CRON_SECRET`, any long random string, for the daily 6:00 IST analysis) in Vercel → Settings → Environment Variables, then redeploy. Without a key every AI feature still works with rule-based text.

Before real buyers: switch payments to Razorpay, move Supabase to the **Pro** plan (free projects pause after a week of inactivity and have no daily backups), turn on leaked-password protection in Supabase Auth, and add your own domain in Vercel → Settings → Domains.

## Working on the code
- `.env.local` is git-ignored, so keys stay on your machine. Put production keys only in Vercel's environment variables.
- Work on a branch and open a pull request: GitHub Actions (`.github/workflows/ci.yml`) type-checks, builds and runs the database tests on every PR, and Vercel posts a preview URL for each one.
- New database change = new file in `supabase/migrations/` (never edit an applied one), then `npx supabase db push`.

## Project structure
```text
src/
  app/
    (site)/            buyer pages: landing, projects, plot explorer, plot, compare, book, me
    console/           developer console (+ actions.ts: all console server actions)
    portal/            contractor / vendor / employee portal
    api/payments/      create-order, verify, simulate      api/webhooks/razorpay
    api/ai/            match, docs, house, ask             api/cron/insights (daily analysis)
  components/
    three/             site-scene (3D site), construction-timeline (replay), stock-yard (3D stores)
    ui/                motion (counters, tilt cards, rings), sheet, toast, tabs, forms
  lib/                 supabase clients, auth/roles, formatting, site geometry
  lib/ai/              analytics (plan, materials, crew, leads, pricing, outlook, cost, house), model client, reports
supabase/
  migrations/          0001 core schema … 0014 AI layer — the whole backend
  tests/               SQL tests for RLS, booking, stock, attendance, CRM
scripts/seed.mjs       demo data for any Supabase project
```

## Database at a glance

| Migration | Adds |
| --- | --- |
| 0001 core schema | organizations, profiles, projects, plots, price history, bookings, payment schedule, payments, documents, updates, announcements, notifications |
| 0002 security | row-level security for every table |
| 0003 booking functions | `hold_plot`, `start_booking`, `mark_payment_paid`, `release_expired_holds` |
| 0004 views | `project_stats`, `booking_balances` |
| 0005 content | push tokens, buyer notifications, storage rules (documents, media, KYC) |
| 0006 milestones | milestones + weighted project %, update snapshots for 3D replay, activity feed, payment plans, installment payments |
| 0007 operations | contractors, work packages, materials, vendors, deliveries, material requests, **stock ledger**, employees, attendance (geofence), modification requests |
| 0008 CRM | leads, lead activities, site visits, public enquiry function, auto-win on booking |
| 0009 realtime | publishes the live tables |
| 0010 hold cleanup | pg_cron job that frees expired 15-minute holds every minute (skipped where pg_cron isn't installed) |
| 0011 hardening | trigger functions not callable over the API; fixed search_path (from the Supabase security advisor) |
| 0012–0013 setup tooling | the `http` extension used once to upload the hosted demo's PDFs, then removed |
| 0014 AI layer | baseline plans, material budgets, progress history, `ai_insights` (suggest → approve trail), staff-only `ai_checks`, `doc_chunks` full-text search, `plot_events` demand signals, `market_factors`, `share_ai_insight`, demo data function |
| 0015 flats and people | apartment projects, `towers` (slabs cast, stage %), `unit_types` with floor-plan layouts, flats as `plots` rows (`kind = 'flat'`), construction-linked payment plans, `employee_profiles` (18+, last 4 digits only), `letters` (issue → acknowledge), invite codes and `access_requests`, `update_tower_progress` |
| 0016 partner workspaces | `contractor_bills` (RA bills capped by verified progress), `purchase_orders` (accept → dispatch → delivered), `vendor_catalog`, `crew_tasks`, `leave_requests`, supervisor-marked attendance, delivery payments, `decide_access_request` |
| 0017 real users | buyer profile and KYC (`submit_my_kyc`, `review_kyc`), developer self sign-up (`create_my_organization`), platform verification of companies, `is_demo` flag for the sample company |

Run the SQL tests on any Postgres 15+:
```bash
createdb remmo_test
psql -d remmo_test -f supabase/tests/local_supabase_stub.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -d remmo_test -f "$f"; done
for t in booking_flow_test content_test operations_crm_test ai_layer_test flats_people_test workspaces_test real_users_test; do psql -d remmo_test -f supabase/tests/$t.sql; done
```
Every check prints `t`.

## What's next
- **Mobile app**: wrap the buyer and portal flows in Expo. The API routes already accept `Authorization: Bearer` tokens.
- **Layout upload**: parse a developer's SVG layout into plot outlines (the `shape_path` column is ready).
- **Push notifications**: the `push_tokens` table and notification triggers are in place. Add a Supabase webhook on `notifications` that calls Expo Push.
- **AI, next steps**: semantic search with pgvector embeddings for long documents; real market data feeds (Kaveri guidance values, listing portals) behind the price outlook; WhatsApp Business API to send drafted messages directly; drone photo progress measurement.
