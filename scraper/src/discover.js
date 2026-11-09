import { load } from 'cheerio';
import { first, getPage } from './fetch.js';

export async function discover() {
  const books = new Map();
  let url = first;
  let pages = 0;
  let discovered = 0;
  while (url && pages < 3) {
    const { html } = await getPage(url, 'catalogue-page-' + (pages + 1) + '.html');
    const $ = load(html);
    pages++;
    for (const link of $('.product_pod h3 a[href]')) {
      const product = new URL($(link).attr('href'), url).href;
      if (!books.has(product)) books.set(product, url);
      discovered++;
    }
    const next = $('.pager .next a').attr('href');
    url = next && new URL(next, url).href;
  }
  console.log('catalogue_pages=' + pages, 'discovered=' + discovered, 'unique_urls=' + books.size);
  return books;
}
