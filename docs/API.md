# Read-only API

All timestamps are UTC. Responses are JSON unless noted. Unknown or repeated query keys and invalid values return 400 with an error message. No HTTP mutation endpoints; import is a local operator CLI.

| GET endpoint | Result |
| --- | --- |
| /api/health | Health check |
| /api/authors | Distinct author handles, display names and counts |
| /api/posts | posts, total, page, pages, limit |
| /api/stats | Filtered counts, interactions, daily series and topics |
| /api/export.csv | Filtered UTF-8 CSV attachment |

Shared filters: q (literal substring, <=200 chars), author (exact handle), from/to (inclusive YYYY-MM-DD), sort (newest, oldest, engagement). Page starts at1, limit defaults to12, max100. Stats ignore pagination. CSV ignores pagination, includes at most5000 rows and exposes X-Total-Count and X-Export-Limit headers. Interactions = likes + reposts + replies, not unique people or reach.

The default fixture is72 fictional posts across5 authors and6 UTC dates. It is created only when the database is empty. Counts do not represent X activity. Search uses SQLite LIKE (ASCII case-insensitive, not full Unicode case folding). SQL parameters and literal wildcard escaping prevent query injection.

## Import format

Run DEMO_SEED=false for an empty database. Import on the same DB_PATH with npm run import -- posts.json. Input is a JSON array, at most5000 rows/10MB. Every row is validated before a transaction begins; stable IDs upsert. No network fetch or scraping is performed. Demo rows are not automatically removed when importing; choose a separate empty DB_PATH for your data.

```json
[{"id":"post-1","author":"example","name":"Example","text":"A post you are authorized to store.","topic":"research","publishedAt":"2026-11-25T12:00:00.000Z","likes":0,"reposts":0,"replies":0}]
```

Text fields are rendered as React text, never raw HTML. CSV values are quoted and formula-leading cells neutralized. Metrics are non-negative safe integers bounded at1billion per field. No credentials, account sessions or internal prompts are needed.

## Deployment boundary

Default HOST=127.0.0.1, PORT=4318, DB_PATH=data/collector.sqlite. No authentication is supplied: this is a local research application, not a public multi-tenant service. Before exposing private collections remotely, put an authenticated TLS reverse proxy in front of it. Do not put secrets in Vite client variables. No CORS access is enabled. Build assets are served by Node; development uses Vite proxying /api to the loopback API.
