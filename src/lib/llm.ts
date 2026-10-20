// Server-only. Never expose the provider key through public env variables.
export const LLM_URL = 'https://llm.izdrail.com/v1';
export const jsonError = (message: string, status = 502) => new Response(JSON.stringify({ error: message }), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export function openAIToNDJSON(body: ReadableStream<Uint8Array>) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let pending = '';
  const line = (text: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    if (!text.startsWith('data:')) return;
    const value = text.slice(5).trim();
    if (!value || value === '[DONE]') return;
    const data = JSON.parse(value);
    if (data.error) throw new Error('The AI provider stopped the response. Please try again.');
    const content = data.choices?.[0]?.delta?.content;
    if (typeof content === 'string') controller.enqueue(encoder.encode(JSON.stringify({ message: { content } }) + '\n'));
  };
  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      pending += decoder.decode(chunk, { stream: true });
      let index;
      while ((index = pending.indexOf('\n')) >= 0) {
        line(pending.slice(0, index).trim(), controller);
        pending = pending.slice(index + 1);
      }
    },
    flush(controller) {
      pending += decoder.decode();
      if (pending.trim()) line(pending.trim(), controller);
    },
  }));
}
