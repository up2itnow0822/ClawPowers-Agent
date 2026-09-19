# Contributing

## Development environment

The published wrapper supports Node.js 22.12+. The development toolchain
requires Node.js `^22.19.0 || ^24.0.0 || >=26.0.0`, matching the supported
ranges of the locked OpenClaw, Vitest, and ESLint releases. `npm install`,
`npm ci`, and `npm run` enforce that contributor-only requirement through
`devEngines`.

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
