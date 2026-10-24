// Lead scoring, next best action and follow-up drafts for the CRM. Transparent points,
// so the sales team can see why a lead is hot.

export type LeadLike = {
  id: string; full_name: string; phone: string; stage: string; source: string; budget_min: number | string | null; budget_max: number | string | null;
  preferred_size: number | null; preferred_facing: string | null; interested_plot_id: string | null; next_follow_up_at: string | null;
  updated_at: string; created_at: string; message?: string | null;
};
export type ActLike = { lead_id: string; type: string; created_at: string; body?: string };
export type VisitLike = { lead_id: string; status: string; scheduled_at: string; feedback?: string | null };
export type PlotLite = { id: string; plot_number: string; price: number | string; area_sqft: number | string; facing: string | null; status: string; is_corner: boolean };

export type LeadScore = { score: number; band: 'hot' | 'warm' | 'cold' | 'closed'; points: { label: string; pts: number }[]; action: { label: string; detail: string; urgency: 'now' | 'today' | 'this week' } };

const STAGE_PTS: Record<string, number> = { new: 28, contacted: 34, site_visit: 52, negotiation: 66, won: 100, lost: 0 };
const SOURCE_PTS: Record<string, number> = { referral: 6, walk_in: 6, broker: 2, app: 2, website: 1, portal: 0, social: -3 };

export function scoreLead(l: LeadLike, acts: ActLike[], visits: VisitLike[], plots: PlotLite[], now = Date.now()): LeadScore {
  if (l.stage === 'won' || l.stage === 'lost') {
    return { score: l.stage === 'won' ? 100 : 0, band: 'closed', points: [{ label: l.stage === 'won' ? 'Booked' : 'Closed lost', pts: 0 }], action: { label: l.stage === 'won' ? 'Ask for a referral' : 'Re-engage in 90 days', detail: l.stage === 'won' ? 'Happy buyers bring the best leads. Offer a referral reward.' : 'Share the next price revision or a new launch.', urgency: 'this week' } };
  }
  const pts: { label: string; pts: number }[] = [];
  const add = (label: string, p: number) => { if (p) pts.push({ label, pts: p }); };
  add(`Stage: ${l.stage.replace('_', ' ')}`, STAGE_PTS[l.stage] ?? 15);
  const idle = (now - new Date(l.updated_at).getTime()) / 86400000;
  if (idle > 3) add(`No movement for ${Math.round(idle)} days`, -Math.min(22, Math.round((idle - 3) * 1.2)));
  else add('Active in the last 3 days', 6);
  const mine = acts.filter((a) => a.lead_id === l.id);
  const recent = mine.filter((a) => now - new Date(a.created_at).getTime() < 14 * 86400000 && a.type !== 'system' && a.type !== 'stage_change');
  if (recent.length) add(`${recent.length} conversation${recent.length > 1 ? 's' : ''} in 14 days`, Math.min(10, recent.length * 3));
  const v = visits.filter((x) => x.lead_id === l.id);
  if (v.some((x) => x.status === 'completed')) add('Visited the site', 10);
  const upcoming = v.find((x) => x.status === 'scheduled' && new Date(x.scheduled_at).getTime() > now);
  if (upcoming) add('Site visit booked', 6);
  if (v.some((x) => x.status === 'no_show')) add('Missed a site visit', -8);
  const avail = plots.filter((p) => p.status === 'available');
  const bMax = Number(l.budget_max || 0), bMin = Number(l.budget_min || 0);
  const fit = bMax ? avail.filter((p) => Number(p.price) <= bMax * 1.05 && Number(p.price) >= bMin * 0.8) : [];
  if (bMax) add(fit.length ? `${fit.length} available plot${fit.length > 1 ? 's' : ''} fit the budget` : 'No plot fits the budget', fit.length ? 8 : -10);
  const plot = plots.find((p) => p.id === l.interested_plot_id);
  if (plot) add(plot.status === 'available' ? `Wants ${plot.plot_number} (still available)` : `Wanted ${plot.plot_number} (now ${plot.status})`, plot.status === 'available' ? 6 : -4);
  add(`Source: ${l.source.replace('_', ' ')}`, SOURCE_PTS[l.source] ?? 0);
  const overdue = l.next_follow_up_at && new Date(l.next_follow_up_at).getTime() < now;
  if (overdue) add('Follow-up overdue', -6);
  const score = Math.max(1, Math.min(99, pts.reduce((a, p) => a + p.pts, 0)));
  const band = score >= 62 ? 'hot' : score >= 32 ? 'warm' : 'cold';

  let action: LeadScore['action'];
  if (plot && plot.status !== 'available') action = { label: `Offer alternatives to ${plot.plot_number}`, detail: `${plot.plot_number} is ${plot.status}. Send 2–3 similar plots before they look elsewhere.`, urgency: 'today' };
  else if (l.stage === 'new' && idle < 1) action = { label: 'Call within the hour', detail: 'New enquiries convert best when called the same hour. Share the price sheet on WhatsApp after.', urgency: 'now' };
  else if (overdue) action = { label: 'Call now: follow-up is overdue', detail: 'Every day of silence lowers the chance of a booking.', urgency: 'now' };
  else if (l.stage === 'new') action = { label: 'Call within the hour', detail: 'New enquiries convert best when called the same hour. Share the price sheet on WhatsApp after.', urgency: 'now' };
  else if (l.stage === 'contacted' && !upcoming) action = { label: 'Book a site visit', detail: 'Leads who visit are far more likely to book. Offer this weekend’s open house.', urgency: 'today' };
  else if (l.stage === 'site_visit') action = { label: 'Send a shortlist and push for a hold', detail: 'Share 2 plots that match what they liked on the visit, and offer a 15-minute online hold.', urgency: 'today' };
  else if (l.stage === 'negotiation') action = { label: 'Close: offer a small incentive with a deadline', detail: 'Free registration support or a waived maintenance year, valid until the next price revision.', urgency: 'today' };
  else action = { label: 'Check in', detail: 'Share the latest construction update.', urgency: 'this week' };
  return { score, band, points: pts, action };
}

/** WhatsApp follow-up draft (rules version; the AI version personalises the wording). */
export function followUpDraft(l: LeadLike, s: LeadScore, matches: { plot_number: string; price: number; area: number; facing: string | null; reasons: string[] }[], agent: string, project: string) {
  const first = l.full_name.split(' ')[0];
  const list = matches.slice(0, 2).map((m) => `• ${m.plot_number}: ${m.area} sq ft, ${(m.facing || '').replace('_', '-')} facing, ₹${(m.price / 1e5).toFixed(1)} L${m.reasons[0] ? ` (${m.reasons[0]})` : ''}`).join('\n');
  const body = l.stage === 'negotiation'
    ? `Hi ${first}, ${agent} here from ${project}. Good news: if you confirm this week, we can include free registration support on your plot. Shall I hold it for you online for 15 minutes so you can pay the token?`
    : l.stage === 'site_visit'
      ? `Hi ${first}, thanks for visiting ${project}! Based on what you liked, these two plots fit well:\n${list}\nWant me to hold one for you?`
      : `Hi ${first}, ${agent} here from ${project}. Thanks for your interest! A few plots that match what you asked for:\n${list}\nWhen would suit you for a site visit?`;
  return s.band === 'cold' ? body.replace('Thanks for your interest!', 'Checking in after a while.') : body;
}
