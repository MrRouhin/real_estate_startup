'use server';
// Developer console actions for approvals, people, letters, purchase orders, towers,
// settings and new projects. All run as the staff member; RLS and database functions keep
// them inside the staff member's own company.
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { fail, friendly, numOf, ok, str, type ActionResult } from '@/lib/actions';
import { draftLetter, type LetterFacts, type LetterKind } from '@/lib/ai/letters';
import { logUsage } from '@/lib/ai/usage';
import { wpHealth } from '@/lib/ai/plan';
import { todayIST } from '@/lib/format';
import { poNo } from '@/lib/numbering';
import { TEMPLATES } from '@/lib/flats/templates';
import type { Layout } from '@/lib/flats/layout';

type A = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
const done = (msg: string, id?: string) => { revalidatePath('/console', 'layout'); return ok(msg, id); };

// ---------------------------------------------------------------- project switcher
export async function switchProject(id: string): Promise<void> {
  const { projects } = await requireStaff();
  if (!projects.some((p) => p.id === id)) return;
  (await cookies()).set('remmo_project', id, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/console', 'layout');
}

// ---------------------------------------------------------------- approvals
export const decideBill: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const status = str(fd, 'status')!;
  const { error } = await supabase.rpc('decide_contractor_bill', { p_bill: str(fd, 'id')!, p_status: status, p_note: str(fd, 'note') ?? undefined, p_ref: str(fd, 'ref') ?? undefined });
  if (error) return fail(friendly(error));
  return done(status === 'paid' ? 'Marked paid. The contractor has been told.' : `Bill ${status}`);
};

export const decideAccess: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const approve = fd.get('approve') === 'true';
  const { error } = await supabase.rpc('decide_access_request', { p_request: str(fd, 'id')!, p_approve: approve, p_note: str(fd, 'note') ?? undefined, p_contractor: str(fd, 'contractor_id') ?? undefined });
  if (error) return fail(friendly(error));
  return done(approve ? 'Approved. Their workspace is ready.' : 'Request declined');
};

export const reviewKyc: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const approve = fd.get('approve') === 'true';
  const { error } = await supabase.rpc('review_kyc', { p_user: str(fd, 'user_id')!, p_approve: approve, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(error.message === 'NOTE_REQUIRED' ? 'Say what needs fixing so the buyer can act on it.' : friendly(error));
  return done(approve ? 'KYC verified' : 'Sent back to the buyer');
};

export const reviewCompany: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const kind = str(fd, 'kind'), status = str(fd, 'status');
  if ((kind !== 'contractor' && kind !== 'vendor') || (status !== 'verified' && status !== 'needs_changes')) return fail('Choose verify or ask for changes.');
  const note = str(fd, 'note');
  if (status === 'needs_changes' && !note) return fail('Say what needs to change.');
  const { error } = await supabase.from(kind === 'contractor' ? 'contractors' : 'vendors').update({ profile_status: status, profile_note: note }).eq('id', str(fd, 'id')!);
  if (error) return fail(friendly(error));
  return done(status === 'verified' ? 'Company verified' : 'Sent back with your note');
};

