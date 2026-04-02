# Changelog

All notable changes to ClawPowers Agent are documented here.

This project follows [Semantic Versioning](https://semver.org/).

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
