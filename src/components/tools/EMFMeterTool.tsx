/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sliders, Shield, RefreshCw } from 'lucide-react';
import { EMFToneEngine, playHaptic } from '../../services/audioEngine';
import { MagnetometerSensorManager } from '../../services/hardwareSensors';
import { JournalService } from '../../services/journalStorage';

export const EMFMeterTool: React.FC = () => {
  const [reading, setReading] = useState(1.0);
  const [baseline, setBaseline] = useState(0.0);
  const [sensitivity, setSensitivity] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [sensorSource, setSensorSource] = useState('Simulated Field Fluctuations');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<number[]>(Array(100).fill(1.0));
  const toneEngineRef = useRef<EMFToneEngine | null>(null);
  const sensorManagerRef = useRef<MagnetometerSensorManager | null>(null);
  const lastLoggedRef = useRef<number>(0);
  const spikeRef = useRef<number>(0);
  const realValRef = useRef<number | null>(null);

  useEffect(() => {
    toneEngineRef.current = new EMFToneEngine();
    sensorManagerRef.current = new MagnetometerSensorManager();

    sensorManagerRef.current.start((mg, source) => {
      realValRef.current = mg;
      setSensorSource(source);
    });

    let rafId: number;

    const loop = () => {
      const sensFactor = sensitivity / 5;
      let val = 1.0;

      if (realValRef.current !== null) {
        // Use device physical hardware sensor data
        val = Math.max(0.1, (realValRef.current - baseline) * sensFactor);
      } else {
        // Realistic paranormal environmental fluctuations with random spikes
        if (Math.random() < 0.007) {
          spikeRef.current = 5 + Math.random() * 9;
        }
        spikeRef.current *= 0.95;
        const drift = (Math.random() - 0.5) * 0.4 * sensFactor;
        const prev = historyRef.current[historyRef.current.length - 1] || 1.0;
        val = Math.max(0.2, Math.min(15.0, prev + drift + spikeRef.current * 0.06));
        // Slowly pull towards ambient ~1.2 mG
        val += (1.2 - val) * 0.02;
      }

      setReading(val);

      // Audio engine update
      toneEngineRef.current?.update(val, soundEnabled);

      // Auto-log high anomaly spikes
      if (val > 9.5 && Date.now() - lastLoggedRef.current > 15000) {
        lastLoggedRef.current = Date.now();
        playHaptic([60, 40, 80]);
        JournalService.addEntry('EMF Meter', `High electromagnetic surge detected: ${val.toFixed(1)} mG`);
      }

      // History update
      historyRef.current.push(val);
      historyRef.current.shift();

      // Render Oscilloscope Canvas
      const cv = canvasRef.current;
      if (cv) {
        const ctx = cv.getContext('2d');
        if (ctx) {
          const w = cv.width;
          const h = cv.height;
          ctx.clearRect(0, 0, w, h);

          // Grid lines
          ctx.strokeStyle = '#1b2230';
          ctx.lineWidth = 1;
          for (let y = 20; y < h; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Waveform line
          const maxLevel = 15;
          const ledIndex = val < 2 ? 0 : val < 4 ? 1 : val < 7 ? 2 : val < 10 ? 3 : 4;
          const ledColors = ['#62b3a8', '#8fb86a', '#e0b94a', '#e08a3c', '#d0583c'];
          const activeColor = ledColors[ledIndex];

          ctx.strokeStyle = activeColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = activeColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();

          historyRef.current.forEach((valPoint, i) => {
            const x = (i / (historyRef.current.length - 1)) * w;
            const y = h - (valPoint / maxLevel) * (h - 15) - 8;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      sensorManagerRef.current?.stop();
      toneEngineRef.current?.stop();
    };
  }, [sensitivity, soundEnabled, baseline]);

  const toggleSound = () => {
    if (!soundEnabled) {
      toneEngineRef.current?.start();
      setSoundEnabled(true);
    } else {
      toneEngineRef.current?.stop();
      setSoundEnabled(false);
    }
  };

  const handleCalibrateBaseline = () => {
    setBaseline(reading);
    playHaptic(50);
  };

  // Determine active LEDs
  const ledColors = ['#62b3a8', '#8fb86a', '#e0b94a', '#e08a3c', '#d0583c'];
  const activeCount = reading < 2 ? 1 : reading < 4 ? 2 : reading < 7 ? 3 : reading < 10 ? 4 : 5;

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* EMF Device Chassis */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-6 shadow-lg">
        {/* Top sensor badge */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262c38]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#62b3a8] animate-pulse" />
            <span className="text-xs text-[#8b8fa0] font-tech">{sensorSource}</span>
          </div>
          <button
            onClick={handleCalibrateBaseline}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a0c10] border border-[#262c38] hover:border-[#c0a062] text-[11px] text-[#e9e3d3] transition"
            title="Set current ambient reading to zero baseline"
          >
            <RefreshCw className="w-3 h-3 text-[#c0a062]" />
            <span>Zero Baseline</span>
          </button>
        </div>

        {/* Digital Readout */}
        <div className="text-center py-4">
          <div className="font-cormorant text-6xl sm:text-7xl font-medium tracking-tight text-[#e9e3d3] tabular-nums leading-none">
            {reading.toFixed(1)}
          </div>
          <div className="text-xs tracking-widest text-[#8b8fa0] uppercase mt-2">
            Milligauss (mG) · Electromagnetic Field
          </div>
        </div>

        {/* 5-LED Indicator Bar */}
        <div className="flex gap-2 my-4">
          {ledColors.map((color, idx) => {
            const isActive = idx < activeCount;
            return (
              <div
                key={idx}
                className="flex-1 h-3.5 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: isActive ? color : '#1a202c',
                  boxShadow: isActive ? `0 0 14px ${color}` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Real-time Oscilloscope Canvas */}
        <div className="bg-[#0a0c10] border border-[#1b2230] rounded-xl p-2 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={500}
            height={130}
            className="w-full h-32 block rounded-lg"
          />
          <div className="absolute top-2 right-3 text-[10px] font-tech text-[#8b8fa0]/60">
            0 - 15 mG Oscillograph
          </div>
        </div>

        {/* Controls */}
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3 text-xs text-[#8b8fa0]">
            <Sliders className="w-4 h-4 text-[#c0a062]" />
            <span className="whitespace-nowrap">Sensitivity ({sensitivity}x):</span>
            <input
              type="range"
              min="1"
              max="10"
              value={sensitivity}
              onChange={e => setSensitivity(Number(e.target.value))}
              className="flex-1 accent-[#c0a062] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={toggleSound}
              className={`px-6 py-2.5 rounded-full font-medium text-xs tracking-wider uppercase transition border flex items-center gap-2 ${
                soundEnabled
                  ? 'border-[#c0a062] bg-[#c0a062] text-[#0b0d11]'
                  : 'border-[#262c38] text-[#8b8fa0] hover:text-[#e9e3d3]'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? 'Tone Pitch On' : 'Tone Pitch Muted'}
            </button>
          </div>
        </div>
      </div>

      {/* Field Analysis Note */}
      <div className="bg-[#141820]/60 border border-[#262c38] rounded-xl p-4 text-xs text-[#8b8fa0] space-y-1">
        <div className="font-semibold text-[#e9e3d3] flex items-center gap-1.5 mb-1">
          <Shield className="w-3.5 h-3.5 text-[#c0a062]" />
          <span>Investigator Reference Guide:</span>
        </div>
        <p>• 0.0 - 2.0 mG: Ambient background baseline</p>
        <p>• 2.0 - 7.0 mG: Weak electromagnetic disturbance / wiring</p>
        <p>• 7.0 - 15.0+ mG: Significant energy spike / unexplained paranormal cold spot</p>
      </div>
    </div>
  );
};
