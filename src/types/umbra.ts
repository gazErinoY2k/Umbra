/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ToolId = 'home' | 'deadbox' | 'emf' | 'evp' | 'sls' | 'talker' | 'journal' | 'casefile';

export interface InvestigationSession {
  id: number;
  name: string;
  start: number;
  end?: number;
  notes?: string;
}

export interface JournalEntry {
  id: string;
  t: number;
  tool: string;
  text: string;
  s?: number; // session id
}

export interface EVPClip {
  id: string;
  sessionNum: number;
  timestamp: string;
  durationSeconds: number;
  anomalies: string[];
  audioUrl: string;
}

export interface SLSPhoto {
  id: string;
  timestamp: string;
  dataUrl: string;
  figuresCount: number;
  types: string[];
}
