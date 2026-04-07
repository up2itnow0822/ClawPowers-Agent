/**
 * ClawPowers Agent — OpenClaw Plugin Skeleton
 * Integration point with OpenClaw's plugin-sdk.
 * Exports lifecycle hooks: onLoad, onSessionStart, onSessionEnd, onError.
 */

import type { Profile } from 'clawpowers';
import { loadConfig, discoverSkills, getActiveSkills } from 'clawpowers';
import type { AgentState } from './agent-types.js';
import { createAgentState } from './agent.js';
import { SKILLS_DIR } from './agent-constants.js';
import pkg from '../package.json' with { type: 'json' };

// ─── Plugin Types ─────────────────────────────────────────────────────────────

export interface PluginContext {
  readonly agentState: AgentState;
  readonly config: ReturnType<typeof loadConfig>;
  readonly skills: ReturnType<typeof discoverSkills>;
}

export interface ClawPowersPlugin {
  readonly name: string;
  readonly version: string;
  onLoad: () => PluginContext;
  onSessionStart: (context: PluginContext) => PluginContext;
  onSessionEnd: (context: PluginContext) => void;
  onError: (error: Error, context: PluginContext) => void;
}

// ─── Profile Loader ───────────────────────────────────────────────────────────

function loadProfileForConfig(): Profile {
  const config = loadConfig();
  return {
    name: config.profile,
    description: `${config.profile} profile`,
    skills: [],
    defaultModel: 'anthropic/claude-sonnet-4',
    maxConcurrentAgents: 3,
    paymentEnabled: config.payments.mode !== 'disabled',
    rsiEnabled: config.rsi.enabled,
  };
}

// ─── Plugin Factory ───────────────────────────────────────────────────────────

export function createClawPowersPlugin(): ClawPowersPlugin {
  return {
    name: 'clawpowers',
    version: pkg.version,

    onLoad(): PluginContext {
      const config = loadConfig();
      const profile = loadProfileForConfig();
      const agentState = createAgentState(profile);
      const skills = discoverSkills(config.skillsDir ?? SKILLS_DIR);

      return {
        agentState,
        config,
        skills,
      };
    },

    onSessionStart(context: PluginContext): PluginContext {
      const activeSkills = getActiveSkills(context.skills, context.agentState.profile);
      return {
        ...context,
        skills: activeSkills,
      };
    },

    onSessionEnd(_context: PluginContext): void {
      // Write episodic memory, update procedural memory, write checkpoint
      // Implementation in Phase 3 (Memory)
    },

    onError(error: Error, _context: PluginContext): void {
      // Log error, attempt recovery, update agent state
      console.error(`[clawpowers] Plugin error: ${error.message}`);
    },
  };
}
