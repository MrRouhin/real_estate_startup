import type { ContractorUsage, WorkPackage } from './types';

/** Roll-up numbers for a contractor card or header. */
export function contractorSummary(wps: Pick<WorkPackage, 'contract_value' | 'progress' | 'status'>[], usage: ContractorUsage[]) {
  const value = wps.reduce((a, w) => a + Number(w.contract_value), 0);
  const progress = value ? wps.reduce((a, w) => a + Number(w.contract_value) * Number(w.progress), 0) / value : 0;
  const issuedValue = usage.reduce((a, u) => a + Number(u.issued) * Number(u.unit_cost || 0), 0);
  const wasteValue = usage.reduce((a, u) => a + Number(u.wastage) * Number(u.unit_cost || 0), 0);
  const used = usage.reduce((a, u) => a + (Number(u.consumed) + Number(u.wastage)) * Number(u.unit_cost || 0), 0);
  const wastePct = used ? (wasteValue / used) * 100 : 0;
  const delayed = wps.filter((w) => w.status === 'delayed').length;
  return { value, progress, issuedValue, wasteValue, wastePct, delayed, active: wps.filter((w) => w.status !== 'completed').length };
}

/** Wastage above 5% of what was used is flagged. */
export const WASTE_LIMIT = 5;
