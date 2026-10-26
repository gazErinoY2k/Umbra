/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Camera, SwitchCamera, Moon, Sun, Download, Sliders, Flashlight } from 'lucide-react';
import { playHaptic } from '../../services/audioEngine';
import { setTorch } from '../../services/hardwareSensors';
import { JournalService } from '../../services/journalStorage';
import { SLSPhoto } from '../../types/umbra';

type PoseType = 'stand' | 'walk' | 'reach' | 'crouch' | 'lurk';

interface JointMap {
  [key: string]: [number, number];
}

interface DetectedFigure {
  type: PoseType;
  x: number;
  y: number;
  k: number;
  dir: number;
  begin: number;
  end: number;
  conf: number;
}

const POSE_BASE: JointMap = {
  h: [0, -0.2],
  n: [0, 0.25],
  sl: [-0.3, 0.4],
  sr: [0.3, 0.4],
  el: [-0.38, 1.05],
  er: [0.38, 1.05],
  hl: [-0.4, 1.7],
  hr: [0.4, 1.7],
  p: [0, 1.5],
  kl: [-0.18, 2.35],
  kr: [0.18, 2.35],
  fl: [-0.2, 3.2],
  fr: [0.2, 3.2],
};

const BONES: [string, string][] = [
  ['n', 'h'],
  ['n', 'sl'],
  ['n', 'sr'],
  ['sl', 'el'],
  ['el', 'hl'],
  ['sr', 'er'],
  ['er', 'hr'],
  ['n', 'p'],
  ['p', 'kl'],
  ['kl', 'fl'],
  ['p', 'kr'],
  ['kr', 'fr'],
  ['sl', 'sr'],
];

function calculatePose(type: PoseType, t: number): JointMap {
  const joints: JointMap = {};
  for (const k in POSE_BASE) {
    joints[k] = [...POSE_BASE[k]];
  }
  const s = Math.sin(t * 3);

  if (type === 'walk') {
    joints.kl[0] += s * 0.3;
    joints.fl[0] += s * 0.55;
    joints.kr[0] -= s * 0.3;
    joints.fr[0] -= s * 0.55;
    joints.hl[0] -= s * 0.25;
    joints.hr[0] += s * 0.25;
  } else if (type === 'reach') {
    joints.er = [0.7, 0.25];
    joints.hr = [1.15, -0.2 + s * 0.1];
    joints.h[0] += 0.1;
  } else if (type === 'crouch') {
    for (const k of ['h', 'n', 'sl', 'sr', 'el', 'er', 'hl', 'hr']) {
      joints[k][1] += 0.9;
    }
    joints.p[1] += 0.85;
    joints.kl = [-0.5, 2.1];
    joints.kr = [0.5, 2.1];
    joints.n[0] += 0.15;
    joints.h[0] += 0.25;
  } else if (type === 'lurk') {
    joints.h[1] += 0.1;
    joints.h[0] += 0.2;
    joints.n[0] += 0.12;
    joints.el = [-0.2, 1.15 + s * 0.04];
    joints.hl = [-0.25, 1.85];
  }
  return joints;
}

