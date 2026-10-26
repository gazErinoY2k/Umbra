/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Radio, Activity, Mic, Video, MessageSquare, BookOpen, FileText, Play, Square } from 'lucide-react';
import { ToolId, InvestigationSession } from '../../types/umbra';
import { JournalService } from '../../services/journalStorage';

interface Props {
  onSelectTool: (tool: ToolId) => void;
  activeSession: InvestigationSession | null;
  onSessionChange: () => void;
}

export const HomeMenu: React.FC<Props> = ({
  onSelectTool,
  activeSession,
  onSessionChange,
}) => {
  const [locationInput, setLocationInput] = useState('');
  const [sessionTimer, setSessionTimer] = useState('00:00:00');

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      const ms = Math.max(0, Date.now() - activeSession.start);
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setSessionTimer(
        [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStartSession = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = locationInput.trim() || 'Historic Manor';
    JournalService.beginSession(name);
    setLocationInput('');
    onSessionChange();
  };

  const handleEndSession = () => {
    const finished = JournalService.endSession();
    onSessionChange();
    if (finished) {
      onSelectTool('casefile');
    }
  };

  const tools = [
    {
      id: 'deadbox' as ToolId,
      name: 'Dead Box',
      desc: 'Sweep the airwaves for stray voices & frequencies',
      icon: Radio,
    },
    {
      id: 'emf' as ToolId,
      name: 'EMF Meter',
      desc: 'Track shifts in the electromagnetic field',
      icon: Activity,
    },
    {
      id: 'evp' as ToolId,
      name: 'EVP Recorder',
      desc: 'Capture, spectrogram analyze & replay audio',
      icon: Mic,
    },
    {
      id: 'sls' as ToolId,
      name: 'SLS Camera',
      desc: 'See dot-mapped skeletal figures in real-time',
      icon: Video,
    },
    {
      id: 'talker' as ToolId,
      name: 'Spirit Talker',
      desc: 'Put a question to the unseen presence',
      icon: MessageSquare,
    },
    {
      id: 'journal' as ToolId,
      name: 'Journal',
      desc: 'Every sighting and note, saved on this device',
      icon: BookOpen,
    },
    {
      id: 'casefile' as ToolId,
      name: 'Case File',
      desc: 'Investigation dossier and evidence export',
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Brand Hero */}
      <div className="text-center pt-4 pb-2">
        <svg
          className="w-20 h-20 mx-auto mb-3 animate-breathe"
          viewBox="0 0 74 74"
          fill="none"
          stroke="#c0a062"
          strokeWidth="1.2"
        >
          <circle cx="37" cy="37" r="34" />
          <path d="M37 14c-11 0-17 9-17 20v26l6-5 5 5 6-5 6 5 5-5 6 5V34c0-11-6-20-17-20z" />
          <circle cx="30" cy="34" r="2.6" fill="#c0a062" />
          <circle cx="44" cy="34" r="2.6" fill="#c0a062" />
        </svg>
        <h1 className="font-cormorant text-4xl sm:text-5xl tracking-[0.18em] pl-[0.18em] text-[#e9e3d3] font-medium leading-none">
          UMBRA
        </h1>
        <p className="text-[#8b8fa0] text-sm tracking-widest mt-2 uppercase font-light">
          Paranormal Investigation Suite
        </p>
      </div>

      {/* Active Session Card */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-5 shadow-lg">
        {activeSession ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#62b3a8] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#62b3a8] animate-ping" />
                Investigation In Progress
              </span>
              <div className="font-cormorant text-2xl font-medium text-[#e9e3d3] mt-0.5">
                {activeSession.name}
              </div>
              <div className="text-xs text-[#8b8fa0] font-tech mt-1">
                Duration: {sessionTimer}
              </div>
            </div>

            <button
              onClick={handleEndSession}
              className="px-4 py-2 rounded-full bg-[#c0a062] hover:bg-[#d4b679] text-[#0b0d11] font-medium text-xs tracking-wider uppercase transition shadow flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" /> End Session
            </button>
          </div>
        ) : (
          <form onSubmit={handleStartSession} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                placeholder="Where are you investigating? (e.g. Waverly Sanitarium)"
                className="flex-1 bg-[#0a0c10] border border-[#262c38] rounded-full px-4 py-2.5 text-sm text-[#e9e3d3] placeholder-[#8b8fa0]/60 focus:outline-none focus:border-[#c0a062] transition"
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full border border-[#c0a062] text-[#c0a062] hover:bg-[#c0a062] hover:text-[#0b0d11] font-medium text-xs tracking-wider uppercase transition flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Begin
              </button>
            </div>
            <p className="text-xs text-[#8b8fa0] text-center sm:text-left">
              Start an investigation session to automatically group your EVP, EMF spikes, and sightings into an official case file.
            </p>
          </form>
        )}
      </div>

      {/* Equipment Menu Grid */}
      <div className="grid grid-cols-1 gap-3">
        {tools.map(tool => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="group flex items-center gap-4 w-full text-left bg-gradient-to-r from-[#141820] to-[#10131a] border border-[#262c38] hover:border-[#c0a062] rounded-2xl p-4.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-[#0b0d11] border border-[#262c38] group-hover:border-[#c0a062]/50 flex items-center justify-center text-[#c0a062] transition flex-none">
                <Icon className="w-6 h-6 stroke-[1.4]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-cormorant font-medium text-2xl text-[#e9e3d3] group-hover:text-[#c0a062] transition leading-none">
                  {tool.name}
                </div>
                <div className="text-xs text-[#8b8fa0] mt-1 truncate">
                  {tool.desc}
                </div>
              </div>
              <div className="text-[#8b8fa0] group-hover:text-[#c0a062] transition text-lg px-1">
                ›
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs text-[#8b8fa0]/70 pt-4">
        For research and entertainment. Physical device sensors utilized when available.
      </div>
    </div>
  );
};
