// CRM helpers that use the model when it is on: personalised WhatsApp follow-ups and
// call-note summaries. Both fall back to templates.
import 'server-only';
import { aiJSON, aiText, type AIResult } from './client';
import { langName, type Lang } from './i18n';
import { followUpDraft, type LeadLike, type LeadScore } from './leads';

type Match = { plot_number: string; price: number; area: number; facing: string | null; reasons: string[] };

export async function draftFollowUpAI(l: LeadLike, s: LeadScore, matches: Match[], agent: string, project: string, notes: string[], lang: Lang = 'en'): Promise<{ text: string; source: 'ai' | 'rules'; result: AIResult | null }> {
  const fallback = followUpDraft(l, s, matches, agent, project);
  const r = await aiText({
    system: `You write short WhatsApp follow-ups from a real estate sales executive in India to a plot buyer. Language: ${langName(lang)}.
Use only the facts given. Warm, respectful, no pressure tactics, no false urgency, never promise returns or appreciation.
Max 70 words. Mention at most 2 plots. End with one clear question. No hashtags.`,
    messages: [{ role: 'user', content: JSON.stringify({ buyer_first_name: l.full_name.split(' ')[0], stage: l.stage, next_best_action: s.action.label, agent, project, recent_notes: notes.slice(0, 4), plots: matches.slice(0, 2) }) }],
    maxTokens: 250, temperature: 0.5,
  });
  return r ? { text: r.text, source: 'ai', result: r } : { text: fallback, source: 'rules', result: null };
}

export type CallSummary = { summary: string; budget?: string | null; wants?: string[]; objections?: string[]; next_step?: string | null; follow_up_in_days?: number | null };

export async function summarizeCall(notes: string): Promise<{ data: CallSummary; source: 'ai' | 'rules'; result: AIResult | null }> {
  const r = await aiJSON<CallSummary>({
    system: `Summarise a sales call note about a plot buyer (India). Only use what is written.
JSON shape: {"summary": "one sentence", "budget": string|null, "wants": [short phrases], "objections": [short phrases], "next_step": string|null, "follow_up_in_days": number|null}`,
    messages: [{ role: 'user', content: notes }], maxTokens: 300, temperature: 0,
  });
  if (r) return { data: r.data, source: 'ai', result: r.result };
  // rules: first sentence + simple extraction
  const s = notes.replace(/\s+/g, ' ').trim();
  const budget = s.match(/(\d+(?:\.\d+)?\s*(?:-|to)\s*\d+(?:\.\d+)?\s*(?:l|lakh|lakhs|cr|crore)|\d+(?:\.\d+)?\s*(?:l|lakh|lakhs|cr|crore))\b/i)?.[0] ?? null;
  const days = s.match(/(?:after|in)\s+(\d+)\s+days?/i)?.[1] ?? (/(next week)/i.test(s) ? '7' : /tomorrow/i.test(s) ? '1' : null);
  const objections = ['price', 'loan', 'distance', 'approval', 'water', 'family'].filter((w) => new RegExp(`\\b${w}`, 'i').test(s) && /concern|worried|issue|expensive|high|far|not sure|doubt/i.test(s));
  return { data: { summary: (s.match(/^[^.!?]+[.!?]?/)?.[0] || s).slice(0, 200), budget, wants: [], objections, next_step: null, follow_up_in_days: days ? Number(days) : null }, source: 'rules', result: null };
}
