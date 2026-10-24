// Delivery and invoice checks. The deterministic checks run on every delivery; when an invoice
// photo is uploaded and an AI key is set, the model reads the invoice and we compare it with
// what was entered.

export type DeliveryLike = {
  id: string; vendor_id: string; material_id: string; quantity: number | string; unit_cost: number | string | null;
  vehicle_number: string | null; invoice_number: string | null; invoice_path?: string | null; photo_paths?: string[] | null;
  created_at: string; status: string; accepted_qty?: number | string | null;
};
export type MaterialLite = { id: string; name: string; unit: string; unit_cost: number | string | null; category?: string };
export type VendorLite = { id: string; company_name: string; gst_number?: string | null };

export type CheckFlag = { id: string; severity: 'info' | 'warn' | 'critical'; label: string; detail: string };
export type DeliveryCheck = { flags: CheckFlag[]; ok: boolean };

// Indian registration: KA 05 AB 1234, KA05AB1234, KA 05 1234, and Bharat series 22 BH 1234 AB
const VEHICLE = /^[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{0,3}[\s-]?\d{4}$|^\d{2}[\s-]?BH[\s-]?\d{4}[\s-]?[A-Z]{1,2}$/;
export const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const normVehicle = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2) : 0; };

/** Rule checks: duplicate invoice, unusual quantity, rate far from normal, bad vehicle number, missing paperwork. */
export function deliveryChecks(d: DeliveryLike, all: DeliveryLike[], material: MaterialLite | null, vendor: VendorLite | null): DeliveryCheck {
  const flags: CheckFlag[] = [];
  const qty = Number(d.quantity);
  if (d.invoice_number) {
    const inv = d.invoice_number.trim().toUpperCase();
    const dup = all.filter((x) => x.id !== d.id && x.vendor_id === d.vendor_id && (x.invoice_number || '').trim().toUpperCase() === inv);
    if (dup.length) flags.push({ id: 'duplicate_invoice', severity: 'critical', label: 'Duplicate invoice number',
      detail: `Invoice ${d.invoice_number} from ${vendor?.company_name || 'this vendor'} was already used on ${dup.length} other deliver${dup.length > 1 ? 'ies' : 'y'} (${new Date(dup[0]!.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}). Check it is not being billed twice.` });
  } else flags.push({ id: 'no_invoice', severity: 'warn', label: 'No invoice number', detail: 'Ask the driver for the tax invoice or delivery challan before accepting.' });

  if (!d.vehicle_number) flags.push({ id: 'no_vehicle', severity: 'warn', label: 'No vehicle number', detail: 'Record the truck number so the delivery can be traced.' });
  else if (!VEHICLE.test(d.vehicle_number.toUpperCase().trim())) flags.push({ id: 'vehicle_format', severity: 'warn', label: 'Vehicle number looks wrong', detail: `"${d.vehicle_number}" is not a valid Indian registration format (e.g. KA 05 AB 1234).` });
  else {
    // the same truck delivering twice within 2 hours
    const t = new Date(d.created_at).getTime();
    const twin = all.find((x) => x.id !== d.id && x.vehicle_number && normVehicle(x.vehicle_number) === normVehicle(d.vehicle_number!) && Math.abs(new Date(x.created_at).getTime() - t) < 2 * 3600_000 && x.material_id === d.material_id);
    if (twin) flags.push({ id: 'same_truck', severity: 'warn', label: 'Same truck, same material, within 2 hours', detail: 'Two deliveries logged for one truck trip. Make sure it is not entered twice.' });
  }

  const peers = all.filter((x) => x.id !== d.id && x.material_id === d.material_id).map((x) => Number(x.quantity)).filter((q) => q > 0);
  if (peers.length >= 3) {
    const m = median(peers);
    if (m > 0 && qty > m * 2.5) flags.push({ id: 'qty_high', severity: 'warn', label: 'Unusually large quantity', detail: `${qty} ${material?.unit || ''} vs a usual ${Math.round(m)} per delivery. Count it at the gate before accepting.` });
  }
  const rate = d.unit_cost != null ? Number(d.unit_cost) : null;
  if (rate && material) {
    const past = all.filter((x) => x.id !== d.id && x.material_id === d.material_id && x.unit_cost != null).map((x) => Number(x.unit_cost));
    const ref = past.length >= 2 ? median(past) : Number(material.unit_cost || 0);
    if (ref > 0) {
      const dev = ((rate - ref) / ref) * 100;
      if (dev > 12) flags.push({ id: 'rate_high', severity: dev > 25 ? 'critical' : 'warn', label: `Rate ${Math.round(dev)}% above normal`, detail: `₹${rate.toLocaleString('en-IN')} per ${material.unit.replace(/s$/, '')} vs usual ₹${Math.round(ref).toLocaleString('en-IN')}. Extra ≈ ₹${Math.round((rate - ref) * qty).toLocaleString('en-IN')} on this delivery.` });
    }
  }
  if (!d.invoice_path && !(d.photo_paths || []).length) flags.push({ id: 'no_photo', severity: 'info', label: 'No photo of the invoice or load', detail: 'A photo at the gate settles disputes later.' });
  if (vendor?.gst_number && !GSTIN.test(vendor.gst_number.toUpperCase())) flags.push({ id: 'vendor_gstin', severity: 'warn', label: 'Vendor GSTIN looks invalid', detail: `${vendor.gst_number} does not match the 15-character GSTIN format. Verify on the GST portal before paying.` });
  return { flags, ok: !flags.some((f) => f.severity !== 'info') };
}

