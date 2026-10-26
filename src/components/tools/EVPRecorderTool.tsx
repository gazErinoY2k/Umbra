/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Download, Trash2, AlertCircle, Headphones } from 'lucide-react';
import { getAudioContext, playHaptic } from '../../services/audioEngine';
import { JournalService } from '../../services/journalStorage';
import { EVPClip } from '../../types/umbra';

export const EVPRecorderTool: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState('00:00');
  const [anomalyStatus, setAnomalyStatus] = useState<string>('Ask a question, then leave a pause for answers.');
  const [clips, setClips] = useState<EVPClip[]>([]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spectroCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const anomaliesRef = useRef<string[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastMarkerTimeRef = useRef<number>(0);
  const emaRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clipCounterRef = useRef<number>(1);

  useEffect(() => {
    // Initialize spectrogram canvas with background
    const sc = spectroCanvasRef.current;
    if (sc) {
      const sCtx = sc.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#0a0c10';
        sCtx.fillRect(0, 0, sc.width, sc.height);
      }
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const startVisualizer = (analyser: AnalyserNode) => {
    const waveCv = waveCanvasRef.current;
    const spectroCv = spectroCanvasRef.current;
    if (!waveCv || !spectroCv) return;

    const wCtx = waveCv.getContext('2d');
    const sCtx = spectroCv.getContext('2d');
    if (!wCtx || !sCtx) return;

    const timeData = new Uint8Array(analyser.fftSize);
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const render = () => {
      // 1. Draw Waveform
      wCtx.clearRect(0, 0, waveCv.width, waveCv.height);
      analyser.getByteTimeDomainData(timeData);

      wCtx.strokeStyle = isRecording ? '#d0583c' : '#62b3a8';
      wCtx.lineWidth = 2;
      wCtx.beginPath();
      for (let i = 0; i < timeData.length; i++) {
        const x = (i / timeData.length) * waveCv.width;
        const y = (timeData[i] / 255) * waveCv.height;
        if (i === 0) wCtx.moveTo(x, y);
        else wCtx.lineTo(x, y);
      }
      wCtx.stroke();

      // 2. Draw Spectrogram Waterfall
      analyser.getByteFrequencyData(freqData);

      // Shift existing spectrogram left by 2px
      sCtx.drawImage(spectroCv, -2, 0);

      // Draw the new column on the right edge
      const h = spectroCv.height;
      for (let j = 0; j < h; j++) {
        const binIndex = Math.floor(((h - 1 - j) / h) * 190);
        const val = freqData[binIndex] / 255;
        // Gothic cyan-to-ember spectral heatmap
        sCtx.fillStyle = `hsl(${175 - 135 * val}, ${45 + 35 * val}%, ${5 + 65 * val}%)`;
        sCtx.fillRect(spectroCv.width - 2, j, 2, 1);
      }

      // 3. Anomaly detection algorithm in voice frequency range (300Hz - 3.4kHz)
      let energy = 0;
      for (let i = 23; i < 93; i++) {
        energy += freqData[i];
      }
      energy /= 70;
      emaRef.current = emaRef.current * 0.97 + energy * 0.03;

      const now = Date.now();
      if (
        isRecording &&
        now - startTimeRef.current > 2500 &&
        energy > emaRef.current * 1.85 + 24 &&
        now - lastMarkerTimeRef.current > 3500
      ) {
        lastMarkerTimeRef.current = now;
        const mark = formatMMSS((now - startTimeRef.current) / 1000);
        anomaliesRef.current.push(mark);
        setAnomalyStatus(`Possible anomaly spike detected at ${mark}`);
        playHaptic([40, 30, 40]);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const handleStartRecording = async () => {
    setMicPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      chunksRef.current = [];
      anomaliesRef.current = [];
      startTimeRef.current = Date.now();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const dur = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        const anomalyList = [...anomaliesRef.current];

        const newClip: EVPClip = {
          id: `${Date.now()}`,
          sessionNum: clipCounterRef.current++,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          durationSeconds: dur,
          anomalies: anomalyList,
          audioUrl,
        };

        setClips(prev => [newClip, ...prev]);

        JournalService.addEntry(
          'EVP Recorder',
          `Captured Session ${newClip.sessionNum} (${dur}s)${
            anomalyList.length ? ` · Anomaly spikes at ${anomalyList.join(', ')}` : ' · No spikes'
          }`
        );

        setAnomalyStatus(
          anomalyList.length
            ? `Recording complete. ${anomalyList.length} potential anomalies flagged.`
            : 'Recording saved. Replay with headphones.'
        );
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAnomalyStatus('Recording active. Maintain silence after asking questions…');

      durationIntervalRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordDuration(formatMMSS(sec));
      }, 500);

      startVisualizer(analyser);
    } catch {
      setMicPermissionError('Microphone access blocked. Please allow microphone permissions in browser settings.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  };

  const handleDeleteClip = (id: string) => {
    setClips(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Visualizer & Recorder Card */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-[#262c38]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRecording ? 'bg-[#d0583c] animate-ping' : 'bg-[#62b3a8]'
              }`}
            />
            <span className="text-xs font-tech text-[#8b8fa0]">
              {isRecording ? `RECORDING · ${recordDuration}` : 'EVP STANDBY'}
            </span>
          </div>
          <span className="text-xs text-[#8b8fa0] flex items-center gap-1">
            <Headphones className="w-3.5 h-3.5 text-[#c0a062]" /> High Sensitivity
          </span>
        </div>

        {/* Dual Oscilloscope and Spectrogram Canvases */}
        <div className="my-4 space-y-2">
          {/* Waveform */}
          <div className="bg-[#0a0c10] border border-[#1b2230] rounded-xl p-2 relative">
            <canvas
              ref={waveCanvasRef}
              width={500}
              height={100}
              className="w-full h-24 block rounded-lg"
            />
            <div className="absolute top-2 right-3 text-[10px] font-tech text-[#8b8fa0]/60">
              Audio Waveform
            </div>
          </div>

          {/* Spectrogram Waterfall */}
          <div className="bg-[#0a0c10] border border-[#1b2230] rounded-xl p-2 relative">
            <canvas
              ref={spectroCanvasRef}
              width={500}
              height={140}
              className="w-full h-32 block rounded-lg"
            />
            <div className="absolute top-2 right-3 text-[10px] font-tech text-[#8b8fa0]/60">
              Spectrogram (0 - 8 kHz)
            </div>
          </div>
        </div>

        {/* Status prompt */}
        <p className="text-xs text-center text-[#8b8fa0] italic min-h-[20px]">
          {anomalyStatus}
        </p>

        {micPermissionError && (
          <div className="p-3 my-2 rounded-xl bg-[#d0583c]/15 border border-[#d0583c]/40 text-xs text-[#d0583c] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-none" />
            <span>{micPermissionError}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-center mt-5">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`px-8 py-3 rounded-full font-medium text-xs tracking-wider uppercase transition shadow-lg flex items-center gap-2 ${
              isRecording
                ? 'bg-[#d0583c] text-white hover:bg-[#e06b50] animate-pulse'
                : 'border border-[#c0a062] text-[#c0a062] hover:bg-[#c0a062] hover:text-[#0b0d11]'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 fill-current" /> Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" /> Start Recording
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recorded Clips Vault */}
      <div className="bg-[#141820] border border-[#262c38] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#262c38]">
          <h3 className="font-cormorant text-xl text-[#e9e3d3] font-medium">
            Saved EVP Audio Recordings
          </h3>
          <span className="text-xs text-[#8b8fa0] font-tech">
            {clips.length} session{clips.length === 1 ? '' : 's'}
          </span>
        </div>

        {clips.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#8b8fa0]/60">
            Recorded audio captures will appear here with frequency analysis.
          </div>
        ) : (
          <div className="space-y-3">
            {clips.map(clip => (
              <div
                key={clip.id}
                className="bg-[#0a0c10] border border-[#262c38] rounded-xl p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-cormorant text-lg text-[#e9e3d3] font-medium">
                      EVP Session #{clip.sessionNum}
                    </span>
                    <span className="text-[#8b8fa0] font-tech text-[10px] ml-2">
                      {clip.timestamp} · {clip.durationSeconds}s
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={clip.audioUrl}
                      download={`umbra_evp_session_${clip.sessionNum}.webm`}
                      className="p-1.5 rounded-lg border border-[#262c38] hover:border-[#c0a062] text-[#8b8fa0] hover:text-[#e9e3d3] transition"
                      title="Download Audio Clip"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => handleDeleteClip(clip.id)}
                      className="p-1.5 rounded-lg border border-[#262c38] hover:border-[#d0583c] text-[#8b8fa0] hover:text-[#d0583c] transition"
                      title="Delete Clip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {clip.anomalies.length > 0 ? (
                  <div className="text-[11px] text-[#62b3a8] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#62b3a8]" />
                    Potential vocal anomaly detected at: {clip.anomalies.join(', ')}
                  </div>
                ) : (
                  <div className="text-[11px] text-[#8b8fa0]">
                    Clean recording · No frequency spikes flagged
                  </div>
                )}

                <audio controls src={clip.audioUrl} className="w-full h-8 mt-1 block" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
