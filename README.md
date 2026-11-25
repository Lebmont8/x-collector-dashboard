# Collector Desk

A searchable research library for collected X-style posts. React + TypeScript on the front end, Node.js and SQLite behind a read-only API.

![Collector Desk collection view](docs/collection-desktop.png)

## What it does

- Browse a paginated post collection with author context and interaction counts
- Search text and people; combine exact-author and inclusive UTC-date filters
- Sort by publication date or total interactions
- Inspect daily collection counts and topic distribution
- Export the current filtered collection as spreadsheet-safe CSV
- Import your own normalized JSON locally, with validation and idempotent upserts
- Use the same workflow on desktop and narrow mobile screens

The included72 posts and5 authors are entirely fictional. The app runs without an X account, cookies, API keys or any external service. It is an archive viewer, not a live X scraper or an official X integration. An existing collector can supply normalized JSON through the documented import boundary; no production collector or private data is included.

## Run

Requires **Node.js24+** and npm. Node’s built-in SQLite is used; Node may print its experimental SQLite warning.

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4318. The first start seeds a local database in data/; later starts preserve it.

Development with Vite hot reload:

```sh
npm run dev
```

Open the loopback Vite URL printed in the terminal. The API stays at127.0.0.1:4318.

## Your own collection

Start with a distinct empty database to avoid mixing real and synthetic rows:

```sh
DB_PATH=data/my-collection.sqlite npm run import -- posts.json
DEMO_SEED=false DB_PATH=data/my-collection.sqlite npm start
```

See [API and import format](docs/API.md). The app never fetches X, starts a collection job or handles account credentials. Keep private collections behind authentication if serving beyond loopback.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:ui
```

For an existing Chrome installation, set CHROME_PATH to its executable instead of downloading a browser. Only set CHROME_NO_SANDBOX=true in a disposable environment that requires it. Browser tests start a temporary loopback server with an in-memory database and close it afterward; screenshots are written to docs/.

[Insights screenshot](docs/insights-desktop.png) · [Mobile screenshot](docs/collection-mobile-390.png) · [Project map](PROJECT_MAP.md)

## Architecture

React → same-origin HTTP API → parameterized SQLite queries. Shared validated filters keep the feed, statistics and CSV consistent. Imports run as a separate local CLI with a single transaction. No runtime dependencies beyond React/ReactDOM; HTTP and SQLite use Node built-ins. Vite, TypeScript and Playwright are development tools.

The UI uses native forms, labels, keyboard submission, focus styles and responsive grid layouts. Browser acceptance covers Chromium desktop1440 and emulated390/320px viewports. Physical iOS/Safari and assistive-technology testing are not claimed.

## License

MIT. See [LICENSE](LICENSE).

## Continuous integration

The reviewed workflow is provided at [ci/checks.yml](ci/checks.yml). It is a reference, not an active GitHub Actions workflow, until repository authorization permits publication under .github/workflows/. Local checks are independent of hosted CI.
