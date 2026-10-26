/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Volume2, VolumeX, Radio, Sparkles, MessageSquare } from 'lucide-react';
import { speakGhost, playHaptic } from '../../services/audioEngine';
import { JournalService } from '../../services/journalStorage';

const EXPANDED_WORDS = [
  "here", "leave", "behind", "cold", "name", "mother", "father", "child",
  "close", "listen", "help", "stay", "window", "door", "upstairs", "cellar",
  "light", "dark", "alone", "remember", "sorry", "wait", "beneath", "garden",
  "fire", "sleep", "watching", "home", "quiet", "near", "why", "yes", "no",
  "hello", "trapped", "lost", "winter", "sister", "hush", "echo", "shadow",
  "attic", "clock", "whisper", "below", "found", "never", "forever", "release",
  "water", "danger", "secret", "hide", "burn", "blood", "sorrow", "grave",
  "revenge", "protect", "mirror", "stone", "stranger", "passage", "guilty",
  "seven", "three", "nineteen", "mortis", "anima", "tenebris", "requiem"
];

const SUGGESTED_QUESTIONS = [
  "Is anyone here with us?",
  "What is your name?",
  "Why are you remaining here?",
  "How many are with you?",
  "Can you give us a sign?",
];

interface TalkerLog {
  id: string;
  question?: string;
  response: string;
  time: string;
}

export const SpiritTalkerTool: React.FC = () => {
  const [questionInput, setQuestionInput] = useState('');
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isContinuous, setIsContinuous] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState<TalkerLog[]>([]);

  const continuousTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerResponse = (questionText?: string) => {
    setIsListening(true);
    setActiveWord(null);

    const delay = 1800 + Math.random() * 2200;
    setTimeout(() => {
      const count = Math.random() < 0.7 ? 1 : 2;
      const selected: string[] = [];
      for (let i = 0; i < count; i++) {
        selected.push(EXPANDED_WORDS[Math.floor(Math.random() * EXPANDED_WORDS.length)]);
      }
      const responsePhrase = selected.join(' ');
      setActiveWord(responsePhrase);
      setIsListening(false);
      playHaptic([40, 50]);

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs(prev => [
        {
          id: `${Date.now()}-${Math.random()}`,
          question: questionText,
          response: responsePhrase,
          time: timeStr,
        },
        ...prev.slice(0, 39),
      ]);

      JournalService.addEntry(
        'Spirit Talker',
        questionText ? `Q: "${questionText}" → Response: "${responsePhrase}"` : `Spontaneous word: "${responsePhrase}"`
      );

      if (voiceEnabled) {
        speakGhost(responsePhrase, true);
      }
    }, delay);
  };

  const handleAsk = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = questionInput.trim();
    if (!q) return;
    triggerResponse(q);
    setQuestionInput('');
  };

  const toggleContinuous = () => {
    if (isContinuous) {
      if (continuousTimerRef.current) clearTimeout(continuousTimerRef.current);
      setIsContinuous(false);
    } else {
      setIsContinuous(true);
      const scheduleNext = () => {
        triggerResponse();
        continuousTimerRef.current = setTimeout(scheduleNext, 5000 + Math.random() * 6000);
      };
      continuousTimerRef.current = setTimeout(scheduleNext, 1500);
    }
  };

  useEffect(() => {
    return () => {
      if (continuousTimerRef.current) clearTimeout(continuousTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Spirit Board Chassis */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-[#262c38]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#c0a062]" />
            <span className="text-xs text-[#8b8fa0] uppercase tracking-wider font-tech">
              Lexical ITC Word Engine
            </span>
          </div>
          <span className="text-xs text-[#62b3a8] font-tech">
            {EXPANDED_WORDS.length} Words Loaded
          </span>
        </div>

        {/* Word Manifestation Box */}
        <div className="h-32 flex flex-col items-center justify-center my-5 bg-[#0a0c10] border border-[#1b2230] rounded-xl px-4 relative text-center">
          {isListening ? (
            <div className="space-y-1.5 animate-pulse">
              <span className="text-xs tracking-widest text-[#62b3a8] uppercase font-tech">
                Opening Spiritual Channel…
              </span>
              <p className="text-xs text-[#8b8fa0]/60">Scanning electromagnetic fluctuations</p>
            </div>
          ) : activeWord ? (
            <div
              key={activeWord}
              className="font-cormorant text-4xl sm:text-5xl font-medium text-[#e9e3d3] tracking-wider animate-word"
            >
              {activeWord}
            </div>
          ) : (
            <span className="text-xs text-[#8b8fa0]/60 tracking-wider">
              Ask a question below or initiate continuous spectral scanning.
            </span>
          )}
        </div>

        {/* Question Input Form */}
        <form onSubmit={handleAsk} className="flex items-center gap-2">
          <input
            type="text"
            value={questionInput}
            onChange={e => setQuestionInput(e.target.value)}
            placeholder="Ask a question (e.g. Is anyone here?)"
            className="flex-1 bg-[#0a0c10] border border-[#262c38] rounded-full px-4 py-2.5 text-sm text-[#e9e3d3] placeholder-[#8b8fa0]/60 focus:outline-none focus:border-[#c0a062] transition"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full bg-[#c0a062] hover:bg-[#d4b679] text-[#0b0d11] font-medium text-xs tracking-wider uppercase transition shadow flex items-center gap-1.5 flex-none"
          >
            <Send className="w-3.5 h-3.5" /> Ask
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuestionInput(q);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#0a0c10] border border-[#262c38] hover:border-[#c0a062]/60 text-[#8b8fa0] hover:text-[#e9e3d3] transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-5 pt-4 border-t border-[#262c38]">
          <button
            onClick={() => setVoiceEnabled(prev => !prev)}
            className={`px-5 py-2.5 rounded-full font-medium text-xs tracking-wider uppercase transition border flex items-center gap-1.5 ${
              voiceEnabled
                ? 'border-[#c0a062]/80 bg-[#c0a062]/15 text-[#c0a062]'
                : 'border-[#262c38] text-[#8b8fa0] hover:text-[#e9e3d3]'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {voiceEnabled ? 'Voice On' : 'Voice Off'}
          </button>

          <button
            onClick={toggleContinuous}
            className={`px-5 py-2.5 rounded-full font-medium text-xs tracking-wider uppercase transition border flex items-center gap-1.5 ${
              isContinuous
                ? 'border-[#62b3a8] bg-[#62b3a8]/20 text-[#62b3a8]'
                : 'border-[#262c38] text-[#8b8fa0] hover:text-[#e9e3d3]'
            }`}
          >
            <Radio className="w-4 h-4" />
            {isContinuous ? 'Listening Continuously…' : 'Continuous Mode'}
          </button>
        </div>
      </div>

      {/* Communications Transcript */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#262c38]">
          <h3 className="font-cormorant text-xl text-[#e9e3d3] font-medium">
            Spiritual Dialog Transcript
          </h3>
          <span className="text-xs text-[#8b8fa0] font-tech">
            {logs.length} answers logged
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {logs.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#8b8fa0]/60">
              Dialogue answers will appear here in chronological sequence.
            </div>
          ) : (
            logs.map(item => (
              <div
                key={item.id}
                className="py-2 border-b border-[#262c38]/50 text-xs space-y-0.5"
              >
                {item.question && (
                  <div className="text-[#8b8fa0] italic">
                    “{item.question}”
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-cormorant text-xl text-[#c0a062] font-medium">
                    {item.response}
                  </span>
                  <span className="text-[#8b8fa0] font-tech text-[10px]">
                    {item.time}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
