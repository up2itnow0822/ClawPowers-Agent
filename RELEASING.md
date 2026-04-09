# Releasing ClawPowers-Agent

## Pre-release checklist

- `npm run sync:skills`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run verify:pack`
- `npm run smoke:openclaw`
- clean-install tarball E2E verified
- README, CHANGELOG, SECURITY, compatibility, and limitations docs updated

## Release discipline

- use a signed Git tag for public releases
- publish only after the supported `clawpowers` and `openclaw` matrix is validated
- inspect `npm pack --dry-run` output before publishing
- document any breaking changes in `CHANGELOG.md`

## Published versions

| Version | Date | Notes |
|---------|------|-------|
| 1.1.1 | 2026-04-08 | Patch: CHANGELOG date corrections, RELEASING populated, README registry fix, peer dep bumped to clawpowers@^2.2.1, `npm pkg fix` repository URL |
| 1.1.0 | 2026-04-08 | First npm publish. Thin OpenClaw wrapper, clawpowers peer dependency, deterministic skill sync, smoke test, pre-launch audit pass |
| 1.0.0 | 2026-04-02 | Initial build. Agent control loop, 27 skills, 3-tier memory, RSI, payments, 327 tests (workspace-only, not published to npm) |
