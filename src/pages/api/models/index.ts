import type { APIRoute } from 'astro';
import { LLM_URL, jsonError } from '../../../lib/llm';

export const GET: APIRoute = async ({ locals }) => {
  const key = locals.runtime.env.LLM_API_KEY;
  if (!key) return jsonError('Chat is not configured yet.', 503);
  try {
    const response = await fetch(`${LLM_URL}/models`, {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return jsonError('The model list is temporarily unavailable.');
    const data = await response.json() as { data?: { id: string }[] };
    return new Response(JSON.stringify({ models: (data.data || []).map(m => ({ name: m.id })) }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return jsonError('The model list is temporarily unavailable.');
  }
};
