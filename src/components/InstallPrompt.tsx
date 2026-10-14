import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  useEffect(() => {
    // Check if app is running as standalone PWA
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowAndroidGuide(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('Install error:', err);
      setShowAndroidGuide(true);
    }
  };

  if (isStandalone) {
    return null; // Already installed and running as native app
  }

  return (
    <>
      {showBanner && (
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-4 py-3 shadow-lg flex items-center justify-between transition-all">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">Installer på telefonen</p>
              <p className="text-[11px] text-blue-100">Raskere oppstart & 100% offline tilgang</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-white text-blue-900 font-semibold text-xs rounded-lg shadow-sm hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Installer
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 text-white/80 hover:text-white"
              aria-label="Lukk"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Guide modal if browser didn't fire beforeinstallprompt automatically */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Installer på Android</h3>
                  <p className="text-xs text-slate-500">Slik legger du til appen</p>
                </div>
              </div>
              <button
                onClick={() => setShowAndroidGuide(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">1</span>
                <span>Trykk på <strong>meny-ikonet (tre prikker ⋮)</strong> øverst til høyre i Google Chrome / Edge på telefonen.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">2</span>
                <span>Velg <strong>«Legg til på startskjermen»</strong> eller <strong>«Installer app»</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">3</span>
                <span>Appen vil nå ligge blant appene dine og fungere lynraskt 100% uten internett.</span>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs rounded-xl transition-colors shadow-sm"
            >
              Forstått
            </button>
          </div>
        </div>
      )}
    </>
  );
};
