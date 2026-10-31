#!/usr/bin/env node
// Seeds a Supabase project with a complete demo: logins for every role, one
// live project with 27 plots, bookings and payments, a CRM pipeline,
// contractors, a materials ledger, vendors, deliveries and attendance.
//
//   npm run seed            # first time
//   npm run seed -- --reset # wipe the demo organization + demo users, then seed again
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env.local).
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ---------- env ----------
for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }
const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const RESET = process.argv.includes('--reset');
const PASSWORD = process.env.SEED_PASSWORD || 'Remmo@2026';
const ORG_NAME = 'Demo Developers Pvt Ltd';

// ---------- helpers ----------
let rngState = 20261015;
const rnd = () => ((rngState = (rngState * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const DAY = 86400000;
const now = Date.now();
const iso = (t) => new Date(t).toISOString();
const daysAgo = (d, h = 10, m = 30) => { const t = new Date(now - d * DAY); t.setUTCHours(h - 5, m - 30, 0, 0); return t.getTime(); };
const dateOnly = (t) => new Date(t + 5.5 * 3600000).toISOString().slice(0, 10);
const roundK = (n) => Math.round(n / 1000) * 1000;
async function must(promise, label) {
  const { data, error } = await promise;
  if (error) { console.error(`✗ ${label}:`, error.message || error); process.exit(1); }
  return data;
}
function step(msg) { console.log('•', msg); }

// ---------- people ----------
const STAFF = [
  { key: 'admin', email: 'admin@remmo.dev', name: 'REMMO Admin', role: 'admin' },
  { key: 'sales', email: 'sales@demodevelopers.dev', name: 'Ananya Sharma', role: 'seller', orgRole: 'owner' },
  { key: 'exec', email: 'karthik@demodevelopers.dev', name: 'Karthik Nair', role: 'seller', orgRole: 'staff' },
];
const PARTNERS = [
  { key: 'abc', email: 'contractor@abcconstructions.dev', name: 'Suresh Gowda', role: 'contractor' },
  { key: 'xyz_el', email: 'electrical@xyzelectricals.dev', name: 'Imran Pasha', role: 'contractor' },
  { key: 'vendor', email: 'vendor@xyzmaterials.dev', name: 'Deepak Jain', role: 'vendor' },
  { key: 'emp', email: 'employee@remmo.dev', name: 'Ravi Kumar', role: 'employee', phone: '919999900003' },
];
const DEMO_BUYER = { key: 'buyer', email: 'buyer@remmo.dev', name: 'Aarav Mehta', role: 'buyer', phone: '919999900001' };
const SAMPLE_BUYERS = [
  ['sandeep', 'Sandeep Rao', '919845011021'], ['priya', 'Priya Nair', '919900123417'], ['arjun', 'Arjun Mehta', '919741150982'],
  ['kavya', 'Kavya Reddy', '919620077310'], ['faisal', 'Faisal Khan', '919886140255'], ['meera', 'Meera Iyer', '919008461290'],
  ['rahul', 'Rahul Desai', '919964308812'], ['ananya', 'Ananya Gupta', '919739026644'], ['vikram', 'Vikram Shetty', '919880851177'],
  ['neha', 'Neha Kulkarni', '919538290011'],
].map(([key, name, phone]) => ({ key, email: `${key}@example.com`, name, role: 'buyer', phone }));
const ALL_USERS = [...STAFF, ...PARTNERS, DEMO_BUYER, ...SAMPLE_BUYERS];

async function findUserByEmail(email) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

// ---------- reset ----------
const existing = await db.from('organizations').select('id').eq('name', ORG_NAME).maybeSingle();
if (existing.data && !RESET) {
  console.log(`"${ORG_NAME}" is already seeded. Run "npm run seed -- --reset" to wipe it and seed again.`);
  process.exit(0);
}
if (RESET) {
  step('Removing previous demo data');
  if (existing.data) {
    // children first: bookings and stock rows deliberately block cascading deletes
    for (const t of ['activity_log', 'lead_activities', 'site_visits', 'leads', 'attendance', 'employees', 'stock_movements',
      'material_requests', 'deliveries', 'work_packages', 'modification_requests', 'payments', 'payment_schedule', 'documents', 'bookings']) {
      await must(db.from(t).delete().eq('org_id', existing.data.id), 'clear ' + t);
    }
    await must(db.from('organizations').delete().eq('id', existing.data.id), 'delete org');
  }
  for (const u of ALL_USERS) {
    const found = await findUserByEmail(u.email);
    if (found) await db.auth.admin.deleteUser(found.id);
  }
}

// ---------- users ----------
step(`Creating ${ALL_USERS.length} demo logins (password: ${PASSWORD})`);
const uid = {};
for (const u of ALL_USERS) {
  const { data, error } = await db.auth.admin.createUser({
    email: u.email, password: PASSWORD, email_confirm: true,
    ...(u.phone ? { phone: u.phone, phone_confirm: true } : {}),
    user_metadata: { full_name: u.name },
  });
  if (error) { console.error(`✗ create ${u.email}:`, error.message); process.exit(1); }
  uid[u.key] = data.user.id;
  await must(db.from('profiles').update({
    full_name: u.name, role: u.role, email: u.email, phone: u.phone || null,
    kyc_status: u.role === 'buyer' ? (u.key === 'buyer' ? 'verified' : 'verified') : 'not_started',
  }).eq('id', data.user.id), 'profile ' + u.email);
}

// ---------- organization & project ----------
step('Creating developer and projects');
const org = await must(db.from('organizations').insert({
  name: ORG_NAME, gst_number: '29ABCDE1234F1Z5', phone: '+91 80 4000 0000', email: 'sales@demodevelopers.dev',
  is_verified: true, token_percent: 10,
}).select().single(), 'org');
await must(db.from('organization_members').insert([
  { org_id: org.id, user_id: uid.sales, org_role: 'owner' },
  { org_id: org.id, user_id: uid.exec, org_role: 'staff' },
]), 'members');

const LAYOUT = {
  viewBox: [0, 0, 1000, 700],
  boundary: { x: 20, y: 20, w: 960, h: 660 },
  roads: [
    { x: 40, y: 40, w: 920, h: 30, label: '30 FT ROAD' },
    { x: 40, y: 630, w: 920, h: 30, label: '30 FT ROAD' },
    { x: 40, y: 330, w: 920, h: 40, label: '40 FT MAIN ROAD', main: true },
    { x: 40, y: 40, w: 30, h: 620 },
    { x: 930, y: 40, w: 30, h: 620 },
    { x: 480, y: 40, w: 40, h: 620, label: '40 FT ROAD', main: true },
  ],
  park: { x: 524, y: 374, w: 172, h: 252, label: 'Central park' },
  clubhouse: { x: 560, y: 520, w: 100, h: 56, label: 'Clubhouse' },
  water_tank: { x: 660, y: 404 },
  gate: { x: 20, y: 645, label: 'Entrance gate' },
  north: { x: 952, y: 104 },
};
const project = await must(db.from('projects').insert({
  org_id: org.id, name: 'Green Valley Residency', slug: 'green-valley-residency', city: 'Bengaluru North',
  address: 'Near Devanahalli, Bengaluru North (sample address)',
  description: 'A 6.5-acre gated plotted layout with 40 ft and 30 ft internal roads, underground drainage, a central park and a clubhouse. Sample project for the REMMO demo.',
  rera_number: 'PRM/KA/RERA/SAMPLE/0001', status: 'ongoing', progress_percent: 0, is_published: true,
  layout: LAYOUT, layout_viewbox: '0 0 1000 700', site_lat: 13.2468, site_lng: 77.712, geofence_m: 300,
}).select().single(), 'project');
await must(db.from('projects').insert({
  org_id: org.id, name: 'Lakeview Enclave', slug: 'lakeview-enclave', city: 'Hoskote',
  description: 'Launching January 2027. Register your interest to get first access to plot prices.',
  rera_number: 'Applied', status: 'upcoming', is_published: true,
}), 'project 2');

// ---------- plots with geometry and price history ----------
step('Drawing 27 plots with shapes and price history');
const RATE_HISTORY = [
  ['2025-01-15', 1650], ['2025-04-01', 1750], ['2025-07-01', 1850], ['2025-10-01', 1950],
  ['2026-01-01', 2050], ['2026-04-01', 2150], ['2026-07-01', 2250], ['2026-10-01', 2300],
];
const DIMS = { 1200: '30x40', 1500: '30x50', 2400: '40x60' };
const ROWS = [
  { block: 'A', kind: 'h', x0: 70, x1: 480, y0: 70, y1: 200, facing: 'north', types: [1200, 1200, 1500, 2400] },
  { block: 'A', kind: 'h', x0: 70, x1: 480, y0: 200, y1: 330, facing: 'south', types: [2400, 1500, 1200, 1200] },
  { block: 'B', kind: 'v', x0: 520, x1: 725, y0: 70, y1: 330, facing: 'west', types: [1200, 1500, 1200] },
  { block: 'B', kind: 'v', x0: 725, x1: 930, y0: 70, y1: 330, facing: 'east', types: [1500, 1200, 1200] },
  { block: 'C', kind: 'h', x0: 70, x1: 480, y0: 370, y1: 500, facing: 'north', types: [1200, 1500, 1200, 2400] },
  { block: 'C', kind: 'h', x0: 70, x1: 480, y0: 500, y1: 630, facing: 'south', types: [1500, 2400, 1200, 1200] },
  { block: 'D', kind: 'h', x0: 700, x1: 930, y0: 370, y1: 500, facing: 'north', types: [1200, 1500, 1200] },
  { block: 'D', kind: 'h', x0: 700, x1: 930, y0: 500, y1: 630, facing: 'south', types: [1500, 2400] },
];
const plotRows = []; const meta = {}; const counters = {};
for (const row of ROWS) {
  const total = row.types.reduce((a, b) => a + b, 0);
  const len = row.kind === 'h' ? row.x1 - row.x0 : row.y1 - row.y0;
  let cursor = row.kind === 'h' ? row.x0 : row.y0;
  row.types.forEach((area, i) => {
    const size = len * area / total;
    const x = row.kind === 'h' ? cursor : row.x0, y = row.kind === 'h' ? row.y0 : cursor;
    const w = row.kind === 'h' ? size : row.x1 - row.x0, h = row.kind === 'h' ? row.y1 - row.y0 : size;
    cursor += size;
    counters[row.block] = (counters[row.block] || 0) + 1;
    const num = row.block + String(counters[row.block]).padStart(2, '0');
    const last = i === row.types.length - 1;
    const park = row.block === 'D' && i === 0;
    const corner = !park && (i === 0 || last);
    const premium = 1 + (corner ? 0.08 : 0) + (row.facing === 'east' ? 0.05 : 0) + (park ? 0.06 : 0);
    const g = 2; const r = (v) => Math.round(v * 10) / 10;
    meta[num] = { premium, area };
    plotRows.push({
      org_id: org.id, project_id: project.id, plot_number: num, area_sqft: area, dimensions: DIMS[area],
      facing: row.facing, is_corner: corner, price: roundK(area * RATE_HISTORY.at(-1)[1] * premium),
      svg_shape_id: 'plot-' + num,
      shape_path: `M${r(x + g)} ${r(y + g)}H${r(x + w - g)}V${r(y + h - g)}H${r(x + g)}Z`,
    });
  });
}
const plots = await must(db.from('plots').insert(plotRows).select(), 'plots');
const plotByNum = Object.fromEntries(plots.map((p) => [p.plot_number, p]));
await must(db.from('plot_price_history').delete().in('plot_id', plots.map((p) => p.id)), 'clear auto history');
const hist = [];
for (const p of plots) for (const [d, rate] of RATE_HISTORY) {
  hist.push({ plot_id: p.id, org_id: org.id, price: roundK(meta[p.plot_number].area * rate * meta[p.plot_number].premium), changed_at: new Date(d + 'T10:00:00+05:30').toISOString() });
}
await must(db.from('plot_price_history').insert(hist), 'price history');
const priceOn = (num, t) => { let r = RATE_HISTORY[0][1]; for (const [d, v] of RATE_HISTORY) if (new Date(d).getTime() <= t) r = v; return roundK(meta[num].area * r * meta[num].premium); };

// ---------- milestones + construction history (3D replay) ----------
step('Building the construction timeline (13 updates across 7 milestones)');
const MS = [
  ['compound_wall', 'Compound wall and gate', 1], ['roads', 'Internal roads', 3], ['drains', 'Storm water drains', 2],
  ['electrical', 'Street lights and cabling', 2], ['water_tank', 'Overhead water tank', 1], ['park', 'Central park', 1],
  ['clubhouse', 'Clubhouse', 1.5],
];
const milestones = await must(db.from('milestones').insert(MS.map(([key, name, weight], i) => ({
  org_id: org.id, project_id: project.id, key, name, weight, progress: 0, sort_order: i,
}))).select(), 'milestones');
const msId = Object.fromEntries(milestones.map((m) => [m.key, m.id]));
const UPDATES = [
  [575, 'compound_wall', 30, 'Compound wall foundation laid', 'Footing and plinth beam complete on the north and east sides.'],
  [520, 'compound_wall', 100, 'Compound wall complete with main gate', 'Wall plastered and painted on all four sides. Security cabin foundation is in.'],
  [430, 'roads', 20, 'Road formation and earthwork started', 'Excavation and compaction for the 40 ft main road are under way.'],
  [350, 'drains', 30, 'Storm water drains: Block A started', 'Precast drain sections are being placed along the main road.'],
  [280, 'roads', 45, 'Granular sub-base laid on main roads', 'GSB layer compacted on the 40 ft roads. 30 ft roads next.'],
  [220, 'drains', 60, 'Drains complete for Blocks A and B', 'Culverts at both road crossings are finished.'],
  [180, 'electrical', 15, 'Underground cabling started', 'BESCOM-approved trenching has begun along Block C.'],
  [150, 'water_tank', 40, 'Overhead tank: column work done', 'The 1 lakh litre tank columns reached full height.'],
  [120, 'park', 15, 'Central park: levelling and pathways', 'Walkway kerbs are in. Planting starts after the monsoon.'],
  [90, 'electrical', 35, 'First street light poles installed', 'Poles along the 40 ft main road are up and wired.'],
  [55, 'drains', 75, 'Drains extended to Block C', 'Drain lines run along both sides of the main road.'],
  [30, 'clubhouse', 20, 'Clubhouse foundation complete', 'Foundation and plinth for the clubhouse are done.'],
  [9, 'roads', 70, 'Internal roads: wet-mix base complete', 'All internal roads have the wet-mix macadam base. Asphalt starts after the monsoon.'],
];
for (const [ago, key, pct, title, body] of UPDATES) {
  const row = await must(db.from('construction_updates').insert({
    org_id: org.id, project_id: project.id, title, body, milestone_id: msId[key], milestone_progress: pct, created_by: uid.sales,
  }).select('id').single(), 'update');
  await must(db.from('construction_updates').update({ created_at: iso(daysAgo(ago, 11)) }).eq('id', row.id), 'backdate update');
}
await must(db.from('announcements').insert([
  { org_id: org.id, project_id: project.id, title: 'Open house this Sunday, 10 am to 4 pm', body: 'Walk the site with our team. A free shuttle runs from the Devanahalli bus stand every 30 minutes.', created_at: iso(daysAgo(4)) },
  { org_id: org.id, project_id: project.id, title: 'Next price revision on 1 January 2027', body: 'Bookings made before 31 December keep today’s price.', created_at: iso(daysAgo(17)) },
]), 'announcements');

// ---------- bookings & payments ----------
step('Recording 11 bookings with payment schedules');
const PLAN = [['Token', 0.10, 'At booking', 0], ['Agreement for sale', 0.20, 'Within 30 days', 30], ['Development milestone', 0.30, 'When roads and drains are complete', null], ['Registration', 0.40, 'At sale deed registration', null]];
const BOOKINGS = [
  ['A05', 'sandeep', 'registered', 560, 4], ['B04', 'priya', 'registered', 500, 4], ['C07', 'arjun', 'registered', 440, 4],
  ['A02', 'kavya', 'confirmed', 240, 2], ['A06', 'faisal', 'confirmed', 185, 2], ['B01', 'meera', 'confirmed', 140, 2],
  ['C03', 'rahul', 'confirmed', 100, 1], ['C05', 'ananya', 'confirmed', 57, 2], ['D02', 'vikram', 'confirmed', 22, 1],
  ['A08', 'neha', 'confirmed', 12, 1], ['C04', 'buyer', 'confirmed', 26, 2],
];
const bookingIds = {};
for (const [num, who, status, ago, paidCount] of BOOKINGS) {
  const t = daysAgo(ago, 12, 15);
  const price = priceOn(num, t);
  const token = roundK(price * 0.1);
  const b = await must(db.from('bookings').insert({
    org_id: org.id, plot_id: plotByNum[num].id, buyer_id: uid[who], status, total_amount: price, token_amount: token,
    created_at: iso(t), confirmed_at: iso(t),
  }).select().single(), 'booking ' + num);
  bookingIds[num] = b.id;
  let used = 0;
  for (let i = 0; i < PLAN.length; i++) {
    const [label, pct, note, days] = PLAN[i];
    const amount = i === 0 ? token : i === PLAN.length - 1 ? price - used : roundK(price * pct);
    used += amount;
    const paid = i < paidCount;
    const inst = await must(db.from('payment_schedule').insert({
      booking_id: b.id, org_id: org.id, label, amount, sort_order: i, due_note: note, status: paid ? 'paid' : 'due',
      due_date: days != null ? dateOnly(t + days * DAY) : null,
    }).select().single(), 'schedule');
    if (paid) {
      await must(db.from('payments').insert({
        booking_id: b.id, installment_id: inst.id, org_id: org.id, buyer_id: uid[who], amount, status: 'paid',
        razorpay_order_id: 'order_seed' + Math.floor(rnd() * 1e12).toString(36), razorpay_payment_id: 'pay_seed' + Math.floor(rnd() * 1e12).toString(36),
        paid_at: iso(t + i * 31 * DAY), created_at: iso(t + i * 31 * DAY),
      }), 'payment');
    }
  }
  await must(db.from('plots').update({ status: status === 'registered' ? 'sold' : 'booked' }).eq('id', plotByNum[num].id), 'plot status');
}
await must(db.from('plots').update({ status: 'blocked' }).eq('id', plotByNum.C08.id), 'block C08');

// ---------- documents (small placeholder PDFs) ----------
step('Uploading sample documents');
for (const [name, isPublic] of [['layouts', true], ['project-media', true], ['documents', false], ['kyc', false], ['site', false]]) {
  await db.storage.createBucket(name, { public: isPublic }).catch(() => {});
}
function samplePdf(title) {
  const text = `Sample document: ${title}. Replace with the real file from the Documents page.`;
  const stream = `BT /F1 14 Tf 60 760 Td (${text.replace(/[()\\]/g, '')}) Tj ET`;
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out);
}
const DOCS = [
  ['RERA registration certificate', 'rera'], ['Approved layout plan (BIAAPA)', 'approval'], ['DC conversion order', 'approval'],
  ['Title deed and EC (13 years)', 'legal'], ['Project brochure', 'brochure'],
];
for (const [title, category] of DOCS) {
  const path = `${org.id}/${project.id}/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  const up = await db.storage.from('documents').upload(path, samplePdf(title), { contentType: 'application/pdf', upsert: true });
  if (up.error) console.warn('  (storage upload skipped:', up.error.message + ')');
  await must(db.from('documents').insert({ org_id: org.id, project_id: project.id, title, category, storage_path: path, visibility: 'public', uploaded_by: uid.sales }), 'doc');
}
for (const [num, label] of [['C04', 'Token receipt'], ['C04', 'Agreement for sale (draft)'], ['A05', 'Sale deed (registered)']]) {
  const path = `${org.id}/${project.id}/${num.toLowerCase()}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  await db.storage.from('documents').upload(path, samplePdf(`${label} - plot ${num}`), { contentType: 'application/pdf', upsert: true });
  await must(db.from('documents').insert({ org_id: org.id, project_id: project.id, booking_id: bookingIds[num], title: `${label} · ${num}`, category: 'agreement', storage_path: path, visibility: 'buyer', uploaded_by: uid.sales }), 'buyer doc');
}

// ---------- contractors & work packages ----------
step('Adding contractors, work packages and staff');
const contractors = await must(db.from('contractors').insert([
  { org_id: org.id, company_name: 'ABC Constructions', contact_person: 'Suresh Gowda', phone: '+91 98450 22110', email: 'contractor@abcconstructions.dev', gst_number: '29AAACA1111B1Z2', trade: 'civil', contract_type: 'item_rate', rating: 4.3, user_id: uid.abc, address: 'Yelahanka, Bengaluru' },
  { org_id: org.id, company_name: 'Sri Lakshmi Roadways', contact_person: 'Manjunath K', phone: '+91 99000 41234', gst_number: '29AAACS2222C1Z3', trade: 'roads', contract_type: 'item_rate', rating: 4.0, address: 'Hebbal, Bengaluru' },
  { org_id: org.id, company_name: 'XYZ Electricals', contact_person: 'Imran Pasha', phone: '+91 97410 33221', email: 'electrical@xyzelectricals.dev', gst_number: '29AAACX3333D1Z4', trade: 'electrical', contract_type: 'turnkey', rating: 4.6, user_id: uid.xyz_el, address: 'Peenya, Bengaluru' },
  { org_id: org.id, company_name: 'GreenScape Landscaping', contact_person: 'Lavanya R', phone: '+91 96860 44556', trade: 'landscaping', contract_type: 'lump_sum', rating: 3.9, address: 'Whitefield, Bengaluru' },
]).select(), 'contractors');
const C = Object.fromEntries(contractors.map((c) => [c.company_name.split(' ')[0].toLowerCase(), c.id]));
const WP = [
  [C.abc, 'compound_wall', 'Compound wall, gate and security cabin', 4200000, 600, 480, 100, 'completed'],
  [C.abc, 'drains', 'Storm water drains, all blocks', 6800000, 380, 40, 75, 'in_progress'],
  [C.abc, 'water_tank', 'Overhead tank (1 lakh litres)', 3500000, 170, 60, 40, 'in_progress'],
  [C.abc, 'clubhouse', 'Clubhouse civil works', 9500000, 45, 200, 20, 'in_progress'],
  [C.sri, 'roads', 'Internal roads: GSB, WMM and asphalt', 12500000, 440, 75, 70, 'in_progress'],
  [C.xyz, 'electrical', 'Street lights, cabling and transformer yard', 5600000, 190, -6, 35, 'delayed'],
  [C.greenscape, 'park', 'Central park landscaping', 1900000, 130, 120, 15, 'in_progress'],
];
const wps = await must(db.from('work_packages').insert(WP.map(([cid, mk, title, value, startAgo, dueIn, progress, status]) => ({
  org_id: org.id, project_id: project.id, contractor_id: cid, milestone_id: msId[mk], title, contract_value: value,
  start_date: dateOnly(now - startAgo * DAY), due_date: dateOnly(now + dueIn * DAY), progress, status,
}))).select(), 'work packages');
const wpBy = (cid, mk) => wps.find((w) => w.contractor_id === cid && w.milestone_id === msId[mk])?.id;

// ---------- materials, vendors, ledger ----------
step('Building the materials ledger (deliveries, issues, usage, wastage)');
const MATERIALS = [
  ['Cement OPC 53', 'cement', 'bags', 150, 390], ['TMT steel 12 mm', 'steel', 'tons', 2, 62000],
  ['M-sand', 'aggregate', 'cu m', 20, 1450], ['20 mm aggregate', 'aggregate', 'cu m', 20, 1300],
  ['Concrete blocks 6"', 'masonry', 'nos', 1000, 48], ['RCC pipes 600 mm', 'pipes', 'nos', 10, 3200],
  ['XLPE cable 4C 25 sq mm', 'electrical', 'm', 200, 410], ['Street light poles 7 m', 'electrical', 'nos', 5, 9800],
];
const mats = await must(db.from('materials').insert(MATERIALS.map(([name, category, unit, reorder_level, unit_cost]) => ({ org_id: org.id, name, category, unit, reorder_level, unit_cost }))).select(), 'materials');
const M = Object.fromEntries(mats.map((m) => [m.name, m]));
const vendors = await must(db.from('vendors').insert([
  { org_id: org.id, company_name: 'XYZ Materials', contact_person: 'Deepak Jain', phone: '+91 98860 55443', email: 'vendor@xyzmaterials.dev', gst_number: '29AAACZ4444E1Z5', categories: ['cement', 'steel', 'aggregate'], rating: 4.4, user_id: uid.vendor, address: 'Yeshwanthpur, Bengaluru' },
  { org_id: org.id, company_name: 'Sri Balaji Traders', contact_person: 'Venkatesh', phone: '+91 99451 66778', categories: ['masonry', 'aggregate'], rating: 4.1, address: 'Devanahalli' },
  { org_id: org.id, company_name: 'Volt Electricals Supply', contact_person: 'Farhan Ali', phone: '+91 97399 88776', categories: ['electrical'], rating: 4.5, address: 'SP Road, Bengaluru' },
  { org_id: org.id, company_name: 'Deccan Pipes', contact_person: 'Ramesh Patil', phone: '+91 96320 11223', categories: ['pipes'], rating: 3.8, address: 'Tumakuru Road' },
]).select(), 'vendors');
const V = Object.fromEntries(vendors.map((v) => [v.company_name.split(' ')[0].toLowerCase(), v.id]));

const moves = [];
const mv = (t, material, type, quantity, extra = {}) => moves.push({ org_id: org.id, project_id: project.id, material_id: M[material].id, type, quantity, created_at: iso(t), created_by: uid.sales, ...extra });
// opening stock 70 days ago
for (const [mat, q] of [['Cement OPC 53', 180], ['TMT steel 12 mm', 4], ['M-sand', 30], ['20 mm aggregate', 25], ['Concrete blocks 6"', 2500], ['RCC pipes 600 mm', 20], ['XLPE cable 4C 25 sq mm', 400], ['Street light poles 7 m', 6]]) mv(daysAgo(70), mat, 'opening', q, { note: 'Opening balance' });
// accepted deliveries
const DELIV = [
  [62, 'xyz', 'Cement OPC 53', 300, 300, 'KA 01 AB 1234', 'INV-10111', 'Main store'],
  [55, 'deccan', 'RCC pipes 600 mm', 40, 38, 'KA 05 MN 7781', 'DP-2207', 'Block C yard'],
  [48, 'xyz', 'TMT steel 12 mm', 6, 6, 'KA 52 C 4410', 'INV-10148', 'Main store'],
  [41, 'sri', 'Concrete blocks 6"', 3000, 2900, 'KA 43 T 9902', 'SBT-881', 'Clubhouse site'],
  [33, 'volt', 'XLPE cable 4C 25 sq mm', 800, 800, 'KA 01 HH 3321', 'VES-5512', 'Electrical store'],
  [26, 'xyz', 'Cement OPC 53', 250, 240, 'KA 01 AB 1234', 'INV-10199', 'Main store'],
  [19, 'volt', 'Street light poles 7 m', 12, 12, 'KA 51 AA 7001', 'VES-5560', 'Electrical store'],
  [12, 'sri', 'M-sand', 40, 40, 'KA 43 T 9902', 'SBT-902', 'Main store'],
  [6, 'xyz', '20 mm aggregate', 30, 30, 'KA 52 C 4410', 'INV-10230', 'Main store'],
];
for (const [ago, v, mat, qty, acc, vehicle, inv, loc] of DELIV) {
  const t = daysAgo(ago, 9, 40);
  const d = await must(db.from('deliveries').insert({
    org_id: org.id, project_id: project.id, vendor_id: V[v], material_id: M[mat].id, quantity: qty, accepted_qty: acc,
    unit_cost: M[mat].unit_cost, vehicle_number: vehicle, invoice_number: inv, location: loc, delivered_at: iso(t),
    status: acc === qty ? 'accepted' : 'partially_accepted', inspected_by: uid.exec, inspected_at: iso(t + 3600000),
    inspection_note: acc === qty ? 'All good' : `${qty - acc} rejected (damaged)`, created_by: v === 'xyz' ? uid.vendor : uid.exec, created_at: iso(t),
  }).select('id').single(), 'delivery');
  mv(t + 3600000, mat, 'received', acc, { vendor_id: V[v], delivery_id: d.id, location: loc, note: 'Delivery ' + inv });
  if (acc < qty) mv(t + 3600000, mat, 'rejected', qty - acc, { vendor_id: V[v], delivery_id: d.id, location: loc, note: 'Damaged' });
}
// pending delivery today (the one from the workflow doc)
await must(db.from('deliveries').insert({
  org_id: org.id, project_id: project.id, vendor_id: V.xyz, material_id: M['Cement OPC 53'].id, quantity: 200, unit_cost: 390,
  vehicle_number: 'KA 01 AB 1234', invoice_number: 'INV-10234', location: 'Tower A store', delivered_at: iso(now - 2 * 3600000), created_by: uid.vendor,
}), 'pending delivery');
// issues to contractors, then site usage
const ISSUES = [
  [60, C.abc, 'drains', 'Cement OPC 53', 220, 'Drain walls Block A'], [58, C.abc, 'drains', 'RCC pipes 600 mm', 30, 'Culverts'],
  [45, C.abc, 'drains', 'TMT steel 12 mm', 4, 'Drain cover slabs'], [40, C.abc, 'clubhouse', 'Concrete blocks 6"', 2600, 'Clubhouse plinth'],
  [30, C.xyz, 'electrical', 'XLPE cable 4C 25 sq mm', 900, 'Main road cabling'], [24, C.abc, 'water_tank', 'Cement OPC 53', 200, 'Tank columns'],
  [17, C.xyz, 'electrical', 'Street light poles 7 m', 14, 'Main road poles'], [10, C.sri, 'roads', '20 mm aggregate', 20, 'WMM patching'],
  [8, C.sri, 'roads', 'M-sand', 25, 'Kerb bedding'], [5, C.abc, 'clubhouse', 'Cement OPC 53', 150, 'Clubhouse footing'],
];
for (const [ago, cid, mk, mat, qty, purpose] of ISSUES) {
  const t = daysAgo(ago, 10, 15);
  const r = await must(db.from('material_requests').insert({
    org_id: org.id, project_id: project.id, contractor_id: cid, work_package_id: wpBy(cid, mk), material_id: M[mat].id, quantity: qty,
    purpose, location: 'Site', needed_by: dateOnly(t + 2 * DAY), status: 'issued', decided_by: uid.exec, decided_at: iso(t + 7200000),
    created_by: cid === C.abc ? uid.abc : uid.sales, created_at: iso(t),
  }).select('id').single(), 'request');
  mv(t + 7200000, mat, 'issued', qty, { contractor_id: cid, request_id: r.id, location: 'Site', note: purpose });
  // usage over the following days: ABC wastes more cement than the others (shows up as an alert)
  const wasteRate = cid === C.abc && mat === 'Cement OPC 53' ? 0.07 : cid === C.xyz ? 0.025 : 0.03;
  const usedShare = ago > 20 ? 0.97 : ago > 7 ? 0.7 : 0.35;
  const whole = M[mat].unit === 'nos' || M[mat].unit === 'bags';
  const r2 = (n) => (whole ? Math.round(n) : Math.round(n * 100) / 100);
  const wasted = r2(qty * usedShare * wasteRate);
  const consumed = r2(qty * usedShare) - wasted;
  if (consumed > 0) mv(t + 3 * DAY, mat, 'consumed', consumed, { contractor_id: cid, note: purpose });
  if (wasted > 0) mv(t + 3 * DAY, mat, 'wastage', wasted, { contractor_id: cid, note: 'Site wastage' });
}
await must(db.from('stock_movements').insert(moves), 'stock movements');
// open requests for the console (one exceeds store stock until today's delivery is accepted)
await must(db.from('material_requests').insert([
  { org_id: org.id, project_id: project.id, contractor_id: C.abc, work_package_id: wpBy(C.abc, 'clubhouse'), material_id: M['Cement OPC 53'].id, quantity: 300, purpose: 'Foundation work', location: 'Tower A', needed_by: dateOnly(now + 10 * DAY), status: 'requested', decided_by: null, decided_at: null, created_by: uid.abc, created_at: iso(now - 5 * 3600000) },
  { org_id: org.id, project_id: project.id, contractor_id: C.xyz, work_package_id: wpBy(C.xyz, 'electrical'), material_id: M['XLPE cable 4C 25 sq mm'].id, quantity: 150, purpose: 'Block D cabling', location: 'Block D', needed_by: dateOnly(now + 4 * DAY), status: 'requested', decided_by: null, decided_at: null, created_by: uid.xyz_el, created_at: iso(now - 26 * 3600000) },
  { org_id: org.id, project_id: project.id, contractor_id: C.sri, work_package_id: wpBy(C.sri, 'roads'), material_id: M['20 mm aggregate'].id, quantity: 12, purpose: '30 ft road WMM', location: 'Block B', needed_by: dateOnly(now + 6 * DAY), status: 'approved', decided_by: uid.exec, decided_at: iso(now - 3 * 3600000), created_by: uid.sales, created_at: iso(now - 30 * 3600000) },
]), 'open requests');

// ---------- employees & attendance ----------
step('Adding 18 site employees and 14 days of attendance');
const EMP = [
  ['EMP-1042', 'Ravi Kumar', 'Electrician', C.xyz, uid.emp, 950], ['EMP-1043', 'Mohammed Salim', 'Electrician', C.xyz, null, 950],
  ['EMP-1044', 'Prakash H', 'Lineman', C.xyz, null, 850], ['EMP-1101', 'Basavaraj', 'Mason', C.abc, null, 1000],
  ['EMP-1102', 'Shankar M', 'Mason', C.abc, null, 1000], ['EMP-1103', 'Lakshmi Devi', 'Helper', C.abc, null, 700],
  ['EMP-1104', 'Anand Rao', 'Bar bender', C.abc, null, 950], ['EMP-1105', 'Gopal K', 'Helper', C.abc, null, 700],
  ['EMP-1106', 'Yusuf Khan', 'Site engineer', C.abc, null, 1800], ['EMP-1201', 'Naveen S', 'Roller operator', C.sri, null, 1200],
  ['EMP-1202', 'Kumaraswamy', 'Paver crew', C.sri, null, 900], ['EMP-1203', 'Hanumanthappa', 'Helper', C.sri, null, 700],
  ['EMP-1301', 'Sowmya P', 'Gardener', C.greenscape, null, 750], ['EMP-1302', 'Ramesh B', 'Gardener', C.greenscape, null, 750],
  ['EMP-0007', 'Karthik Nair', 'Site in-charge', null, null, 2500], ['EMP-0008', 'Divya S', 'Store keeper', null, null, 1400],
  ['EMP-0009', 'Raju', 'Security', null, null, 800], ['EMP-0010', 'Mallesh', 'Security', null, null, 800],
];
const emps = await must(db.from('employees').insert(EMP.map(([code, name, role, cid, user, wage]) => ({
  org_id: org.id, project_id: project.id, contractor_id: cid, employee_code: code, full_name: name, role_title: role, user_id: user, daily_wage: wage,
  phone: '+91 9' + String(Math.floor(rnd() * 1e9)).padStart(9, '0'),
}))).select(), 'employees');
const att = [];
for (let d = 14; d >= 0; d--) {
  const day = new Date(now - d * DAY);
  const weekday = new Date(day.getTime() + 5.5 * 3600000).getUTCDay();
  if (weekday === 0) continue;   // Sundays off
  for (const e of emps) {
    if (d === 0 && e.employee_code === 'EMP-1042') continue;   // leave today's check-in for the demo
    if (d === 0 && rnd() < 0.35) continue;                      // some haven't arrived yet today
    if (rnd() < 0.1) continue;                                   // absent
    const inH = 8 + Math.floor(rnd() * 2), inM = Math.floor(rnd() * 60);
    const t = daysAgo(d, inH, inM);
    const outside = rnd() < 0.04;
    const dist = outside ? 900 + Math.floor(rnd() * 2500) : 20 + Math.floor(rnd() * 220);
    att.push({
      org_id: org.id, employee_id: e.id, project_id: project.id, work_date: dateOnly(t), check_in_at: iso(t),
      check_out_at: d === 0 ? null : iso(t + (8 + rnd() * 1.5) * 3600000),
      lat: 13.2468 + (outside ? 0.012 : (rnd() - 0.5) * 0.002), lng: 77.712 + (outside ? 0.015 : (rnd() - 0.5) * 0.002),
      distance_m: dist, inside_geofence: !outside, work_note: pick(['Drain wall shuttering', 'Cable laying', 'Block work', 'WMM rolling', 'Pole erection', 'Planting', 'Store issue register', 'Gate duty']),
    });
  }
}
await must(db.from('attendance').insert(att), 'attendance');

// ---------- buyer modifications ----------
step('Adding modification requests');
await must(db.from('modification_requests').insert([
  { org_id: org.id, booking_id: bookingIds.A05, buyer_id: uid.sandeep, requirement: 'Change living room flooring to vitrified tiles', quoted_cost: 85000, deadline: dateOnly(now + 10 * DAY), contractor_id: C.abc, status: 'approved', buyer_approved_at: iso(now - 6 * DAY), created_at: iso(now - 12 * DAY) },
  { org_id: org.id, booking_id: bookingIds.C04, buyer_id: uid.buyer, requirement: 'Add a 12 ft sliding gate and a compound wall on the road side of my plot', quoted_cost: 145000, deadline: dateOnly(now + 30 * DAY), contractor_id: C.abc, status: 'quoted', created_at: iso(now - 3 * DAY) },
]), 'modifications');

// ---------- CRM ----------
step('Filling the CRM pipeline (24 leads, activities, site visits)');
const LEADS = [
  ['Kiran Rao', '919845077777', 'app', 'new', 2500000, 3200000, 1200, 'east', null, 0.2],
  ['Pooja Hegde', '919886012345', 'portal', 'new', 4000000, 5500000, 2400, null, null, 0.5],
  ['Manoj Tiwari', '919731122334', 'website', 'new', 2800000, 3500000, 1500, 'north', null, 1],
  ['Sneha Kapoor', '919900887766', 'social', 'new', null, null, null, null, null, 0.1],
  ['Rohit Bansal', '919845566778', 'app', 'contacted', 3000000, 3800000, 1500, 'east', 'B05', 2],
  ['Lakshmi Narayan', '919741234567', 'referral', 'contacted', 5000000, 6500000, 2400, null, 'A04', 3],
  ['Abdul Rahman', '919880011223', 'walk_in', 'contacted', 2500000, 3000000, 1200, null, null, 4],
  ['Divya Menon', '919632145870', 'portal', 'contacted', 3500000, 4500000, 1500, 'east', 'B06', 2.5],
  ['Harish Gowda', '919845098765', 'app', 'site_visit', 2800000, 3400000, 1200, 'north', 'A03', 5],
  ['Swati Joshi', '919900554433', 'broker', 'site_visit', 5500000, 6200000, 2400, 'south', 'C06', 6],
  ['Venkat Subramanian', '919731987654', 'website', 'site_visit', 3000000, 3600000, 1500, 'west', 'B02', 7],
  ['Nikhil Jain', '919886677889', 'referral', 'site_visit', 2600000, 3100000, 1200, null, 'D01', 4],
  ['Farah Siddiqui', '919845200101', 'app', 'negotiation', 3200000, 3700000, 1500, 'east', 'B05', 9],
  ['Gautam Shenoy', '919741555666', 'walk_in', 'negotiation', 5800000, 6500000, 2400, null, 'D05', 12],
  ['Ritu Agarwal', '919900321654', 'portal', 'negotiation', 2900000, 3300000, 1200, null, 'C01', 8],
  ['Sandeep Rao', '919845011021', 'walk_in', 'won', null, null, 1200, null, 'A05', 560],
  ['Kavya Reddy', '919620077310', 'portal', 'won', null, null, 1200, null, 'A02', 240],
  ['Faisal Khan', '919886140255', 'referral', 'won', null, null, 2400, null, 'A06', 185],
  ['Ananya Gupta', '919739026644', 'app', 'won', null, null, 1500, null, 'C05', 57],
  ['Vikram Shetty', '919880851177', 'website', 'won', null, null, 1500, null, 'D02', 22],
  ['Neha Kulkarni', '919538290011', 'app', 'won', null, null, 1200, null, 'A08', 12],
  ['Aarav Mehta', '919999900001', 'app', 'won', null, null, 2400, null, 'C04', 26],
  ['Prakash Iyengar', '919845111999', 'social', 'lost', 2000000, 2400000, 1200, null, null, 30, 'Budget too low'],
  ['Tanvi Shah', '919741000222', 'portal', 'lost', 4000000, 4500000, 2400, null, null, 45, 'Bought in another project'],
];
const buyerIdByPhone = Object.fromEntries([...SAMPLE_BUYERS, DEMO_BUYER].map((b) => [b.phone, uid[b.key]]));
const leadRows = LEADS.map(([full_name, phone, source, stage, bmin, bmax, size, facing, plot, ago, lost]) => ({
  org_id: org.id, project_id: project.id, full_name, phone, source, stage, budget_min: bmin, budget_max: bmax,
  preferred_size: size, preferred_facing: facing, interested_plot_id: plot ? plotByNum[plot].id : null,
  assigned_to: rnd() < 0.6 ? uid.sales : uid.exec, buyer_id: buyerIdByPhone[phone] || null, lost_reason: lost || null,
  email: full_name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
  next_follow_up_at: ['won', 'lost'].includes(stage) ? null : iso(now + (Math.floor(rnd() * 6) - 1) * DAY + 3600000 * (10 + Math.floor(rnd() * 6)) - (now % DAY)),
  message: plot ? `Interested in plot ${plot}` : 'Wants a call back with plot prices', created_at: iso(now - ago * DAY), updated_at: iso(now - ago * DAY * 0.4),
}));
const leads = await must(db.from('leads').insert(leadRows).select(), 'leads');
const acts = []; const visits = [];
for (const l of leads) {
  const created = new Date(l.created_at).getTime();
  const age = (now - created) / DAY;
  acts.push({ org_id: org.id, lead_id: l.id, type: 'enquiry', body: l.message, created_at: l.created_at, created_by: null });
  if (l.stage !== 'new') acts.push({ org_id: org.id, lead_id: l.id, type: 'call', body: pick(['Called, shared price list on WhatsApp', 'Spoke for 6 minutes; wants east facing', 'Interested; asked about loan tie-ups', 'Shared layout plan and RERA certificate']), created_at: iso(created + Math.min(age * 0.2, 1) * DAY), created_by: l.assigned_to });
  if (['site_visit', 'negotiation', 'won'].includes(l.stage)) {
    const upcoming = l.stage === 'site_visit' && rnd() < 0.7;
    const at = upcoming ? now + (1 + Math.floor(rnd() * 5)) * DAY + 3600000 * (10 + Math.floor(rnd() * 5)) - (now % 3600000) : created + Math.max(age * 0.5, 0.5) * DAY;
    visits.push({ org_id: org.id, lead_id: l.id, project_id: project.id, scheduled_at: iso(at), status: upcoming ? 'scheduled' : 'completed', feedback: upcoming ? null : pick(['Liked the park-facing plots', 'Family visited; positive', 'Wants a better price', 'Happy with road width']), created_at: iso(created + 0.3 * DAY) });
  }
  if (l.stage === 'negotiation') acts.push({ org_id: org.id, lead_id: l.id, type: 'whatsapp', body: 'Asked for 3% discount; offered free registration support instead', created_at: iso(now - 1.5 * DAY), created_by: l.assigned_to });
  if (l.stage === 'lost') acts.push({ org_id: org.id, lead_id: l.id, type: 'note', body: 'Closed: ' + l.lost_reason, created_at: iso(now - age * 0.3 * DAY), created_by: l.assigned_to });
}
await must(db.from('lead_activities').insert(acts), 'lead activities');
await must(db.from('site_visits').insert(visits), 'site visits');

// ---------- notifications for the demo buyer ----------
await must(db.from('notifications').insert([
  { user_id: uid.buyer, title: 'Booking confirmed', body: 'Plot C04 is booked in your name.', link: '/my-property/' + bookingIds.C04, created_at: iso(daysAgo(26)), read_at: iso(daysAgo(26)) },
  { user_id: uid.buyer, title: 'Construction update: Internal roads: wet-mix base complete', body: 'All internal roads have the wet-mix macadam base.', link: '/project/' + project.id, created_at: iso(daysAgo(9)) },
  { user_id: uid.buyer, title: 'Quote ready for MOD-1025', body: 'Sliding gate and road-side wall — ₹1.5 L. Approve it in My property.', link: '/my-property/' + bookingIds.C04, created_at: iso(daysAgo(3)) },
]), 'notifications');

// ---------- a believable activity feed ----------
await must(db.from('activity_log').delete().eq('org_id', org.id), 'clear feed');
const FEED = [
  [0.08, 'delivery', 'XYZ Materials delivered 200 bags Cement OPC 53 (vehicle KA 01 AB 1234) — waiting for inspection'],
  [0.2, 'stock', 'ABC Constructions requested 300 bags Cement OPC 53 for Foundation work'],
  [0.6, 'attendance', '11 people checked in at site before 9:30 am'],
  [1.1, 'stock', 'XYZ Electricals requested 150 m XLPE cable 4C 25 sq mm for Block D cabling'],
  [1.5, 'lead', 'Lead Farah Siddiqui moved to negotiation'],
  [2.2, 'visit', 'Site visit: Harish Gowda on ' + new Date(now + 2 * DAY).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ', 11:00 AM'],
  [3, 'info', 'MOD-1025 requested: Add a 12 ft sliding gate and a compound wall on the road side of my plot'],
  [5, 'alert', 'ABC Constructions used 140 bags Cement OPC 53, wasted 10.5 (7% wastage)'],
  [6, 'delivery', 'Accepted 30 cu m 20 mm aggregate from XYZ Materials'],
  [9, 'update', 'Posted update "Internal roads: wet-mix base complete" — project now 53%'],
  [12, 'booked', 'Neha Kulkarni booked plot A08 (token paid)'],
  [12, 'lead', 'New lead: Pooja Hegde (portal)'],
  [19, 'delivery', 'Accepted 12 nos Street light poles 7 m from Volt Electricals Supply'],
  [22, 'booked', 'Vikram Shetty booked plot D02 (token paid)'],
  [26, 'booked', 'Aarav Mehta booked plot C04 (token paid)'],
  [26, 'delivery', 'Accepted 240 bags Cement OPC 53 from XYZ Materials (10 rejected)'],
];
await must(db.from('activity_log').insert(FEED.map(([d, kind, message]) => ({ org_id: org.id, project_id: project.id, kind, message, created_at: iso(now - d * DAY) }))), 'feed');

step('Preparing AI demo data (baseline plans, budgets, progress history, demand signals, FAQ)');
{
  const ai = await db.rpc('seed_ai_demo', { p_org: org.id });
  if (ai.error) console.warn('  (AI demo data skipped: ' + ai.error.message + ')');
}

step('Adding the apartment project (2 towers, 112 flats), partner profiles and letters');
{
  const fl = await db.rpc('seed_flats_demo', { p_org: org.id });
  if (fl.error) console.warn('  (flats demo skipped: ' + fl.error.message + ')');
}
step('Adding partner workspaces: RA bills, purchase orders, price list, crew tasks and leave');
{
  const ws = await db.rpc('seed_workspaces_demo', { p_org: org.id });
  if (ws.error) console.warn('  (workspaces demo skipped: ' + ws.error.message + ')');
}

const { data: pr } = await db.from('projects').select('progress_percent').eq('id', project.id).single();
// (the apartment project "Green Valley Heights" is created by seed_flats_demo)
console.log(`\n✓ Seeded "${ORG_NAME}" — project progress ${pr.progress_percent}%\n`);
console.log('Demo logins (password ' + PASSWORD + '):');
console.log('  Developer console  sales@demodevelopers.dev');
console.log('  Buyer              buyer@remmo.dev   (or phone +91 99999 00001 with a test OTP)');
console.log('  Contractor         contractor@abcconstructions.dev');
console.log('  Vendor             vendor@xyzmaterials.dev');
console.log('  Site employee      employee@remmo.dev');
console.log('  Platform admin     admin@remmo.dev');
