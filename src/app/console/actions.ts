'use server';
// Developer-console server actions. Each one checks the person is developer staff,
// then writes as that person, so row-level security still applies.
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { createAdminClient, hasServiceKey, SERVICE_KEY_MISSING } from '@/lib/supabase/server';
import { fail, friendly, numOf, ok, str, type ActionResult } from '@/lib/actions';
import type { LeadStage } from '@/lib/types';
import type { Json } from '@/lib/database.types';
import { checkInvoice, fileBytes, saveCheck } from '@/lib/ai/delivery-check';
import { readExif, visionCheck, photoFlags } from '@/lib/ai/photo';
import { indexPdf } from '@/lib/ai/docs';
import { aiEnabled } from '@/lib/ai/client';
import { logUsage } from '@/lib/ai/usage';

const R = (p: string) => revalidatePath(p, 'layout');
type A = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

// ---------------- CRM ----------------
export const createLead: A = async (_, fd) => {
  const { supabase, orgId, project, user } = await requireStaff();
  const phone = (str(fd, 'phone') || '').replace(/\D/g, '');
  const full = phone.length === 10 ? '91' + phone : phone;
  if (!str(fd, 'full_name') || full.length < 11) return fail('Enter a name and a 10-digit mobile number.');
  const { data, error } = await supabase.from('leads').insert({
    org_id: orgId, project_id: project?.id ?? null, full_name: str(fd, 'full_name')!, phone: full, email: str(fd, 'email'),
    source: (str(fd, 'source') || 'walk_in') as 'walk_in', budget_min: numOf(fd, 'budget_min'), budget_max: numOf(fd, 'budget_max'),
    preferred_size: numOf(fd, 'preferred_size'), message: str(fd, 'message'), assigned_to: str(fd, 'assigned_to') || user.id,
    next_follow_up_at: str(fd, 'next_follow_up_at') ? new Date(str(fd, 'next_follow_up_at')!).toISOString() : null,
  }).select('id').single();
  if (error) return fail(error.code === '23505' ? 'A lead with this phone number already exists.' : friendly(error));
  R('/console/leads');
  return ok('Lead added', data.id);
};

export async function moveLead(id: string, stage: LeadStage, lostReason?: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from('leads').update({ stage, lost_reason: stage === 'lost' ? lostReason || 'Not specified' : null }).eq('id', id);
  if (error) return fail(friendly(error));
  R('/console/leads');
  return ok();
}

export const updateLead: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const id = str(fd, 'id')!;
  const { error } = await supabase.from('leads').update({
    assigned_to: str(fd, 'assigned_to'), budget_min: numOf(fd, 'budget_min'), budget_max: numOf(fd, 'budget_max'),
    preferred_size: numOf(fd, 'preferred_size'), preferred_facing: (str(fd, 'preferred_facing') as 'east' | null),
    next_follow_up_at: str(fd, 'next_follow_up_at') ? new Date(str(fd, 'next_follow_up_at')!).toISOString() : null,
    interested_plot_id: str(fd, 'interested_plot_id'), email: str(fd, 'email'),
  }).eq('id', id);
  if (error) return fail(friendly(error));
  R(`/console/leads/${id}`);
  return ok('Lead updated');
};

export const logLeadActivity: A = async (_, fd) => {
  const { supabase, orgId } = await requireStaff();
  const leadId = str(fd, 'lead_id')!, body = str(fd, 'body');
  if (!body) return fail('Write a note first.');
  const { error } = await supabase.from('lead_activities').insert({ org_id: orgId, lead_id: leadId, type: (str(fd, 'type') || 'note') as 'note', body });
  if (error) return fail(friendly(error));
  const contacted = ['call', 'whatsapp', 'email'].includes(str(fd, 'type') || '');
  if (contacted) await supabase.from('leads').update({ stage: 'contacted' }).eq('id', leadId).eq('stage', 'new');
  R(`/console/leads/${leadId}`);
  return ok('Logged');
};

