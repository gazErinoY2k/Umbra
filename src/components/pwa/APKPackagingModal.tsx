/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle, Copy, Check, FileCode, Layers, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const APKPackagingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'twa' | 'capacitor' | 'obb' | 'direct'>('direct');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://umbra-suite.app';

  const twaManifest = {
    packageId: "app.umbra.paranormal",
    host: typeof window !== 'undefined' ? window.location.hostname : "umbra-suite.app",
    name: "Umbra – Paranormal Investigation Suite",
    launcherName: "Umbra",
    themeColor: "#0b0d11",
    navigationColor: "#0b0d11",
    backgroundColor: "#0b0d11",
    enableNotifications: true,
    startUrl: "/",
    iconUrl: `${currentOrigin}/pwa-512x512.png`,
    maskableIconUrl: `${currentOrigin}/pwa-maskable-512x512.png`,
    appVersionName: "1.0.0",
    appVersionCode: 1,
    shortcuts: [
      {
        name: "Dead Box",
        shortName: "DeadBox",
        url: "/?tool=deadbox",
        icon: `${currentOrigin}/pwa-192x192.png`
      },
      {
        name: "EMF Meter",
        shortName: "EMF",
        url: "/?tool=emf",
        icon: `${currentOrigin}/pwa-192x192.png`
      }
    ],
    features: {
      locationDelegation: { enabled: false },
      playBilling: { enabled: false }
    },
    alphaDependencies: { enabled: false }
  };

  const capacitorConfig = {
    appId: "app.umbra.paranormal",
    appName: "Umbra",
    webDir: "dist",
    bundledWebRuntime: false,
    plugins: {
      SplashScreen: {
        launchAutoHide: false,
        backgroundColor: "#0b0d11"
      }
    },
    server: {
      url: currentOrigin,
      cleartext: true
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Ignore
    }
  };

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#141820] border border-[#c0a062]/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262c38] bg-[#0f1218]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c0a062]/10 border border-[#c0a062]/30 flex items-center justify-center text-[#c0a062]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium tracking-wide text-[#e9e3d3] font-cormorant">
                Install & APK / OBB Packaging Suite
              </h2>
              <p className="text-xs text-[#8b8fa0]">
                Turn Umbra into a standalone Android APK, OBB soundbank, or Home Screen App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#262c38] hover:border-[#c0a062] flex items-center justify-center text-[#8b8fa0] hover:text-[#e9e3d3] transition text-lg"
          >
            ×
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#262c38] bg-[#10131a] px-6 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('direct')}
            className={`py-3 px-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'direct'
                ? 'border-[#c0a062] text-[#c0a062]'
                : 'border-transparent text-[#8b8fa0] hover:text-[#e9e3d3]'
            }`}
          >
            <Smartphone className="w-4 h-4" /> 1-Click Install
          </button>
          <button
            onClick={() => setActiveTab('twa')}
            className={`py-3 px-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'twa'
                ? 'border-[#c0a062] text-[#c0a062]'
                : 'border-transparent text-[#8b8fa0] hover:text-[#e9e3d3]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Android TWA (Bubblewrap)
          </button>
          <button
            onClick={() => setActiveTab('capacitor')}
            className={`py-3 px-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'capacitor'
                ? 'border-[#c0a062] text-[#c0a062]'
                : 'border-transparent text-[#8b8fa0] hover:text-[#e9e3d3]'
            }`}
          >
            <FileCode className="w-4 h-4" /> Capacitor / Android Studio
          </button>
          <button
            onClick={() => setActiveTab('obb')}
            className={`py-3 px-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'obb'
                ? 'border-[#c0a062] text-[#c0a062]'
                : 'border-transparent text-[#8b8fa0] hover:text-[#e9e3d3]'
            }`}
          >
            <Layers className="w-4 h-4" /> OBB Asset Expansion
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-[#e9e3d3]/90">
          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0b0d11] border border-[#262c38]">
                <h3 className="text-base font-medium text-[#c0a062] font-cormorant mb-1">
                  Direct Device Installation
                </h3>
                <p className="text-xs text-[#8b8fa0] leading-relaxed">
                  Umbra is a certified Progressive Web App with offline service worker caching, safe-area hardware notches support, and standalone display. When installed, it launches without a browser address bar, exactly like a native APK.
                </p>

                <div className="mt-4 pt-3 border-t border-[#262c38] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-medium text-[#e9e3d3]">App Status: </span>
                    {isInstalled ? (
                      <span className="text-xs text-[#62b3a8] font-medium flex items-center gap-1 inline-flex">
                        <CheckCircle className="w-3.5 h-3.5" /> Installed & Running Standalone
                      </span>
                    ) : isInstallable ? (
                      <span className="text-xs text-[#c0a062] font-medium">Ready to install on this device</span>
                    ) : (
                      <span className="text-xs text-[#8b8fa0]">Browser install trigger standby</span>
                    )}
                  </div>

                  {isInstallable && !isInstalled && (
                    <button
                      onClick={install}
                      className="px-5 py-2.5 rounded-full bg-[#c0a062] hover:bg-[#d4b679] text-[#0b0d11] font-medium text-xs tracking-wider uppercase transition shadow-lg flex items-center gap-2"
                    >
                      <Smartphone className="w-4 h-4" /> Install Umbra App
                    </button>
                  )}
                </div>
              </div>

              {isIOS && (
                <div className="p-4 rounded-xl bg-[#1a202c] border border-[#2d3748] space-y-2">
                  <h4 className="text-sm font-medium text-[#e9e3d3]">iPhone / iPad Installation:</h4>
                  <ol className="text-xs text-[#8b8fa0] space-y-1 list-decimal list-inside leading-relaxed">
                    <li>Tap the <strong className="text-[#e9e3d3]">Share</strong> button (box with upward arrow) in Safari.</li>
                    <li>Scroll down and tap <strong className="text-[#e9e3d3]">Add to Home Screen</strong>.</li>
                    <li>Umbra will install to your device with its gold occult icon and launch in full-screen standalone mode.</li>
                  </ol>
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#0b0d11]/70 border border-[#262c38] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#c0a062]">
                      1-Click Cloud APK Builder
                    </div>
                    <div className="text-xs text-[#8b8fa0]">
                      Generate a signed Google Play .apk/.aab directly from Microsoft PWABuilder
                    </div>
                  </div>
                  <a
                    href={`https://www.pwabuilder.com?url=${encodeURIComponent(currentOrigin)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-lg border border-[#c0a062]/50 hover:bg-[#c0a062]/10 text-[#c0a062] text-xs font-medium transition"
                  >
                    Open PWABuilder ↗
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'twa' && (
            <div className="space-y-4">
              <p className="text-xs text-[#8b8fa0] leading-relaxed">
                Google’s official Trusted Web Activity (TWA) tool <code className="text-[#c0a062]">bubblewrap</code> compiles this PWA into an authentic release APK or Android App Bundle (AAB) with zero Java code needed.
              </p>

              <div className="p-4 rounded-xl bg-[#0b0d11] border border-[#262c38] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#e9e3d3]">1. Terminal Quick Commands:</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `# Install Google Bubblewrap CLI\nnpm install -g @bubblewrap/cli\n\n# Initialize from Umbra live URL\nbubblewrap init --manifest=${currentOrigin}/manifest.webmanifest\n\n# Build release APK & AAB\nbubblewrap build`,
                        'cli'
                      )
                    }
                    className="flex items-center gap-1 text-xs text-[#c0a062] hover:underline"
                  >
                    {copiedCode === 'cli' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode === 'cli' ? 'Copied' : 'Copy Commands'}
                  </button>
                </div>
                <pre className="text-xs bg-[#07080b] p-3 rounded-lg text-[#62b3a8] font-tech overflow-x-auto border border-[#1b2230]">
                  npm install -g @bubblewrap/cli{"\n"}
                  bubblewrap init --manifest={currentOrigin}/manifest.webmanifest{"\n"}
                  bubblewrap build
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-[#0b0d11] border border-[#262c38] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#e9e3d3]">2. Pre-configured twa-manifest.json</span>
                  <button
                    onClick={() =>
                      downloadFile(
                        'twa-manifest.json',
                        JSON.stringify(twaManifest, null, 2),
                        'application/json'
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#262c38] hover:bg-[#323a4a] text-xs text-[#e9e3d3] transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download twa-manifest.json
                  </button>
                </div>
                <pre className="text-xs bg-[#07080b] p-3 rounded-lg text-[#8b8fa0] font-tech max-h-36 overflow-y-auto border border-[#1b2230]">
                  {JSON.stringify(twaManifest, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'capacitor' && (
            <div className="space-y-4">
              <p className="text-xs text-[#8b8fa0] leading-relaxed">
                If you prefer building in Android Studio with native plugins, use Capacitor to wrap the production build into a native Android Gradle project:
              </p>

              <div className="p-4 rounded-xl bg-[#0b0d11] border border-[#262c38] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#e9e3d3]">Capacitor Build Steps:</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `npm install @capacitor/core @capacitor/cli @capacitor/android\nnpx cap init "Umbra" "app.umbra.paranormal"\nnpm run build\nnpx cap add android\nnpx cap open android`,
                        'cap'
                      )
                    }
                    className="flex items-center gap-1 text-xs text-[#c0a062] hover:underline"
                  >
                    {copiedCode === 'cap' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode === 'cap' ? 'Copied' : 'Copy Steps'}
                  </button>
                </div>
                <pre className="text-xs bg-[#07080b] p-3 rounded-lg text-[#62b3a8] font-tech overflow-x-auto border border-[#1b2230]">
                  npm install @capacitor/core @capacitor/cli @capacitor/android{"\n"}
                  npx cap init "Umbra" "app.umbra.paranormal" --web-dir="dist"{"\n"}
                  npm run build{"\n"}
                  npx cap add android{"\n"}
                  npx cap open android
                </pre>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() =>
                    downloadFile(
                      'capacitor.config.json',
                      JSON.stringify(capacitorConfig, null, 2),
                      'application/json'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#262c38] hover:bg-[#323a4a] text-xs text-[#e9e3d3] transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download capacitor.config.json
                </button>
              </div>
            </div>
          )}

          {activeTab === 'obb' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0b0d11] border border-[#262c38] space-y-2">
                <h3 className="text-sm font-medium text-[#c0a062]">Understanding Android OBB Files</h3>
                <p className="text-xs text-[#8b8fa0] leading-relaxed">
                  In Android development, an <strong className="text-[#e9e3d3]">OBB (Opaque Binary Blob)</strong> is an expansion file stored in <code className="text-[#62b3a8]">Android/obb/app.umbra.paranormal/main.1.app.umbra.paranormal.obb</code>.
                  Google Play uses OBBs when an app bundle exceeds Play Store size limits (usually for large 3D models or hundreds of MBs of audio assets).
                </p>
                <p className="text-xs text-[#8b8fa0] leading-relaxed">
                  For Umbra, our Web Audio synthetic sweep oscillators, white noise buffers, and speech synthesis engine are ultra-lightweight (&lt; 2 MB total), so an OBB file is not strictly mandatory for Google Play submission. However, if you want an offline high-fidelity ambient ghost soundbank or custom dictionary pack, you can package them into an OBB zip container.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0b0d11]/70 border border-[#262c38] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#e9e3d3]">Download Complete APK Packaging Blueprint</span>
                  <button
                    onClick={() => {
                      const guide = `# UMBRA PARANORMAL INVESTIGATION SUITE
## Android APK & OBB Build Guide

### 1. Build via Bubblewrap (Recommended - Easiest & Official Google CLI)
\`\`\`bash
# 1. Install CLI
npm install -g @bubblewrap/cli

# 2. Initialize project from the live PWA manifest
bubblewrap init --manifest="${currentOrigin}/manifest.webmanifest"

# 3. Build APK
bubblewrap build
\`\`\`

### 2. Build via Capacitor (Native Android Studio)
\`\`\`bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Umbra" "app.umbra.paranormal"
npm run build
npx cap add android
npx cap open android
# In Android Studio: Build > Generate Signed Bundle / APK
\`\`\`

### 3. Digital Asset Links (Verification)
Place \`assetlinks.json\` in your host's \`public/.well-known/assetlinks.json\` so Android removes the browser URL bar.

### 4. OBB Expansion File Convention
Directory on Android device:
\`/sdcard/Android/obb/app.umbra.paranormal/main.1.app.umbra.paranormal.obb\`
`;
                      downloadFile('UMBRA_ANDROID_BUILD_GUIDE.md', guide, 'text/markdown');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c0a062] hover:bg-[#d4b679] text-[#0b0d11] font-medium text-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Complete Blueprint (.md)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#262c38] bg-[#0f1218]">
          <span className="text-xs text-[#8b8fa0]">
            Umbra v1.0.0 · Offline Ready
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full border border-[#262c38] hover:border-[#c0a062] text-xs font-medium text-[#e9e3d3] transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
