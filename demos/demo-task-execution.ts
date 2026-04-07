#!/usr/bin/env npx tsx
/**
 * Demo: Full Task Execution Control Loop
 *
 * Demonstrates intake → plan → execute → review → complete cycle
 * with formatted output showing each phase.
 *
 * Run: npx tsx demos/demo-task-execution.ts
 */

import { parseTask } from '../src/agent/intake.js';
import { createPlan, approvePlan } from '../src/agent/planner.js';
import { executePlan } from '../src/agent/executor.js';
import { reviewOutput } from '../src/agent/reviewer.js';
import { completeTask } from '../src/agent/completion.js';
import { WorkingMemoryManager } from 'clawpowers';
import type { Step, WorkingMemory, SkillManifest } from 'clawpowers';

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

// ─── Mock Skills ──────────────────────────────────────────────────────────────

const skills: SkillManifest[] = [
  { name: 'tdd', description: 'Test driven development and testing', path: '/skills/tdd', requirements: null },
  { name: 'code-gen', description: 'Generate and write code', path: '/skills/code-gen', requirements: null },
  { name: 'debugging', description: 'Debug and fix issues', path: '/skills/debugging', requirements: null },
  { name: 'deploy', description: 'Deploy to production', path: '/skills/deploy', requirements: null },
];

// ─── Simulated Step Runner ────────────────────────────────────────────────────

let stepCount = 0;
async function simulatedRunner(step: Step, _context: WorkingMemory): Promise<{ success: boolean; output: string }> {
  stepCount++;
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 50));

  const skills = step.assignedSkills.length > 0 ? step.assignedSkills.join(', ') : 'general';
  return {
    success: true,
    output: `Completed: ${step.description} [skills: ${skills}]`,
  };
}

// ─── Main Demo ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  header('ClawPowers Agent — Task Execution Demo');

  const rawTask = `
1. Set up the project structure with TypeScript configuration
2. Write the core authentication module with JWT tokens
3. Add input validation using Zod schemas
4. Write unit tests for all auth functions. Tests pass
5. Deploy to staging environment
  `.trim();

  // ── Phase 1: Intake ──
  section('Phase 1: Intake');
  console.log(`    Raw task: "${rawTask.split('\n')[0]}..."`);

  const goal = parseTask(rawTask, 'cli');
  bullet(`Task ID: ${goal.taskId.slice(0, 8)}...`);
  bullet(`Constraints found: ${goal.constraints.length}`);
  bullet(`Success criteria: ${goal.successCriteria.length}`);
  for (const c of goal.successCriteria) {
    console.log(`      → ${c.slice(0, 80)}`);
  }

  // ── Phase 2: Planning ──
  section('Phase 2: Planning');
  const plan = createPlan(goal, skills);
  bullet(`Steps generated: ${plan.steps.length}`);
  bullet(`Status: ${plan.status}`);

  for (const step of plan.steps) {
    const deps = step.dependsOn.length > 0
      ? ` (depends on: ${step.dependsOn.map(d => d.slice(0, 8)).join(', ')})`
      : ' (no deps)';
    const assigned = step.assignedSkills.length > 0
      ? ` [${step.assignedSkills.join(', ')}]`
      : '';
    console.log(`      ${step.stepId.slice(0, 8)} │ ${step.description.slice(0, 50)}${assigned}${deps}`);
  }

  const approved = approvePlan(plan);
  bullet(`Plan approved at: ${approved.approvedAt}`);

  // ── Phase 3: Execution ──
  section('Phase 3: Execution');
  const wmm = new WorkingMemoryManager();
  const memory = wmm.create(goal.taskId, goal);
  bullet(`Working memory initialized for task ${goal.taskId.slice(0, 8)}`);

  stepCount = 0;
  const planResult = await executePlan(approved, memory, simulatedRunner);

  bullet(`Status: ${planResult.status}`);
  bullet(`Completed: ${planResult.completedSteps}/${plan.steps.length}`);
  bullet(`Failed: ${planResult.failedSteps}`);
  bullet(`Duration: ${planResult.durationMs}ms`);

  for (const result of planResult.stepResults) {
    const icon = result.status === 'success' ? '✓' : '✗';
    console.log(`      ${icon} ${result.stepId.slice(0, 8)} — ${result.output.slice(0, 60)}`);
  }

  // ── Phase 4: Review ──
  section('Phase 4: Review');
  const review = reviewOutput(goal, planResult);
  bullet(`Review passed: ${review.passed}`);

  for (const criterion of review.criteria) {
    const icon = criterion.met ? '✓' : '✗';
    console.log(`      ${icon} ${criterion.criterion.slice(0, 60)}`);
    console.log(`        Evidence: ${criterion.evidence.slice(0, 60)}`);
  }

  if (review.suggestions.length > 0) {
    bullet('Suggestions:');
    for (const s of review.suggestions) {
      console.log(`        → ${s.slice(0, 70)}`);
    }
  }

  // ── Phase 5: Completion ──
  section('Phase 5: Completion');
  const completion = completeTask(goal, planResult, review);
  bullet(`Outcome: ${completion.outcome}`);
  bullet(`Summary: ${completion.summary}`);
  bullet(`Skills used: ${completion.skillsUsed.join(', ') || 'none detected'}`);

  if (completion.lessonsLearned.length > 0) {
    bullet('Lessons learned:');
    for (const lesson of completion.lessonsLearned) {
      console.log(`        → ${lesson.slice(0, 70)}`);
    }
  }

  header('Demo Complete');
  console.log(`  Total steps executed: ${stepCount}`);
  console.log(`  Final outcome: ${completion.outcome}\n`);
}

main().catch(console.error);
