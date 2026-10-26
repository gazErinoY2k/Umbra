/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Copy, Printer, Download, Check, ShieldAlert, ArrowLeft } from 'lucide-react';
import { JournalService } from '../../services/journalStorage';
import { InvestigationSession, JournalEntry, ToolId } from '../../types/umbra';

interface Props {
  sessionId?: number | null;
  onNavigate: (tool: ToolId) => void;
}

export const CaseFileTool: React.FC<Props> = ({ sessionId, onNavigate }) => {
  const [sessions, setSessions] = useState<InvestigationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(sessionId || null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const list = JournalService.getSessions();
    setSessions(list);
    if (!selectedSessionId && list.length > 0) {
      setSelectedSessionId(list[list.length - 1].id);
    }
  }, [sessionId, selectedSessionId]);

  const currentSession = sessions.find(s => s.id === selectedSessionId) || null;
  const entries = JournalService.getEntries().filter(e =>
    selectedSessionId ? e.s === selectedSessionId : true
  );

  const formatDateTime = (t: number) => {
    return new Date(t).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatDuration = (start: number, end?: number) => {
    const ms = Math.max(0, (end || Date.now()) - start);
    const sec = Math.floor(ms / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  // Summarize tools count
  const toolCounts: { [tool: string]: number } = {};
  entries.forEach(e => {
    if (e.tool !== 'Session') {
      toolCounts[e.tool] = (toolCounts[e.tool] || 0) + 1;
    }
  });

  const generateReportText = () => {
    const title = currentSession ? currentSession.name : 'All Recorded Activity';
    const lines = [
      `======================================================`,
      `          UMBRA PARANORMAL INVESTIGATION DOSSIER      `,
      `======================================================`,
      `Location:  ${title}`,
      currentSession ? `Started:   ${formatDateTime(currentSession.start)}` : null,
      currentSession
        ? `Concluded: ${currentSession.end ? formatDateTime(currentSession.end) : 'In Progress'}`
        : null,
      currentSession ? `Duration:  ${formatDuration(currentSession.start, currentSession.end)}` : null,
      `Total Events Logged: ${entries.length}`,
      ``,
      `---------------- SUMMARY OF ANOMALIES ----------------`,
      ...Object.entries(toolCounts).map(([tool, count]) => `• ${tool.padEnd(20)} : ${count} occurrence(s)`),
      ``,
      `---------------- CHRONOLOGICAL TIMELINE --------------`,
      ...entries
        .slice()
        .reverse()
        .map(
          e =>
            `[${new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] [${e.tool}] ${e.text}`
        ),
      `======================================================`,
    ].filter(l => l !== null);

    return lines.join('\n');
  };

  const handleCopyReport = () => {
    const text = generateReportText();
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownloadMarkdown = () => {
    const text = generateReportText();
    const title = (currentSession ? currentSession.name : 'case_file').toLowerCase().replace(/\s+/g, '_');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `umbra_${title}_dossier.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-10">
      {/* Session Switcher & Navigation Header */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          onClick={() => onNavigate('journal')}
          className="flex items-center gap-1.5 text-xs text-[#8b8fa0] hover:text-[#e9e3d3] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Journal
        </button>

        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8b8fa0]">Session:</span>
            <select
              value={selectedSessionId || ''}
              onChange={e => setSelectedSessionId(Number(e.target.value))}
              className="bg-[#0a0c10] border border-[#262c38] rounded-lg px-2.5 py-1 text-xs text-[#e9e3d3] focus:outline-none focus:border-[#c0a062]"
            >
              {sessions
                .slice()
                .reverse()
                .map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({new Date(s.start).toLocaleDateString()})
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Official Dossier Parchment Card */}
      <div className="bg-[#141820] print:bg-white print:text-black border border-[#c0a062]/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Seal watermark */}
        <div className="flex items-center justify-between border-b border-[#262c38] pb-5 mb-5">
          <div>
            <div className="text-[10px] tracking-widest text-[#c0a062] uppercase font-tech">
              Confidential Paranormal Report
            </div>
            <h1 className="font-cormorant text-3xl sm:text-4xl font-medium text-[#e9e3d3] print:text-black mt-1">
              Case File Dossier
            </h1>
          </div>

          <div className="w-12 h-12 rounded-full border border-[#c0a062]/50 flex items-center justify-center p-2 text-[#c0a062]">
            <svg viewBox="0 0 74 74" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="37" cy="37" r="34" />
              <path d="M37 14c-11 0-17 9-17 20v26l6-5 5 5 6-5 6 5 5-5 6 5V34c0-11-6-20-17-20z" />
            </svg>
          </div>
        </div>

        {/* Location & Metadata Specs */}
        <div className="grid grid-cols-2 gap-4 py-3 bg-[#0a0c10] print:bg-neutral-100 rounded-xl p-4 border border-[#262c38] print:border-neutral-300 text-xs">
          <div>
            <span className="text-[#8b8fa0] uppercase tracking-wider text-[10px] block">Location</span>
            <span className="font-cormorant text-xl text-[#e9e3d3] print:text-black font-medium">
              {currentSession ? currentSession.name : 'Unassigned Notes'}
            </span>
          </div>

          <div>
            <span className="text-[#8b8fa0] uppercase tracking-wider text-[10px] block">Investigation Duration</span>
            <span className="font-tech text-sm text-[#62b3a8] font-medium">
              {currentSession ? formatDuration(currentSession.start, currentSession.end) : 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-[#8b8fa0] uppercase tracking-wider text-[10px] block">Date Commenced</span>
            <span className="text-[#e9e3d3] print:text-black font-tech">
              {currentSession ? formatDateTime(currentSession.start) : 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-[#8b8fa0] uppercase tracking-wider text-[10px] block">Status</span>
            <span className="text-[#e9e3d3] print:text-black font-tech">
              {currentSession ? (currentSession.end ? 'Completed & Sealed' : 'Investigation Active') : 'Archive'}
            </span>
          </div>
        </div>

        {/* Breakdown of Anomalies */}
        <div className="mt-6">
          <h3 className="font-cormorant text-xl text-[#c0a062] font-medium mb-2">
            Anomalous Signatures Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.keys(toolCounts).length === 0 ? (
              <div className="col-span-4 text-xs text-[#8b8fa0] py-2">
                No signatures recorded.
              </div>
            ) : (
              Object.entries(toolCounts).map(([tool, count]) => (
                <div
                  key={tool}
                  className="bg-[#0f1218] print:bg-neutral-50 border border-[#262c38] rounded-lg p-2.5 text-center"
                >
                  <span className="text-[10px] text-[#8b8fa0] block truncate">{tool}</span>
                  <span className="font-cormorant text-2xl text-[#e9e3d3] print:text-black font-medium">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timeline Sequence */}
        <div className="mt-6">
          <h3 className="font-cormorant text-xl text-[#c0a062] font-medium mb-2">
            Investigation Chronology
          </h3>
          <div className="border border-[#262c38] print:border-neutral-300 rounded-xl divide-y divide-[#262c38] max-h-80 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="p-4 text-xs text-[#8b8fa0] text-center">
                Nothing recorded in this session.
              </div>
            ) : (
              entries
                .slice()
                .reverse()
                .map(item => (
                  <div key={item.id} className="p-3 text-xs flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-[#e9e3d3] print:text-black mr-2">
                        [{item.tool}]
                      </span>
                      <span className="text-[#8b8fa0] print:text-neutral-700">{item.text}</span>
                    </div>
                    <span className="text-[10px] text-[#8b8fa0] font-tech flex-none pt-0.5">
                      {new Date(item.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 no-print">
        <button
          onClick={handleCopyReport}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#141820] border border-[#262c38] hover:border-[#c0a062] text-xs font-medium text-[#e9e3d3] transition shadow"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#62b3a8]" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied to Clipboard' : 'Copy Dossier'}
        </button>

        <button
          onClick={handleDownloadMarkdown}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#141820] border border-[#262c38] hover:border-[#62b3a8] text-xs font-medium text-[#62b3a8] transition shadow"
        >
          <Download className="w-3.5 h-3.5" /> Download Report (.md)
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#c0a062] hover:bg-[#d4b679] text-[#0b0d11] text-xs font-medium tracking-wider uppercase transition shadow"
        >
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </button>
      </div>
    </div>
  );
};
