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
| 1.1.7 | 2026-04-14 | Repair release: published version surfaces aligned and dependency range moved to `clawpowers@^2.2.6` |
| 1.1.6 | 2026-04-09 | Added clawpowers.ai canonical links and aligned the remaining 1.1.6 version surfaces |
| 1.1.5 | 2026-04-09 | Final launch closeout: Node 22.12+ runtime alignment for OpenClaw, clean npm-registry lockfile, CI smoke path fixed |
| 1.1.4 | 2026-04-09 | CI green, launch-ready surface, compatibility updated to clawpowers 2.2.4 |
| 1.1.3 | 2026-04-09 | Security automation, ROADMAP, CI badges, license stack callout, OpenClaw onboarding, ITP server docs |
| 1.1.2 | 2026-04-09 | Polish pass: homepage/bugs/exports/engines added, README config version fixed, npm install -g corrected, compatibility matrix updated |
| 1.1.1 | 2026-04-08 | Patch: CHANGELOG date corrections, RELEASING populated, README registry fix, peer dep bumped to clawpowers@^2.2.1, `npm pkg fix` repository URL |
| 1.1.0 | 2026-04-08 | First npm publish. Thin OpenClaw wrapper, clawpowers peer dependency, deterministic skill sync, smoke test, pre-launch audit pass |
| 1.0.0 | 2026-04-02 | Initial build. Agent control loop, 27 skills, 3-tier memory, RSI, payments, 327 tests (workspace-only, not published to npm) |
