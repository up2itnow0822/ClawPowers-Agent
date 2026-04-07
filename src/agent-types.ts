/**
 * Agent runtime types not exported from the skills library (clawpowers).
 */

import type { Goal, Plan, AgentStatus, Profile, MemoryStats } from 'clawpowers';

export interface AgentState {
  readonly taskId: string;
  readonly currentTask: Goal | null;
  readonly currentPlan: Plan | null;
  readonly status: AgentStatus;
  readonly profile: Profile;
  readonly memoryStats: MemoryStats;
  readonly startedAt: string;
  readonly updatedAt: string;
}