export const scheduleVisit: A = async (_, fd) => {
  const { supabase, orgId, project } = await requireStaff();
  const leadId = str(fd, 'lead_id')!, at = str(fd, 'scheduled_at');
  if (!at) return fail('Pick a date and time.');
  const { error } = await supabase.from('site_visits').insert({ org_id: orgId, lead_id: leadId, project_id: project?.id ?? null, scheduled_at: new Date(at).toISOString() });
  if (error) return fail(friendly(error));
  await supabase.from('leads').update({ stage: 'site_visit' }).eq('id', leadId).in('stage', ['new', 'contacted']);
  R(`/console/leads/${leadId}`);
  return ok('Site visit scheduled');
};

export const updateVisit: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const id = str(fd, 'id')!, status = str(fd, 'status')!;
  const { data, error } = await supabase.from('site_visits').update({ status, feedback: str(fd, 'feedback') }).eq('id', id).select('lead_id').single();
  if (error) return fail(friendly(error));
  R(`/console/leads/${data.lead_id}`);
  return ok('Visit updated');
};

// ---------------- Plots ----------------
export const setPlotPrice: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const price = numOf(fd, 'price');
  if (!price || price < 100000) return fail('Enter the full price in rupees.');
  const { error } = await supabase.from('plots').update({ price }).eq('id', str(fd, 'id')!).in('status', ['available', 'held', 'blocked']);
  if (error) return fail(friendly(error));
  R('/console/plots');
  return ok('Price updated and logged to price history');
};

export async function togglePlotBlock(id: string, block: boolean): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from('plots').update({ status: block ? 'blocked' : 'available' }).eq('id', id).eq('status', block ? 'available' : 'blocked');
  if (error) return fail(friendly(error));
  R('/console/plots');
  return ok(block ? 'Plot blocked' : 'Plot released for sale');
}

export const revisePrices: A = async (_, fd) => {
  const { supabase, project } = await requireStaff();
  const pct = numOf(fd, 'pct');
  if (!pct || pct <= 0 || pct > 25 || !project) return fail('Pick a revision between 1% and 25%.');
  const { data: plots } = await supabase.from('plots').select('id, price').eq('project_id', project.id).in('status', ['available', 'held', 'blocked']);
  for (const p of plots || []) {
    const price = Math.round((Number(p.price) * (1 + pct / 100)) / 1000) * 1000;
    const { error } = await supabase.from('plots').update({ price }).eq('id', p.id);
    if (error) return fail(friendly(error));
  }
  R('/console/plots');
  return ok(`Raised ${plots?.length || 0} unsold plots by ${pct}%`);
};

export const importPlots: A = async (_, fd) => {
  const { supabase, orgId, project } = await requireStaff();
  if (!project) return fail('Create a project first.');
  const rows = (str(fd, 'csv') || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const head = rows.shift()?.toLowerCase().split(',').map((s) => s.trim()) || [];
  const need = ['plot_number', 'area_sqft', 'facing', 'price'];
  if (!need.every((k) => head.includes(k))) return fail('The first line must include: plot_number, area_sqft, facing, price (dimensions and is_corner are optional).');
  const out = []; const bad: number[] = [];
  for (const [i, line] of rows.entries()) {
    const c = line.split(',').map((s) => s.trim()); const get = (k: string) => c[head.indexOf(k)];
    const area = Number(get('area_sqft')), price = Number(get('price')), facing = get('facing')?.toLowerCase();
    if (!get('plot_number') || !(area > 0) || !(price > 0) || !facing) { bad.push(i + 2); continue; }
    out.push({ org_id: orgId, project_id: project.id, plot_number: get('plot_number')!, area_sqft: area, price, facing: facing as 'east',
      dimensions: head.includes('dimensions') ? get('dimensions') || null : null, is_corner: head.includes('is_corner') ? /^(1|y|yes|true)$/i.test(get('is_corner') || '') : false,
      svg_shape_id: 'plot-' + get('plot_number') });
  }
  if (bad.length) return fail(`Check line${bad.length > 1 ? 's' : ''} ${bad.join(', ')}: each row needs a plot number, size, facing and price.`);
  if (!out.length) return fail('No rows to import.');
  const { error } = await supabase.from('plots').insert(out);
  if (error) return fail(friendly(error));
  R('/console/plots');
  return ok(`Imported ${out.length} plots. Upload the layout so they appear on the map.`);
};

// ---------------- Bookings & modifications ----------------
export async function setBookingStatus(id: string, status: 'registered' | 'handed_over' | 'cancelled'): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) return fail(friendly(error));
  R('/console/bookings');
  return ok(status === 'registered' ? 'Marked registered; plot is now sold' : status === 'handed_over' ? 'Marked handed over' : 'Booking closed');
}

