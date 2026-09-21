# Contributing

## Development environment

The published wrapper supports Node.js 24.16+. The development toolchain
requires Node.js `^24.16.0 || >=26.1.0`, matching OpenClaw 2026.9.x's
runtime floor and excluding unsupported Node 25 / early 26 builds.
`npm install`, `npm ci`, and `npm run` enforce that contributor-only
requirement through `devEngines`.

## Before opening a PR

- align with the supported compatibility matrix
- keep wrapper logic thin and push shared capability changes into `clawpowers`
- update docs when architecture, packaging, or launch surface changes

## Validation

Run:

```bash
npm run sync:skills
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:pack
npm run smoke:openclaw
```
