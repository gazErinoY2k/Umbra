/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Wake Lock controller
let wakeLockSentinel: { release: () => Promise<void> } | null = null;

export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel = sentinel as unknown as { release: () => Promise<void> };
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function releaseScreenWakeLock(): void {
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch {
      // Ignore
    }
    wakeLockSentinel = null;
  }
}

// Flashlight / Torch controller on MediaStream
export async function setTorch(stream: MediaStream | null, enabled: boolean): Promise<boolean> {
  if (!stream) return false;
  try {
    const track = stream.getVideoTracks()[0];
    if (!track) return false;
    // Check capabilities if available
    const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : null;
    // @ts-expect-error torch capability
    if (capabilities && !capabilities.torch) {
      return false;
    }
    await track.applyConstraints({
      // @ts-expect-error torch constraint
      advanced: [{ torch: enabled }]
    });
    return true;
  } catch {
    return false;
  }
}

// Magnetometer Sensor with fallback to DeviceOrientation
export class MagnetometerSensorManager {
  private sensor: unknown = null;
  private onReadingCallback: ((mg: number, source: string) => void) | null = null;
  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;
  private isListening: boolean = false;

  public start(onReading: (mg: number, source: string) => void): void {
    this.onReadingCallback = onReading;
    this.isListening = true;

    // 1. Try native W3C Magnetometer Sensor API
    if (typeof window !== 'undefined' && 'Magnetometer' in window) {
      try {
        // @ts-expect-error W3C Magnetometer
        this.sensor = new window.Magnetometer({ frequency: 20 });
        // @ts-expect-error W3C Magnetometer
        this.sensor.onreading = () => {
          if (!this.sensor || !this.isListening) return;
          // @ts-expect-error sensor axes in microteslas
          const x = this.sensor.x || 0;
          // @ts-expect-error sensor axes in microteslas
          const y = this.sensor.y || 0;
          // @ts-expect-error sensor axes in microteslas
          const z = this.sensor.z || 0;
          // 1 microtesla (uT) = 10 milligauss (mG)
          const totalUt = Math.hypot(x, y, z);
          const mg = totalUt * 10;
          this.onReadingCallback?.(mg, 'Device Magnetometer (uT)');
        };
        // @ts-expect-error start
        this.sensor.start();
        return;
      } catch {
        // Fallback below
      }
    }

    // 2. Fallback to DeviceOrientation / Compass heading fluctuations
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      let lastAlpha = 0;
      this.orientationHandler = (e: DeviceOrientationEvent) => {
        if (!this.isListening) return;
        const alpha = e.alpha ?? 0;
        const delta = Math.abs(alpha - lastAlpha);
        lastAlpha = alpha;
        // Map delta to magnetic drift reading
        const simulatedMg = 1.0 + (delta % 4) * 0.8;
        this.onReadingCallback?.(simulatedMg, 'Compass Orientation Sensor');
      };
      window.addEventListener('deviceorientation', this.orientationHandler, true);
    }
  }

  public stop(): void {
    this.isListening = false;
    if (this.sensor) {
      try {
        // @ts-expect-error stop
        this.sensor.stop();
      } catch {
        // Ignore
      }
      this.sensor = null;
    }
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler, true);
      this.orientationHandler = null;
    }
    this.onReadingCallback = null;
  }
}
