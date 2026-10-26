/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Flashlight, Eye, Download, ShieldAlert } from 'lucide-react';
import { ToolId, InvestigationSession } from '../../types/umbra';
import { JournalService } from '../../services/journalStorage';
import { requestScreenWakeLock, releaseScreenWakeLock } from '../../services/hardwareSensors';

interface Props {
  activeTool: ToolId;
  onNavigate: (tool: ToolId) => void;
  onOpenAPKModal: () => void;
  activeSession: InvestigationSession | null;
}

export const Header: React.FC<Props> = ({
  activeTool,
  onNavigate,
  onOpenAPKModal,
  activeSession,
}) => {
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      const ms = Math.max(0, Date.now() - activeSession.start);
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setElapsedTime(
        [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const toggleWakeLock = async () => {
    if (wakeLockActive) {
      releaseScreenWakeLock();
      setWakeLockActive(false);
    } else {
      const ok = await requestScreenWakeLock();
      setWakeLockActive(ok);
    }
  };

  const toggleScreenTorch = () => {
    setTorchActive(prev => !prev);
  };

  return (
    <>
      {/* Fullscreen Screen Torch Overlay if physical camera torch is unavailable or for screen illumination */}
      {torchActive && (
        <div
          onClick={() => setTorchActive(false)}
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-black select-none cursor-pointer"
        >
          <Flashlight className="w-16 h-16 mb-4 text-amber-500 animate-pulse" />
          <h2 className="text-2xl font-bold font-cormorant">Illumination Beacon Active</h2>
          <p className="text-xs text-neutral-600 mt-2">Tap anywhere to extinguish torch</p>
        </div>
      )}

      <header className="sticky top-0 z-30 w-full bg-[#0b0d11]/90 backdrop-blur-md border-b border-[#262c38]/60 px-4 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          {activeTool !== 'home' ? (
            <button
              onClick={() => onNavigate('home')}
              className="w-9 h-9 rounded-full bg-[#141820] border border-[#262c38] hover:border-[#c0a062] flex items-center justify-center text-[#e9e3d3] transition"
              aria-label="Back to Tools"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div
              onClick={() => onNavigate('home')}
              className="w-9 h-9 rounded-full bg-[#141820] border border-[#c0a062]/40 flex items-center justify-center cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 74 74" fill="none" stroke="#c0a062" strokeWidth="1.5">
                <circle cx="37" cy="37" r="34" />
                <path d="M37 14c-11 0-17 9-17 20v26l6-5 5 5 6-5 6 5 5-5 6 5V34c0-11-6-20-17-20z" />
                <circle cx="30" cy="34" r="2.6" fill="#c0a062" />
                <circle cx="44" cy="34" r="2.6" fill="#c0a062" />
              </svg>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-cormorant font-semibold text-lg tracking-wider text-[#e9e3d3]">
                UMBRA
              </span>
              {activeSession && (
                <span className="px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-medium bg-[#62b3a8]/20 text-[#62b3a8] border border-[#62b3a8]/40 animate-pulse">
                  REC · {elapsedTime}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8b8fa0] -mt-0.5 tracking-wide">
              Paranormal Suite
            </p>
          </div>
        </div>

        {/* Action icons: WakeLock, Screen Torch, APK Package modal */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleWakeLock}
            title={wakeLockActive ? 'Screen Wake Lock: Active' : 'Enable Screen Wake Lock'}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition text-xs ${
              wakeLockActive
                ? 'bg-[#c0a062]/20 border-[#c0a062] text-[#c0a062]'
                : 'bg-[#141820] border-[#262c38] text-[#8b8fa0] hover:text-[#e9e3d3]'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={toggleScreenTorch}
            title="Toggle Light / Torch"
            className="w-8 h-8 rounded-full bg-[#141820] border border-[#262c38] hover:border-[#c0a062] text-[#8b8fa0] hover:text-[#e9e3d3] flex items-center justify-center transition"
          >
            <Flashlight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAPKModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141820] border border-[#c0a062]/60 hover:bg-[#c0a062]/20 text-[#c0a062] text-xs font-medium transition shadow-sm"
            title="Install APK / PWA"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install APK</span>
          </button>
        </div>
      </header>
    </>
  );
};
