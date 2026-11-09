import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { getPage } from './fetch.js';

export async function readBook(product_url, source_page) {
  const key = createHash('sha256').update(product_url).digest('hex');
  const { html, fetched_at } = await getPage(product_url, key + '.html');
  const $ = load(html);
  const product = $('.product_page');
  const main = product.find('.product_main');
  const text = element => element.text().replace(/\s+/g, ' ').trim();
  const classes = main.find('.star-rating').attr('class') || '';
  return {
    title: text(main.find('h1')), product_url,
    price_text: text(main.find('.price_color')),
    availability_text: text(main.find('.availability')),
    rating_text: classes.split(/\s+/).find(c => ['One','Two','Three','Four','Five'].includes(c)),
    description: text(product.find('#product_description + p')) || null,
    source_page, fetched_at
  };
}
