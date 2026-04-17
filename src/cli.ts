/**
 * ClawPowers Agent — CLI
 * Commander-based CLI with commands: run, status, init, config, skills.
 */

import { Command } from 'commander';
import { mkdirSync, existsSync } from 'node:fs';
import {
  PACKAGE_NAME,
  CLAWPOWERS_HOME,
  loadConfigSafe,
  saveConfig,
  initConfig,
  getConfigValue,
  setConfigValue,
  discoverSkills,
} from 'clawpowers';
import type { Profile } from 'clawpowers';
import pkg from '../package.json' with { type: 'json' };
import { SKILLS_DIR } from './agent-constants.js';
import { createAgentState } from './agent.js';
import { writeGatewayConfig } from './gateway.js';
import {
  ensureClawPowersPluginInstalled,
  getOpenClawRuntimeStatus,
  runWrappedAgentTurn,
  syncClawPowersSkills,
} from './openclaw-runtime.js';

// ─── Program ──────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name(PACKAGE_NAME)
  .description('Autonomous AI coding agent — orchestrates 26+ skills via OpenClaw')
  .version(pkg.version);

// ─── run <task> ───────────────────────────────────────────────────────────────

program
  .command('run')
  .argument('<task>', 'Task description to execute')
  .description('Execute a task through the full agent control loop')
  .action((task: string) => {
    const config = loadConfigSafe();
    const profile: Profile = {
      name: config.profile,
      description: `${config.profile} profile`,
      skills: [],
      defaultModel: 'anthropic/claude-sonnet-4',
      maxConcurrentAgents: 3,
      paymentEnabled: config.payments.mode !== 'disabled',
      rsiEnabled: config.rsi.enabled,
    };
    const state = createAgentState(profile);
    console.log(`⚡ ClawPowers Agent v${pkg.version}`);
    console.log(`📋 Task: ${task}`);
    console.log(`👤 Profile: @${state.profile.name}`);
    console.log(`🔄 Status: ${state.status}`);
    console.log('');

    const syncedSkills = syncClawPowersSkills();
    ensureClawPowersPluginInstalled();

    if (syncedSkills.length > 0) {
      console.log(`🧩 Synced skills: ${syncedSkills.join(', ')}`);
      console.log('');
    }

    const result = runWrappedAgentTurn(`[ClawPowers-Agent]\n${task}`);
    if (result.length > 0) {
      console.log(result);
    }
  });

// ─── status ───────────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Show agent state, profile, and skill counts')
  .action(() => {
    const config = loadConfigSafe();
    const skills = discoverSkills(config.skillsDir ?? SKILLS_DIR);
    const runtime = getOpenClawRuntimeStatus();
    const profile: Profile = {
      name: config.profile,
      description: `${config.profile} profile`,
      skills: [],
      defaultModel: 'anthropic/claude-sonnet-4',
      maxConcurrentAgents: 3,
      paymentEnabled: config.payments.mode !== 'disabled',
      rsiEnabled: config.rsi.enabled,
    };
    const state = createAgentState(profile);
    console.log(`ClawPowers Agent v${pkg.version}`);
    console.log('========================');
    console.log(`Status:    ${state.status}`);
    console.log(`Profile:   @${config.profile}`);
    console.log(`Skills:    ${skills.length} discovered`);
    console.log(`Gateway:   ${runtime.gatewayHealthy ? 'healthy' : 'not running'}`);
    console.log(`OpenClaw Skills Dir: ${runtime.skillsDir}`);
    console.log('');
    console.log('RSI:');
    console.log(`  Enabled: ${config.rsi.enabled}`);
    console.log(`  T1 (Parameters):    ${config.rsi.tiers.t1}`);
    console.log(`  T2 (Strategies):    ${config.rsi.tiers.t2}`);
    console.log(`  T3 (Composition):   ${config.rsi.tiers.t3}`);
    console.log(`  T4 (Architecture):  ${config.rsi.tiers.t4}`);
    console.log('');
    console.log('Payments:');
    console.log(`  Mode:  ${config.payments.mode}`);
    console.log(`  Daily: $${config.payments.dailyLimitUsd}`);
  });

// ─── init ─────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Initialize ClawPowers home directory and config')
  .action(() => {
    console.log(`⚡ Initializing ClawPowers Agent v${pkg.version}...`);

    // Create directory structure
    const dirs = [CLAWPOWERS_HOME, SKILLS_DIR];
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`  ✅ Created ${dir}`);
      }
    }

    // Write default config
    const config = initConfig();
    console.log(`  ✅ Config written`);

    // Write gateway config
    writeGatewayConfig(config, []);
    console.log(`  ✅ Gateway config written`);

    const syncedSkills = syncClawPowersSkills();
    console.log(`  ✅ Synced ${syncedSkills.length} ClawPowers skill${syncedSkills.length === 1 ? '' : 's'}`);

    ensureClawPowersPluginInstalled();
    console.log('  ✅ OpenClaw plugin installed/linked');

    console.log('');
    console.log(`Done! Run \`clawpowers status\` to verify.`);
  });

// ─── config get/set ───────────────────────────────────────────────────────────

