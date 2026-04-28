'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    if (isIOSDevice) {
      setIsIOS(true);
      // Show iOS install instructions after a short delay
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    const installedHandler = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('fmf-install-dismissed', 'true');
  };

  useEffect(() => {
    // Check if user already dismissed this session
    if (sessionStorage.getItem('fmf-install-dismissed') === 'true') {
      setShowPrompt(false);
    }
  }, []);

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-md mx-auto bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 shadow-2xl shadow-orange-500/30 border border-orange-400/30">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-3 text-white/80 hover:text-white text-xl font-bold leading-none"
          aria-label="Dismiss install prompt"
        >
          ×
        </button>

        <div className="flex items-center gap-3">
          {/* App Icon */}
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <img
              src="/icon-192.png"
              alt="FeedMeForward"
              className="w-10 h-10 rounded-lg"
            />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-sm">
              Install FeedMeForward
            </h3>
            <p className="text-white/90 text-xs mt-0.5">
              {isIOS
                ? 'Tap the Share button, then "Add to Home Screen"'
                : 'Add to your home screen for the full app experience'}
            </p>
          </div>

          {/* Install Button */}
          {!isIOS && (
            <Button
              onClick={handleInstallClick}
              className="bg-white text-orange-600 hover:bg-white/90 font-bold text-xs px-4 py-2 h-auto rounded-xl shadow-lg shrink-0"
            >
              Install
            </Button>
          )}

          {isIOS && (
            <div className="text-white text-2xl shrink-0" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
