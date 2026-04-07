/**
 * Parallel swarm — re-exports from clawpowers plus Agent-local SwarmMemory.
 */

export {
  ConcurrencyManager,
  TokenPool,
  classifyHeuristic,
  selectModel,
  classifyTasks,
} from 'clawpowers';
export type {
  ModelComplexity,
  TaskStatus,
  SwarmTask,
  SwarmResult,
  SwarmRun,
  SwarmConfig,
  SwarmMemoryEntry,
  SwarmMemoryHandle,
  TokenAllocation,
  TokenUsageReport,
} from 'clawpowers';

export { SwarmMemory } from './memory.js';
