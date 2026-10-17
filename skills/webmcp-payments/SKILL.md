---
name: webmcp-payments
description: "PAUSED — payment rails disabled for security maintenance. Do not route HTTP 402 / micropayments through agentpay-mcp or related packages until contract-level enforcement is live and this skill is unpaused."
metadata:
  hermes:
    tags: [finance, clawpowers-catalog, hermes-compatible, paused]
  status: paused
---

<!-- synced with ClawPowers-Skills pause 2026-10-17 (Bill GO) -->

# WebMCP Payments — PAUSED

**Status: PAUSED (2026-10-17).** Payment rails are paused for security maintenance pending contract-level enforcement (Safe + Zodiac Roles / Delay + AgentSpendModule).

## Do not use

- Do **not** install or invoke `agentpay-mcp`, `agentwallet-sdk`, or `webmcp-payments` for live spend from this skill.
- Do **not** set `AGENT_PRIVATE_KEY` / hot-wallet keys to “make payments work” while this pause is in effect.
- Do **not** treat HTTP 402 responses as an automatic pay-and-retry loop via AgentPay MCP.

## When this skill may return

After contract-level agent spend controls are proven (testnet+) and maintainers explicitly unpause this skill and the related npm packages.

## Notes

- Companion pause PR lands in `ClawPowers-Skills` (catalog + skill source of truth).
- `scripts/sync-skills.mjs` preserves a locally paused `SKILL.md` only when syncing from a packaged `clawpowers` copy (not from authoritative `ClawPowers-Skills`, so an intentional unpause can propagate).
- Runtime skill sync prefers this package's bundled `skills/` (with the pause) over an adjacent Skills checkout or `node_modules/clawpowers`.
