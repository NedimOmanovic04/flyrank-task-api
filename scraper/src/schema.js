import { z } from 'zod';

const httpsUrl = z.url({ protocol: /^https$/ });
const book = z.object({
  title: z.string().min(1),
  product_url: httpsUrl,
  price_text: z.string().regex(/^£\d+\.\d{2}$/),
  price_gbp: z.number().nonnegative(),
  availability_text: z.string().min(1),
  rating_text: z.enum(['One', 'Two', 'Three', 'Four', 'Five']),
  description: z.string().nullable(),
  source_page: httpsUrl,
  fetched_at: z.iso.datetime()
});

export function validate(raw) {
  return book.safeParse({ ...raw, price_gbp: Number(raw.price_text.slice(1)) });
}
