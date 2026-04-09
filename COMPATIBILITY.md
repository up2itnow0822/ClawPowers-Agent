# Compatibility Matrix

## Supported release line

| clawpowers-agent | clawpowers | openclaw | Status |
| --- | --- | --- | --- |
| 1.1.x | 2.2.x | 2026.4.5 | Supported |

## Notes

- `clawpowers-agent` is the stock OpenClaw wrapper runtime.
- `clawpowers` is the capability library that supplies payments, memory, RSI, wallet, swarm, and ITP primitives.
- When `clawpowers` updates skill assets or capability implementations, `clawpowers-agent` should pick them up through package updates and skill sync.
- OpenClaw minor or patch upgrades should be validated before widening the supported matrix.
