#!/usr/bin/env npx tsx
/**
 * Demo: Memory System Cycle
 *
 * Demonstrates episodic memory, procedural memory, checkpoints,
 * and context injection across multiple simulated task completions.
 *
 * Run: npx tsx demos/demo-memory-cycle.ts
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EpisodicMemory } from '../src/memory/episodic.js';
import { ProceduralMemory } from '../src/memory/procedural.js';
import { CheckpointManager } from '../src/memory/checkpoint.js';
import { ContextInjector } from '../src/memory/context-injector.js';
import { WorkingMemoryManager } from '../src/memory/working.js';
import type { EpisodicEntry, Goal, CheckpointState } from '../src/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function header(title: string): void {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function section(title: string): void {
  console.log(`\n  ── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`);
}

function bullet(text: string): void {
  console.log(`    • ${text}`);
}

// ─── Simulated Tasks ──────────────────────────────────────────────────────────

const tasks = [
  { desc: 'Built JWT authentication module', skills: ['auth', 'tdd'], outcome: 'success' as const, lesson: 'Always validate token expiry edge cases' },
  { desc: 'Implemented rate limiting middleware', skills: ['middleware', 'tdd'], outcome: 'success' as const, lesson: 'Use sliding window algorithm for accuracy' },
  { desc: 'Fixed database connection pooling bug', skills: ['debugging', 'database'], outcome: 'success' as const, lesson: 'Connection pools need health checks' },
  { desc: 'Deployed auth service to staging', skills: ['deploy', 'auth'], outcome: 'partial' as const, lesson: 'Always verify environment variables before deploy' },
  { desc: 'Wrote integration tests for auth flow', skills: ['tdd', 'auth'], outcome: 'success' as const, lesson: 'Test the full request lifecycle, not just unit functions' },
];

// ─── Main Demo ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const demoDir = mkdtempSync(join(tmpdir(), 'clawpowers-demo-'));

  try {
    const episodic = new EpisodicMemory(join(demoDir, 'episodic.jsonl'));
    const procedural = new ProceduralMemory(join(demoDir, 'procedural.json'));
    const checkpoints = new CheckpointManager(join(demoDir, 'checkpoints'));

    header('ClawPowers Agent — Memory System Demo');

    // ── Phase 1: Simulate 5 task completions ──
    section('Phase 1: Recording 5 Task Completions');

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]!;
      const taskId = `demo-task-${i + 1}`;

      // Write episodic entry
      const entry: EpisodicEntry = {
        taskId,
        timestamp: new Date(Date.now() - (tasks.length - i) * 86400000).toISOString(),
        description: task.desc,
        outcome: task.outcome,
        lessonsLearned: [task.lesson],
        skillsUsed: task.skills,
        durationMs: 3000 + Math.floor(Math.random() * 5000),
        tags: task.skills,
      };
      await episodic.append(entry);

      // Update procedural memory for each skill used
      for (const skill of task.skills) {
        await procedural.update(skill, {
          succeeded: task.outcome === 'success',
          durationMs: 1000 + Math.floor(Math.random() * 3000),
          taskId,
        });
      }

      const icon = task.outcome === 'success' ? '✓' : '◐';
      bullet(`${icon} Task ${i + 1}: ${task.desc} [${task.skills.join(', ')}] → ${task.outcome}`);
    }

    // ── Phase 2: Show memory state ──
    section('Phase 2: Memory State');

    const allEpisodic = await episodic.readAll();
    bullet(`Episodic entries: ${allEpisodic.length}`);

    const allProcedural = await procedural.load();
    bullet(`Procedural entries (skills tracked): ${allProcedural.length}`);

    console.log('\n    Skill Performance:');
    for (const entry of allProcedural) {
      const rate = Math.round(entry.successRate * 100);
      const bar = '█'.repeat(Math.round(rate / 10)) + '░'.repeat(10 - Math.round(rate / 10));
      console.log(`      ${entry.skillName.padEnd(15)} │ ${bar} ${rate}% │ ${entry.invocationCount} invocations`);
    }

    // ── Phase 3: Context Injection ──
    section('Phase 3: Context Injection for New Task');

    const injector = new ContextInjector(episodic, procedural);
    const newGoal: Goal = {
      taskId: 'new-task-1',
      description: 'Build OAuth2 integration for the authentication service',
      constraints: [],
      successCriteria: ['OAuth2 flow works end-to-end'],
      createdAt: new Date().toISOString(),
      source: 'cli',
    };

    bullet(`New task: "${newGoal.description}"`);

    const context = await injector.inject(newGoal, 2000);
    bullet(`Context entries injected: ${context.length}`);
    console.log('\n    Injected context (most relevant first):');
    for (const entry of context) {
      console.log(`      ${entry}`);
    }

    // ── Phase 4: Working Memory + Injection ──
    section('Phase 4: Working Memory with Context');

    const wmm = new WorkingMemoryManager();
    wmm.create(newGoal.taskId, newGoal);
    wmm.injectContext(context);

    const snapshot = wmm.getSnapshot();
    bullet(`Working memory task: ${snapshot.taskId}`);
    bullet(`Context window size: ${snapshot.contextWindow.length} entries`);
    bullet(`Estimated tokens: ~${Math.ceil(snapshot.contextWindow.join('').length / 4)}`);

    // ── Phase 5: Checkpoint Save/Resume ──
    section('Phase 5: Checkpoint Save & Resume');

    const checkpointState: CheckpointState = {
      taskId: newGoal.taskId,
      goal: newGoal,
      plan: {
        taskId: newGoal.taskId,
        steps: [
          { stepId: 'step-1', description: 'Configure OAuth2 provider', assignedSkills: ['auth'], status: 'complete', dependsOn: [], output: 'Provider configured', retryCount: 0, maxRetries: 3 },
          { stepId: 'step-2', description: 'Implement token exchange', assignedSkills: ['auth'], status: 'in-progress', dependsOn: ['step-1'], output: null, retryCount: 0, maxRetries: 3 },
          { stepId: 'step-3', description: 'Write tests', assignedSkills: ['tdd'], status: 'pending', dependsOn: ['step-2'], output: null, retryCount: 0, maxRetries: 3 },
        ],
        status: 'executing',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        parallelizable: false,
      },
      currentStepId: 'step-2',
      intermediateOutputs: { 'step-1': 'OAuth2 provider configured successfully' },
      workingMemory: snapshot,
      savedAt: new Date().toISOString(),
      agentStatus: 'executing',
    };

    await checkpoints.save(newGoal.taskId, checkpointState);
    bullet('Checkpoint saved');

    // Simulate resume
    const loaded = await checkpoints.load(newGoal.taskId);
    if (loaded) {
      bullet(`Checkpoint loaded: task ${loaded.taskId}`);
      bullet(`Resuming from step: ${loaded.currentStepId}`);
      bullet(`Intermediate outputs: ${Object.keys(loaded.intermediateOutputs).length} steps`);
      bullet(`Agent status: ${loaded.agentStatus}`);
    }

    // List incomplete checkpoints
    const incomplete = await checkpoints.listIncomplete();
    bullet(`Incomplete checkpoints: ${incomplete.length}`);
    for (const info of incomplete) {
      console.log(`      ${info.taskId.slice(0, 8)} │ "${info.description.slice(0, 40)}" │ saved: ${info.savedAt.slice(0, 10)}`);
    }

    // ── Phase 6: Search ──
    section('Phase 6: Episodic Memory Search');

    const authResults = await episodic.search('auth');
    bullet(`Search "auth": ${authResults.length} results`);
    for (const r of authResults.slice(0, 3)) {
      console.log(`      → ${r.description} (${r.outcome})`);
    }

    const dbResults = await episodic.search('database');
    bullet(`Search "database": ${dbResults.length} results`);

    header('Demo Complete');
    console.log(`  Demo data stored in: ${demoDir}`);
    console.log(`  Total episodic entries: ${allEpisodic.length}`);
    console.log(`  Total skills tracked: ${allProcedural.length}\n`);
  } finally {
    rmSync(demoDir, { recursive: true, force: true });
    console.log('  (Temp files cleaned up)\n');
  }
}

main().catch(console.error);
