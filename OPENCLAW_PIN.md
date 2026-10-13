# OpenClaw pin policy (ClawPowers-Agent)

**Pinned version:** `openclaw@2026.9.4` (matches Max on Bill's Mac).

**Rules**
1. Do not merge Dependabot (or other) PRs that bump `openclaw` while this pin is in force.
2. Future upgrades require the canary process documented in the OpenClaw cleanup plan: install in a throwaway location, run doctor + dashboard smoke + ClawPowers tests, wait ≥72h for public breakage reports, then promote with independent critic sign-off.
3. Dependabot is configured to `ignore` the `openclaw` dependency so bumps are not opened automatically.

**Related:** Max issues/plan `cleanup-2026-09`; ClawPowers issues #100, #101; held PR #105.
