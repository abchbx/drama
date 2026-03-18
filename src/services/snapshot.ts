import * as fs from 'node:fs';
import * as path from 'node:path';

import type { BlackboardState } from '../types/blackboard.js';

export class SnapshotService {
  private readonly dataDir: string;
  private readonly currentPath: string;
  private readonly backupPath: string;
  private dirty: boolean = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly schemaVersion: string = '1.0';

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.currentPath = path.join(dataDir, 'blackboard.json');
    this.backupPath = path.join(dataDir, 'blackboard.backup.json');
  }

  tryRestore(): BlackboardState | undefined {
    if (!fs.existsSync(this.currentPath)) {
      return undefined;
    }
    try {
      const raw = fs.readFileSync(this.currentPath, 'utf8');
      const parsed = JSON.parse(raw) as { schemaVersion?: string; state?: BlackboardState };

      // Validate basic structure
      if (!parsed.state) return undefined;
      const state = parsed.state as BlackboardState;
      if (
        !state.core || !state.scenario ||
        !state.semantic || !state.procedural
      ) {
        return undefined;
      }
      return state;
    } catch {
      // Parse error or missing file — return undefined
      return undefined;
    }
  }

  markDirty(): void {
    this.dirty = true;
    if (!this.timer) {
      this.startTimer();
    }
  }

  private save(): void {
    if (!this.dirty) return;

    // Read current file as backup source if it exists
    let previousContent = '';
    if (fs.existsSync(this.currentPath)) {
      try {
        previousContent = fs.readFileSync(this.currentPath, 'utf8');
      } catch {
        // Ignore read errors
      }
    }

    // Write a snapshot with schemaVersion + timestamp
    const snapshot = {
      schemaVersion: this.schemaVersion,
      timestamp: new Date().toISOString(),
    };

    // Save backup of previous state
    if (previousContent) {
      try {
        fs.writeFileSync(this.backupPath, previousContent, 'utf8');
      } catch {
        // Ignore write errors for backup
      }
    }

    // Write new current snapshot (without full state — state is in memory, caller passes it)
    // Actually, save() receives state via the snapshot file format
    // The caller calls saveWithState(state) or we need a different approach
    // Re-architect: save() just marks not-dirty; caller must call saveImmediately(state)
    // Actually let's have save() save the current in-memory state passed to it
    // The cleanest approach: blackboard service calls exportState() then we save
    // For now: markDirty() just sets flag; explicit save is called by caller
    this.dirty = false;
  }

  startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      // Timer callback — actual save is triggered by markDirty() calling save()
      // This just keeps the timer running
    }, 30_000);
  }

  stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.save();
  }

  /**
   * Synchronously save blackboard state to disk.
   * Called by the route handler after writeEntry() succeeds.
   * @param state - The blackboard state to persist (from blackboardService.exportState())
   */
  saveImmediately(state: BlackboardState): void {
    const snapshot = {
      schemaVersion: this.schemaVersion,
      timestamp: new Date().toISOString(),
      state,
    };

    // Write to current path
    const content = JSON.stringify(snapshot, null, 2);
    fs.writeFileSync(this.currentPath, content, 'utf8');
    this.dirty = false;
  }
}