export type InvoiceRead = {
  invoice_number?: string | null; invoice_date?: string | null; seller_name?: string | null; seller_gstin?: string | null;
  vehicle_number?: string | null; items?: { description: string; quantity: number | null; unit?: string | null; rate?: number | null; amount?: number | null }[];
  total?: number | null; readable?: boolean;
};

export const INVOICE_PROMPT = `You read Indian tax invoices and delivery challans for construction materials (cement, steel, sand, aggregate, pipes, cables).
Extract exactly what is printed. If a field is not visible, use null. Never guess numbers.
JSON shape: {"readable": true|false, "invoice_number": string|null, "invoice_date": "YYYY-MM-DD"|null, "seller_name": string|null, "seller_gstin": string|null, "vehicle_number": string|null, "items": [{"description": string, "quantity": number|null, "unit": string|null, "rate": number|null, "amount": number|null}], "total": number|null}`;

/** Compare what the model read from the invoice with what was entered. */
export function compareInvoice(read: InvoiceRead, d: DeliveryLike, material: MaterialLite | null, vendor: VendorLite | null): CheckFlag[] {
  const flags: CheckFlag[] = [];
  if (read.readable === false) return [{ id: 'unreadable', severity: 'warn', label: 'Invoice photo is not readable', detail: 'Retake the photo in good light, flat, with the whole page visible.' }];
  const norm = (s: string | null | undefined) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (read.invoice_number && d.invoice_number && norm(read.invoice_number) !== norm(d.invoice_number))
    flags.push({ id: 'inv_mismatch', severity: 'critical', label: 'Invoice number differs from the photo', detail: `Entered ${d.invoice_number}, invoice shows ${read.invoice_number}.` });
  if (read.vehicle_number && d.vehicle_number && normVehicle(read.vehicle_number) !== normVehicle(d.vehicle_number))
    flags.push({ id: 'vehicle_mismatch', severity: 'warn', label: 'Vehicle number differs from the invoice', detail: `Entered ${d.vehicle_number}, invoice shows ${read.vehicle_number}.` });
  if (read.seller_gstin && !GSTIN.test(norm(read.seller_gstin))) flags.push({ id: 'gstin_format', severity: 'warn', label: 'GSTIN on the invoice looks invalid', detail: `${read.seller_gstin} is not a valid GSTIN format.` });
  if (read.seller_gstin && vendor?.gst_number && norm(read.seller_gstin) !== norm(vendor.gst_number))
    flags.push({ id: 'gstin_mismatch', severity: 'critical', label: 'Invoice is from a different GSTIN', detail: `Invoice GSTIN ${read.seller_gstin}; ${vendor.company_name} is registered as ${vendor.gst_number}.` });
  const qty = Number(d.quantity);
  const words = (material?.name || '').toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const item = (read.items || []).find((i) => words.some((w) => i.description.toLowerCase().includes(w))) || (read.items?.length === 1 ? read.items[0] : undefined);
  if (item?.quantity != null && qty > 0 && Math.abs(item.quantity - qty) / qty > 0.02)
    flags.push({ id: 'qty_mismatch', severity: 'critical', label: 'Quantity differs from the invoice', detail: `Entered ${qty} ${material?.unit || ''}, invoice says ${item.quantity} ${item.unit || ''}.` });
  if (item?.rate != null && d.unit_cost != null && Math.abs(item.rate - Number(d.unit_cost)) / Number(d.unit_cost) > 0.03)
    flags.push({ id: 'rate_mismatch', severity: 'warn', label: 'Rate differs from the invoice', detail: `Entered ₹${Number(d.unit_cost).toLocaleString('en-IN')}, invoice shows ₹${item.rate.toLocaleString('en-IN')}.` });
  if (read.invoice_date) {
    const age = (new Date(d.created_at).getTime() - new Date(read.invoice_date).getTime()) / 86400000;
    if (age > 10) flags.push({ id: 'old_invoice', severity: 'warn', label: 'Old invoice', detail: `Invoice dated ${read.invoice_date}, ${Math.round(age)} days before this delivery. Could be a reused bill.` });
  }
  return flags;
}
