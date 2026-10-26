/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { getAudioContext } from '../../services/audioEngine';

interface Props {
  onDismiss: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onDismiss }) => {
  const [fading, setFading] = useState(false);

  const handleEnter = () => {
    // Resume AudioContext on initial user gesture
    try {
      getAudioContext().resume();
    } catch {
      // Ignore
    }
    setFading(true);
    setTimeout(onDismiss, 700);
  };

  useEffect(() => {
    // Auto-timeout after 5 seconds if no interaction
    const timer = setTimeout(handleEnter, 5500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onClick={handleEnter}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0d11] transition-opacity duration-700 cursor-pointer select-none p-6 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative mb-6">
        <svg
          className="w-32 h-32 overflow-visible"
          viewBox="0 0 74 74"
          fill="none"
          stroke="#c0a062"
          strokeWidth="1.2"
        >
          <circle
            cx="37"
            cy="37"
            r="34"
            className="transition-all duration-1000"
            style={{
              strokeDasharray: 214,
              strokeDashoffset: 0,
              animation: 'drawCircle 2s ease forwards',
            }}
          />
          <path
            d="M37 14c-11 0-17 9-17 20v26l6-5 5 5 6-5 6 5 5-5 6 5V34c0-11-6-20-17-20z"
            style={{
              strokeDasharray: 260,
              strokeDashoffset: 0,
              animation: 'drawBody 2.2s 0.3s ease forwards',
            }}
          />
          <circle
            className="animate-pulse"
            cx="30"
            cy="34"
            r="2.6"
            fill="#c0a062"
            stroke="none"
          />
          <circle
            className="animate-pulse"
            cx="44"
            cy="34"
            r="2.6"
            fill="#c0a062"
            stroke="none"
          />
        </svg>
      </div>

      <h1 className="font-cormorant text-5xl tracking-[0.25em] pl-[0.25em] text-[#e9e3d3] font-medium text-center">
        UMBRA
      </h1>
      <p className="text-[#8b8fa0] text-sm tracking-widest uppercase mt-3 font-light text-center">
        Paranormal Investigation Suite
      </p>

      <span className="mt-12 text-xs text-[#c0a062]/80 tracking-widest uppercase border border-[#c0a062]/30 px-5 py-2 rounded-full hover:bg-[#c0a062]/10 transition">
        Tap to Enter
      </span>
    </div>
  );
};
