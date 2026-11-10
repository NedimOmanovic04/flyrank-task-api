const fs = require('node:fs');
const path = require('node:path');
const { completion } = require('./client');
const { judgement } = require('./schema');

const version = 'triage-v1';
const prompt = fs.readFileSync(path.join(__dirname, '../../prompts', version + '.md'), 'utf8');
const quarantine = path.join(__dirname, '../../logs/quarantine.jsonl');

function parseAnswer(raw) {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Expected a JSON object');
  return judgement.parse(JSON.parse(raw.slice(start, end + 1)));
}

async function classify(text, call = completion, logPath = quarantine) {
  const messages = [{ role: 'system', content: prompt }, { role: 'user', content: JSON.stringify({ text }) }];
  for (const repair of [false, true]) {
    const raw = await call(messages, { version, repair });
    try {
      return parseAnswer(raw);
    } catch (error) {
      if (repair) {
        await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
        await fs.promises.appendFile(logPath, JSON.stringify({ version, text, raw, error: error.message }) + '\n');
        throw Object.assign(new Error('Model answer failed validation after one correction'), { publicStatus: 422 });
      }
      messages.push({ role: 'assistant', content: raw }, {
        role: 'user', content: 'Your previous answer was rejected: ' + error.message + '. Return only corrected JSON matching the schema.'
      });
    }
  }
}
module.exports = { classify, version };
