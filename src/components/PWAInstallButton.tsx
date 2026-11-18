import { Download } from 'lucide-react';
import { useState } from 'react';
import { Translations } from '../game/i18n';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  t: Translations;
}

export function PWAInstallButton({ t }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title={t.installApp}
        className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg bg-[#22FF88]/14 hover:bg-[#22FF88]/22 border border-[#22FF88]/40 text-[#22FF88] text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{t.installApp}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title={t.installIOS}
          className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 rounded-lg bg-[#0F1623] border border-white/12 text-slate-200 hover:text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150"
        >
          <Download className="w-3.5 h-3.5 shrink-0 text-[#22FF88]" />
          <span className="hidden sm:inline">{t.installIOS}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-xl bg-[#0D1420] border border-white/14 p-6 shadow-2xl">
              <h3 className="font-display text-lg font-bold text-slate-50">
                {t.installIOSTitle}
              </h3>
              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                {t.installIOSStep1}
                <br />
                {t.installIOSStep2}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-[#22FF88] py-2.5 text-sm font-bold text-[#051B0F] hover:bg-[#3DFF98] transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
