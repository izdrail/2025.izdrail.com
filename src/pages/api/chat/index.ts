import type { APIRoute } from 'astro';
import { LLM_URL, jsonError, openAIToNDJSON } from '../../../lib/llm';

export const POST: APIRoute = async ({ request, locals }) => {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return jsonError('Forbidden origin', 403);
  const key = locals.runtime.env.LLM_API_KEY;
  if (!key) return jsonError('Chat is not configured yet. Please try again later.', 503);
  try {
    const text = await request.text();
    if (text.length > 40000) return jsonError('This conversation is too long. Please start a new chat.', 413);
    const body = JSON.parse(text);
    if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 40 ||
      body.messages.some((m: any) => !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 12000)) {
      return jsonError('Invalid messages', 400);
    }
    const model = typeof body.model === 'string' && /^[a-zA-Z0-9._:/-]{1,120}$/.test(body.model) ? body.model : 'auto';
    const response = await fetch(`${LLM_URL}/chat/completions`, {
      method: 'POST', signal: AbortSignal.timeout(90000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: body.messages.map((m: any) => ({ role: m.role, content: m.content })), stream: true, max_tokens: 1024 }),
    });
    if (!response.ok || !response.body) {
      // Do not forward provider responses, which can contain private diagnostics.
      return jsonError(response.status === 429 ? 'The AI service is busy. Please try again shortly.' : `The AI service could not answer (HTTP ${response.status}). Try another model.`, response.status === 429 ? 429 : 502);
    }
    return new Response(openAIToNDJSON(response.body), {
      headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' },
    });
  } catch {
    return jsonError('The AI service could not finish the request. Please try again.');
  }
};