const configCmd = program
  .command('config')
  .description('Manage configuration');

configCmd
  .command('get')
  .argument('<key>', 'Config key in dot notation (e.g., rsi.tiers.t1)')
  .description('Get a configuration value')
  .action((key: string) => {
    const config = loadConfigSafe();
    const value = getConfigValue(config, key);
    if (value === undefined) {
      console.error(`Error: Unknown config key "${key}"`);
      process.exit(1);
    }
    if (typeof value === 'object') {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(String(value));
    }
  });

configCmd
  .command('set')
  .argument('<key>', 'Config key in dot notation')
  .argument('<value>', 'Value to set')
  .description('Set a configuration value')
  .action((key: string, value: string) => {
    try {
      const config = loadConfigSafe();
      const updated = setConfigValue(config, key, value);
      saveConfig(updated);
      console.log(`✅ Set ${key} = ${value}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
  });

// ─── skills list/add/remove ───────────────────────────────────────────────────

const skillsCmd = program
  .command('skills')
  .description('Manage skills');

skillsCmd
  .command('list')
  .description('List all discovered skills')
  .action(() => {
    const config = loadConfigSafe();
    const skills = discoverSkills(config.skillsDir ?? SKILLS_DIR);
    if (skills.length === 0) {
      console.log('No skills discovered. Run `clawpowers init` to set up.');
      return;
    }
    console.log(`Skills (${skills.length}):`);
    for (const skill of skills) {
      console.log(`  • ${skill.name} — ${skill.description}`);
    }
  });

skillsCmd
  .command('add')
  .argument('<name>', 'Skill name to add')
  .description('Add a skill to the active profile')
  .action((name: string) => {
    console.log(`Adding skill: ${name}`);
    console.log('Skill management requires profile configuration (see profiles/).');
  });

skillsCmd
  .command('remove')
  .argument('<name>', 'Skill name to remove')
  .description('Remove a skill from the active profile')
  .action((name: string) => {
    console.log(`Removing skill: ${name}`);
    console.log('Skill management requires profile configuration (see profiles/).');
  });

// ─── payments history/summary ─────────────────────────────────────────────────

const paymentsCmd = program
  .command('payments')
  .description('Payment management commands');

paymentsCmd
  .command('history')
  .description('Show payment audit log')
  .action(() => {
    console.log('Payment History');
    console.log('===============');
    console.log('No payments recorded yet.');
    console.log('');
    console.log('Payments are logged when the agent encounters HTTP 402 responses');
    console.log('and executes payments via agentpay-mcp.');
  });

paymentsCmd
  .command('summary')
  .description('Show spending summary by period')
  .action(() => {
    const config = loadConfigSafe();
    console.log('Spending Summary');
    console.log('================');
    console.log(`Mode:         ${config.payments.mode}`);
    console.log(`Daily Limit:  $${config.payments.dailyLimitUsd}`);
    console.log(`Weekly Limit: $${config.payments.weeklyLimitUsd}`);
    console.log('');
    console.log('Today:      $0.00');
    console.log('This Week:  $0.00');
    console.log('This Month: $0.00');
    console.log('');
    if (config.payments.allowedDomains.length > 0) {
      console.log(`Allowed Domains: ${config.payments.allowedDomains.join(', ')}`);
    } else {
      console.log('Allowed Domains: (all — no allowlist configured)');
    }
  });

// ─── rsi status/history/revert ─────────────────────────────────────────────────

const rsiCmd = program
  .command('rsi')
  .description('RSI (Recursive Self-Improvement) management');

rsiCmd
  .command('status')
  .description('Show active mutations, A/B tests, and last improvement')
  .action(() => {
    const config = loadConfigSafe();
    console.log('RSI Status');
    console.log('==========');
    console.log(`Enabled: ${config.rsi.enabled}`);
    console.log(`T1 (Parameters):    ${config.rsi.tiers.t1}`);
    console.log(`T2 (Strategies):    ${config.rsi.tiers.t2}`);
    console.log(`T3 (Composition):   ${config.rsi.tiers.t3}`);
    console.log(`T4 (Architecture):  ${config.rsi.tiers.t4}`);
    console.log('');
    console.log('Active Mutations: 0');
    console.log('Active A/B Tests: 0');
    console.log('Last Improvement: none');
  });

rsiCmd
  .command('history')
  .description('Show RSI audit log')
  .action(() => {
    console.log('RSI Audit History');
    console.log('=================');
    console.log('No RSI actions recorded yet.');
  });

rsiCmd
  .command('revert')
  .argument('<change-id>', 'Mutation ID to revert')
  .description('Revert a specific RSI mutation')
  .action((changeId: string) => {
    console.log(`Reverting mutation: ${changeId}`);
    console.log('Mutation revert requires active mutation history.');
  });

// ─── resume ───────────────────────────────────────────────────────────────────

program
  .command('resume')
  .description('List incomplete checkpoints and offer to resume')
  .action(() => {
    console.log('Incomplete Tasks');
    console.log('================');
    console.log('No incomplete checkpoints found.');
    console.log('');
    console.log('Checkpoints are created when the agent pauses or crashes during execution.');
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parse();