export const quoteModification: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const cost = numOf(fd, 'quoted_cost');
  if (cost == null || cost < 0) return fail('Enter the quoted cost.');
  const { error } = await supabase.from('modification_requests').update({
    quoted_cost: cost, deadline: str(fd, 'deadline'), contractor_id: str(fd, 'contractor_id'), status: 'quoted',
  }).eq('id', str(fd, 'id')!).in('status', ['requested', 'quoted']);
  if (error) return fail(friendly(error));
  R('/console/modifications');
  return ok('Quote sent to the buyer');
};

export async function setModificationStatus(id: string, status: 'in_progress' | 'done'): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from('modification_requests').update({ status }).eq('id', id);
  if (error) return fail(friendly(error));
  R('/console/modifications');
  return ok(status === 'done' ? 'Marked done' : 'Work started');
}

// ---------------- Construction ----------------
export const postUpdate: A = async (_, fd) => {
  const { supabase, orgId, project, user } = await requireStaff();
  if (!project) return fail('No project selected.');
  const title = str(fd, 'title');
  if (!title) return fail('Give the update a title.');
  const photo = await fileBytes(fd.get('photo'));
  const paths: string[] = [];
  if (photo) {
    const path = `${orgId}/${project.id}/updates/${Date.now()}-${photo.file.name.replace(/[^a-z0-9.]+/gi, '-')}`;
    const { error } = await supabase.storage.from('project-media').upload(path, photo.file, { contentType: photo.mediaType });
    if (!error) paths.push(path);
  }
  const milestoneId = str(fd, 'milestone_id'), claimed = numOf(fd, 'milestone_progress');
  // check the photo: camera time and place (EXIF), and with an AI key, whether it shows the claimed work
  let photo_check: Json | null = null, warn = '', insight: { severity: string; title: string; body: string; source: string } | null = null;
  if (photo && /^image\//.test(photo.mediaType)) {
    const { data: ms } = milestoneId ? await supabase.from('milestones').select('name').eq('id', milestoneId).single() : { data: null };
    const exif = await readExif(photo.bytes, { lat: project.site_lat, lng: project.site_lng });
    const v = aiEnabled() ? await visionCheck(photo.bytes, photo.mediaType, { title, milestone: ms?.name ?? null, progress: claimed }) : null;
    if (v) await logUsage('photo_check', 'u:' + user.id, orgId, v.result);
    const flags = photoFlags(exif, v?.vision ?? null, { progress: claimed }, new Date(), project.geofence_m);
    photo_check = { checked_at: new Date().toISOString(), exif, vision: v?.vision ?? null, flags, source: v ? 'ai' : 'rules', claim: { milestone: ms?.name ?? null, progress: claimed } } as unknown as Json;
    const bad = flags.filter((f) => f.severity !== 'info');
    if (bad.length) {
      warn = ` · photo check: ${bad[0]!.label.toLowerCase()}`;
      insight = { severity: bad.some((f) => f.severity === 'critical') ? 'critical' : 'warn', title: `Photo check on "${title}": ${bad[0]!.label}`, body: bad.map((f) => `• ${f.label}: ${f.detail}`).join('\n'), source: v ? 'ai' : 'rules' };
    }
  }
  const { data: upd, error } = await supabase.from('construction_updates').insert({
    org_id: orgId, project_id: project.id, title, body: str(fd, 'body'), created_by: user.id,
    milestone_id: milestoneId, milestone_progress: claimed, photo_paths: paths,
  }).select('id').single();
  if (error) return fail(friendly(error));
  if (photo_check) await saveCheck(supabase, orgId, 'photo', upd.id, photo_check);
  if (insight) await supabase.from('ai_insights').insert({ org_id: orgId, project_id: project.id, scope: 'project', subject_id: upd.id, kind: 'photo_check', severity: insight.severity, title: insight.title,
    body: insight.body, source: insight.source, suggestion: { action: 'review', href: '/console/construction', label: 'Open the update' } as unknown as Json });
  R('/console/construction'); revalidatePath('/', 'layout');
  return ok('Update posted — buyers notified' + warn);
};

