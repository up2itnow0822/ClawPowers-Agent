# Changelog

All notable changes to ClawPowers Agent are documented here.

This project follows [Semantic Versioning](https://semver.org/).

## [1.1.5] - 2026-04-09

### Fixed

- CI now runs on Node 22 so the OpenClaw smoke test executes in a supported runtime
- `package-lock.json` regenerated from the npm registry so `npm ci` succeeds on clean GitHub runners
- README and Known Limitations now state the real OpenClaw runtime requirement: Node.js 22.12+
- `engines.node` updated to `>=22.12.0` to match the underlying OpenClaw requirement

## [1.1.1] - 2026-04-08

### Fixed

- `package.json` homepage, bugs URL, exports field, and engines normalization added
- Peer dependency bumped to `clawpowers@^2.2.1`
- CHANGELOG publish dates corrected to 2026-04-08
- RELEASING.md populated with published versions table
- `npm pkg fix` repository URL normalization applied

## [1.1.0] - 2026-04-08

### Changed

- **ClawPowers-Skills is a dependency** — The `clawpowers` npm package ([ClawPowers-Skills](https://github.com/up2itnow0822/ClawPowers-Skills)) is the single source of truth for payments, memory, RSI, wallet, swarm primitives, ITP client, skills loader, and native/WASM acceleration. The agent uses `file:../ClawPowers-Skills` for local development; published installs use `clawpowers` from npm.
- **Agent scope** — This repo is a thin runtime: agent state machine, control loop (`src/agent/`), CLI, OpenClaw plugin, gateway config, `SwarmMemory`, and ITP delegation hooks. Duplicated modules under `src/memory`, `src/payments`, `src/rsi`, `src/native`, `src/skills.ts`, shared config/types/constants, and the top-level `native/` Rust tree were removed.
- **Public API** — `src/index.ts` re-exports all public symbols from `clawpowers` and adds agent-only exports (`AgentState`, control loop, plugin, gateway, `SwarmMemory`, delegation hooks, and runtime constants such as `VALID_TRANSITIONS`).
- **Tests** — **132 tests** across **11 files** (agent-focused; capability tests live in Skills). Down from the previous monolithic count by design.

### Removed

- Local copies of native acceleration (Rust/WASM/PyO3) — provided by the `clawpowers` package.

## [1.0.0] - 2026-04-02

### Added

- **Agent control loop** - Full intake/planner/executor/reviewer/completion pipeline for autonomous coding agents
- **27 production skills** - Code review, testing, security audit, deployment, debugging, and more
- **Three-tier memory system** - Working memory (session), episodic memory (cross-session), procedural memory (learned skills) with checkpoint and context injection
- **Payments module** - Payment discovery, execution, and spending policy enforcement via x402 protocol
- **RSI engine** - Recursive self-improvement with A/B testing, hypothesis generation, mutation tracking, and metric-driven evaluation
- **Skills loader** - Dynamic skill registration, execution, and outcome tracking
- **CLI** - `clawpowers init`, `clawpowers status`, configuration management
- **Gateway and plugin system** - Extensible architecture for custom integrations
- **327 tests passing** across 28 test files
- **T4 safety invariant** - Architecture proposals cannot be set to "auto" mode; always requires human approval

### Native Acceleration (Rust)

- **clawpowers-core** - 10 Rust crates compiled to native `.node` addon via napi-rs
  - **Wallet family**: `wallet` (alloy-signer, Zeroize), `tokens` (U256 fixed-point), `policy` (spending caps, allowlists, fail-closed), `fee` (0.77% tx / 0.30% swap), `x402` (HTTP 402 payment protocol)
  - **Memory family**: `canonical` (SQLite immutable store), `compression` (TurboQuant 4x), `index` (cosine similarity), `verification` (integrity/TTL/quarantine), `security` (write firewall, audit)
- **148 Rust tests** all passing, clippy clean, zero unsafe blocks
- **3-tier loading** - Native addon (fastest) -> WASM (portable) -> TypeScript (universal fallback)

### WASM Fallback

- **8 of 10 crates** compile to WASM via wasm-pack (tokens, fee, policy, compression, index, canonical, verification, security)
- **Browser and Node.js** packages (`pkg/` and `pkg-node/`)
- Wallet and x402 excluded from WASM (alloy-signer/reqwest not WASM-compatible) - fall back to TypeScript automatically

### Python Bindings (PyO3)

- **clawpowers-pyo3** - Full Python bindings via PyO3 for NemoClaw integration
- Wraps all 10 Rust crates with Pythonic API (`AgentWallet`, `TokenAmount`, `FeeSchedule`, etc.)
- maturin build system, pip-installable
- Enables: `import clawpowers_core; wallet = clawpowers_core.AgentWallet.generate()`

### Documentation

- 270-line README with installation (6 methods), usage examples, architecture diagrams, and platform support matrix
- Dual-runtime architecture docs (Node.js + bash)
- Patent-pending notice included

### License

- BSL 1.1 (Business Source License) with 4-year conversion to Apache 2.0
