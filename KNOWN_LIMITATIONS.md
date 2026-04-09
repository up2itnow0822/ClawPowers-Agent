# Known Limitations

## Production-ready

- stock OpenClaw wrapper path
- plugin installation/link flow
- deterministic ClawPowers skill sync
- local validation commands: lint, typecheck, build, tests, pack, smoke init

## Experimental or environment-dependent

- real model execution depends on valid OpenClaw/provider configuration
- prompt-cache economics in published benchmark material remain modeled, not billed receipts
- plugin/runtime behavior should be revalidated against future OpenClaw releases before claiming support

## Important operational notes

- `clawpowers run` depends on a working local OpenClaw installation and configured model/auth state
- clean-install success does not guarantee provider auth is configured on a fresh machine
- wallet/payment primitives inherit their security and runtime constraints from the `clawpowers` package
