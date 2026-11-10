const cases = require('./cases.json');
const app = require('../server');
const { judgement } = require('../src/llm/schema');

async function run() {
  if (process.env.LLM_STUB === '1' || process.env.LLM_ENABLED === 'false') throw new Error('Eval requires live mode');
  const server = app.listen(0, '127.0.0.1');
  await require('node:events').once(server, 'listening');
  let passed = 0;
  try {
    for (const [index, item] of cases.entries()) {
      try {
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/triage', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: item.text })
        });
        const body = await response.json();
        if (!response.ok) throw new Error(response.status + ' ' + body.error);
        const answer = judgement.parse(body);
        console.log(index + 1, 'expected', item.category, 'got', JSON.stringify(answer));
        if (answer.category === item.category) passed++;
      } catch (error) { console.error(index + 1, error.message); }
    }
    console.log(passed + '/' + cases.length, (100 * passed / cases.length) + '%');
    if (passed !== cases.length) process.exitCode = 1;
  } finally { server.close(); }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
