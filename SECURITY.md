# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.1.x   | ✅ |
| < 1.1.0 | ❌ |

## Reporting a Vulnerability

Please report security issues privately to **bill@ai-agent-economy.com**.

Include:
- affected versions of `clawpowers-agent`, `clawpowers`, and `openclaw`
- whether the issue affects plugin install, skill sync, local config, or runtime execution
- reproduction steps and impact

Please do not open public GitHub issues for unpatched vulnerabilities.

## Response Expectations

- initial acknowledgement: within 3 business days
- severity triage: within 5 business days
- remediation timing: based on impact and exploitability

## Scope Notes

ClawPowers-Agent is a thin wrapper around a stock OpenClaw runtime. Security-sensitive areas include:
- plugin installation and loading
- skill synchronization into the OpenClaw skill directory
- local config generation under `~/.clawpowers`
- routing user tasks into a live OpenClaw runtime

## Local Data and Telemetry

- ClawPowers-Agent stores local configuration and generated plugin assets on disk
- ClawPowers-Agent does not intentionally add telemetry beyond what the underlying OpenClaw runtime and configured model providers already use
- model traffic, auth, and provider behavior depend on the user’s OpenClaw configuration

## Wallet and Payment Features

Wallet, payment, x402, and RSI primitives live in the `clawpowers` package. Review that package’s security notes as well when evaluating payment or wallet-related risk.