export const SLSCameraTool: React.FC = () => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [nightVision, setNightVision] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [gain, setGain] = useState(100);
  const [activityRate, setActivityRate] = useState(5);
  const [statusNote, setStatusNote] = useState('Camera standby. Point at room to detect skeletal figures.');
  const [capturedPhotos, setCapturedPhotos] = useState<SLSPhoto[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const figuresRef = useRef<DetectedFigure[]>([]);
  const nextSpawnRef = useRef<number>(Date.now() + 4000);
  const tickRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const getCameraFilter = () => {
    const g = gain / 100;
    if (nightVision) {
      return `grayscale(1) sepia(1) hue-rotate(55deg) saturate(4.5) contrast(1.4) brightness(${g * 1.35})`;
    }
    return `grayscale(1) contrast(1.35) brightness(${g * 0.6})`;
  };

  const spawnFigures = (w: number, h: number) => {
    const num = Math.random() < 0.65 ? 1 : Math.random() < 0.75 ? 2 : 3;
    const now = Date.now();
    const newFigs: DetectedFigure[] = [];
    const types: PoseType[] = ['stand', 'walk', 'walk', 'reach', 'crouch', 'lurk'];

    for (let i = 0; i < num; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      newFigs.push({
        type,
        x: (0.2 + Math.random() * 0.6) * w,
        y: (0.16 + Math.random() * 0.28) * h,
        k: (h / 10) * (0.75 + Math.random() * 0.35),
        dir: Math.random() < 0.5 ? -1 : 1,
        begin: now + i * 400,
        end: now + (2800 + Math.random() * 3000),
        conf: Math.round(65 + Math.random() * 32),
      });
    }

    figuresRef.current = newFigs;
    setStatusNote(`${num} humanoid figure${num > 1 ? 's' : ''} locked onto SLS grid`);
    playHaptic([50, 40, 60]);
    JournalService.addEntry(
      'SLS Camera',
      `Locked onto ${num} figure${num > 1 ? 's' : ''} (${newFigs.map(f => f.type).join(', ')})`
    );
  };

  const startAnimation = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const frame = () => {
      const w = cv.clientWidth || 300;
      const h = cv.clientHeight || 400;
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }

      ctx.clearRect(0, 0, w, h);
      tickRef.current++;
      const now = Date.now();

      // Draw SLS structured light dot-matrix grid
      ctx.fillStyle = 'rgba(98, 179, 168, 0.4)';
      for (let i = 8; i < w; i += 16) {
        for (let j = 8; j < h; j += 16) {
          if (Math.random() < (isCameraActive ? 0.35 : 0.88)) continue;
          ctx.fillRect(i + (tickRef.current % 2), j, 1.8, 1.8);
        }
      }

      // Scanner bar
      ctx.fillStyle = 'rgba(98, 179, 168, 0.15)';
      ctx.fillRect(0, (tickRef.current * 2) % h, w, 2);

      // Night vision speckles
      if (nightVision) {
        ctx.fillStyle = 'rgba(150, 255, 140, 0.25)';
        for (let i = 0; i < 40; i++) {
          ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
        }
      }

      // Check spawn condition
      const gap = (16000 - activityRate * 1200) * (0.8 + Math.random() * 0.4);
      if (now > nextSpawnRef.current && figuresRef.current.length === 0) {
        spawnFigures(w, h);
      }

      if (figuresRef.current.length > 0 && figuresRef.current.every(f => now > f.end)) {
        figuresRef.current = [];
        setStatusNote('Scanning environment for movement…');
        nextSpawnRef.current = now + gap;
      }

      // Render Detected Figures
      figuresRef.current.forEach(f => {
        if (now < f.begin || now > f.end) return;
        const t = (now - f.begin) / 1000;
        const progress = (now - f.begin) / (f.end - f.begin);
        const alpha = Math.min(1, progress * 6, (1 - progress) * 5);
        const joints = calculatePose(f.type, t);
        const k = f.k;

        if (f.type === 'walk') {
          f.x += f.dir * 0.35;
        }

        const project = (pt: [number, number]): [number, number] => [
          f.x + pt[0] * k + (Math.random() - 0.5) * 1.2,
          f.y + pt[1] * k,
        ];

        // Draw green phosphor bones
        ctx.fillStyle = `rgba(233, 227, 211, ${0.85 * alpha})`;
        for (const [p1, p2] of BONES) {
          const a = project(joints[p1]);
          const b = project(joints[p2]);
          for (let step = 0; step <= 1; step += 0.1) {
            const bx = a[0] + (b[0] - a[0]) * step;
            const by = a[1] + (b[1] - a[1]) * step;
            ctx.beginPath();
            ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw Head circle
        const headCenter = project(joints.h);
        for (let s = 0; s < 12; s++) {
          const angle = (s / 12) * Math.PI * 2;
          const hx = headCenter[0] + Math.cos(angle) * 0.22 * k;
          const hy = headCenter[1] + Math.sin(angle) * 0.26 * k;
          ctx.beginPath();
          ctx.arc(hx, hy, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw joint sensor tracking dots
        ctx.fillStyle = `rgba(98, 179, 168, ${alpha})`;
        for (const jKey in joints) {
          const jp = project(joints[jKey]);
          ctx.beginPath();
          ctx.arc(jp[0], jp[1], 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Tag label
        ctx.font = '11px Jost, sans-serif';
        ctx.fillStyle = `rgba(192, 160, 98, ${alpha})`;
        ctx.fillText(`${f.type.toUpperCase()} · ${f.conf}%`, f.x - k * 0.4, f.y - k * 0.65);
      });

      rafRef.current = requestAnimationFrame(frame);
    };

    frame();
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setStatusNote('SLS Sensor active. Dot matrix mapping depth…');
      nextSpawnRef.current = Date.now() + 3500;
      startAnimation();
    } catch {
      setIsCameraActive(false);
      setStatusNote('Physical camera unavailable. Simulating sensor grid and skeletal tracking.');
      startAnimation();
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
    figuresRef.current = [];
  };

  const handleCaptureSnapshot = () => {
    const cv = canvasRef.current;
    const v = videoRef.current;
    if (!cv) return;

    const w = cv.width || 360;
    const h = cv.height || 480;

    const outCv = document.createElement('canvas');
    outCv.width = w;
    outCv.height = h;
    const outCtx = outCv.getContext('2d');
    if (!outCtx) return;

    // Background
    outCtx.fillStyle = '#07080b';
    outCtx.fillRect(0, 0, w, h);

    // Video frame
    if (isCameraActive && v && v.videoWidth) {
      const s = Math.max(w / v.videoWidth, h / v.videoHeight);
      outCtx.save();
      try {
        outCtx.filter = getCameraFilter();
      } catch {
        // Ignore filter error
      }
      outCtx.drawImage(
        v,
        (w - v.videoWidth * s) / 2,
        (h - v.videoHeight * s) / 2,
        v.videoWidth * s,
        v.videoHeight * s
      );
      outCtx.restore();
    }

    // Burn overlay
    outCtx.drawImage(cv, 0, 0);

    // Add HUD timestamp watermark
    outCtx.fillStyle = 'rgba(192, 160, 98, 0.9)';
    outCtx.font = '12px "JetBrains Mono", monospace';
    const stamp = new Date().toLocaleString();
    outCtx.fillText(`UMBRA SLS // ${stamp}`, 12, h - 14);

    const dataUrl = outCv.toDataURL('image/jpeg', 0.85);
    const activeFigures = [...figuresRef.current];

    const newPhoto: SLSPhoto = {
      id: `${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dataUrl,
      figuresCount: activeFigures.length,
      types: activeFigures.map(f => f.type),
    };

    setCapturedPhotos(prev => [newPhoto, ...prev]);
    JournalService.addEntry('SLS Camera', `Evidence frame captured with ${newPhoto.figuresCount} figures`);
    playHaptic([30, 40]);
  };

  const toggleNightVision = () => {
    const nextNV = !nightVision;
    setNightVision(nextNV);
  };

  const toggleHardwareTorch = async () => {
    const nextTorch = !torchActive;
    const ok = await setTorch(streamRef.current, nextTorch);
    if (ok) {
      setTorchActive(nextTorch);
    } else {
      setTorchActive(nextTorch); // update UI state
    }
  };

  const switchFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      stopCamera();
      setTimeout(startCamera, 200);
    }
  };

  useEffect(() => {
    startAnimation();
    return () => {
      cancelAnimationFrame(rafRef.current);
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* SLS Viewport */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-4 shadow-lg">
        {/* Camera Container */}
        <div
          className={`relative aspect-[3/4] rounded-xl overflow-hidden border ${
            nightVision ? 'border-[#4a7a3a]' : 'border-[#262c38]'
          } bg-[#07080b]`}
        >
          {/* Video Feed */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: getCameraFilter() }}
          />

          {/* Night Vision phosphor radial vignette overlay */}
          {nightVision && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle, transparent 45%, rgba(0, 15, 0, 0.78))',
              }}
            />
          )}

          {/* Skeleton Overlay Canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

          {/* Top Camera HUD */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none text-[11px] font-tech text-[#8b8fa0]">
            <div className="flex items-center gap-1.5 bg-[#0b0d11]/80 px-2.5 py-1 rounded-full border border-[#262c38]">
              <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-[#62b3a8] animate-pulse' : 'bg-[#d0583c]'}`} />
              <span>{isCameraActive ? 'SLS LIVE FEED' : 'SIMULATION GRID'}</span>
            </div>

            {nightVision && (
              <span className="bg-[#4a7a3a]/30 text-[#85e874] border border-[#4a7a3a] px-2 py-0.5 rounded-full uppercase tracking-wider text-[10px]">
                IR NIGHT VISION
              </span>
            )}
          </div>
        </div>

        {/* Note prompt */}
        <p className="text-xs text-center text-[#8b8fa0] mt-3 italic min-h-[18px]">
          {statusNote}
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            className={`px-5 py-2.5 rounded-full font-medium text-xs tracking-wider uppercase transition shadow border flex items-center gap-1.5 ${
              isCameraActive
                ? 'bg-[#c0a062] text-[#0b0d11]'
                : 'border-[#c0a062] text-[#c0a062] hover:bg-[#c0a062]/10'
            }`}
          >
            <Camera className="w-4 h-4" />
            {isCameraActive ? 'Stop Camera' : 'Start Camera'}
          </button>

          <button
            onClick={handleCaptureSnapshot}
            className="px-5 py-2.5 rounded-full bg-[#141820] border border-[#62b3a8] hover:bg-[#62b3a8] hover:text-[#0b0d11] text-[#62b3a8] font-medium text-xs tracking-wider uppercase transition flex items-center gap-1.5 shadow"
          >
            <Camera className="w-4 h-4" /> Capture Frame
          </button>

          <button
            onClick={toggleNightVision}
            className={`px-4 py-2.5 rounded-full font-medium text-xs tracking-wider uppercase transition border flex items-center gap-1.5 ${
              nightVision
                ? 'border-[#85e874] bg-[#4a7a3a]/40 text-[#85e874]'
                : 'border-[#262c38] text-[#8b8fa0] hover:text-[#e9e3d3]'
            }`}
          >
            {nightVision ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            Night Vision
          </button>

          {isCameraActive && (
            <>
              <button
                onClick={switchFacing}
                className="p-2.5 rounded-full border border-[#262c38] hover:border-[#c0a062] text-[#8b8fa0] hover:text-[#e9e3d3] transition"
                title="Switch Front/Rear Camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              <button
                onClick={toggleHardwareTorch}
                className={`p-2.5 rounded-full border transition ${
                  torchActive
                    ? 'border-[#c0a062] bg-[#c0a062]/20 text-[#c0a062]'
                    : 'border-[#262c38] text-[#8b8fa0] hover:text-[#e9e3d3]'
                }`}
                title="Toggle Physical Camera Torch"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-[#262c38] text-xs text-[#8b8fa0]">
          <div className="flex items-center gap-3">
            <Sliders className="w-4 h-4 text-[#c0a062]" />
            <span className="whitespace-nowrap">Gain ({gain}%):</span>
            <input
              type="range"
              min="50"
              max="200"
              value={gain}
              onChange={e => setGain(Number(e.target.value))}
              className="flex-1 accent-[#c0a062] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap">Entity Activity ({activityRate}x):</span>
            <input
              type="range"
              min="1"
              max="10"
              value={activityRate}
              onChange={e => setActivityRate(Number(e.target.value))}
              className="flex-1 accent-[#c0a062] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Captured Evidence Photos Gallery */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#262c38]">
          <h3 className="font-cormorant text-xl text-[#e9e3d3] font-medium">
            Captured SLS Photos
          </h3>
          <span className="text-xs text-[#8b8fa0] font-tech">
            {capturedPhotos.length} capture{capturedPhotos.length === 1 ? '' : 's'}
          </span>
        </div>

        {capturedPhotos.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#8b8fa0]/60">
            Snapshots taken with the SLS camera will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {capturedPhotos.map(photo => (
              <div
                key={photo.id}
                className="group relative rounded-xl overflow-hidden border border-[#262c38] bg-[#0a0c10]"
              >
                <img
                  src={photo.dataUrl}
                  alt={`SLS Capture ${photo.timestamp}`}
                  className="w-full aspect-[3/4] object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-2">
                  <span className="text-[10px] text-[#e9e3d3] font-tech">
                    {photo.timestamp}
                  </span>
                  <a
                    href={photo.dataUrl}
                    download={`umbra_sls_${photo.id}.jpg`}
                    className="p-1.5 rounded-full bg-[#c0a062] text-[#0b0d11] self-end hover:bg-[#d4b679] transition"
                    title="Download Photo"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
