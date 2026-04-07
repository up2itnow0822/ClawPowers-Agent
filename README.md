# ClawPowers Agent

> The autonomous AI coding agent that plans, executes, reviews, remembers, and self-improves.

> **Patent Pending** — Non-Custodial Multi-Chain Financial Infrastructure System for Autonomous AI Agents

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

### Indicative Performance

Parallel swarm execution reduces tokens and wall time when tasks share common context (system prompts, working memory, model preambles). **Actual savings vary widely by workload** — they depend on how much context overlap exists, which models the tasks target, and the size of the working-memory footprint.

In internal 5-task health-check testing we observed wall-time speedups around 5x and token reductions in the 30–65% range depending on configuration. These numbers are illustrative, not guaranteed. See the [ClawPowers-Skills README](https://github.com/up2itnow0822/ClawPowers-Skills#swarm-vs-sequential-cron--indicative-performance) for methodology and caveats. A reproducible benchmark script is on the roadmap.

## ITP (Identical Twins Protocol)

Context compression protocol for multi-agent communication. Deduplicates shared context between agents using the same or similar models.

```typescript
import { itpEncode, itpDecode, encodeTaskDescription } from 'clawpowers';

// Compress task before delegation
const encoded = await encodeTaskDescription('Analyze revenue data');
// Decompress result from worker
const decoded = await decodeSwarmResult(workerResult);
```

Graceful fallback: operates in passthrough mode when the ITP server is offline.

## Quick Start

```bash
# Install (pulls in clawpowers automatically)
npm install -g clawpowers-agent

# Initialize config at ~/.clawpowers/
clawpowers init

# Run a task
clawpowers run "Build a REST API with Express and Zod validation. Tests pass."

# Check status
clawpowers status
```

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
  "version": "1.0.0",
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

- Node.js ≥ 20
- TypeScript ≥ 5.5

### Setup

```bash
git clone https://github.com/up2itnow0822/ClawPowers-Agent.git
cd ClawPowers-Agent
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
