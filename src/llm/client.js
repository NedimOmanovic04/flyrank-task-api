async function completion(messages) {
  const { LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } = process.env;
  if (!LLM_BASE_URL || !LLM_API_KEY || !LLM_MODEL) throw new Error('Missing model configuration');
  const response = await fetch(LLM_BASE_URL.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + LLM_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: LLM_MODEL, messages, temperature: 0, max_tokens: 96 }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error('Provider HTTP ' + response.status);
  return (await response.json()).choices[0].message.content;
}
module.exports = { completion };
