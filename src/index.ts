/**
 * ClawPowers Agent — Public API
 */

// Types
export type {
  AgentState,
  AgentStatus,
  Goal,
  GoalSource,
  Plan,
  PlanStatus,
  Step,
  StepStatus,
  Profile,
  ProfileName,
  SkillManifest,
  SkillRequirements,
  ConfigFile,
  RSIConfig,
  RSITier,
  RSITierMode,
  RSITierT4Mode,
  RSIMutation,
  RSIMutationStatus,
  MemoryEntry,
  MemoryOutcome,
  MemoryStats,
  PaymentConfig,
  PaymentMode,
  LoggingConfig,
} from './types.js';

// Agent
export { createAgentState, transition, canTransition, isTerminal, isActive, getValidTransitions } from './agent.js';

// Config
export { loadConfig, loadConfigSafe, saveConfig, initConfig, getConfigValue, setConfigValue } from './config.js';

// Constants
export { VERSION, PACKAGE_NAME, CLAWPOWERS_HOME, DEFAULT_CONFIG, VALID_TRANSITIONS, RSI_TIER_ALLOWED_MODES, SAFETY_INVARIANTS, PERFORMANCE } from './constants.js';

// Skills
export { discoverSkills, loadSkillManifest, getActiveSkills, listSkillsWithStatus, parseFrontmatter } from './skills.js';

// Plugin
export { createClawPowersPlugin } from './plugin.js';
export type { ClawPowersPlugin, PluginContext } from './plugin.js';

// Gateway
export { generateGatewayConfig, writeGatewayConfig, gatewayConfigToYaml } from './gateway.js';
export type { GatewayConfig, GatewaySkillConfig } from './gateway.js';

// Agent Control Loop
export { parseTask } from './agent/intake.js';
export { createPlan, approvePlan, validatePlanDependencies } from './agent/planner.js';
export { executeStep, executePlan } from './agent/executor.js';
export { reviewOutput } from './agent/reviewer.js';
export { completeTask } from './agent/completion.js';

// Payments
export { detect402, isPaymentRequired } from './payments/discovery.js';
export { SpendingPolicy } from './payments/spending.js';
export { PaymentExecutor } from './payments/executor.js';
export type { MCPPaymentClient } from './payments/executor.js';

// New Types
export type {
  StepResult,
  PlanResult,
  CriterionResult,
  ReviewResult,
  TaskOutcome,
  TaskCompletion,
  WorkingMemory,
  PaymentRequired,
  PaymentRequest,
  PaymentResult,
  SpendingDecision,
  PaymentAuditEntry,
  EpisodicEntry,
  ProceduralEntry,
  MutationRecord,
  CheckpointState,
  CheckpointInfo,
  TaskMetrics,
  SkillMetrics,
  SkillAggregateStats,
  TrendDirection,
  RSIHypothesis,
  RSITierLabel,
  RSIMutationExtended,
  RSIMutationExtendedStatus,
  ABTest,
  ABTestResult,
  ABTestDecision,
  ABTestStatus,
  RSIAuditEntry,
  RSIAuditMetrics,
} from './types.js';

// Memory
export {
  WorkingMemoryManager,
  EpisodicMemory,
  ProceduralMemory,
  CheckpointManager,
  ContextInjector,
} from './memory/index.js';

// Native
export { getNative, isNativeAvailable } from './native/index.js';

// RSI
export {
  MetricsCollector,
  HypothesisEngine,
  MutationEngine,
  ABTestManager,
  RSIAuditLog,
} from './rsi/index.js';
