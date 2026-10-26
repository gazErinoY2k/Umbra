/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvestigationSession, JournalEntry } from '../types/umbra';

const SS_KEY = 'umbra.ss';
const J_KEY = 'umbra.j';
const AUTO_KEY = 'umbra.auto';

export class JournalService {
  private static listeners: Array<() => void> = [];

  public static subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private static notify(): void {
    this.listeners.forEach(fn => fn());
  }

  public static getSessions(): InvestigationSession[] {
    try {
      return JSON.parse(localStorage.getItem(SS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  public static saveSessions(sessions: InvestigationSession[]): void {
    try {
      localStorage.setItem(SS_KEY, JSON.stringify(sessions));
      this.notify();
    } catch {
      // Ignore
    }
  }

  public static getCurrentSession(): InvestigationSession | null {
    const list = this.getSessions();
    return list.find(s => !s.end) || null;
  }

  public static beginSession(locationName: string): InvestigationSession {
    const list = this.getSessions();
    const newSession: InvestigationSession = {
      id: Date.now(),
      name: locationName.trim() || 'Untitled Location',
      start: Date.now(),
    };
    list.push(newSession);
    this.saveSessions(list);
    this.addEntry('Session', `Began paranormal investigation at: ${newSession.name}`, true);
    return newSession;
  }

  public static endSession(): InvestigationSession | null {
    const list = this.getSessions();
    const current = list.find(s => !s.end);
    if (current) {
      current.end = Date.now();
      this.saveSessions(list);
      this.addEntry('Session', `Concluded paranormal investigation at: ${current.name}`, true);
      return current;
    }
    return null;
  }

  public static isAutoLog(): boolean {
    try {
      return localStorage.getItem(AUTO_KEY) !== '0';
    } catch {
      return true;
    }
  }

  public static setAutoLog(enabled: boolean): void {
    try {
      localStorage.setItem(AUTO_KEY, enabled ? '1' : '0');
      this.notify();
    } catch {
      // Ignore
    }
  }

  public static getEntries(): JournalEntry[] {
    try {
      return JSON.parse(localStorage.getItem(J_KEY) || '[]');
    } catch {
      return [];
    }
  }

  public static saveEntries(entries: JournalEntry[]): void {
    try {
      localStorage.setItem(J_KEY, JSON.stringify(entries.slice(0, 400)));
      this.notify();
    } catch {
      // Ignore
    }
  }

  public static addEntry(tool: string, text: string, manual: boolean = false): void {
    if (!manual && !this.isAutoLog()) return;
    const current = this.getCurrentSession();
    const entries = this.getEntries();
    const newEntry: JournalEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      t: Date.now(),
      tool,
      text,
      s: current ? current.id : undefined,
    };
    entries.unshift(newEntry);
    this.saveEntries(entries);
  }

  public static deleteEntry(id: string): void {
    const entries = this.getEntries().filter(e => e.id !== id);
    this.saveEntries(entries);
  }

  public static clearAll(): void {
    this.saveEntries([]);
  }
}
