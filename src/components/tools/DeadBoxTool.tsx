/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, VolumeX, Radio, RotateCcw } from 'lucide-react';
import { DeadBoxAudioEngine, speakGhost, playHaptic } from '../../services/audioEngine';
import { JournalService } from '../../services/journalStorage';

const WORDS = [
  "here", "leave", "behind", "cold", "name", "mother", "father", "child",
  "close", "listen", "help", "stay", "window", "door", "upstairs", "cellar",
  "light", "dark", "alone", "remember", "sorry", "wait", "beneath", "garden",
  "fire", "sleep", "watching", "home", "quiet", "near", "why", "yes", "no",
  "hello", "trapped", "lost", "winter", "sister", "hush", "echo", "shadow",
  "attic", "clock", "whisper", "below", "found", "never", "forever", "release"
];

interface WordLogItem {
  id: string;
  word: string;
  freq: string;
  time: string;
}

export const DeadBoxTool: React.FC = () => {
  const [isSweeping, setIsSweeping] = useState(false);
  const [currentFreq, setCurrentFreq] = useState('87.5');
  const [sweepSpeed, setSweepSpeed] = useState(170); // ms
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [wordLogs, setWordLogs] = useState<WordLogItem[]>([]);

  const audioEngineRef = useRef<DeadBoxAudioEngine | null>(null);
  const nextWordTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    audioEngineRef.current = new DeadBoxAudioEngine();
    return () => {
      audioEngineRef.current?.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getRandomFrequency = () => (88.0 + Math.random() * 20.0).toFixed(1);

  const tickSweep = () => {
    const f = getRandomFrequency();
    setCurrentFreq(f);

    const filterFreq = 300 + Math.random() * 2800;
    const filterQ = 1.0 + Math.random() * 4.0;
    const gainLevel = 0.04 + Math.random() * 0.14;

    audioEngineRef.current?.modulate(filterFreq, filterQ, gainLevel);

    const now = Date.now();
    if (now > nextWordTimeRef.current) {
      // Trigger new word emergence
      nextWordTimeRef.current = now + (5000 + Math.random() * 7000);
      const chosenWord = WORDS[Math.floor(Math.random() * WORDS.length)];
      setActiveWord(chosenWord);
      playHaptic(30);

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setWordLogs(prev => [
        {
          id: `${Date.now()}-${Math.random()}`,
          word: chosenWord,
          freq: `${f} MHz`,
          time: timeStr,
        },
        ...prev.slice(0, 39),
      ]);

      JournalService.addEntry('Dead Box', `"${chosenWord}" captured at ${f} MHz`);

      if (voiceEnabled) {
        speakGhost(chosenWord, true);
        audioEngineRef.current?.modulate(filterFreq, filterQ, 0.02);
      }
    }

    timerRef.current = setTimeout(tickSweep, sweepSpeed * (0.6 + Math.random() * 0.8));
  };

  const handleToggleSweep = () => {
    if (isSweeping) {
      if (timerRef.current) clearTimeout(timerRef.current);
      audioEngineRef.current?.stop();
      setIsSweeping(false);
    } else {
      audioEngineRef.current?.start();
      nextWordTimeRef.current = Date.now() + 2500;
      setIsSweeping(true);
      tickSweep();
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Radio Frequency Header Banner */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-3 left-4 text-[10px] tracking-widest text-[#8b8fa0] uppercase font-tech flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-[#c0a062]" />
          <span>VHF Band Spirit Sweep</span>
        </div>

        {/* Digital Frequency Readout */}
        <div className="pt-3">
          <div className="font-cormorant text-6xl sm:text-7xl font-medium tracking-tight text-[#e9e3d3] tabular-nums">
            {currentFreq}
          </div>
          <div className="text-xs tracking-widest text-[#8b8fa0] uppercase mt-1">
            MHz · {isSweeping ? 'Active Frequency Sweep' : 'Scanner Standby'}
          </div>
        </div>

        {/* Word Display Canvas / Screen */}
        <div className="h-28 flex items-center justify-center my-4 bg-[#0a0c10] border border-[#1b2230] rounded-xl px-4 relative">
          {activeWord ? (
            <div
              key={activeWord + currentFreq}
              className="font-cormorant text-4xl sm:text-5xl font-medium text-[#e9e3d3] tracking-wider animate-word"
            >
              {activeWord}
            </div>
          ) : (
            <span className="text-xs text-[#8b8fa0]/60 tracking-wider font-light">
              {isSweeping ? 'Listening for atmospheric phonemes…' : 'Start sweep to scan radio airwaves'}
            </span>
          )}

          {isSweeping && (
            <div className="absolute bottom-2 right-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#62b3a8] animate-ping" />
              <span className="text-[10px] font-tech text-[#62b3a8]">SCAN</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleToggleSweep}
            className={`px-6 py-2.5 rounded-full font-medium text-xs tracking-wider uppercase transition shadow-md flex items-center gap-2 ${
              isSweeping
                ? 'bg-[#c0a062] text-[#0b0d11] hover:bg-[#d4b679]'
                : 'border border-[#c0a062] text-[#c0a062] hover:bg-[#c0a062]/10'
            }`}
          >
            {isSweeping ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isSweeping ? 'Stop Sweep' : 'Start Sweep'}
          </button>

          <button
            onClick={() => setVoiceEnabled(prev => !prev)}
            className={`px-5 py-2.5 rounded-full font-medium text-xs tracking-wider uppercase transition border flex items-center gap-1.5 ${
              voiceEnabled
                ? 'border-[#c0a062]/80 bg-[#c0a062]/15 text-[#c0a062]'
                : 'border-[#262c38] text-[#8b8fa0] hover:text-[#e9e3d3]'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {voiceEnabled ? 'Voice On' : 'Voice Muted'}
          </button>
        </div>

        {/* Speed Slider */}
        <div className="mt-5 pt-4 border-t border-[#262c38] flex items-center gap-3 text-xs text-[#8b8fa0]">
          <span className="whitespace-nowrap">Sweep Rate:</span>
          <input
            type="range"
            min="60"
            max="400"
            value={sweepSpeed}
            onChange={e => setSweepSpeed(Number(e.target.value))}
            className="flex-1 accent-[#c0a062] cursor-pointer"
          />
          <span className="font-tech w-12 text-right">{sweepSpeed}ms</span>
        </div>
      </div>

      {/* Captured Words Log */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#262c38]">
          <h3 className="font-cormorant text-xl text-[#e9e3d3] font-medium">
            Sweep Transcript
          </h3>
          <span className="text-xs text-[#8b8fa0] font-tech">
            {wordLogs.length} voices detected
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {wordLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#8b8fa0]/60">
              No vocal signatures recorded yet.
            </div>
          ) : (
            wordLogs.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between py-1.5 border-b border-[#262c38]/50 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-cormorant text-base text-[#e9e3d3] font-medium">
                    {item.word}
                  </span>
                  <span className="text-[10px] text-[#62b3a8] font-tech">
                    {item.freq}
                  </span>
                </div>
                <span className="text-[#8b8fa0] font-tech text-[10px]">
                  {item.time}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
