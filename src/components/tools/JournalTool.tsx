/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, Check, FileText } from 'lucide-react';
import { JournalService } from '../../services/journalStorage';
import { JournalEntry, InvestigationSession, ToolId } from '../../types/umbra';

interface Props {
  onNavigate: (tool: ToolId) => void;
  onSelectCaseFile: (sessionId: number) => void;
}

export const JournalTool: React.FC<Props> = ({ onNavigate, onSelectCaseFile }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [sessions, setSessions] = useState<InvestigationSession[]>([]);
  const [autoLog, setAutoLog] = useState(true);
  const [noteInput, setNoteInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [armClear, setArmClear] = useState(false);

  const refresh = () => {
    setEntries(JournalService.getEntries());
    setSessions(JournalService.getSessions());
    setAutoLog(JournalService.isAutoLog());
  };

  useEffect(() => {
    refresh();
    const unsubscribe = JournalService.subscribe(refresh);
    return () => unsubscribe();
  }, []);

  const handleAddNote = (e?: React.FormEvent) => {
    e?.preventDefault();
    const note = noteInput.trim();
    if (!note) return;
    JournalService.addEntry('Manual Note', note, true);
    setNoteInput('');
  };

  const toggleAutoLog = () => {
    JournalService.setAutoLog(!autoLog);
  };

  const handleCopyAll = () => {
    const formatted = entries
      .map(
        e =>
          `${new Date(e.t).toLocaleDateString()} ${new Date(e.t).toLocaleTimeString()} · [${e.tool}] ${e.text}`
      )
      .join('\n');
    try {
      navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleClearAll = () => {
    if (!armClear) {
      setArmClear(true);
      setTimeout(() => setArmClear(false), 3000);
    } else {
      JournalService.clearAll();
      setArmClear(false);
    }
  };

  const handleDeleteEntry = (id: string) => {
    JournalService.deleteEntry(id);
  };

  const formatTime = (t: number) => {
    return new Date(t).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group entries by session ID
  const groupedEntries: { [key: number]: JournalEntry[] } = {};
  entries.forEach(e => {
    const sId = e.s || 0;
    if (!groupedEntries[sId]) groupedEntries[sId] = [];
    groupedEntries[sId].push(e);
  });

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Header controls & Note creation */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-5 shadow-lg space-y-4">
        <form onSubmit={handleAddNote} className="flex items-center gap-2">
          <input
            type="text"
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            placeholder="Add an observational note (e.g. Temperature dropped in hall)"
            className="flex-1 bg-[#0a0c10] border border-[#262c38] rounded-full px-4 py-2.5 text-sm text-[#e9e3d3] placeholder-[#8b8fa0]/60 focus:outline-none focus:border-[#c0a062] transition"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full bg-[#c0a062] hover:bg-[#d4b679] text-[#0b0d11] font-medium text-xs tracking-wider uppercase transition shadow flex items-center gap-1.5 flex-none"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#262c38]">
          <button
            onClick={toggleAutoLog}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${
              autoLog
                ? 'border-[#62b3a8] bg-[#62b3a8]/15 text-[#62b3a8]'
                : 'border-[#262c38] text-[#8b8fa0] hover:text-[#e9e3d3]'
            }`}
          >
            Auto-Log: {autoLog ? 'Active' : 'Paused'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0a0c10] border border-[#262c38] hover:border-[#c0a062] text-xs text-[#e9e3d3] transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#62b3a8]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy All'}
            </button>

            <button
              onClick={handleClearAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition ${
                armClear
                  ? 'border-[#d0583c] bg-[#d0583c] text-white'
                  : 'bg-[#0a0c10] border-[#262c38] hover:border-[#d0583c] text-[#8b8fa0] hover:text-[#d0583c]'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {armClear ? 'Tap Again to Clear' : 'Clear All'}
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Logs */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-8 text-center text-xs text-[#8b8fa0]/60">
            No entries recorded yet. Sensor anomalies, words, and notes will automatically appear here.
          </div>
        ) : (
          <>
            {/* Show sessions in reverse order */}
            {sessions
              .slice()
              .reverse()
              .map(session => {
                const sessionEntries = groupedEntries[session.id] || [];
                return (
                  <div
                    key={session.id}
                    className="bg-[#141820] border border-[#262c38] rounded-2xl overflow-hidden shadow-lg"
                  >
                    <div className="bg-[#10131a] px-5 py-3 border-b border-[#262c38] flex items-center justify-between">
                      <div>
                        <div className="font-cormorant text-xl text-[#c0a062] font-medium leading-none">
                          {session.name}
                        </div>
                        <div className="text-[11px] text-[#8b8fa0] font-tech mt-1">
                          {formatTime(session.start)} {session.end ? `· Concluded` : '· In Progress'}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectCaseFile(session.id);
                          onNavigate('casefile');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c0a062]/10 border border-[#c0a062]/40 hover:bg-[#c0a062]/20 text-[#c0a062] text-xs font-medium transition"
                      >
                        <FileText className="w-3.5 h-3.5" /> Dossier
                      </button>
                    </div>

                    <div className="p-4 space-y-2">
                      {sessionEntries.length === 0 ? (
                        <div className="text-xs text-[#8b8fa0]/60 py-2">
                          No events recorded for this session.
                        </div>
                      ) : (
                        sessionEntries.map(entry => (
                          <div
                            key={entry.id}
                            className="flex items-start justify-between gap-3 py-2 border-b border-[#262c38]/40 text-xs last:border-0"
                          >
                            <div className="space-y-0.5">
                              <span className="font-medium text-[#e9e3d3] bg-[#0a0c10] px-2 py-0.5 rounded border border-[#262c38]">
                                {entry.tool}
                              </span>
                              <p className="text-[#8b8fa0] text-[13px] pt-1">{entry.text}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-none pt-0.5">
                              <span className="text-[10px] text-[#8b8fa0] font-tech whitespace-nowrap">
                                {formatTime(entry.t)}
                              </span>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="text-[#8b8fa0] hover:text-[#d0583c] transition px-1"
                                title="Delete note"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}

            {/* Unassigned Entries */}
            {groupedEntries[0] && groupedEntries[0].length > 0 && (
              <div className="bg-[#141820] border border-[#262c38] rounded-2xl overflow-hidden shadow-lg">
                <div className="bg-[#10131a] px-5 py-3 border-b border-[#262c38]">
                  <div className="font-cormorant text-xl text-[#e9e3d3] font-medium leading-none">
                    Unassigned Sightings
                  </div>
                  <div className="text-[11px] text-[#8b8fa0] font-tech mt-1">
                    Activity logged outside of an official session
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {groupedEntries[0].map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-3 py-2 border-b border-[#262c38]/40 text-xs last:border-0"
                    >
                      <div className="space-y-0.5">
                        <span className="font-medium text-[#e9e3d3] bg-[#0a0c10] px-2 py-0.5 rounded border border-[#262c38]">
                          {entry.tool}
                        </span>
                        <p className="text-[#8b8fa0] text-[13px] pt-1">{entry.text}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-none pt-0.5">
                        <span className="text-[10px] text-[#8b8fa0] font-tech whitespace-nowrap">
                          {formatTime(entry.t)}
                        </span>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-[#8b8fa0] hover:text-[#d0583c] transition px-1"
                          title="Delete note"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
