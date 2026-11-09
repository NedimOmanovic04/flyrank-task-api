import { mkdir, writeFile } from 'node:fs/promises';
import { discover } from './discover.js';
import { readBook } from './book.js';
import { validate } from './schema.js';

const records = [];
const errors = [];
for (const [url, source] of await discover()) {
  const raw = await readBook(url, source);
  const result = validate(raw);
  if (result.success) records.push(result.data);
  else errors.push({ raw, reason: result.error.issues });
}
await mkdir('output', { recursive: true });
async function save(name, data) {
  await writeFile('output/' + name + '.json', JSON.stringify(data, null, 2) + '\n');
}
await save('books', records);
await save('errors', errors);
console.log('valid_records=' + records.length);
