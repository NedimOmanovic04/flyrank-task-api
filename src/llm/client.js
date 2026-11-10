const { setTimeout: sleep } = require('node:timers/promises');
const fail = (status, message) => Object.assign(new Error(message), { publicStatus: status });

function retryAfter(value) {
  if (!value) return null;
  const ms = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(ms) ? Math.max(0, ms) : null;
}

async function completion(messages, { version = 'hello', repair = false } = {}) {
  const { LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } = process.env;
  if (!LLM_BASE_URL || !LLM_API_KEY || !LLM_MODEL) throw fail(503, 'Missing model configuration');
  for (let attempt = 0; attempt < 4; attempt++) {
    const started = Date.now();
    let status = null;
    let usage;
    let wait;
    let problem;
    try {
      const response = await fetch(LLM_BASE_URL.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + LLM_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: LLM_MODEL, messages, temperature: 0, max_tokens: 96 }),
        signal: AbortSignal.timeout(30000)
      });
      status = response.status;
      if (response.ok) {
        const body = await response.json();
        usage = body.usage;
        if (body.error) throw fail(502, 'Provider returned an error');
        return typeof body.choices?.[0]?.message?.content === 'string' ? body.choices[0].message.content : '';
      }
      await response.body?.cancel();
      if (status !== 429 && status < 500) throw fail(502, 'Provider rejected request (HTTP ' + status + ')');
      problem = fail(503, 'Provider temporarily unavailable');
      if (status === 429) wait = retryAfter(response.headers.get('retry-after'));
    } catch (error) {
      if (error.publicStatus) throw error;
      if (error.name !== 'TimeoutError') throw fail(502, 'Could not read provider response');
      problem = fail(504, 'Model request timed out');
    } finally {
      console.log(JSON.stringify({ version, model: LLM_MODEL, attempt: attempt + 1, repair, status,
        input_tokens: usage?.prompt_tokens ?? null, output_tokens: usage?.completion_tokens ?? null,
        duration_ms: Date.now() - started }));
    }
    if (attempt === 3 || wait > 30000) throw problem;
    await sleep(wait ?? (1000 * 2 ** attempt + Math.floor(Math.random() * 250)));
  }
}
module.exports = { completion, retryAfter };
