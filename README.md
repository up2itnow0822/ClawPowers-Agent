# ClawPowers Agent

**Launch surface:** `clawpowers-agent` is the thin wrapper runtime around a stock, updatable OpenClaw instance. The shared capability implementation lives in the `clawpowers` library.

## Canonical Links

- Product site: https://clawpowers.ai
- Docs: https://clawpowers.ai/docs
- Agent runtime: https://clawpowers.ai/agent

**Supported matrix:** `clawpowers-agent` 1.1.x + `clawpowers` 2.2.x + `openclaw` 2026.4.14.

**More docs:** [SECURITY](./SECURITY.md) · [Compatibility](./COMPATIBILITY.md) · [Known Limitations](./KNOWN_LIMITATIONS.md) · [Licensing](./LICENSING.md) · [Releasing](./RELEASING.md) · [Demo](./DEMO.md) · [Roadmap](./ROADMAP.md)

[![CI](https://github.com/up2itnow0822/ClawPowers-Agent/actions/workflows/ci.yml/badge.svg)](https://github.com/up2itnow0822/ClawPowers-Agent/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> The autonomous AI coding agent that plans, executes, reviews, remembers, and self-improves.

> **Patent Pending** — Non-Custodial Multi-Chain Financial Infrastructure System for Autonomous AI Agents

> **License note:** This package is MIT-licensed. It depends on `clawpowers`, which is licensed under **BSL 1.1**. Non-production use is free; production use requires a commercial license until April 3, 2030, after which it converts to Apache 2.0. Review [LICENSING.md](./LICENSING.md) before commercial use.

ClawPowers Agent is a TypeScript runtime wrapper for running ClawPowers capabilities through OpenClaw. It provides the public `clawpowers` CLI, initializes local config, syncs skills, and routes tasks through the stock OpenClaw runtime.

## Prerequisites: OpenClaw

ClawPowers Agent runs on top of [OpenClaw](https://openclaw.ai). You need a working OpenClaw installation before running `clawpowers`.

```bash
npm install -g openclaw@2026.4.14
openclaw status
```

OpenClaw needs at least one LLM provider configured. Add your API key to `~/.openclaw/config.json` or set the appropriate environment variable, such as `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`.

**Node version:** current OpenClaw releases require Node.js 22.12+. If `openclaw` exits immediately during `clawpowers init` or `clawpowers run`, check `node --version` first.

## Quick Start

```bash
# Install the supported OpenClaw runtime and ClawPowers CLI wrapper.
npm install -g openclaw@2026.4.14 clawpowers-agent

# Initialize config at ~/.clawpowers/.
clawpowers init

# Check runtime status.
clawpowers status

# Run a task.
clawpowers run "Build a REST API with Express and Zod validation. Tests pass."
```

## What It Does

ClawPowers runs coding tasks through a five-phase control loop:

1. Intake: parse the task into a goal and acceptance criteria.
2. Planning: decompose the goal into ordered steps and skill matches.
3. Execution: run steps with retries and bounded parallelism.
4. Review: validate output against the success criteria.
5. Completion: report status and persist useful lessons.

Core capabilities come from the underlying `clawpowers` package:

- **Memory** — Three-tier memory for working, episodic, and procedural context.
- **RSI** — Recursive Self-Improvement with tiered autonomy and A/B testing.
- **Payments** — x402 payment workflow handling with policy checks and human-first defaults.
- **Parallel Swarm** — Fan-out concurrent task execution with model routing and token budgeting.
- **ITP** — Experimental context compression for multi-agent communication.

## Native Acceleration

Rust, WASM, and TypeScript fallbacks live in the `clawpowers` npm package. Installing `clawpowers-agent` pulls in `clawpowers` automatically; you do not build native code in this repo.

```typescript
import { isNativeAvailable } from 'clawpowers';
console.log('Native acceleration:', isNativeAvailable());
```

## Architecture Summary

- **`clawpowers`** is the capability library: config, payments, memory, RSI, wallet helpers, swarm primitives, ITP client, native/WASM acceleration, and skill assets.
- **`clawpowers-agent`** is the OpenClaw wrapper: CLI, plugin packaging, skill-sync layer, runtime glue, state machine, and control loop.
- **OpenClaw** remains the underlying runtime. The goal is to stay aligned with stock OpenClaw instead of forking it.

| Area | Location | What it does |
| --- | --- | --- |
| Agent control loop | `src/agent/` | Intake → planner → executor → reviewer → completion. |
| Agent state machine | `src/agent.ts`, `src/agent-constants.ts`, `src/agent-types.ts` | Validated state transitions, constants, and runtime types. |
| CLI | `src/cli.ts` | Commander-powered `clawpowers` binary. |
| Plugin and gateway | `src/plugin.ts`, `src/gateway.ts` | OpenClaw lifecycle hooks and gateway YAML generation. |
| Swarm memory | `src/swarm/memory.ts` | In-process shared key/value store for parallel runs. |
| ITP delegation | `src/itp/delegation-hook.ts` | ITP encode/decode wrappers for the delegation pipeline. |

## RSI Safety Tiers

| Tier | Scope | Default | Description |
| --- | --- | --- | --- |
| T1 | Parameter tuning | `auto` | Retry counts, timeouts, thresholds. Auto-applies within hard bounds. |
| T2 | Strategy evolution | `auto` | Skill selection order and fallback chains. Auto-applies with notification. |
| T3 | Skill composition | `ask` | Creates new skill chains from existing skills after validation. |
| T4 | Architecture proposals | `ask` | Structural changes. Always requires human approval and cannot be set to `auto`. |

Safety invariants such as spending limits, identity, sandbox boundaries, credentials, and tier definitions are not modifiable by RSI.

## Configuration

Config lives at `~/.clawpowers/config.json` with Zod validation.

```json
{
  "version": "1.1.7",
  "profile": "dev",
  "rsi": {
    "enabled": true,
    "tiers": { "t1": "auto", "t2": "auto", "t3": "ask", "t4": "ask" }
  },
  "payments": {
    "mode": "human-first",
    "dailyLimitUsd": 25,
    "weeklyLimitUsd": 100,
    "allowedDomains": []
  },
  "logging": { "level": "info", "retentionDays": 30 },
  "skillsDir": "~/.clawpowers/skills",
  "dataDir": "~/.clawpowers/data"
}
```

Profiles: `dev`, `lead`, `secure`, `growth`, `full`.

Payment modes: `human-first`, `auto`, `disabled`.

```bash
clawpowers config get payments.dailyLimitUsd
clawpowers config set payments.dailyLimitUsd 50
clawpowers config set payments.mode auto
```

## CLI Reference

```bash
clawpowers init
clawpowers run <task>
clawpowers status
clawpowers config get <key>
clawpowers config set <key> <value>
clawpowers skills list
clawpowers skills add <name>
clawpowers skills remove <name>
```

## Development

```bash
git clone https://github.com/up2itnow0822/ClawPowers-Agent.git clawpowers-agent
cd clawpowers-agent
npm install
npm run build
npm run typecheck
npm test
npm run lint
```

Memory, payments, and RSI behavior are covered primarily in the ClawPowers-Skills (`clawpowers`) test suite. This repo keeps tests focused on the agent runtime and re-exports.

## Demos

```bash
npm run demo:task
npm run demo:memory
npm run demo:rsi
```

## License

MIT — see [LICENSE](./LICENSE).

For commercial use, review both this repo and the underlying `clawpowers` package licensing. See [LICENSING.md](./LICENSING.md).
