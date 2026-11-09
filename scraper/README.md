# Books to Scrape

## Target classification

ToScrape lists Books to Scrape as a public scraping sandbox. This exercise follows the first three catalogue pages and their book links to collect titles, prices, stock text, ratings and descriptions. The limited scope and practice catalogue make it appropriate for this exercise. The robots.txt check returned HTTP 404 (no robots file found).

I will not reuse this code on another site without checking its rules and terms first.

## Run

Install Node.js 22.12 or later (npm comes with it). From a terminal:

```sh
git clone https://github.com/NedimOmanovic04/flyrank-task-api.git
cd flyrank-task-api/scraper
npm ci
npm start
```

Run `npm start` again from this folder to reuse the cache. Check `output/books.json` for the books, `output/errors.json` for rejected records or failed URLs, and `output/run-report.json` for the counts. A copy of the validated output is in `sample-books.json`.

## What gets saved

Cheerio reads each product page. Zod checks the record before it goes into the output.

| Field | Value |
| --- | --- |
| title | Nonempty book title |
| product_url | Absolute HTTPS detail link, used to remove duplicates |
| price_text / price_gbp | Original GBP price and its nonnegative numeric value |
| availability_text | Stock message with whitespace cleaned up |
| rating_text | One, Two, Three, Four or Five |
| description | Description text, or null when missing |
| source_page | HTTPS catalogue page where the link first appeared |
| fetched_at | UTC timestamp from when the detail page was saved |

## Requests and failures

The user-agent includes FlyRankInternshipA9/1.0 and the repo URL. Requests run one at a time, at least 550 ms apart, with a 10-second timeout. Only HTTP 200 responses enter the cache. A timeout or 5xx gets one retry after a second. A 403 or 404 is skipped. The cache has no expiry, so a later run can show old prices until you clear it.

The server sends the book data in the HTML, so this script needs no browser. For other projects, use an official API when available, respect logins, paywalls and blocks, and collect only the fields the job needs.

## Check the result

On a second run the book file had the same checksum. Running `npm start -- --broken` adds a made-up detail URL and simulates a 404 locally. That run kept all 60 books and reported one failed page. Here is the report from the following normal run:

```json
{
  "started_at": "2026-11-09T20:34:10.451Z",
  "duration_ms": 378,
  "pages_fetched": 0,
  "cache_hits": 63,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0
}
```
