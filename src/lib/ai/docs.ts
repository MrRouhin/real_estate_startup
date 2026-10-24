// Document Q&A: find the passages that answer a question and quote them. With an AI key the
// model writes the answer (in the buyer's language) strictly from the quoted passages.
import 'server-only';
import type { DB } from './analysis';
import { aiText, type AIResult } from './client';
import { langName, t, type Lang } from './i18n';

export type Passage = { n: number; id: number; title: string; heading: string | null; content: string; document_id: string | null; visibility: string };
export type DocAnswer = { answer: string; passages: Passage[]; source: 'ai' | 'rules'; result: AIResult | null };

/** Split extracted text into ~900-character chunks on paragraph boundaries, keeping headings. */
export function chunkText(text: string, maxLen = 900): { heading: string | null; content: string }[] {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const paras = clean.split(/\n\s*\n|(?<=\.)\n(?=[A-Z0-9])/).map((p) => p.replace(/\n/g, ' ').trim()).filter((p) => p.length > 2);
  const out: { heading: string | null; content: string }[] = [];
  let heading: string | null = null, buf = '';
  const flush = () => { if (buf.trim().length > 40) out.push({ heading, content: buf.trim() }); buf = ''; };
  for (const p of paras) {
    const isHeading = p.length < 80 && !/[.,;:]$/.test(p) && (/^(\d+(\.\d+)*\.?|[A-Z][A-Z\s&/-]{3,}|clause|schedule|annexure)/i.test(p) || p === p.toUpperCase());
    if (isHeading) { flush(); heading = p.slice(0, 120); continue; }
    if ((buf + ' ' + p).length > maxLen) {
      flush();
      if (p.length > maxLen) { for (const s of p.match(new RegExp(`[^]{1,${maxLen}}(?=\\s|$)`, 'g')) || []) out.push({ heading, content: s.trim() }); continue; }
    }
    buf += (buf ? ' ' : '') + p;
  }
  flush();
  return out.slice(0, 400);
}

/** Pull the text out of an uploaded PDF and make it searchable. Returns the number of chunks. */
export async function indexPdf(db: DB, doc: { id: string; org_id: string; project_id: string; booking_id: string | null; visibility: string; title: string }, bytes: Uint8Array) {
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const chunks = chunkText(Array.isArray(text) ? text.join('\n\n') : text);
    if (!chunks.length) return 0;
    await db.from('doc_chunks').delete().eq('document_id', doc.id);
    const { error } = await db.from('doc_chunks').insert(chunks.map((c) => ({
      org_id: doc.org_id, project_id: doc.project_id, document_id: doc.id, booking_id: doc.booking_id,
      visibility: doc.visibility as 'public', title: doc.title, heading: c.heading, content: c.content,
    })));
    return error ? 0 : chunks.length;
  } catch (e) {
    console.warn('[docs] could not index', (e as Error).message);
    return 0;
  }
}

/** The sentences of a passage that share the most words with the question. */
function bestSentences(content: string, q: string, n = 2) {
  const words = new Set(q.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const sents = content.match(/[^.!?]+[.!?]+/g) || [content];
  return sents.map((s, i) => ({ s: s.trim(), i, score: s.toLowerCase().split(/\W+/).filter((w) => words.has(w)).length }))
    .sort((a, b) => b.score - a.score || a.i - b.i).slice(0, n).sort((a, b) => a.i - b.i).map((x) => x.s).join(' ');
}

const SYSTEM = (lang: Lang, project: string) => `You answer a home buyer's questions about ${project} using ONLY the numbered passages from the project's documents.
Rules:
- Quote the exact words that answer the question in "double quotes" and cite them like [1] or [2].
- If the passages do not answer it, say so plainly and suggest asking the sales team. Never use outside knowledge, never guess dates, amounts or legal effects.
- Not legal advice: for anything about rights, penalties or disputes, add one line suggesting they confirm with a lawyer.
- Keep it under 140 words. Write in ${langName(lang)}${lang === 'en' ? '' : ' (keep quoted text in its original language)'}.`;

export async function answerFromDocs(db: DB, project: { id: string; name: string }, question: string, lang: Lang, history: { role: 'user' | 'assistant'; content: string }[] = []): Promise<DocAnswer> {
  let query = question;
  if (lang !== 'en' || /[^\x00-\x7F]/.test(question)) {
    const tr = await aiText({ system: 'Translate the question into short English search keywords about property documents (booking, refund, possession, payment, approvals, maintenance...). Reply with keywords only.', messages: [{ role: 'user', content: question }], maxTokens: 40, temperature: 0, timeoutMs: 8000 });
    if (tr) query = tr.text;
  }
  const { data } = await db.rpc('search_docs', { p_project: project.id, p_query: query, p_limit: 5 });
  const passages: Passage[] = (data || []).map((r, i) => ({ n: i + 1, id: r.id, title: r.title, heading: r.heading, content: r.content, document_id: r.document_id, visibility: r.visibility }));
  if (!passages.length) return { answer: t('docsNone', lang), passages, source: 'rules', result: null };
  const ctx = passages.map((p) => `[${p.n}] ${p.title}${p.heading ? ' — ' + p.heading : ''}\n${p.content}`).join('\n\n');
  const r = await aiText({
    system: SYSTEM(lang, project.name), maxTokens: 450, temperature: 0.1,
    messages: [...history.slice(-4), { role: 'user', content: `Passages:\n${ctx}\n\nQuestion: ${question}` }],
  });
  if (r) return { answer: r.text, passages, source: 'ai', result: r };
  const top = passages.slice(0, 2);
  const answer = [t('docsLead', lang), ...top.map((p) => `“${bestSentences(p.content, query)}” [${p.n}]`), lang !== 'en' ? t('englishOnly', lang) : ''].filter(Boolean).join('\n\n');
  return { answer, passages, source: 'rules', result: null };
}