export const postAnnouncement: A = async (_, fd) => {
  const { supabase, orgId, project } = await requireStaff();
  if (!project || !str(fd, 'title')) return fail('Give the announcement a title.');
  const { error } = await supabase.from('announcements').insert({ org_id: orgId, project_id: project.id, title: str(fd, 'title')!, body: str(fd, 'body') });
  if (error) return fail(friendly(error));
  R('/console/construction');
  return ok('Announcement sent to all buyers');
};

// ---------------- Contractors & work ----------------
export const createContractor: A = async (_, fd) => {
  const { supabase, orgId } = await requireStaff();
  if (!str(fd, 'company_name')) return fail('Enter the company name.');
  const { data, error } = await supabase.from('contractors').insert({
    org_id: orgId, company_name: str(fd, 'company_name')!, contact_person: str(fd, 'contact_person'), phone: str(fd, 'phone'), email: str(fd, 'email'),
    gst_number: str(fd, 'gst_number'), address: str(fd, 'address'), trade: (str(fd, 'trade') || 'civil') as 'civil', contract_type: str(fd, 'contract_type') || 'item_rate',
  }).select('id').single();
  if (error) return fail(friendly(error));
  R('/console/contractors');
  return ok('Contractor added', data.id);
};

export const createWorkPackage: A = async (_, fd) => {
  const { supabase, orgId, project } = await requireStaff();
  if (!project || !str(fd, 'title')) return fail('Give the work package a title.');
  const cid = str(fd, 'contractor_id')!;
  const { error } = await supabase.from('work_packages').insert({
    org_id: orgId, project_id: project.id, contractor_id: cid, title: str(fd, 'title')!, scope: str(fd, 'scope'),
    milestone_id: str(fd, 'milestone_id'), contract_value: numOf(fd, 'contract_value') || 0, start_date: str(fd, 'start_date'), due_date: str(fd, 'due_date'),
  });
  if (error) return fail(friendly(error));
  R(`/console/contractors/${cid}`);
  return ok('Work package added');
};

