# ClawPowers Agent

**Launch surface:** `clawpowers-agent` is the thin wrapper runtime around a stock, updatable OpenClaw instance. The shared capability implementation lives in the `clawpowers` library.

## Canonical Links
- Product site: https://clawpowers.ai
- Docs: https://clawpowers.ai/docs
- Agent runtime: https://clawpowers.ai/agent

**Supported matrix:** `clawpowers-agent` 1.1.x + `clawpowers` 2.2.x + `openclaw` 2026.4.9.

**More docs:** [SECURITY](./SECURITY.md) · [Compatibility](./COMPATIBILITY.md) · [Known Limitations](./KNOWN_LIMITATIONS.md) · [Licensing](./LICENSING.md) · [Releasing](./RELEASING.md) · [Demo](./DEMO.md) · [Roadmap](./ROADMAP.md)

[![CI](https://github.com/up2itnow0822/ClawPowers-Agent/actions/workflows/ci.yml/badge.svg)](https://github.com/up2itnow0822/ClawPowers-Agent/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> The autonomous AI coding agent that plans, executes, reviews, remembers, and self-improves.

> **Patent Pending** — Non-Custodial Multi-Chain Financial Infrastructure System for Autonomous AI Agents

> **License note:** This package is MIT-licensed. It depends on `clawpowers`, which is licensed under **BSL 1.1** (non-production use is free; production use requires a commercial license until April 3, 2030, after which it converts to Apache 2.0). Review [LICENSING.md](./LICENSING.md) before commercial use.

ClawPowers is a TypeScript framework for building autonomous coding agents with a full control loop, persistent memory, automatic payment handling (x402), and recursive self-improvement (RSI). It runs on [OpenClaw](https://openclaw.ai) and orchestrates 26+ skills to complete coding tasks end-to-end.

## What It Does

ClawPowers runs your coding tasks through a five-phase control loop:

```
  ┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌────────────┐
  │  Intake  │───▶│ Planning │───▶│ Execution │───▶│  Review  │───▶│ Completion │
  └─────────┘    └──────────┘    └───────────┘    └──────────┘    └────────────┘
       │                              │                │                │
       ▼                              ▼                ▼                ▼
  Parse task into          Decompose into       Run steps with     Validate against
  Goal with criteria       ordered Steps        retry & parallel   success criteria
                           + skill matching      execution
```

**Then it gets smarter:**

- **Memory** — Three-tier memory (working, episodic, procedural) persists lessons across tasks
- **RSI** — Recursive Self-Improvement with tiered autonomy (T1–T4) and A/B testing
- **Payments** — Automatic x402 payment handling when APIs return 402 Payment Required
- **Parallel Swarm** — Fan-out concurrent task execution with model routing and token budgeting
- **ITP (Identical Twins Protocol)** — Context compression eliminating redundant tokens across agent sessions

## Native Acceleration

Rust, WASM, and TypeScript fallbacks live in the **`clawpowers` npm package** ([ClawPowers-Skills](https://github.com/up2itnow0822/ClawPowers-Skills)). Installing `clawpowers-agent` pulls in `clawpowers` as a dependency; you do not build native code in this repo.

| Module | Native capability | TypeScript fallback |
|--------|-------------------|----------------------|
| Payments | Fee schedule, x402 parsing, wallet helpers | Pure-TS equivalents |
| Memory | Canonical store, compression, write firewall | JSONL / in-memory |

### Checking native status

```typescript
import { isNativeAvailable } from 'clawpowers';
console.log('Native acceleration:', isNativeAvailable());
```

## Parallel Swarm

ClawPowers Agent includes a parallel execution engine for running multiple tasks concurrently with intelligent resource management:

- **ConcurrencyManager** — Bounded parallel execution with configurable limits
- **TokenPool** — Global token budget allocation and tracking per task
- **Model Router** — Automatic complexity classification (simple/moderate/complex) routes tasks to optimal models
- **Swarm Memory** — Shared episodic context across concurrent tasks

### Parallel Swarm Benefits

Running N tasks as a single swarm instead of N separate sessions avoids reloading shared context (system prompt, workspace files, tool schemas) for every task.

- **Wall time:** parallel fan-out is significantly faster than sequential execution, scaling with task count and concurrency limit
- **Token usage:** shared-context overhead is paid once per swarm run instead of once per task

**Current measurement snapshot from the underlying `clawpowers` library:**

**Live ITP compression measurements:**
- **25-message corpus:** 11 of 25 messages compressed, `862` to `759` estimated tokens, **11.95% token reduction**, **7.8 ms/message** round-trip
- **5-task live swarm payload:** `183` to `133` task tokens, **27.32% payload reduction**, **5 of 5 tasks compressed**, **10.8 ms** average encode latency

**Modeled prompt-cache economics on those same live prompt sizes:**

| Scenario | Effective input units | Reduction vs baseline | Source type |
|----------|-----------------------|-----------------------|-------------|
| Baseline | 1902.00 | 0.00% | Derived from live prompt sizes |
| ITP only | 1848.00 | 2.84% | Live ITP server compression applied to full prompts |
| Prompt cache only | 752.95 | 60.41% | Anthropic cache-pricing model |
| ITP + prompt cache | 698.95 | 63.25% | Hybrid result: live ITP compression + modeled cache pricing |

Additional measured data:
- **Shared prompt prefix in swarm test:** 1,372 characters, about 343 estimated input tokens
- **Three-set hybrid validation on a MacBook Pro (Apple M1, 16 GB RAM) with benchmark runner model `openai-codex/gpt-5.4`:** combined reduction ranged from **61.89%** to **63.25%**, with a **62.56%** mean and **0.56** standard deviation

Reproduce the underlying benchmarks from [`clawpowers`](https://github.com/up2itnow0822/ClawPowers-Skills):
- `node benchmarks/itp-measurement.mjs` for the live ITP corpus benchmark
- `node benchmarks/swarm-vs-sequential.mjs` for the structure-only swarm cost model
- `node benchmarks/itp-cache-swarm-benchmark.mjs` for the hybrid benchmark (live ITP compression + modeled cache economics)
- `node benchmarks/itp-cache-multi-swarm-benchmark.mjs` for the same hybrid methodology across three swarm sets

## ITP (Identical Twins Protocol) - Experimental

> **Status: Experimental.** ITP compression and latency numbers below are measured against the running server. Any prompt-cache numbers are modeled Anthropic cache economics applied to those same live prompt sizes.

Context compression protocol for multi-agent communication. Deduplicates shared context between agents using the same or similar models.

```typescript
import { itpEncode, itpDecode, encodeTaskDescription } from 'clawpowers';

// Compress task before delegation
const encoded = await encodeTaskDescription('Analyze revenue data');
// Decompress result from worker
const decoded = await decodeSwarmResult(workerResult);
```

**ITP server:** ITP compression is provided by a companion server that maintains the shared codebook. The server is run by AI Agent Economy and is available to all ClawPowers users at no additional cost during the early-access period. You do not need to self-host it. When the server is unreachable, the library operates in passthrough mode with no compression but full functionality preserved. The `graceful fallback` in the code above handles this transparently. Self-hosted ITP server support is on the roadmap.

**Live ITP benchmark snapshot:**
- **Codebook:** `v1.0.0`, 99 entries
- **Corpus benchmark:** **11.95%** token reduction on 25 messages
- **Swarm payload benchmark:** **27.32%** task-token reduction on a 5-task swarm
- **Hybrid swarm benchmark:** **63.25%** effective input-cost reduction from live ITP compression plus modeled prompt caching

## Prerequisites: OpenClaw

ClawPowers Agent runs on top of [OpenClaw](https://openclaw.ai), the AI agent platform. You need a working OpenClaw installation before running `clawpowers`.

**Install OpenClaw:**

```bash
npm install -g openclaw@2026.4.9
```

**Configure a model provider:** OpenClaw needs at least one LLM provider configured. Add your API key to `~/.openclaw/config.json` or set the appropriate environment variable (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`). See [openclaw.ai](https://openclaw.ai) for full setup docs.

**Node version:** current OpenClaw releases require **Node.js 22.12+**. If `openclaw` exits immediately during `clawpowers init` or `clawpowers run`, check `node --version` first.

**Verify OpenClaw is working:**

```bash
openclaw status
```

Once OpenClaw is running, install and initialize ClawPowers:

## Quick Start

```bash
# Install (pulls in clawpowers automatically)
npm install -g openclaw@2026.4.9 clawpowers-agent

# Initialize config at ~/.clawpowers/
clawpowers init

# Run a task
clawpowers run "Build a REST API with Express and Zod validation. Tests pass."

# Check status
clawpowers status
```

## Architecture Summary

- **`clawpowers`** is the capability library, payments, memory, RSI, wallet, swarm, ITP, native/WASM acceleration, and skill assets.
- **`clawpowers-agent`** is the stock OpenClaw wrapper, CLI, plugin packaging, skill-sync layer, and runtime glue.
- **OpenClaw** remains the underlying runtime. The goal is to stay aligned with stock OpenClaw instead of forking it.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        clawpowers-agent (this repo)                      │
├─────────────────────────────────────────────────────────────────────────┤
│  State machine (`agent.ts`) · Control loop (`src/agent/*`) · CLI         │
│  OpenClaw plugin (`plugin.ts`) · Gateway YAML (`gateway.ts`)             │
│  SwarmMemory (`src/swarm/memory.ts`) · ITP delegation hooks (`itp/*`)   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ imports
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         clawpowers (ClawPowers-Skills)                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Config · Constants · Types · Skills loader · Memory · Payments · RSI    │
│  Wallet · ITP client · Parallel swarm (concurrency, token pool, router) │
│  Native / WASM acceleration                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module Breakdown

| Area | Location | What it does |
|------|----------|----------------|
| **From `clawpowers`** | npm package | Single source of truth for config, payments, memory, RSI, wallet, skills discovery, swarm primitives (except `SwarmMemory` class), ITP encode/decode, native acceleration. |
| **Agent control loop** | `src/agent/` | Intake → planner → executor → reviewer → completion. |
| **Agent state machine** | `src/agent.ts`, `src/agent-constants.ts`, `src/agent-types.ts` | `AgentState`, validated transitions, paths/safety constants not re-exported by the Skills entry. |
| **CLI** | `src/cli.ts` | Commander `clawpowers` binary. |
| **Plugin & gateway** | `src/plugin.ts`, `src/gateway.ts` | OpenClaw lifecycle hooks; gateway YAML generation. |
| **SwarmMemory** | `src/swarm/memory.ts` | In-process shared key/value store for parallel runs (re-exported from the agent package). |
| **ITP delegation** | `src/itp/delegation-hook.ts` | `itpEncodeMessage` / `itpDecodeMessage` wrappers for the delegation pipeline. |

## RSI Tiers

ClawPowers implements four tiers of recursive self-improvement, each with different autonomy levels:

| Tier | Scope | Default | Description |
|------|-------|---------|-------------|
| **T1** | Parameter Tuning | `auto` | Retry counts, timeouts, thresholds. Auto-applies. |
| **T2** | Strategy Evolution | `auto` | Skill selection order, fallback chains. Auto-applies with notification. |
| **T3** | Skill Composition | `ask` | Create new skill chains from existing skills. Requires passing A/B tests. |
| **T4** | Architecture Proposals | `ask` | Structural changes. **Always requires human approval.** Cannot be set to `auto`. |

**Safety invariants** (never modifiable by RSI):
- Spending limits and SpendingPolicy
- Core identity and directives
- RSI safety tier definitions
- Sandbox boundaries
- Authentication credentials

**T1/T2 hard bounding boxes** (enforced via Zod schema; mutations outside these ranges are rejected automatically):
- `timeout`: minimum 5 seconds, maximum 300 seconds
- `retry_count`: minimum 0, maximum 5
- `context_window_fraction`: minimum 0.25 (RSI may not truncate below 25% of available context)
- `max_parallel_tasks`: minimum 1, maximum 20

These limits prevent reward-hacking scenarios where T1 minimizes token usage by setting `retry_count = 0` or aggressively truncating context windows to pass fragile tests.

```bash
# Check current tier modes
clawpowers config get rsi.tiers

# Set T3 to auto
clawpowers config set rsi.tiers.t3 auto

# T4 cannot be set to auto (enforced by Zod validation)
clawpowers config set rsi.tiers.t4 auto
# Error: T4 (Architecture Proposals) cannot be set to "auto".
```

### RSI Cycle

```
  Record Metrics ──▶ Analyze Stats ──▶ Generate Hypotheses
        ▲                                       │
        │                                       ▼
  Observe Results ◀── A/B Test ◀── Create Mutation
        │                              │
        └──── Promote or Rollback ◀────┘
```

## Configuration

Config lives at `~/.clawpowers/config.json` with Zod validation:

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

**Profiles:** `dev` | `lead` | `secure` | `growth` | `full` — each activates a different set of skills and capabilities.

**Payment modes:** `human-first` (ask before paying) | `auto` (pay within policy limits) | `disabled` (no payments)

```bash
# Dot-notation config access
clawpowers config get payments.dailyLimitUsd     # 25
clawpowers config set payments.dailyLimitUsd 50
clawpowers config set payments.mode auto
```

## CLI Reference

```bash
clawpowers init                          # Initialize ~/.clawpowers/ with default config
clawpowers run <task>                    # Execute task through full control loop
clawpowers status                        # Show agent state, profile, memory stats
clawpowers config get <key>              # Get config value (dot-notation)
clawpowers config set <key> <value>      # Set config value
clawpowers skills list                   # List all discovered skills
clawpowers skills add <name>             # Add skill to active profile
clawpowers skills remove <name>          # Remove skill from active profile
```

## Development

### Prerequisites

- Node.js ≥ 22.12.0
- TypeScript ≥ 5.5

### Setup

> **Local development note:** in this workspace, `clawpowers-agent/` is the canonical local checkout for agent edits. Keep local changes there to avoid clone drift. The GitHub repo name stays `ClawPowers-Agent`.

```bash
git clone https://github.com/up2itnow0822/ClawPowers-Agent.git clawpowers-agent
cd clawpowers-agent
npm install
```

### Commands

```bash
npm run build          # Build with tsup
npm run dev            # Build in watch mode
npm run typecheck      # tsc --noEmit
npm test               # vitest run (agent-focused suite; see CHANGELOG for count)
npm run test:watch     # vitest in watch mode
npm run lint           # eslint
npm run clean          # Remove dist/
```

### Test Structure

```
tests/
├── agent/                 # Control loop unit tests
├── integration/
│   └── control-loop.test.ts
├── agent.test.ts          # State machine
├── config.test.ts         # Config (via clawpowers)
├── types.test.ts          # Types (via clawpowers)
├── skills.test.ts         # Skill discovery (via clawpowers)
└── cli.test.ts            # CLI
```

Memory, payments, and RSI behavior are covered in the **ClawPowers-Skills** (`clawpowers`) test suite; this repo keeps tests focused on the agent runtime and re-exports.

### Demos

```bash
npm run demo:task      # Full control loop execution
npm run demo:memory    # Memory system cycle
npm run demo:rsi       # RSI self-improvement cycle
```

## Key Design Decisions

- **Zero `any` types.** TypeScript `strict: true` with `noUncheckedIndexedAccess`. Discriminated unions for all status fields.
- **Zod at boundaries.** Config parsing, external data validation — all through Zod schemas.
- **Atomic writes.** Procedural memory uses write-to-temp + rename. Checkpoints use the same pattern. Backups created before every write.
- **Append-only logs.** Episodic memory and RSI metrics use JSONL format — append-only, corruption-recoverable.
- **Fail-closed payments.** Any policy check error → reject. No auto-retry on payment failure. Domain allowlists enforced.
- **Safety invariants.** Spending limits, identity, and tier definitions cannot be mutated by RSI. T4 can never be `auto`.

## License

MIT — see [LICENSE](./LICENSE)

For commercial use, review both this repo and the underlying `clawpowers` package licensing. See [LICENSING.md](./LICENSING.md).
