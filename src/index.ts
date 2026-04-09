/**
 * ClawPowers Agent — Public API
 * Re-exports clawpowers (Skills library) plus agent runtime: state machine, control loop, plugin, gateway.
 */

export * from 'clawpowers';

export type { AgentState } from './agent-types.js';

export {
  SKILLS_DIR,
  VALID_TRANSITIONS,
  RSI_TIER_ALLOWED_MODES,
  SAFETY_INVARIANTS,
  PERFORMANCE,
} from './agent-constants.js';

export { createAgentState, transition, canTransition, isTerminal, isActive, getValidTransitions } from './agent.js';

export { createClawPowersPlugin } from './plugin.js';
export type { ClawPowersPlugin, PluginContext } from './plugin.js';
export { default as openClawPlugin } from './plugin.js';

export { generateGatewayConfig, writeGatewayConfig, gatewayConfigToYaml } from './gateway.js';
export type { GatewayConfig, GatewaySkillConfig } from './gateway.js';

export {
  ensureClawPowersPluginInstalled,
  ensureGatewayStarted,
  getOpenClawRuntimeStatus,
  runWrappedAgentTurn,
  syncClawPowersSkills,
} from './openclaw-runtime.js';

export { parseTask } from './agent/intake.js';
export { createPlan, approvePlan, validatePlanDependencies } from './agent/planner.js';
export { executeStep, executePlan } from './agent/executor.js';
export { reviewOutput } from './agent/reviewer.js';
export { completeTask } from './agent/completion.js';

export { SwarmMemory } from './swarm/memory.js';

export { itpEncodeMessage, itpDecodeMessage } from './itp/delegation-hook.js';