export const updateProgress: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc('update_work_progress', { p_package: str(fd, 'id')!, p_progress: numOf(fd, 'progress') ?? 0, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  R(`/console/contractors/${data.contractor_id}`);
  return ok('Progress saved');
};

// ---------------- Materials ----------------
export const createMaterial: A = async (_, fd) => {
  const { supabase, orgId } = await requireStaff();
  if (!str(fd, 'name') || !str(fd, 'unit')) return fail('Enter a name and unit.');
  const { error } = await supabase.from('materials').insert({ org_id: orgId, name: str(fd, 'name')!, category: (str(fd, 'category') || 'other'), unit: str(fd, 'unit')!, reorder_level: numOf(fd, 'reorder_level') || 0, unit_cost: numOf(fd, 'unit_cost') });
  if (error) return fail(friendly(error));
  R('/console/materials');
  return ok('Material added');
};

export const recordOpening: A = async (_, fd) => {
  const { supabase, project } = await requireStaff();
  const { error } = await supabase.rpc('record_opening_stock', { p_project: project!.id, p_material: str(fd, 'material_id')!, p_qty: numOf(fd, 'qty') ?? 0, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  R('/console/materials');
  return ok('Stock recorded');
};

export async function decideRequest(id: string, approve: boolean): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc('decide_material_request', { p_request: id, p_approve: approve });
  if (error) return fail(friendly(error));
  R('/console/materials');
  return ok(approve ? 'Request approved' : 'Request rejected');
}

export async function issueRequest(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc('issue_material', { p_request: id });
  if (error) return fail(friendly(error));
  R('/console/materials');
  return ok('Issued from the store');
}

export const recordUsage: A = async (_, fd) => {
  const { supabase, project } = await requireStaff();
  const { error } = await supabase.rpc('record_site_usage', {
    p_project: project!.id, p_contractor: str(fd, 'contractor_id')!, p_material: str(fd, 'material_id')!,
    p_consumed: numOf(fd, 'consumed') ?? 0, p_wastage: numOf(fd, 'wastage') ?? 0, p_note: str(fd, 'note') ?? undefined,
  });
  if (error) return fail(friendly(error));
  R('/console/materials');
  return ok('Usage recorded');
};

// ---------------- Vendors & deliveries ----------------
export const createVendor: A = async (_, fd) => {
  const { supabase, orgId } = await requireStaff();
  if (!str(fd, 'company_name')) return fail('Enter the company name.');
  const { error } = await supabase.from('vendors').insert({
    org_id: orgId, company_name: str(fd, 'company_name')!, contact_person: str(fd, 'contact_person'), phone: str(fd, 'phone'), email: str(fd, 'email'),
    gst_number: str(fd, 'gst_number'), address: str(fd, 'address'), categories: (str(fd, 'categories') || '').split(',').map((s) => s.trim()).filter(Boolean),
  });
  if (error) return fail(friendly(error));
  R('/console/vendors');
  return ok('Vendor added');
};

export const recordDelivery: A = async (_, fd) => {
  const { supabase, orgId, project, user } = await requireStaff();
  const qty = numOf(fd, 'quantity');
  if (!qty || qty <= 0) return fail('Enter the quantity delivered.');
  const inv = await fileBytes(fd.get('invoice'));
  let invoicePath: string | null = null;
  if (inv) {
    const path = `${orgId}/invoices/${Date.now()}-${inv.file.name.replace(/[^a-z0-9.]+/gi, '-')}`;
    const up = await supabase.storage.from('site').upload(path, inv.file, { contentType: inv.mediaType });
    if (!up.error) invoicePath = path;
  }
  const { data, error } = await supabase.from('deliveries').insert({
    org_id: orgId, project_id: project!.id, vendor_id: str(fd, 'vendor_id')!, material_id: str(fd, 'material_id')!, quantity: qty,
    unit_cost: numOf(fd, 'unit_cost'), vehicle_number: str(fd, 'vehicle_number'), invoice_number: str(fd, 'invoice_number'), location: str(fd, 'location'),
    invoice_path: invoicePath,
  }).select('id').single();
  if (error) return fail(friendly(error));
  let note = '';
  if (inv) {
    const c = await checkInvoice(supabase, data.id, inv, 'u:' + user.id);
    if (c?.source === 'ai') note = c.flags.length ? ` · invoice check: ${c.flags.length} issue${c.flags.length > 1 ? 's' : ''}` : ' · invoice matches';
  }
  R('/console/vendors');
  return ok('Delivery logged — waiting for inspection' + note);
};

export const attachInvoice: A = async (_, fd) => {
  const { supabase, orgId, user } = await requireStaff();
  const id = str(fd, 'id')!;
  const inv = await fileBytes(fd.get('invoice'));
  if (!inv) return fail('Choose a photo of the invoice.');
  if (!/^image\//.test(inv.mediaType)) return fail('Use a photo (JPG or PNG) of the invoice.');
  const path = `${orgId}/invoices/${Date.now()}-${inv.file.name.replace(/[^a-z0-9.]+/gi, '-')}`;
  const up = await supabase.storage.from('site').upload(path, inv.file, { contentType: inv.mediaType });
  if (!up.error) await supabase.from('deliveries').update({ invoice_path: path }).eq('id', id);
  const c = await checkInvoice(supabase, id, inv, 'u:' + user.id);
  R('/console/vendors');
  if (!c) return fail('Delivery not found.');
  if (c.source !== 'ai') return ok(c.note || 'Photo saved');
  return ok(c.flags.length ? `Invoice read: ${c.flags.length} issue${c.flags.length > 1 ? 's' : ''} found` : 'Invoice read: it matches what was entered');
};

export const inspectDelivery: A = async (_, fd) => {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc('accept_delivery', { p_delivery: str(fd, 'id')!, p_accepted: numOf(fd, 'accepted') ?? 0, p_note: str(fd, 'note') ?? undefined });
  if (error) return fail(friendly(error));
  R('/console/vendors'); R('/console/materials');
  return ok('Inspection saved and stock updated');
};

// ---------------- Employees ----------------
export const createEmployee: A = async (_, fd) => {
  const { supabase, orgId, project } = await requireStaff();
  if (!str(fd, 'full_name') || !str(fd, 'employee_code')) return fail('Enter a name and employee code.');
  const { error } = await supabase.from('employees').insert({
    org_id: orgId, project_id: project?.id ?? null, contractor_id: str(fd, 'contractor_id'), employee_code: str(fd, 'employee_code')!,
    full_name: str(fd, 'full_name')!, phone: str(fd, 'phone'), role_title: str(fd, 'role_title'), daily_wage: numOf(fd, 'daily_wage'),
  });
  if (error) return fail(error.code === '23505' ? 'That employee code is already used.' : friendly(error));
  R('/console/employees');
  return ok('Employee added');
};

/** Link a portal login (by email) to a contractor, vendor or employee record. */
export const linkLogin: A = async (_, fd) => {
  const { orgId } = await requireStaff();
  const kind = str(fd, 'kind') as 'contractor' | 'vendor' | 'employee', id = str(fd, 'id')!, email = str(fd, 'email')?.toLowerCase();
  if (!email) return fail('Enter the person’s login email.');
  if (!hasServiceKey()) return fail(SERVICE_KEY_MISSING);
  const admin = createAdminClient(); // profiles of other people are not readable by staff
  const { data: prof } = await admin.from('profiles').select('id, role').eq('email', email).maybeSingle();
  if (!prof) return fail('No account with that email. Ask them to sign up first, then link it.');
  if (prof.role === 'seller' || prof.role === 'admin') return fail('That login belongs to developer staff.');
  const table = kind === 'contractor' ? 'contractors' : kind === 'vendor' ? 'vendors' : 'employees';
  const { error } = await admin.from(table).update({ user_id: prof.id }).eq('id', id).eq('org_id', orgId);
  if (error) return fail(friendly(error));
  await admin.from('profiles').update({ role: kind }).eq('id', prof.id);
  R('/console');
  return ok('Login linked. They can now use the site portal.');
};

// ---------------- Documents ----------------
export const uploadDocument: A = async (_, fd) => {
  const { supabase, orgId, project, user } = await requireStaff();
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return fail('Choose a file.');
  if (file.size > 5 * 1024 * 1024) return fail('Files must be under 5 MB.');
  const bookingId = str(fd, 'booking_id');
  const path = `${orgId}/${project!.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.]+/gi, '-').toLowerCase()}`;
  const up = await supabase.storage.from('documents').upload(path, file, { contentType: file.type || 'application/pdf' });
  if (up.error) return fail(up.error.message);
  const { data: doc, error } = await supabase.from('documents').insert({
    org_id: orgId, project_id: project!.id, booking_id: bookingId, title: str(fd, 'title') || file.name, category: str(fd, 'category') || 'general',
    storage_path: path, visibility: bookingId ? 'buyer' : ((str(fd, 'visibility') || 'public') as 'public'), uploaded_by: user.id,
  }).select('id, org_id, project_id, booking_id, visibility, title').single();
  if (error) return fail(friendly(error));
  // make the text searchable for the buyers' document Q&A (internal files are never indexed)
  let indexed = 0;
  if ((file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) && doc.visibility !== 'internal') indexed = await indexPdf(supabase, doc, new Uint8Array(await file.arrayBuffer()));
  R('/console/documents');
  return ok((bookingId ? 'Shared with the buyer' : 'Document published') + (indexed ? ` · ${indexed} passages searchable in Ask the documents` : ''));
};
