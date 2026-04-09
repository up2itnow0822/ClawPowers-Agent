# Contributing

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
