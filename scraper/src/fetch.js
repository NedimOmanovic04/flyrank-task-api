import { mkdir, readFile, writeFile, stat, rename } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';

export const first = 'https://books.toscrape.com/catalogue/page-1.html';
export const counts = { pages_fetched: 0, cache_hits: 0 };
let lastRequest = 0;

export async function getPage(url, filename) {
  if (new URL(url).origin !== new URL(first).origin) throw Error('Outside sandbox');
  await mkdir('cache', { recursive: true });
  const path = 'cache/' + filename;
  try {
    const html = await readFile(path, 'utf8');
    const { mtime } = await stat(path);
    counts.cache_hits++;
    console.log('CACHE HIT', filename, Buffer.byteLength(html));
    return { html, fetched_at: mtime.toISOString() };
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  await wait(Math.max(0, 550 - (Date.now() - lastRequest)));
  lastRequest = Date.now();
  const response = await fetch(url, {
    headers: { 'User-Agent': 'FlyRankInternshipA9/1.0 (+https://github.com/NedimOmanovic04/flyrank-task-api)' },
    signal: AbortSignal.timeout(10000), redirect: 'manual'
  });
  if (response.status !== 200) {
    await response.body?.cancel();
    throw Object.assign(Error('HTTP ' + response.status), { status: response.status });
  }
  const html = await response.text();
  await writeFile(path + '.tmp', html);
  await rename(path + '.tmp', path);
  counts.pages_fetched++;
  console.log('FETCH', filename, Buffer.byteLength(html));
  return { html, fetched_at: (await stat(path)).mtime.toISOString() };
}
