import { Check, Copy, Mail, MessageCircle, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Translations } from '../game/i18n';
import { soundEngine } from '../game/sound';

const FALLBACK_SHARE_URL =
  'https://ais-pre-qtjtrbeztzuk3rphx4kfw3-92334257386.europe-west2.run.app';

export function getShareableAppUrl(): string {
  if (typeof window === 'undefined') return FALLBACK_SHARE_URL;
  const { protocol, hostname, origin } = window.location;
  if (
    (protocol === 'https:' || protocol === 'http:') &&
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1'
  ) {
    return origin;
  }
  return FALLBACK_SHARE_URL;
}

interface ShareAppModalProps {
  open: boolean;
  t: Translations;
  onClose: () => void;
}

export function ShareAppModal({ open, t, onClose }: ShareAppModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const shareUrl = getShareableAppUrl();
  const shareText = t.shareMessageText(shareUrl);
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(t.emailSubject)}&body=${encodeURIComponent(shareText)}`;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    soundEngine.playClick();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        throw new Error('Clipboard unavailable');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        // Ignore fallback failure
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const handleNativeShare = async () => {
    soundEngine.playClick();
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: '3mo.doma',
        text: shareText,
        url: shareUrl,
      });
    } catch {
      // User dismissed or native share blocked inside iframe; modal options remain ready
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="animate-overlay-in w-full max-w-[390px] rounded-2xl bg-[#0D1420] border border-[#22FF88]/30 p-5 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.72)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-start">
            <h3
              id="share-modal-title"
              className="font-display text-lg sm:text-xl font-bold text-slate-50 leading-tight"
            >
              {t.shareModalTitle}
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400 leading-relaxed">
              {t.shareModalDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[#162032] hover:bg-[#1E2B42] border border-white/10 text-slate-300 hover:text-white shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selectable URL + Copy Button */}
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            readOnly
            dir="ltr"
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={t.shareModalTitle}
            className="flex-1 min-w-0 h-11 px-3 rounded-xl bg-[#070B12] border border-white/12 text-slate-200 font-mono-nums text-xs select-all focus:outline-none focus:border-[#22FF88]/60"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 transition-colors duration-150 ${
              copied
                ? 'bg-[#22FF88] text-[#051B0F]'
                : 'bg-[#22FF88]/16 hover:bg-[#22FF88]/26 border border-[#22FF88]/40 text-[#22FF88]'
            }`}
          >
            {copied ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
            <span>{copied ? t.linkCopied : t.copyLink}</span>
          </button>
        </div>

        {/* Direct Send Options: WhatsApp, Email, Native Share */}
        <div className="mt-3.5 flex flex-col gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => soundEngine.playClick()}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-sm whitespace-nowrap transition-colors duration-150"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>{t.sendWhatsApp}</span>
          </a>

          <a
            href={emailHref}
            onClick={() => soundEngine.playClick()}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-[#162032] hover:bg-[#1E2B42] border border-white/12 text-slate-100 font-semibold text-sm whitespace-nowrap transition-colors duration-150"
          >
            <Mail className="w-4 h-4 shrink-0 text-[#22FF88]" />
            <span>{t.sendEmail}</span>
          </a>

          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-[#111927] hover:bg-[#192438] border border-white/12 text-slate-200 font-semibold text-sm whitespace-nowrap transition-colors duration-150"
            >
              <Share2 className="w-4 h-4 shrink-0 text-[#22FF88]" />
              <span>{t.shareViaDevice}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
