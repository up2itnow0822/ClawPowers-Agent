/**
 * SwarmMemory — Shared memory store for parallel swarm execution.
 * Agents can share findings and query across the swarm during a run.
 */

import type { SwarmMemoryEntry, SwarmMemoryHandle } from 'clawpowers';

export class SwarmMemory implements SwarmMemoryHandle {
  private readonly entries: Map<string, SwarmMemoryEntry> = new Map();

  /**
   * Share a finding with the swarm.
   */
  share(agentId: string, key: string, value: string, tags: string[] = []): void {
    this.entries.set(key, {
      agent_id: agentId,
      key,
      value,
      tags,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get a specific entry by key.
   */
  get(key: string): SwarmMemoryEntry | undefined {
    return this.entries.get(key);
  }

  /**
   * Query entries by tags and/or keyword.
   */
  query(options?: { tags?: string[]; keyword?: string }): SwarmMemoryEntry[] {
    const all = [...this.entries.values()];
    if (!options) return all;

    return all.filter((entry) => {
      if (options.tags && options.tags.length > 0) {
        const hasMatchingTag = options.tags.some((tag) => entry.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }
      if (options.keyword) {
        const kw = options.keyword.toLowerCase();
        const inKey = entry.key.toLowerCase().includes(kw);
        const inValue = entry.value.toLowerCase().includes(kw);
        if (!inKey && !inValue) return false;
      }
      return true;
    });
  }

  /**
   * Get all entries.
   */
  getAll(): SwarmMemoryEntry[] {
    return [...this.entries.values()];
  }

  /**
   * Clear all entries (used between runs).
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Number of entries stored.
   */
  get size(): number {
    return this.entries.size;
  }
}
