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

ClawPowers Agent includes optional Rust-powered native acceleration via [clawpowers-core](https://github.com/up2itnow0822/clawpowers-core), providing:

| Module | Native Capability | TypeScript Fallback |
|--------|------------------|---------------------|
| Payments | `JsFeeSchedule` (77 bps fee calc) | Pure-TS 77 bps formula |
| Payments | `JsX402Client` (HTTP 402 header parsing) | Base64-encoded JSON |
| Payments | `JsAgentWallet` (EVM key generation) | Zero address placeholder |
| Memory | `JsCanonicalStore` (SQLite-backed immutable records) | JSONL file storage |
| Memory | `JsTurboCompressor` (4x vector compression) | Not available |
| Memory | `JsWriteFirewall` (namespace access control) | Fail-open (allow all) |

### Building the Native Addon

**Requirements:** Rust toolchain (rustc 1.70+, cargo)

```bash
cd clawpowers
npm run build:native
```

The native addon (`native/ffi/index.node`) will be built automatically if Rust is available. If Rust is not installed, the TypeScript fallback activates silently — no errors.

### Checking Native Status

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

### Verified Performance (April 2026)

5 health/monitoring tasks — parallel swarm vs 5 sequential cron jobs:

| Metric | Sequential | Parallel Swarm | Improvement |
|--------|-----------|----------------|-----------|
| Tokens | 52,800 | 18,300 | **65% reduction** |
| Wall time | ~25s | ~5s | **5× faster** |
| Cost/run | $0.182 | $0.062 | **66% cheaper** |

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
# Install
npm install -g clawpowers

# Initialize config at ~/.clawpowers/
clawpowers init

# Run a task
clawpowers run "Build a REST API with Express and Zod validation. Tests pass."

# Check status
clawpowers status
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClawPowers Agent                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────── Agent Control Loop ──────────────────┐    │
│  │  Intake → Planner → Executor → Reviewer → Completion    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──── Memory ────┐  ┌──── RSI ─────┐  ┌──── Payments ───┐    │
│  │ Working        │  │ Metrics      │  │ 402 Discovery   │    │
│  │ Episodic       │  │ Hypothesis   │  │ Spending Policy │    │
│  │ Procedural     │  │ Mutation     │  │ Payment Exec    │    │
│  │ Checkpoint     │  │ A/B Testing  │  │ Audit Log       │    │
│  │ Context Inject │  │ Audit Trail  │  │                 │    │
│  └────────────────┘  └──────────────┘  └─────────────────┘    │
│                                                                 │
│  ┌──── Config ────┐  ┌──── Skills ──┐  ┌──── Gateway ────┐    │
│  │ Zod-validated  │  │ SKILL.md     │  │ YAML config     │    │
│  │ Dot-notation   │  │ Discovery    │  │ OpenClaw        │    │
│  │ Profile system │  │ Matching     │  │ Integration     │    │
│  └────────────────┘  └──────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Module Breakdown

| Module | Files | What It Does |
|--------|-------|-------------|
| **Agent Control Loop** | `src/agent/` | Intake parses tasks into Goals. Planner decomposes into dependency-ordered Steps with skill matching. Executor runs steps with retry logic and parallel execution. Reviewer validates against success criteria. Completion generates outcome records and extracts lessons. |
| **Memory** | `src/memory/` | Working memory (in-process, token-budgeted). Episodic memory (JSONL append-only, keyword search). Procedural memory (JSON with atomic writes and backups). Checkpoint manager (crash recovery). Context injector (relevance-scored memory injection). |
| **RSI** | `src/rsi/` | Metrics collector (per-task and per-skill JSONL). Hypothesis engine (detects low success rates, slow skills, co-occurring pairs). Mutation engine (tier-enforced, safety-invariant-protected). A/B test manager (min sample sizes, promotion/rollback thresholds). Audit log (append-only trail). |
| **Payments** | `src/payments/` | 402 detection with x402 header parsing. Spending policy (daily limits, per-transaction limits, domain allowlists, fail-closed). Payment executor with MCP client interface. Audit logging. No auto-retry on failure (financial safety). |
| **Config** | `src/config.ts` | Zod-validated JSON config at `~/.clawpowers/config.json`. Dot-notation get/set. T4 safety invariant enforced at validation layer. |
| **Skills** | `src/skills.ts` | SKILL.md frontmatter parser. Directory-based skill discovery. Profile-based skill filtering. |

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
git clone https://github.com/up2itnow0822/clawpowers.git
cd clawpowers
npm install
```

### Commands

```bash
npm run build          # Build with tsup
npm run dev            # Build in watch mode
npm run typecheck      # tsc --noEmit
npm test               # vitest run (300+ tests)
npm run test:watch     # vitest in watch mode
npm run lint           # eslint
npm run clean          # Remove dist/
```

### Test Structure

```
tests/
├── agent/            # Unit tests for control loop modules
├── memory/           # Unit tests for memory modules
├── payments/         # Unit tests for payment modules
├── rsi/              # Unit tests for RSI modules
├── integration/      # Integration tests (cross-module)
│   ├── control-loop.test.ts
│   ├── memory-persistence.test.ts
│   ├── rsi-cycle.test.ts
│   └── payment-flow.test.ts
├── agent.test.ts     # State machine tests
├── config.test.ts    # Config CRUD tests
├── types.test.ts     # Type system tests
├── skills.test.ts    # Skill discovery tests
└── cli.test.ts       # CLI integration tests
```

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
