import { ArrowLeft, ArrowRight, Grid, Play, RotateCcw, Share2, Trophy } from 'lucide-react';
import { Translations } from '../game/i18n';
import { HudSnapshot, Language } from '../game/types';
import { LevelSelectScreen } from './LevelSelectScreen';

interface GameOverlaysProps {
  hud: HudSnapshot;
  lang: Language;
  t: Translations;
  onOpenLevelSelect: () => void;
  onBackToHome: () => void;
  onSelectLevel: (level: number) => void;
  onStartNewGame: () => void;
  onRetryLevel: () => void;
  onResume: () => void;
  onNextLevel: () => void;
  onOpenShare: () => void;
}

function formatBestTime(seconds: number | null): string {
  if (seconds === null) return '—';
  return `${seconds.toFixed(1)}s`;
}

export function GameOverlays({
  hud,
  lang,
  t,
  onOpenLevelSelect,
  onBackToHome,
  onSelectLevel,
  onStartNewGame,
  onRetryLevel,
  onResume,
  onNextLevel,
  onOpenShare,
}: GameOverlaysProps) {
  if (hud.status === 'PLAYING') {
    return null;
  }

  if (hud.status === 'LEVEL_SELECT') {
    return (
      <LevelSelectScreen
        lang={lang}
        t={t}
        maxLevels={hud.maxLevels}
        unlockedLevel={hud.unlockedLevel}
        completedLevels={hud.completedLevels}
        onSelectLevel={onSelectLevel}
        onBackToHome={onBackToHome}
      />
    );
  }

  const hasAnyStats =
    hud.highScore > 0 || hud.totalApplesEaten > 0 || hud.completedLevels.length > 0;
  const NextArrow = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-6 ${
        hud.status === 'START'
          ? 'bg-[#060A11]/20'
          : 'bg-[#060A11]/80 backdrop-blur-[5px]'
      }`}
    >
      {hud.status === 'START' && (
        <div className="animate-overlay-in w-full max-w-[395px] max-h-full overflow-y-auto rounded-2xl bg-[#090F1A]/78 backdrop-blur-[4px] border border-[#22FF88]/28 p-5 sm:p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.68),0_0_40px_rgba(34,255,136,0.1)]">
          <h2
            dir="ltr"
            className="font-display text-4xl sm:text-[3.25rem] font-extrabold tracking-tight text-slate-50 leading-none [text-wrap:balance] drop-shadow-[0_0_24px_rgba(34,255,136,0.48)]"
          >
            3mo<span className="text-[#22FF88]">.</span>doma
          </h2>

          <p className="mt-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t.homeSubtitle}
          </p>

          {hasAnyStats && (
            <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] sm:text-[11px] text-slate-400">{t.highScore}</div>
                <div dir="ltr" className="font-mono-nums text-xs sm:text-sm font-bold text-[#22FF88] mt-0.5">
                  {hud.highScore.toLocaleString()}
                </div>
              </div>
              <div className="border-x border-white/10 px-1.5">
                <div className="text-[10px] sm:text-[11px] text-slate-400">{t.level}</div>
                <div dir="ltr" className="font-mono-nums text-xs sm:text-sm font-bold text-slate-100 mt-0.5">
                  {hud.unlockedLevel} / {hud.maxLevels}
                </div>
              </div>
              <div>
                <div className="text-[10px] sm:text-[11px] text-slate-400">{t.totalApples}</div>
                <div dir="ltr" className="font-mono-nums text-xs sm:text-sm font-bold text-slate-100 mt-0.5">
                  {hud.totalApplesEaten.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenLevelSelect}
            className="mt-5 sm:mt-6 w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#22FF88] to-[#14E074] hover:from-[#42FF9A] hover:to-[#22FF88] active:scale-[0.99] text-[#051B0F] font-display text-base sm:text-lg font-extrabold tracking-wide whitespace-nowrap shrink-0 transition-all duration-150 shadow-[0_0_28px_rgba(34,255,136,0.38)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Play className="w-5 h-5 fill-current shrink-0" />
            <span>{t.startButton}</span>
          </button>

          <button
            type="button"
            onClick={onOpenShare}
            className="mt-2.5 w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#131C2B] hover:bg-[#1A263A] border border-white/12 text-slate-200 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
          >
            <Share2 className="w-4 h-4 text-[#22FF88] shrink-0" />
            <span>{t.shareAppTitle}</span>
          </button>

          <p className="mt-3.5 text-[11px] sm:text-xs text-slate-400">
            {t.controlsHintDesktop}
          </p>
        </div>
      )}

      {hud.status === 'PAUSED' && (
        <div className="animate-overlay-in w-full max-w-[340px] max-h-full overflow-y-auto rounded-2xl bg-[#0D1420]/96 border border-white/14 p-5 sm:p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-50 leading-tight">
            {t.paused}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            {t.level} <span dir="ltr">{hud.level} / {hud.maxLevels}</span> · {t.apples}:{' '}
            <span dir="ltr">{hud.applesEatenLevel}/{hud.applesRequired}</span>
          </p>

          <div className="mt-5 sm:mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#22FF88] to-[#14E074] hover:from-[#42FF9A] hover:to-[#22FF88] text-[#051B0F] font-display text-sm font-bold tracking-wide whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>{t.resume}</span>
            </button>

            <button
              type="button"
              onClick={onRetryLevel}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#162032] hover:bg-[#1E2B42] border border-white/10 text-slate-200 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>{t.retryLevel(hud.level)}</span>
            </button>

            <button
              type="button"
              onClick={onOpenLevelSelect}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#111927] hover:bg-[#192438] border border-white/10 text-slate-300 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
            >
              <Grid className="w-4 h-4 shrink-0" />
              <span>{t.backToLevels}</span>
            </button>
          </div>
        </div>
      )}

      {hud.status === 'LEVEL_COMPLETE' && (
        <div className="animate-overlay-in w-full max-w-[385px] max-h-full overflow-y-auto rounded-2xl bg-[#0D1420]/96 border border-[#22FF88]/30 p-4 sm:p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
          <div className="text-[11px] sm:text-xs font-medium text-[#22FF88]">
            {t.levelClearedTag(hud.level, hud.maxLevels)}
          </div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-slate-50 leading-tight">
            {t.levelCompleteTitle}
          </h2>

          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10 grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] sm:text-xs text-slate-400">{t.clearTime}</div>
              <div dir="ltr" className="font-mono-nums text-sm sm:text-base font-bold text-slate-100 mt-0.5">
                {formatBestTime(hud.lastLevelClearTime)}
              </div>
            </div>
            <div className="border-x border-white/10 px-1">
              <div className="text-[10px] sm:text-xs text-slate-400">{t.timeBonus}</div>
              <div dir="ltr" className="font-mono-nums text-sm sm:text-base font-bold text-[#22FF88] mt-0.5">
                +{hud.lastTimeBonus}
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-xs text-slate-400">
                {t.best} {hud.isNewBestTime ? `· ${t.newBadge}` : ''}
              </div>
              <div dir="ltr" className="font-mono-nums text-sm sm:text-base font-bold text-amber-300 mt-0.5">
                {formatBestTime(hud.bestTime)}
              </div>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10 text-start space-y-1 sm:space-y-1.5">
            <div className="text-xs font-semibold text-slate-200">
              {t.upNextLevel(hud.nextLevelConfig.level, hud.maxLevels)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t.target}</span>
              <span className="font-mono-nums text-slate-100">
                {t.applesAndTimer(hud.nextLevelConfig.applesRequired, hud.nextLevelConfig.timeLimitSeconds)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t.paceAndObstacles}</span>
              <span className="font-mono-nums text-slate-100">
                {t.paceLabel(hud.nextLevelConfig.speedLabel)} ·{' '}
                {t.hazardsSummary(
                  hud.nextLevelConfig.obstacleCount,
                  hud.nextLevelConfig.trapCount
                )}
              </span>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onNextLevel}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 sm:py-3 px-6 rounded-xl bg-gradient-to-r from-[#22FF88] to-[#14E074] hover:from-[#42FF9A] hover:to-[#22FF88] active:scale-[0.99] text-[#051B0F] font-display text-sm sm:text-base font-bold tracking-wide whitespace-nowrap shrink-0 transition-all duration-150 shadow-[0_0_22px_rgba(34,255,136,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span>{t.nextLevel}</span>
              <NextArrow className="w-4 h-4 shrink-0" />
            </button>

            <button
              type="button"
              onClick={onOpenLevelSelect}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#162032] hover:bg-[#1E2B42] border border-white/10 text-slate-200 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
            >
              <Grid className="w-4 h-4 shrink-0" />
              <span>{t.backToLevels}</span>
            </button>
          </div>
        </div>
      )}

      {hud.status === 'CAMPAIGN_COMPLETE' && (
        <div className="animate-overlay-in w-full max-w-[385px] max-h-full overflow-y-auto rounded-2xl bg-[#0D1420]/96 border border-[#22FF88]/40 p-5 sm:p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#22FF88]/15 text-[#22FF88] mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="text-xs font-medium text-[#22FF88]">
            {t.allLevelsCleared(hud.maxLevels)}
          </div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-slate-50 leading-tight">
            {t.masterVictoryTitle}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            {t.masterVictoryDesc}
          </p>

          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-400">{t.finalScore}</div>
              <div dir="ltr" className="font-mono-nums text-lg font-bold text-slate-50 mt-0.5">
                {hud.score.toLocaleString()}
              </div>
            </div>
            <div className="border-s border-white/10">
              <div className="text-[11px] text-slate-400">{t.bestTime}</div>
              <div dir="ltr" className="font-mono-nums text-lg font-bold text-[#22FF88] mt-0.5">
                {formatBestTime(hud.bestTime)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={onOpenLevelSelect}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-[#22FF88] to-[#14E074] hover:from-[#42FF9A] hover:to-[#22FF88] text-[#051B0F] font-display text-sm sm:text-base font-bold tracking-wide whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Grid className="w-4 h-4 shrink-0" />
              <span>{t.backToLevels}</span>
            </button>

            <button
              type="button"
              onClick={onStartNewGame}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#162032] hover:bg-[#1E2B42] border border-white/10 text-slate-200 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>{t.startNewGame}</span>
            </button>
          </div>
        </div>
      )}

      {hud.status === 'GAME_OVER' && (
        <div className="animate-overlay-in w-full max-w-[380px] max-h-full overflow-y-auto rounded-2xl bg-[#0D1420]/96 border border-[#FF3855]/35 p-4 sm:p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
          <div className="text-[11px] sm:text-xs font-medium text-[#FF3855]">
            {hud.gameOverReason === 'TIME'
              ? t.timeExpiredTag
              : hud.gameOverReason === 'TRAP'
                ? t.trapTriggeredTag
                : t.collisionTag}
          </div>
          <h2 className="mt-0.5 sm:mt-1 font-display text-2xl sm:text-[2.15rem] font-extrabold text-slate-50 leading-tight">
            {t.gameOverTitle}
          </h2>
          <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-400">
            {t.gameOverReason(hud.gameOverReason)}
          </p>

          <div className="mt-3.5 sm:mt-5 pt-3 sm:pt-4 border-t border-white/10 grid grid-cols-2 gap-y-3 sm:gap-y-4 gap-x-3">
            <div>
              <div className="text-[11px] sm:text-xs text-slate-400">{t.level}</div>
              <div dir="ltr" className="font-mono-nums text-base sm:text-lg font-bold text-slate-100 mt-0.5">
                {hud.level} / {hud.maxLevels}
              </div>
            </div>
            <div className="border-s border-white/10">
              <div className="text-[11px] sm:text-xs text-slate-400">
                {t.highScore} {hud.isNewBest ? `· ${t.newBadge}` : ''}
              </div>
              <div dir="ltr" className="font-mono-nums text-base sm:text-lg font-bold text-[#22FF88] mt-0.5">
                {hud.highScore.toLocaleString()}
              </div>
            </div>
            <div className="pt-2.5 sm:pt-3 border-t border-white/8">
              <div className="text-[11px] sm:text-xs text-slate-400">{t.totalApples}</div>
              <div dir="ltr" className="font-mono-nums text-sm sm:text-base font-bold text-[#FF3855] mt-0.5">
                {hud.totalApplesEaten.toLocaleString()}
              </div>
            </div>
            <div className="pt-2.5 sm:pt-3 border-t border-white/8 border-s border-white/10">
              <div className="text-[11px] sm:text-xs text-slate-400">{t.bestTime}</div>
              <div dir="ltr" className="font-mono-nums text-sm sm:text-base font-bold text-slate-100 mt-0.5">
                {formatBestTime(hud.bestTime)}
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onRetryLevel}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 sm:py-3 px-6 rounded-xl bg-gradient-to-r from-[#22FF88] to-[#14E074] hover:from-[#42FF9A] hover:to-[#22FF88] active:scale-[0.99] text-[#051B0F] font-display text-sm sm:text-base font-bold tracking-wide whitespace-nowrap shrink-0 transition-all duration-150 shadow-[0_0_22px_rgba(34,255,136,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>{t.retry}</span>
            </button>

            <button
              type="button"
              onClick={onOpenLevelSelect}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#162032] hover:bg-[#1E2B42] border border-white/10 text-slate-200 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
            >
              <Grid className="w-4 h-4 shrink-0" />
              <span>{t.backToLevels}</span>
            </button>
          </div>

          <p className="mt-2 sm:mt-3 text-[11px] sm:text-xs text-slate-500">
            {t.pressEnterRetry(hud.level)}
          </p>
        </div>
      )}
    </div>
  );
}
