const fs = require('node:fs');
const path = require('node:path');
const { completion } = require('./client');
const { judgement } = require('./schema');
const version = 'triage-v1';
const prompt = fs.readFileSync(path.join(__dirname, '../../prompts', version + '.md'), 'utf8');

async function classify(text) {
  const messages = [{ role: 'system', content: prompt }, { role: 'user', content: JSON.stringify({ text }) }];
  return judgement.parse(JSON.parse(await completion(messages)));
}
module.exports = { classify, version };
