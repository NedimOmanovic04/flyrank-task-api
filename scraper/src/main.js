import { counts, first } from './fetch.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { discover } from './discover.js';
import { readBook } from './book.js';
import { validate } from './schema.js';

const records = [];
const errors = [];
const started = new Date();
let failed = 0;
let invalid = 0;
function onFailure(url, err) {
  failed++;
  errors.push({ url, reason: err.message });
  console.error('SKIP', url, err.message);
}
const books = await discover(onFailure);
const fakeUrl = new URL('made-up-book/index.html', first).href;
if (process.argv.includes('--broken')) books.set(fakeUrl, first);
for (const [url, source] of books) {
  try {
    if (url === fakeUrl && process.argv.includes('--broken')) throw Error('Simulated HTTP 404');
    const raw = await readBook(url, source);
    const result = validate(raw);
    if (result.success) records.push(result.data);
    else {
      invalid++;
      errors.push({ raw, reason: result.error.issues });
    }
  } catch (err) {
    onFailure(url, err);
  }
}
await mkdir('output', { recursive: true });
async function save(name, data) {
  await writeFile('output/' + name + '.json', JSON.stringify(data, null, 2) + '\n');
}
await save('books', records);
await save('errors', errors);
console.log('valid_records=' + records.length);

const report = {
  started_at: started.toISOString(),
  duration_ms: Date.now() - started.getTime(),
  ...counts,
  valid_records: records.length,
  invalid_records: invalid,
  failed_pages: failed
};
await save('run-report', report);
console.log(report);
