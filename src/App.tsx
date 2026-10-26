/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ToolId, InvestigationSession } from './types/umbra';
import { Header } from './components/common/Header';
import { SplashScreen } from './components/common/SplashScreen';
import { HomeMenu } from './components/home/HomeMenu';
import { DeadBoxTool } from './components/tools/DeadBoxTool';
import { EMFMeterTool } from './components/tools/EMFMeterTool';
import { EVPRecorderTool } from './components/tools/EVPRecorderTool';
import { SLSCameraTool } from './components/tools/SLSCameraTool';
import { SpiritTalkerTool } from './components/tools/SpiritTalkerTool';
import { JournalTool } from './components/tools/JournalTool';
import { CaseFileTool } from './components/tools/CaseFileTool';
import { APKPackagingModal } from './components/pwa/APKPackagingModal';
import { JournalService } from './services/journalStorage';
import { WifiOff } from 'lucide-react';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolId>('home');
  const [activeSession, setActiveSession] = useState<InvestigationSession | null>(null);
  const [caseFileSessionId, setCaseFileSessionId] = useState<number | null>(null);
  const [isAPKModalOpen, setIsAPKModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Sync active session and online status
  useEffect(() => {
    setActiveSession(JournalService.getCurrentSession());
    const unsub = JournalService.subscribe(() => {
      setActiveSession(JournalService.getCurrentSession());
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    // Check URL parameters for direct shortcut jumps (e.g. /?tool=emf from PWA shortcuts)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const toolParam = params.get('tool') as ToolId | null;
      if (toolParam && ['deadbox', 'emf', 'evp', 'sls', 'talker', 'journal', 'casefile'].includes(toolParam)) {
        setActiveTool(toolParam);
        setShowSplash(false);
      }
    }

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNavigate = (tool: ToolId) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveTool(tool);
  };

  const handleSelectCaseFile = (sessionId: number) => {
    setCaseFileSessionId(sessionId);
    setActiveTool('casefile');
  };

  return (
    <div className="min-h-screen bg-[#0b0d11] text-[#e9e3d3] flex flex-col font-sans selection:bg-[#c0a062]/30 selection:text-white">
      {/* Initial Gothic Splash Screen */}
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}

      {/* Main Top Header Bar */}
      <Header
        activeTool={activeTool}
        onNavigate={handleNavigate}
        onOpenAPKModal={() => setIsAPKModalOpen(true)}
        activeSession={activeSession}
      />

      {/* Offline Status Badge (when investigating in remote areas with zero connectivity) */}
      {!isOnline && (
        <div className="bg-[#141820] border-b border-[#c0a062]/40 text-[#c0a062] px-4 py-1.5 text-xs flex items-center justify-center gap-2 font-medium tracking-wide">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Investigation Mode · Local sensor caching active</span>
        </div>
      )}

      {/* Main Container Viewport */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-5">
        {activeTool === 'home' && (
          <HomeMenu
            onSelectTool={handleNavigate}
            activeSession={activeSession}
            onSessionChange={() => setActiveSession(JournalService.getCurrentSession())}
          />
        )}

        {activeTool === 'deadbox' && <DeadBoxTool />}

        {activeTool === 'emf' && <EMFMeterTool />}

        {activeTool === 'evp' && <EVPRecorderTool />}

        {activeTool === 'sls' && <SLSCameraTool />}

        {activeTool === 'talker' && <SpiritTalkerTool />}

        {activeTool === 'journal' && (
          <JournalTool
            onNavigate={handleNavigate}
            onSelectCaseFile={handleSelectCaseFile}
          />
        )}

        {activeTool === 'casefile' && (
          <CaseFileTool
            sessionId={caseFileSessionId}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* APK & OBB Packaging Suite Modal */}
      <APKPackagingModal
        isOpen={isAPKModalOpen}
        onClose={() => setIsAPKModalOpen(false)}
      />
    </div>
  );
}