export const reviewEmployee: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const status = str(fd, 'status')!;
  const { error } = await supabase.rpc('review_employee_profile', { p_employee: str(fd, 'employee_id')!, p_status: status, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  return done(status === 'verified' ? 'Worker verified' : 'Sent back with your note');
};

export const decideStaffLeave: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const approve = fd.get('approve') === 'true';
  const { error } = await supabase.rpc('decide_leave', { p_leave: str(fd, 'id')!, p_approve: approve, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  return done(approve ? 'Leave approved' : 'Leave declined');
};

export const markDeliveryPaid: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc('mark_delivery_paid', { p_delivery: str(fd, 'id')!, p_ref: str(fd, 'ref') ?? '' });
  if (error) return fail(friendly(error));
  return done('Payment recorded. The supplier has been told.');
};

// ---------------------------------------------------------------- purchase orders
export const createPurchaseOrder: A = async (_, fd) => {
  const { supabase, orgId, project } = await requireStaff();
  if (!project) return fail('Create a project first.');
  const names = fd.getAll('item_name').map(String), units = fd.getAll('item_unit').map(String), qtys = fd.getAll('item_qty').map(Number), rates = fd.getAll('item_rate').map(Number), mats = fd.getAll('item_material').map(String);
  const items = names.map((n, i) => ({ material_id: mats[i] || null, name: n.trim(), unit: units[i]!.trim(), qty: qtys[i]!, rate: rates[i]! })).filter((i) => i.name && i.unit && i.qty > 0 && i.rate >= 0);
  if (!items.length) return fail('Add at least one item with quantity and rate.');
  const vendor = str(fd, 'vendor_id');
  if (!vendor) return fail('Choose a supplier.');
  const { data, error } = await supabase.from('purchase_orders').insert({
    org_id: orgId, project_id: project.id, vendor_id: vendor, items, gst_pct: numOf(fd, 'gst_pct') ?? 18, required_by: str(fd, 'required_by'),
    delivery_location: str(fd, 'delivery_location'), terms: str(fd, 'terms'), material_request_id: str(fd, 'material_request_id'),
  }).select('seq, created_at').single();
  if (error) return fail(friendly(error));
  return done(`${poNo(data.seq, data.created_at)} sent to the supplier`);
};

export async function cancelPurchaseOrder(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from('purchase_orders').update({ status: 'cancelled' }).eq('id', id).in('status', ['issued', 'accepted', 'declined']);
  if (error) return fail(friendly(error));
  return done('Order cancelled');
}

// ---------------------------------------------------------------- letters
async function letterFacts(kind: LetterKind, recipientType: string, recipientId: string, refId: string | null, note: string | null): Promise<LetterFacts | string> {
  const { supabase, org, project } = await requireStaff();
  const replyBy = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const base = { org: { name: org.name, signatory: org.signatory_name, title: org.signatory_title }, project: project ? { name: project.name, rera: project.rera_number } : null, note, replyBy };
  if (recipientType === 'contractor') {
    const { data: c } = await supabase.from('contractors').select('*').eq('id', recipientId).single();
    if (!c) return 'Contractor not found.';
    const recipient = { name: c.company_name, attn: c.contact_person };
    if (kind === 'work_order' || kind === 'delay_notice') {
      const { data: w } = refId ? await supabase.from('work_packages').select('*').eq('id', refId).single() : await supabase.from('work_packages').select('*').eq('contractor_id', c.id).order('due_date').limit(1).single();
      if (!w) return 'Pick a work package for this letter.';
      const [{ data: pts }, { data: log }] = await Promise.all([
        supabase.from('wp_plan_points').select('work_package_id, planned_date, planned_pct').eq('work_package_id', w.id).order('planned_date'),
        supabase.from('wp_progress_log').select('work_package_id, progress, logged_at').eq('work_package_id', w.id).order('logged_at'),
      ]);
      const h = wpHealth(w, pts || [], log || [], todayIST());
      return { ...base, recipient, workPackage: { title: w.title, scope: w.scope, value: w.contract_value == null ? null : Number(w.contract_value), start: w.start_date, due: w.due_date, progress: Number(w.progress), planned: h.planned, forecast: h.forecast } };
    }
    if (kind === 'crew_compliance') {
      const { data: crew } = await supabase.from('employees').select('id, full_name').eq('contractor_id', c.id).eq('active', true);
      const { data: profs } = await supabase.from('employee_profiles').select('employee_id, status, safety_trained').in('employee_id', (crew || []).map((e) => e.id));
      const pm = new Map((profs || []).map((p) => [p.employee_id, p]));
      return { ...base, recipient, crew: { total: (crew || []).length, unverified: (crew || []).filter((e) => pm.get(e.id)?.status !== 'verified').map((e) => e.full_name), noSafety: (crew || []).filter((e) => !pm.get(e.id)?.safety_trained).map((e) => e.full_name), insuranceTill: c.insurance_valid_till } };
    }
    return { ...base, recipient };
  }
  if (recipientType === 'vendor') {
    const { data: v } = await supabase.from('vendors').select('*').eq('id', recipientId).single();
    if (!v) return 'Supplier not found.';
    const recipient = { name: v.company_name, attn: v.contact_person };
    if (kind === 'purchase_order') {
      const { data: po } = refId ? await supabase.from('purchase_orders').select('*').eq('id', refId).single() : await supabase.from('purchase_orders').select('*').eq('vendor_id', v.id).order('created_at', { ascending: false }).limit(1).single();
      if (!po) return 'Raise the purchase order first, then send the letter.';
      return { ...base, recipient, po: { number: poNo(po.seq, po.created_at), items: po.items as never, total: Number(po.total), requiredBy: po.required_by, location: po.delivery_location, terms: po.terms } };
    }
    return { ...base, recipient };
  }
  const { data: e } = await supabase.from('employees').select('*, contractors(company_name)').eq('id', recipientId).single();
  if (!e) return 'Worker not found.';
  return { ...base, recipient: { name: e.full_name }, employee: { code: e.employee_code, role: e.role_title, wage: e.daily_wage == null ? null : Number(e.daily_wage), employer: (e.contractors as unknown as { company_name: string } | null)?.company_name ?? null, start: e.created_at } };
}

export async function draftLetterAction(input: { kind: LetterKind; recipientType: string; recipientId: string; refId: string | null; note: string | null }) {
  const { orgId, user } = await requireStaff();
  const facts = await letterFacts(input.kind, input.recipientType, input.recipientId, input.refId, input.note);
  if (typeof facts === 'string') return { ok: false as const, error: facts };
  const r = await draftLetter(input.kind, facts);
  if (r.result) await logUsage('letter_draft', 'u:' + user.id, orgId, r.result);
  return { ok: true as const, subject: r.subject, body: r.body, source: r.source };
}

export const saveLetter: A = async (_, fd) => {
  const { supabase, orgId, project } = await requireStaff();
  const subject = str(fd, 'subject'), body = str(fd, 'body');
  if (!subject || !body) return fail('Write a subject and the letter.');
  const { data, error } = await supabase.from('letters').insert({
    org_id: orgId, project_id: project?.id ?? null, kind: str(fd, 'kind') ?? 'general', recipient_type: str(fd, 'recipient_type')!, recipient_id: str(fd, 'recipient_id')!,
    subject, body, source: str(fd, 'source') === 'ai' ? 'ai' : 'rules', status: 'draft', data: { ref: str(fd, 'ref_id') },
  }).select('id').single();
  if (error) return fail(friendly(error));
  if (fd.get('intent') === 'issue') {
    const { error: e2 } = await supabase.rpc('issue_letter', { p_letter: data.id });
    if (e2) return fail(friendly(e2));
    return done('Letter issued. The recipient has been notified.', data.id);
  }
  return done('Saved as draft', data.id);
};

export async function issueLetter(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc('issue_letter', { p_letter: id });
  if (error) return fail(friendly(error));
  return done('Letter issued');
}

// ---------------------------------------------------------------- towers
export const postTowerProgress: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const stages: Record<string, number> = {};
  for (const k of ['foundation', 'masonry', 'mep', 'finishing', 'facade']) { const v = numOf(fd, k); if (v != null) stages[k] = Math.max(0, Math.min(100, v)); }
  const title = str(fd, 'title');
  if (!title) return fail('Give the update a short title, like “Slab 12 cast”.');
  const { error } = await supabase.rpc('update_tower_progress', { p_tower: str(fd, 'tower_id')!, p_slabs: numOf(fd, 'slabs_cast') ?? 0, p_stages: stages as never, p_title: title, p_body: str(fd, 'body') ?? undefined });
  if (error) return fail(friendly(error));
  return done('Progress posted. Buyers of this tower see it now.');
};

