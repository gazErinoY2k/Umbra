/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playHaptic(pattern: number | number[] = 40): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error if blocked
    }
  }
}

export function speakGhost(text: string, enabled: boolean = true): void {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.65;
    utterance.pitch = 0.55;
    utterance.volume = 0.9;
    
    // Attempt to pick a whispery, deep voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferred = voices.find(v => 
        v.name.toLowerCase().includes('whisper') ||
        v.name.toLowerCase().includes('daniel') ||
        v.name.toLowerCase().includes('oliver') ||
        v.name.toLowerCase().includes('en-gb')
      );
      if (preferred) utterance.voice = preferred;
    }
    
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech errors
  }
}

/**
 * Dead Box Radio Noise Sweeper
 */
export class DeadBoxAudioEngine {
  private ctx: AudioContext;
  private noiseSource: AudioBufferSourceNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.ctx = getAudioContext();
  }

  private createWhiteNoiseBuffer(): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * 2, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public start(): void {
    if (this.isRunning) return;
    this.ctx = getAudioContext();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const noiseBuffer = this.createWhiteNoiseBuffer();
    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 800;
    this.filter.Q.value = 2.0;

    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.08;

    this.noiseSource.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    this.noiseSource.start();
    this.isRunning = true;
  }

  public modulate(freq: number, q: number, gainLevel: number): void {
    if (!this.isRunning || !this.filter || !this.gain) return;
    const now = this.ctx.currentTime;
    this.filter.frequency.setTargetAtTime(freq, now, 0.03);
    this.filter.Q.setTargetAtTime(q, now, 0.03);
    this.gain.gain.setTargetAtTime(gainLevel, now, 0.03);
  }

  public stop(): void {
    if (!this.isRunning) return;
    try {
      this.noiseSource?.stop();
      this.noiseSource?.disconnect();
      this.filter?.disconnect();
      this.gain?.disconnect();
    } catch {
      // Ignore
    }
    this.noiseSource = null;
    this.filter = null;
    this.gain = null;
    this.isRunning = false;
  }
}

/**
 * EMF Meter Tone Generator
 */
export class EMFToneEngine {
  private ctx: AudioContext;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isPlaying: boolean = false;

  constructor() {
    this.ctx = getAudioContext();
  }

  public start(): void {
    if (this.isPlaying) return;
    this.ctx = getAudioContext();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.osc = this.ctx.createOscillator();
    this.osc.type = 'triangle';
    this.osc.frequency.value = 280;

    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;

    this.osc.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    this.osc.start();
    this.isPlaying = true;
  }

  public update(milligauss: number, isAudible: boolean): void {
    if (!this.isPlaying || !this.osc || !this.gain) return;
    const now = this.ctx.currentTime;
    if (!isAudible) {
      this.gain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    const freq = Math.min(1800, 260 + milligauss * 90);
    const targetGain = milligauss > 2.0 ? Math.min(0.12, 0.02 + (milligauss / 15) * 0.08) : 0.005;
    
    this.osc.frequency.setTargetAtTime(freq, now, 0.04);
    this.gain.gain.setTargetAtTime(targetGain, now, 0.04);
  }

  public stop(): void {
    if (!this.isPlaying) return;
    try {
      this.osc?.stop();
      this.osc?.disconnect();
      this.gain?.disconnect();
    } catch {
      // Ignore
    }
    this.osc = null;
    this.gain = null;
    this.isPlaying = false;
  }
}
