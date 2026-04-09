# Roadmap

This document tracks planned improvements to `clawpowers-agent`. Items are roughly prioritized.

## Near-term (v1.2.x)

- **ClawHub registry entry** — list `clawpowers-agent` on clawhub.ai for OpenClaw skill discovery
- **Graceful no-auth startup** — clear, actionable error messages when OpenClaw or model provider auth is missing instead of a silent failure
- **CI coverage reporting** — publish coverage artifacts on every PR so regressions are caught before merge
- **Isolated `clawpowers init` test** — CI job that runs init in a fresh `$HOME` directory to catch any pre-existing state dependency
- **OS support documentation** — explicit Windows/macOS/Linux install paths and behavior for `~/.clawpowers`

## Medium-term (v1.3.x)

- **OpenClaw version matrix automation** — CI job that validates against multiple OpenClaw releases as they ship
- **GitHub Release automation** — the `release.yml` workflow now handles this; goal is removing all manual publish steps
- **ClawPowers skills catalog expansion** — additional skills beyond ITP (code-review, deploy, debug, test-generation) synced from `clawpowers`

## Longer-term

- **Multi-agent swarm orchestration UI** — visibility into concurrent task fans and their token/cost budgets
- **RSI dashboard** — per-session mutation history, A/B test outcomes, and accepted improvements
- **Plugin API for custom control loops** — allow external packages to register custom planner/executor/reviewer stages

## Dependency on ClawPowers-Skills roadmap

Capability improvements (payment atomicity, SQLite memory, zero-copy ITP, Rust-layer key loading) are tracked in the [`clawpowers` ROADMAP](https://github.com/up2itnow0822/ClawPowers-Skills/blob/main/ROADMAP.md). This package picks them up through normal dependency updates.
