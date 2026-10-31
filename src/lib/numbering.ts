// Document numbers, matching the database's bill_number / po_number / letter_number functions.
const yr = (created: string) => new Date(new Date(created).getTime() + 5.5 * 3600000).getUTCFullYear();
export const billNo = (seq: number, created: string) => `RA-${yr(created)}-${String(seq).padStart(4, '0')}`;
export const poNo = (seq: number, created: string) => `PO-${yr(created)}-${String(seq).padStart(4, '0')}`;
export const letterNo = (seq: number, created: string) => `LTR-${new Date(created).getFullYear()}-${String(seq).padStart(4, '0')}`;
