import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = ts.transpileModule(fs.readFileSync('src/lib/llm.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { openAIToNDJSON } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const run = async chunks => {
 const stream = new ReadableStream({ start(c) { for (const chunk of chunks) c.enqueue(new TextEncoder().encode(chunk)); c.close(); } });
 return await new Response(openAIToNDJSON(stream)).text();
};
test('split SSE chunks and final unterminated event', async () => {
 const output = await run(['data: {"choices":[{"del', 'ta":{"content":"Hi"}}]}\n\ndata: {"choices":[{"delta":{"content":"!"}}]}']);
 assert.deepEqual(output.trim().split('\n').map(JSON.parse), [{ message:{content:'Hi'} }, { message:{content:'!'} }]);
});
test('ignores reasoning and DONE', async () => {
 assert.equal(await run(['data: {"choices":[{"delta":{"reasoning_content":"private"}}]}\n\ndata: [DONE]\n']), '');
});
test('provider stream error is not silently swallowed', async () => {
 await assert.rejects(run(['data: {"error":{"message":"upstream problem"}}\n']), /stopped the response/);
});
test('key is runtime-only and origin guard is present', () => {
 const route=fs.readFileSync('src/pages/api/chat/index.ts','utf8');
 assert.ok(route.includes('locals.runtime.env.LLM_API_KEY'));
 assert.ok(route.includes('Forbidden origin'));
 assert.ok(!route.includes('import.meta.env'));
});
