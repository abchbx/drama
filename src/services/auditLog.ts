import * as fs from 'node:fs';
import * as path from 'node:path';

import type { AuditLogEntry } from '../types/blackboard.js';

export class AuditLogService {
  private readonly dataDir: string;
  private currentDate: string = '';
  private currentStream: fs.WriteStream | null = null;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private getFilename(date: string): string {
    return path.join(this.dataDir, `audit-${date}.jsonl`);
  }

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private rotate(date: string): void {
    if (this.currentStream) {
      this.currentStream.end();
      this.currentStream = null;
    }
    this.currentDate = date;
    // Ensure the file is opened in append mode
    this.currentStream = fs.createWriteStream(this.getFilename(date), { flags: 'a' });
  }

  private ensureStream(): void {
    const today = this.getTodayDate();
    if (today !== this.currentDate || !this.currentStream) {
      this.rotate(today);
    }
  }

  async write(
    entry: Omit<AuditLogEntry, 'entryContentHash'>,
    contentHash: string,
  ): Promise<void> {
    this.ensureStream();
    const record: AuditLogEntry = { ...entry, entryContentHash: contentHash };
    const line = JSON.stringify(record) + '\n';
    // fs.createWriteStream with 'a' flag is non-blocking for the caller
    // but we need to ensure the write is flushed
    if (this.currentStream) {
      this.currentStream.write(line);
    }
  }

  async query(filters: {
    agentId?: string;
    layer?: string;
    since?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    const today = this.getTodayDate();
    const entries: AuditLogEntry[] = [];

    // Read today's file and optionally yesterday's for date boundary
    const datesToRead = [today];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    datesToRead.push(yesterday.toISOString().slice(0, 10));

    for (const date of Array.from(new Set(datesToRead))) {
      const filename = this.getFilename(date);
      if (!fs.existsSync(filename)) continue;

      const content = fs.readFileSync(filename, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditLogEntry;

          // Apply filters
          if (filters.agentId && entry.agentId !== filters.agentId) continue;
          if (filters.layer && entry.layer !== filters.layer) continue;
          if (filters.since && entry.timestamp < filters.since) continue;

          entries.push(entry);
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Return most recent first, limit to requested count
    entries.reverse();
    const limit = filters.limit ?? 1000;
    return entries.slice(0, limit);
  }

  async close(): Promise<void> {
    if (this.currentStream) {
      this.currentStream.end();
      this.currentStream = null;
    }
  }
}
