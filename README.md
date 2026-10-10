# Gatita Search

This repository contains only the Gatita Search site. Its API lives in the
separate CL4NKR backend, which serves the site at `/search/`.

The production browser client uses the established `https://api.clankr.tech`
base with these endpoints:

- `GET https://api.clankr.tech/search/api/search?q=<query>&page=<number>`
- `GET https://api.clankr.tech/search/api/suggest?q=<query>`
- `GET https://api.clankr.tech/search/api/trending`
- `GET https://api.clankr.tech/search/api/summary?q=<query>`
- `POST https://api.clankr.tech/search/api/followup`
- `GET https://api.clankr.tech/search/api/me`
- `GET https://api.clankr.tech/search/api/favicon?domain=<hostname>`

Run the normal workspace server with `npm start`. The search API and UI stay in that existing process. Search fetches upstream HTML directly; no additional service, container,
API key or account is needed. For local development, set
`window.GATITA_SEARCH_API_BASE` or open the page with
`?api=http://localhost/search/api` once; that override is remembered.

Search pages are cached in server memory for 30 minutes. Equivalent capitalization
and whitespace share entries. Concurrent requests share one upstream request.
Autocomplete uses titles from the same real first-page results and shares that cache.
The home page shows three recent stories from BBC News, Al Jazeera, and Le Monde
RSS feeds, favoring one story per source. Feeds refresh every 15 minutes. If one
feed fails, remaining feeds can fill the three slots. Unavailable or stale
stories show an unavailable message instead of fixed sample searches.
The cache is bounded to 500 entries and resets on server restart. Search returns
web links and source snippets directly from the HTML engine. Gatita Instant
(the backend `toolcall` model) separately summarizes the first page. Summaries
share the 30-minute server cache, including concurrent requests, and reset on
server restart. Summary previews reserve three lines and expand behind View more.
Expanded summaries offer related questions through Gatita 7.1 Mini. Summary
failures leave links usable.

Result links and official-domain checkmarks follow the theme's primary color.
The exact-host source list lives in `src/config/searchSources.js`; a checkmark
recognizes the organization's domain, rather than fact-checking the page.
Favicons are fetched through the backend from a fixed image provider, never by
requesting arbitrary result URLs. Icons are cached for seven days (up to 1,000
domains), with a globe fallback cached for one hour if the provider fails.
The favicon route requires the same legal acknowledgment as search requests.

Search uses Gatita's shared HttpOnly session cookie with credentialed requests.
The Settings menu recognizes an existing Gatita account and sends guests through
the sign-in page at `gatita.tech`, returning them to `search.gatita.tech`. Deploy
the updated Gatita Main files and backend together to enable the return flow.

Terms of Service and Privacy Policy acceptance is required before Search starts
account checks, searches, or favicon requests. Search records a versioned acceptance
in browser storage; a new legal version requires fresh acceptance. The API also
requires the current `X-Gatita-Legal-Version` acknowledgment header and returns
HTTP 428 when it is missing or outdated.

Local previews at `http://localhost:4173` and `http://127.0.0.1:4173` are
allowed by the backend CORS rules. An unavailable search upstream returns JSON
with HTTP 503 and `Retry-After: 30`, retaining the CORS headers. Gateway-generated
errors can lack CORS headers even when preflight succeeds; updating the frontend
alone cannot change a gateway response. Restart the existing backend after
updating its routes. Verification challenges are treated as temporary failures,
not empty search results.

## Search upstream

Search fetches `https://html.duckduckgo.com/html/` directly from the existing
backend. It parses organic web links and source snippets, unwraps result URLs,
and follows the next-page form as users scroll. The user's query is preserved;
the AI summarizes only the fetched results and does not rewrite the query or
generate the web result list. It uses the existing backend AI configuration.

Result pages stay cached for 30 minutes. Empty or repeated pages stop scrolling.
Verification challenges and malformed responses return 503 instead of appearing
as empty results. The upstream may still challenge or rate-limit server requests.

After updating these files, restart the existing backend on the server:

```sh
pm2 restart clankr
```

Completely unrelated result batches are rejected before caching or display.
The guard looks for at least one meaningful query term in result titles, snippets,
or URLs; it does not rank pages or verify factual accuracy. An unrelated batch
returns a readable error instead of presenting it as search results.
