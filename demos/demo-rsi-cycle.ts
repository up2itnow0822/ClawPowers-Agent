#!/usr/bin/env npx tsx
/**
 * Demo: RSI (Recursive Self-Improvement) Cycle
 *
 * Demonstrates metrics collection, hypothesis generation,
 * mutation creation, A/B testing, and tier enforcement.
 *
 * Run: npx tsx demos/demo-rsi-cycle.ts
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  MetricsCollector,
  HypothesisEngine,
  MutationEngine,
  ABTestManager,
  RSIAuditLog,
} from 'clawpowers';
import type { TaskMetrics, SkillMetrics } from 'clawpowers';

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

// ─── Main Demo ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const demoDir = mkdtempSync(join(tmpdir(), 'clawpowers-rsi-'));

  try {
    const metrics = new MetricsCollector(
      join(demoDir, 'task-metrics.jsonl'),
      join(demoDir, 'skill-metrics.jsonl')
    );
    const hypothesisEngine = new HypothesisEngine();
    const mutationEngine = new MutationEngine(join(demoDir, 'mutations.jsonl'));
    const abTestManager = new ABTestManager();
    const auditLog = new RSIAuditLog(join(demoDir, 'audit.jsonl'));

    header('ClawPowers Agent — RSI Cycle Demo');

    // ── Phase 1: Collect Metrics ──
    section('Phase 1: Collecting Metrics (15 tasks)');

    const skillNames = ['code-gen', 'tdd', 'debugging', 'deploy'];

    for (let i = 0; i < 15; i++) {
      const usedSkills = [skillNames[i % 4]!, skillNames[(i + 1) % 4]!];

      const taskMetric: TaskMetrics = {
        taskId: `metric-task-${i}`,
        timestamp: new Date(Date.now() - (15 - i) * 3600000).toISOString(),
        durationMs: 3000 + Math.floor(Math.random() * 7000),
        stepCount: 3,
        stepsCompleted: i < 4 ? 2 : 3,
        stepsFailed: i < 4 ? 1 : 0,
        retryCount: i < 4 ? 2 : 0,
        skillsUsed: usedSkills,
        outcome: i < 4 ? 'failure' : 'success',
        memoryEntriesCreated: 1,
      };
      await metrics.recordTaskMetrics(taskMetric);

      // Record per-skill metrics
      for (const skill of skillNames) {
        const skillMetric: SkillMetrics = {
          skillName: skill,
          timestamp: taskMetric.timestamp,
          invoked: usedSkills.includes(skill),
          succeeded: usedSkills.includes(skill) ? i >= 4 : false,
          durationMs: skill === 'deploy' ? 5000 : 1500,
          taskId: taskMetric.taskId,
          mutationActive: false,
        };
        await metrics.recordSkillMetrics(skillMetric);
      }

      const icon = i < 4 ? '✗' : '✓';
      process.stdout.write(`    ${icon}`);
    }
    console.log('');

    // Show aggregated stats
    console.log('\n    Skill Performance Summary:');
    for (const skill of skillNames) {
      const stats = await metrics.getAggregatedSkillStats(skill);
      const rate = Math.round(stats.successRate * 100);
      const bar = '█'.repeat(Math.round(rate / 10)) + '░'.repeat(10 - Math.round(rate / 10));
      console.log(`      ${skill.padEnd(12)} │ ${bar} ${rate}% │ ${stats.totalInvocations} inv │ trend: ${stats.trendDirection}`);
    }

    // ── Phase 2: Hypothesis Generation ──
    section('Phase 2: Hypothesis Generation');

    const allStats = await Promise.all(
      skillNames.map(s => metrics.getAggregatedSkillStats(s))
    );
    const taskHistory = await metrics.getTaskHistory();
    bullet(`Task history: ${taskHistory.length} entries`);

    const hypotheses = hypothesisEngine.analyze(allStats, taskHistory);
    bullet(`Hypotheses generated: ${hypotheses.length}`);

    for (const h of hypotheses) {
      console.log(`      [${h.tier}] ${h.description}`);
      console.log(`            Confidence: ${Math.round(h.confidence * 100)}% │ Expected improvement: ${h.expectedImprovement}%`);
      for (const e of h.evidence) {
        console.log(`            Evidence: ${e}`);
      }
    }

    // ── Phase 3: Mutation Creation ──
    section('Phase 3: Mutation Creation');

    if (hypotheses.length > 0) {
      const targetHypothesis = hypotheses[0]!;
      const mutation = mutationEngine.createMutation(targetHypothesis);
      bullet(`Mutation created: ${mutation.mutationId.slice(0, 8)}`);
      bullet(`Tier: ${mutation.tier}`);
      bullet(`Skill: ${mutation.skillName}`);
      bullet(`Status: ${mutation.status}`);

      // ── Phase 4: Tier Enforcement ──
      section('Phase 4: Tier Enforcement');

      // T1 auto-apply
      if (mutation.tier === 'T1' || mutation.tier === 'T2') {
        await mutationEngine.applyMutation(mutation);
        bullet(`✓ ${mutation.tier} mutation auto-applied`);

        await auditLog.log({
          timestamp: new Date().toISOString(),
          action: `${mutation.tier}-auto-applied`,
          skillName: mutation.skillName,
          mutationId: mutation.mutationId,
          hypothesis: targetHypothesis.description,
          metrics: { baseline: allStats[0]!.successRate, current: 0, delta: 0 },
          decision: 'auto-applied',
        });
      }

      // Demonstrate T4 blocking
      bullet('Attempting T4 mutation (should be blocked):');
      try {
        const t4Mutation = mutationEngine.createMutation({
          ...targetHypothesis,
          hypothesisId: 'hyp-t4-demo',
          tier: 'T4',
          skillName: 'orchestrator',
        });
        await mutationEngine.applyMutation(t4Mutation);
        bullet('  ERROR: T4 should have been blocked!');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        bullet(`  ✓ Blocked: ${msg.slice(0, 70)}`);
      }

      // Demonstrate safety invariant blocking
      bullet('Attempting safety invariant mutation (should be blocked):');
      try {
        mutationEngine.createMutation({
          ...targetHypothesis,
          hypothesisId: 'hyp-safety-demo',
          skillName: 'Spending limits and SpendingPolicy',
        });
        bullet('  ERROR: Safety invariant should have been blocked!');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        bullet(`  ✓ Blocked: ${msg.slice(0, 70)}`);
      }

      // ── Phase 5: A/B Testing ──
      section('Phase 5: A/B Testing');

      if (mutation.tier !== 'T4') {
        const baselineStats = allStats.find(s => s.skillName === mutation.skillName) ?? allStats[0]!;
        const test = abTestManager.startTest(mutation, baselineStats);
        bullet(`A/B test started: ${test.testId.slice(0, 8)}`);
        bullet(`Baseline success rate: ${Math.round(baselineStats.successRate * 100)}%`);

        // Simulate improved results
        console.log('\n    Recording A/B test results:');
        for (let i = 0; i < 6; i++) {
          const outcome = Math.random() > 0.2 ? 'success' : 'failure';
          abTestManager.recordResult(test.testId, {
            taskId: `ab-task-${i}`,
            timestamp: new Date().toISOString(),
            durationMs: 2000,
            stepCount: 2,
            stepsCompleted: outcome === 'success' ? 2 : 1,
            stepsFailed: outcome === 'success' ? 0 : 1,
            retryCount: 0,
            skillsUsed: [mutation.skillName],
            outcome: outcome as 'success' | 'failure',
            memoryEntriesCreated: 1,
          });
          const icon = outcome === 'success' ? '✓' : '✗';
          process.stdout.write(`      ${icon}`);
        }
        console.log('');

        const result = abTestManager.evaluateTest(test.testId);
        bullet(`Decision: ${result.decision}`);
        bullet(`Improvement: ${Math.round(result.improvement * 100)}%`);
        bullet(`Confidence: ${Math.round(result.confidence * 100)}%`);

        await auditLog.log({
          timestamp: new Date().toISOString(),
          action: `ab-test-${result.decision}`,
          skillName: mutation.skillName,
          mutationId: mutation.mutationId,
          hypothesis: targetHypothesis.description,
          metrics: { baseline: baselineStats.successRate, current: result.improvement, delta: result.improvement - baselineStats.successRate },
          decision: result.decision,
        });
      }
    } else {
      bullet('No hypotheses generated (insufficient data or no issues detected)');
    }

    // ── Phase 6: Audit Trail ──
    section('Phase 6: Audit Trail');

    const auditHistory = await auditLog.getHistory();
    bullet(`Total audit entries: ${auditHistory.length}`);
    for (const entry of auditHistory) {
      console.log(`      [${entry.timestamp.slice(11, 19)}] ${entry.action} │ ${entry.skillName} │ ${entry.decision}`);
    }

    header('Demo Complete');
    console.log(`  Metrics collected: ${taskHistory.length} tasks`);
    console.log(`  Hypotheses generated: ${hypotheses.length}`);
    console.log(`  Audit entries: ${auditHistory.length}\n`);
  } finally {
    rmSync(demoDir, { recursive: true, force: true });
    console.log('  (Temp files cleaned up)\n');
  }
}

main().catch(console.error);
