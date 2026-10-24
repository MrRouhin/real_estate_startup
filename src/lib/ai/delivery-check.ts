// Reads an invoice photo with the vision model and stores the comparison on the delivery.
import 'server-only';
import type { Json } from '@/lib/database.types';
import { createAdminClient, hasServiceKey } from '@/lib/supabase/server';
import type { DB } from './analysis';
import { aiEnabled, aiJSON } from './client';
import { compareInvoice, INVOICE_PROMPT, type CheckFlag, type InvoiceRead } from './invoice';
import { logUsage } from './usage';

export type AICheck = { checked_at: string; source: 'ai' | 'rules'; read: InvoiceRead | null; flags: CheckFlag[]; note?: string };

export async function checkInvoice(db: DB, deliveryId: string, image: { bytes: Uint8Array; mediaType: string } | null, actor: string): Promise<AICheck | null> {
  const { data: d } = await db.from('deliveries').select('*').eq('id', deliveryId).single();
  if (!d) return null;
  const [{ data: material }, { data: vendor }] = await Promise.all([
    db.from('materials').select('id, name, unit, unit_cost').eq('id', d.material_id).single(),
    db.from('vendors').select('id, company_name, gst_number').eq('id', d.vendor_id).single(),
  ]);
  let check: AICheck = { checked_at: new Date().toISOString(), source: 'rules', read: null, flags: [], note: aiEnabled() ? 'No invoice photo to read.' : 'Add an AI key to read invoice photos automatically.' };
  if (image && aiEnabled() && /^image\/(jpeg|png|webp|gif)$/.test(image.mediaType) && image.bytes.byteLength <= 4.5 * 1024 * 1024) {
    const r = await aiJSON<InvoiceRead>({ system: INVOICE_PROMPT, maxTokens: 700, temperature: 0, timeoutMs: 25000,
      messages: [{ role: 'user', images: [{ mediaType: image.mediaType, base64: Buffer.from(image.bytes).toString('base64') }], content: 'Read this invoice.' }] });
    await logUsage('invoice_read', actor, d.org_id, r?.result ?? null);
    if (r) check = { checked_at: new Date().toISOString(), source: 'ai', read: r.data, flags: compareInvoice(r.data, d, material, vendor) };
    else check.note = 'The AI could not read the photo this time. Try again or check by hand.';
  } else if (image && !/^image\//.test(image.mediaType)) check.note = 'Invoice reading works on photos (JPG, PNG, WEBP).';
  await saveCheck(db, d.org_id, 'invoice', deliveryId, check);
  return check;
}

/** Store a check result (staff-only table). The server key is used when the caller is a vendor. */
export async function saveCheck(db: DB, orgId: string, kind: 'photo' | 'invoice', subjectId: string, result: unknown) {
  const writer = hasServiceKey() ? createAdminClient() : db;
  await writer.from('ai_checks').upsert({ org_id: orgId, kind, subject_id: subjectId, result: result as NonNullable<Json> }, { onConflict: 'kind,subject_id' });
}

export async function fileBytes(f: FormDataEntryValue | null) {
  if (!(f instanceof File) || f.size === 0) return null;
  return { file: f, bytes: new Uint8Array(await f.arrayBuffer()), mediaType: f.type || 'application/octet-stream' };
}
