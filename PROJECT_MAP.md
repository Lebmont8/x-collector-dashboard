# Collector Desk

Standalone React + TypeScript research interface and Node.js SQLite API. Synthetic fixtures only; no production collector, accounts or data.

- client/: React state, accessible controls, responsive presentation
- server/db.mjs: schema, validation, transactional idempotent imports
- server/query.mjs: validated filters, parameterized queries, CSV escaping
- server/app.mjs: read-only HTTP API and static production build
- server/*.test.mjs: data, filter, HTTP and export regression tests
- scripts/ui-check.mjs: real browser interaction and viewport checks
- docs/: API contract and screenshots
- data/: ignored local database

Node.js 24+. API binds loopback by default. Development: npm run dev. Production: npm run build && npm start. No collectors, external API calls, scheduled jobs or credentials.
