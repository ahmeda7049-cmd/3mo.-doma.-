import { Gamepad2, Grid, Home, Pause, Play, Share2, Volume2, VolumeX } from 'lucide-react';
import { Translations } from '../game/i18n';
import { HudSnapshot, Language } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface GameHudProps {
  hud: HudSnapshot;
  lang: Language;
  t: Translations;
  muted: boolean;
  showDesktopJoystick: boolean;
  onChangeLanguage: (lang: Language) => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onToggleDesktopJoystick: () => void;
  onGoHome: () => void;
  onOpenLevels: () => void;
  onOpenShare: () => void;
}

function formatTimer(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function GameHud({
  hud,
  lang,
  t,
  muted,
  showDesktopJoystick,
  onChangeLanguage,
  onToggleMute,
  onTogglePause,
  onToggleDesktopJoystick,
  onGoHome,
  onOpenLevels,
  onOpenShare,
}: GameHudProps) {
  const isPlayingOrPaused = hud.status === 'PLAYING' || hud.status === 'PAUSED';
  const isInSession = hud.status !== 'START';
  const isLowTime = hud.status === 'PLAYING' && hud.timeRemaining <= 10;
  const isCriticalTime = hud.status === 'PLAYING' && hud.timeRemaining <= 5;

  return (
    <header className="w-full max-w-[1220px] mx-auto px-3 sm:px-6 pt-2.5 sm:pt-3.5 pb-2 shrink-0 select-none">
      {/* Main Top Row: Brand — Metrics (desktop) — Language & Utility Controls */}
      <div className="flex items-center justify-between gap-3 sm:gap-6">
        {/* Brand Title */}
        <h1
          dir="ltr"
          className="font-display text-xl sm:text-2xl md:text-[1.7rem] font-extrabold tracking-tight text-slate-50 whitespace-nowrap shrink-0 leading-none drop-shadow-[0_0_12px_rgba(34,255,136,0.28)]"
        >
          3mo<span className="text-[#22FF88]">.</span>doma
        </h1>

        {/* Desktop Centered Unboxed Telemetry Strip */}
        <div className="hidden lg:flex items-center gap-5 xl:gap-7 shrink-0">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 leading-none mb-1">
              {t.score}
            </span>
            <span dir="ltr" className="font-mono-nums text-base xl:text-lg font-bold text-slate-50 leading-none">
              {hud.score.toLocaleString()}
            </span>
          </div>

          <div className="h-7 w-px bg-white/10" aria-hidden="true" />

          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 leading-none mb-1">
              {t.highScore}
            </span>
            <span dir="ltr" className="font-mono-nums text-base xl:text-lg font-bold text-slate-300 leading-none">
              {hud.highScore.toLocaleString()}
            </span>
          </div>

          <div className="h-7 w-px bg-white/10" aria-hidden="true" />

          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 leading-none mb-1">
              {t.level}
            </span>
            <span dir="ltr" className="font-mono-nums text-base xl:text-lg font-bold text-[#22FF88] leading-none whitespace-nowrap">
              {hud.level} <span className="text-slate-500 text-xs font-semibold">/ {hud.maxLevels}</span>
            </span>
          </div>

          <div className="h-7 w-px bg-white/10" aria-hidden="true" />

          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 leading-none mb-1 whitespace-nowrap">
              {t.apples}:{' '}
              <span dir="ltr" className="inline-block">
                <span className="text-slate-100 font-mono-nums font-bold">{hud.applesEatenLevel}</span>
                <span className="text-slate-500 font-mono-nums"> / {hud.applesRequired}</span>
              </span>
            </span>
            <div dir="ltr" className="flex items-center gap-1 mt-1" aria-hidden="true">
              {Array.from({ length: Math.min(hud.applesRequired, 12) }).map((_, idx) => {
                const filled =
                  hud.applesRequired <= 12
                    ? idx < hud.applesEatenLevel
                    : idx < Math.round((hud.applesEatenLevel / hud.applesRequired) * 12);
                return (
                  <span
                    key={idx}
                    className={`h-1.5 w-2.5 rounded-[2px] transition-colors duration-150 ${
                      filled ? 'bg-[#FF2A44]' : 'bg-white/12'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="h-7 w-px bg-white/10" aria-hidden="true" />

          <div className="flex flex-col min-w-[74px]">
            <span className="text-[11px] font-medium text-slate-400 leading-none mb-1">
              {isLowTime ? t.lowTime : t.time}
            </span>
            <span
              dir="ltr"
              className={`font-mono-nums text-base xl:text-lg font-bold leading-none transition-colors duration-150 ${
                isCriticalTime
                  ? 'text-[#FF3855]'
                  : isLowTime
                    ? 'text-amber-400'
                    : 'text-slate-50'
              }`}
            >
              {formatTimer(hud.timeRemaining)}
            </span>
          </div>
        </div>

        {/* Language Switcher + Functional Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Segmented Bilingual Language Switch: عربي | English */}
          <div
            role="group"
            aria-label="Language switch"
            dir="ltr"
            className="flex items-center p-0.5 rounded-lg bg-[#0F1623] border border-white/12 shrink-0"
          >
            <button
              type="button"
              onClick={() => onChangeLanguage('ar')}
              aria-pressed={lang === 'ar'}
              className={`px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors duration-150 ${
                lang === 'ar'
                  ? 'bg-[#22FF88] text-[#051B0F]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              عربي
            </button>
            <button
              type="button"
              onClick={() => onChangeLanguage('en')}
              aria-pressed={lang === 'en'}
              className={`px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors duration-150 ${
                lang === 'en'
                  ? 'bg-[#22FF88] text-[#051B0F]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              English
            </button>
          </div>

          <PWAInstallButton t={t} />

          <button
            type="button"
            onClick={onOpenShare}
            aria-label={t.shareAppTitle}
            title={t.shareAppTitle}
            className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#0F1623] border border-white/10 text-[#22FF88] hover:text-white hover:border-[#22FF88]/40 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {isPlayingOrPaused && (
            <button
              type="button"
              onClick={onOpenLevels}
              aria-label={t.levelsTitle}
              title={t.levelsTitle}
              className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#0F1623] border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
            >
              <Grid className="w-4 h-4" />
            </button>
          )}

          {isInSession && (
            <button
              type="button"
              onClick={onGoHome}
              aria-label={t.homeTitle}
              title={t.homeTitle}
              className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#0F1623] border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
            >
              <Home className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleDesktopJoystick}
            aria-label={showDesktopJoystick ? t.hideJoystickTitle : t.showJoystickTitle}
            aria-pressed={showDesktopJoystick}
            title={showDesktopJoystick ? t.hideJoystickTitle : t.showJoystickTitle}
            className={`hidden md:inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88] ${
              showDesktopJoystick
                ? 'bg-[#22FF88]/15 border-[#22FF88]/45 text-[#22FF88]'
                : 'bg-[#0F1623] border-white/10 text-slate-300 hover:text-white hover:border-white/20'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
          </button>

          {isPlayingOrPaused && (
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={hud.status === 'PAUSED' ? t.resumeTitle : t.pauseTitle}
              title={hud.status === 'PAUSED' ? t.resumeTitle : t.pauseTitle}
              className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#0F1623] border border-white/10 text-slate-200 hover:text-white hover:border-white/20 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
            >
              {hud.status === 'PAUSED' ? (
                <Play className="w-4 h-4 fill-current" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? t.unmuteTitle : t.muteTitle}
            title={muted ? t.unmuteTitle : t.muteTitle}
            className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#0F1623] border border-white/10 text-slate-200 hover:text-white hover:border-white/20 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Compact Responsive HUD Strip for Mobile & Tablet (< lg) */}
      <div className="lg:hidden mt-2 pt-2 border-t border-white/8 grid grid-cols-4 gap-2 text-start">
        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 leading-none truncate">{t.score}</div>
          <div dir="ltr" className="font-mono-nums text-sm font-bold text-slate-50 mt-0.5 truncate">
            {hud.score}
          </div>
        </div>

        <div className="min-w-0 border-s border-white/8 ps-2">
          <div className="text-[10px] text-slate-400 leading-none truncate">{t.level}</div>
          <div dir="ltr" className="font-mono-nums text-sm font-bold text-[#22FF88] mt-0.5 whitespace-nowrap">
            {hud.level}<span className="text-slate-500 text-[11px] font-medium">/{hud.maxLevels}</span>
          </div>
        </div>

        <div className="min-w-0 border-s border-white/8 ps-2">
          <div className="text-[10px] text-slate-400 leading-none truncate">{t.apples}</div>
          <div dir="ltr" className="font-mono-nums text-sm font-bold text-slate-50 mt-0.5">
            <span className="text-[#FF3855]">{hud.applesEatenLevel}</span>
            <span className="text-slate-500 text-xs">/{hud.applesRequired}</span>
          </div>
        </div>

        <div className="min-w-0 border-s border-white/8 ps-2">
          <div className="text-[10px] text-slate-400 leading-none truncate">
            {isLowTime ? t.lowTime : t.time}
          </div>
          <div
            dir="ltr"
            className={`font-mono-nums text-sm font-bold mt-0.5 ${
              isCriticalTime
                ? 'text-[#FF3855]'
                : isLowTime
                  ? 'text-amber-400'
                  : 'text-slate-50'
            }`}
          >
            {formatTimer(hud.timeRemaining)}
          </div>
        </div>
      </div>
    </header>
  );
}
