# Continuous verbatim compaction

Jev scores each tool call and result. Stale ones drop or truncate. Everything kept stays the original text. User and assistant text never become a summary.

This page reimplements the [fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction) pattern with canned keep, drop, and truncate decisions. It does not call the TypeSafe API.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000

## Deploy

DEPLOY_URL
