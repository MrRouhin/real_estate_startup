// One door to the language model. Works with Anthropic's Messages API (default) or any
// OpenAI-compatible endpoint. Every caller has a rules-based fallback, so when no key is set
// (or the model is slow or down) the feature still works — just with plainer wording.
import 'server-only';

export type AIImage = { mediaType: string; base64: string } | { url: string };
export type AIMessage = { role: 'user' | 'assistant'; content: string; images?: AIImage[] };

type Provider = 'anthropic' | 'openai';

function config() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const genericKey = process.env.AI_API_KEY;
  const provider: Provider | null = (process.env.AI_PROVIDER as Provider) || (anthropicKey ? 'anthropic' : genericKey ? 'openai' : null);
  if (!provider) return null;
  const key = provider === 'anthropic' ? anthropicKey || genericKey : genericKey || anthropicKey;
  if (!key) return null;
  const baseUrl = (process.env.AI_BASE_URL || (provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1')).replace(/\/$/, '');
  const model = process.env.AI_MODEL || (provider === 'anthropic' ? 'claude-haiku-5-5' : '');
  if (!model) return null;
  return { provider, key, baseUrl, model };
}

/** True when a model is configured. Pages use this to label output "AI" vs "Rules". */
export const aiEnabled = () => config() !== null;
export const aiModelName = () => config()?.model ?? null;

/** Conversations must start with the user and alternate roles: drop leading assistant turns, merge repeats. */
export function normalizeTurns(ms: AIMessage[]): AIMessage[] {
  const out: AIMessage[] = [];
  for (const m of ms) {
    if (!m.content?.trim() && !m.images?.length) continue;
    if (!out.length && m.role === 'assistant') continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) out[out.length - 1] = { role: m.role, content: last.content + '\n\n' + m.content, images: [...(last.images || []), ...(m.images || [])] };
    else out.push({ ...m });
  }
  return out;
}

export type AIResult = { text: string; model: string; inputTokens?: number; outputTokens?: number };

/** Send a prompt; returns null on any failure (callers fall back to templates). */
export async function aiText(opts: { system: string; messages: AIMessage[]; maxTokens?: number; temperature?: number; timeoutMs?: number }): Promise<AIResult | null> {
  const c = config();
  if (!c) return null;
  opts = { ...opts, messages: normalizeTurns(opts.messages) };
  if (!opts.messages.length) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 25000);
  try {
    if (c.provider === 'anthropic') {
      const res = await fetch(`${c.baseUrl}/v1/messages`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'x-api-key': c.key, 'anthropic-version': process.env.AI_ANTHROPIC_VERSION || '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: c.model, max_tokens: opts.maxTokens ?? 900, temperature: opts.temperature ?? 0.3, system: opts.system,
          messages: opts.messages.map((m) => ({
            role: m.role,
            content: m.images?.length
              ? [...m.images.map((im) => ({ type: 'image', source: 'url' in im ? { type: 'url', url: im.url } : { type: 'base64', media_type: im.mediaType, data: im.base64 } })), { type: 'text', text: m.content }]
              : m.content,
          })),
        }),
      });
      if (!res.ok) { console.warn('[ai] anthropic', res.status, (await res.text()).slice(0, 300)); return null; }
      const j = await res.json() as { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
      const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
      return text ? { text, model: c.model, inputTokens: j.usage?.input_tokens, outputTokens: j.usage?.output_tokens } : null;
    }
    const res = await fetch(`${c.baseUrl}/chat/completions`, {
      method: 'POST', signal: ctrl.signal,
      headers: { authorization: `Bearer ${c.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: c.model, max_tokens: opts.maxTokens ?? 900, temperature: opts.temperature ?? 0.3,
        messages: [{ role: 'system', content: opts.system }, ...opts.messages.map((m) => ({
          role: m.role,
          content: m.images?.length
            ? [{ type: 'text', text: m.content }, ...m.images.map((im) => ({ type: 'image_url', image_url: { url: 'url' in im ? im.url : `data:${im.mediaType};base64,${im.base64}` } }))]
            : m.content,
        }))],
      }),
    });
    if (!res.ok) { console.warn('[ai] openai-compatible', res.status, (await res.text()).slice(0, 300)); return null; }
    const j = await res.json() as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const text = (j.choices?.[0]?.message?.content || '').trim();
    return text ? { text, model: c.model, inputTokens: j.usage?.prompt_tokens, outputTokens: j.usage?.completion_tokens } : null;
  } catch (e) {
    console.warn('[ai] request failed', (e as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Ask for JSON and parse the first object in the reply. Returns null if the model is off or the JSON is bad. */
export async function aiJSON<T>(opts: Parameters<typeof aiText>[0]): Promise<{ data: T; result: AIResult } | null> {
  const r = await aiText({ ...opts, system: opts.system + '\n\nReply with a single JSON object only. No prose, no code fences.' });
  if (!r) return null;
  const m = r.text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return { data: JSON.parse(m[0]) as T, result: r }; } catch { return null; }
}
