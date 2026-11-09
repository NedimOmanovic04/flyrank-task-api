import { discover } from './discover.js';
import { readBook } from './book.js';

const records = [];
for (const [url, source] of await discover()) {
  records.push(await readBook(url, source));
}
console.log(records[0]);
console.log('detail_pages=' + records.length);