// ---------------------------------------------------------------- settings
export const saveOrgSettings: A = async (_, fd) => {
  const { supabase, orgId } = await requireStaff();
  const gst = str(fd, 'gst_number')?.toUpperCase() ?? null;
  if (gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)) return fail('Enter a valid 15-character GSTIN.');
  const { error } = await supabase.from('organizations').update({
    name: str(fd, 'name')!, phone: str(fd, 'phone'), email: str(fd, 'email'), gst_number: gst, address: str(fd, 'address'), website: str(fd, 'website'),
    signatory_name: str(fd, 'signatory_name'), signatory_title: str(fd, 'signatory_title'), token_percent: numOf(fd, 'token_percent') ?? 10,
  }).eq('id', orgId);
  if (error) return fail(friendly(error));
  return done('Company details saved');
};

export async function verifyCompany(orgId: string, verified: boolean): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc('verify_organization', { p_org: orgId, p_verified: verified });
  if (error) return fail(friendly(error));
  revalidatePath('/console/platform');
  return ok(verified ? 'Company verified' : 'Verification removed');
}

// ---------------------------------------------------------------- new project
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export async function createProject(input: {
  kind: 'plots' | 'apartments'; name: string; city: string; address: string; description: string; rera: string; possession: string | null; publish: boolean;
  plots?: { blocks: number; rows: number; perRow: number; widthFt: number; depthFt: number; rate: number; cornerPct: number; eastPct: number };
  towers?: { code: string; floors: number; stacks: string[]; frontFacing: string; rot: number }[];
  types?: { code: string; template: keyof typeof TEMPLATES; rate: number }[];
  pricing?: { floorRise: number; plc: number; corner: number };
}): Promise<ActionResult> {
  const { supabase, orgId } = await requireStaff();
  const name = input.name.trim();
  if (name.length < 3) return fail('Give the project a name.');
  let slug = slugify(name) || 'project';
  const { data: clash } = await supabase.from('projects').select('id').eq('slug', slug).maybeSingle();
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: p, error } = await supabase.from('projects').insert({
    org_id: orgId, name, slug, city: input.city.trim() || null, address: input.address.trim() || null, description: input.description.trim() || null,
    rera_number: input.rera.trim() || null, status: 'upcoming', is_published: input.publish, kind: input.kind, possession_date: input.possession || null,
    pricing: input.kind === 'apartments' ? { floor_rise: input.pricing?.floorRise ?? 35, plc: { park: input.pricing?.plc ?? 150, pool: input.pricing?.plc ?? 150, garden: Math.round((input.pricing?.plc ?? 150) * 0.6), road: 0 }, corner: input.pricing?.corner ?? 75, maintenance: 3.5 } : null,
    payment_plan: input.kind === 'apartments' ? [
      { label: 'Booking amount', pct: 10, note: 'At booking' }, { label: 'Agreement for sale', pct: 10, days: 30, note: 'Within 30 days' },
      { label: 'On completion of foundation', pct: 15, stage: 'foundation' }, { label: 'On casting of the 4th slab', pct: 15, slab: 4 },
      { label: 'On casting of the roof slab', pct: 15, slab: 'top' }, { label: 'On completion of masonry', pct: 15, stage: 'masonry' },
      { label: 'On flooring and finishing', pct: 15, stage: 'finishing' }, { label: 'On possession', pct: 5 },
    ] : null,
  } as never).select('id, slug').single();
  if (error) return fail(friendly(error));
  (await cookies()).set('remmo_project', p.id, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });

  if (input.kind === 'plots' && input.plots) {
    const g = input.plots;
    const rows: Record<string, unknown>[] = [];
    const area = g.widthFt * g.depthFt;
    // a simple grid layout in the 1000×700 site canvas: blocks side by side, two rows of plots per block around a road
    const blockW = 900 / g.blocks, cellW = blockW / g.perRow, cellH = Math.min(70, 600 / (g.rows + 1));
    for (let b = 0; b < g.blocks; b++) for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.perRow; c++) {
      const x = 50 + b * blockW + c * cellW, y = 60 + r * (cellH + (r % 2 ? 30 : 4));
      const corner = c === 0 || c === g.perRow - 1, facing = r % 2 ? 'north' : 'south';
      const price = Math.round(area * g.rate * (1 + (corner ? g.cornerPct / 100 : 0)) / 1000) * 1000;
      rows.push({ org_id: orgId, project_id: p.id, plot_number: `${String.fromCharCode(65 + b)}-${String(r * g.perRow + c + 1).padStart(2, '0')}`, area_sqft: area,
        dimensions: `${g.widthFt}x${g.depthFt}`, facing, is_corner: corner, price, kind: 'plot',
        shape_path: `M${x.toFixed(1)},${y.toFixed(1)} h${(cellW - 4).toFixed(1)} v${(cellH - 4).toFixed(1)} h${(-(cellW - 4)).toFixed(1)} Z` });
    }
    const { error: e2 } = await supabase.from('plots').insert(rows as never);
    if (e2) return fail(friendly(e2));
  }

  if (input.kind === 'apartments' && input.towers?.length && input.types?.length) {
    const typeRows = input.types.map((t) => { const T = TEMPLATES[t.template]; return { org_id: orgId, project_id: p.id, code: t.code, name: T.name, bedrooms: T.bedrooms, bathrooms: T.bathrooms, balconies: T.balconies, carpet_sqft: T.carpet, builtup_sqft: T.builtup, super_sqft: T.super, base_rate: t.rate, layout: T.layout as unknown as Layout, description: T.description }; });
    const { data: types, error: e3 } = await supabase.from('unit_types').insert(typeRows as never).select('id, code, super_sqft, base_rate');
    if (e3) return fail(friendly(e3));
    const pr = input.pricing ?? { floorRise: 35, plc: 150, corner: 75 };
    const flats: Record<string, unknown>[] = [];
    let i = 0;
    for (const t of input.towers) {
      const half = Math.ceil(t.stacks.length / 2);
      const { data: tw, error: e4 } = await supabase.from('towers').insert({ org_id: orgId, project_id: p.id, code: t.code, name: `Tower ${t.code}`, floors: t.floors, units_per_floor: t.stacks.length,
        position: { x: i * 46 - (input.towers.length - 1) * 23, z: 0, rot: t.rot }, sort_order: i } as never).select('id').single();
      if (e4) return fail(friendly(e4));
      const back = ({ north: 'south', south: 'north', east: 'west', west: 'east', north_east: 'south_west', south_west: 'north_east', north_west: 'south_east', south_east: 'north_west' } as Record<string, string>)[t.frontFacing] ?? 'west';
      for (let f = 1; f <= t.floors; f++) t.stacks.forEach((code, s) => {
        const ty = types!.find((x) => x.code === code)!;
        const stack = s + 1, front = stack <= half, corner = stack === 1 || stack === t.stacks.length, view = front ? 'park' : 'road';
        const rate = Number(ty.base_rate) + pr.floorRise * (f - 1) + (view === 'park' ? pr.plc : 0) + (corner ? pr.corner : 0);
        flats.push({ org_id: orgId, project_id: p.id, kind: 'flat', tower_id: tw.id, floor: f, stack, unit_type_id: ty.id, plot_number: `${t.code}-${f}${String(stack).padStart(2, '0')}`,
          area_sqft: ty.super_sqft, price: Math.round((Number(ty.super_sqft) * rate) / 1000) * 1000, facing: front ? t.frontFacing : back, is_corner: corner, view, mirror: !front });
      });
      i++;
    }
    for (let k = 0; k < flats.length; k += 500) {
      const { error: e5 } = await supabase.from('plots').insert(flats.slice(k, k + 500) as never);
      if (e5) return fail(friendly(e5));
    }
  }
  revalidatePath('/console', 'layout');
  return ok(input.publish ? 'Project created and published' : 'Project created. Publish it when you are ready.', `/console?project=${p.id}`);
}

export async function setPublished(id: string, publish: boolean): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from('projects').update({ is_published: publish }).eq('id', id);
  if (error) return fail(friendly(error));
  return done(publish ? 'Published. Buyers can see it once your company is verified.' : 'Hidden from buyers');
}
