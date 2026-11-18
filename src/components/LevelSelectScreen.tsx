import { ArrowLeft, ArrowRight, Check, Lock, Star } from 'lucide-react';
import { Translations } from '../game/i18n';
import { Language } from '../game/types';

interface LevelSelectScreenProps {
  lang: Language;
  t: Translations;
  maxLevels: number;
  unlockedLevel: number;
  completedLevels: number[];
  onSelectLevel: (level: number) => void;
  onBackToHome: () => void;
}

export function LevelSelectScreen({
  lang,
  t,
  maxLevels,
  unlockedLevel,
  completedLevels,
  onSelectLevel,
  onBackToHome,
}: LevelSelectScreenProps) {
  const completedSet = new Set(completedLevels);
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  const levels = Array.from({ length: maxLevels }, (_, i) => i + 1);

  return (
    <div className="animate-overlay-in absolute inset-0 z-20 flex flex-col bg-[#070B12]/94 backdrop-blur-[6px] p-3 sm:p-5">
      {/* Header: Back Button + Choose Level Title + Progress Count */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3 rounded-lg bg-[#111927] hover:bg-[#192438] border border-white/12 text-slate-200 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88]"
        >
          <BackArrow className="w-4 h-4 shrink-0" />
          <span>{t.backButton}</span>
        </button>

        <h2 className="font-display text-base sm:text-xl font-extrabold text-slate-50 truncate text-center">
          {t.chooseLevelTitle}
        </h2>

        <div className="text-[11px] sm:text-xs font-medium text-[#22FF88] whitespace-nowrap shrink-0 font-mono-nums">
          {completedLevels.length} / {maxLevels}
        </div>
      </div>

      {/* 50-Level 5-Column Square Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-3 pe-1">
        <div className="grid grid-cols-5 gap-2 sm:gap-2.5 pb-1">
          {levels.map((lvl) => {
            const isCompleted = completedSet.has(lvl);
            const isUnlocked = lvl <= unlockedLevel;
            const isCurrentNext = isUnlocked && !isCompleted;
            const state = isCompleted ? 'completed' : isUnlocked ? 'unlocked' : 'locked';

            return (
              <button
                key={lvl}
                type="button"
                disabled={!isUnlocked}
                onClick={() => isUnlocked && onSelectLevel(lvl)}
                aria-label={t.levelTileAria(lvl, state)}
                className={`relative aspect-square min-h-[44px] rounded-xl flex flex-col items-center justify-center p-1 border transition-all duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22FF88] ${
                  !isUnlocked
                    ? 'bg-[#0E131D]/85 border-white/6 text-slate-600 cursor-not-allowed'
                    : isCompleted
                      ? 'bg-[#0F1E18] hover:bg-[#132920] border-[#22FF88]/45 text-slate-50 shadow-[0_0_14px_rgba(34,255,136,0.12)] active:scale-95'
                      : isCurrentNext
                        ? 'bg-[#12261E] hover:bg-[#173227] border-[#22FF88] text-[#22FF88] shadow-[0_0_18px_rgba(34,255,136,0.24)] active:scale-95'
                        : 'bg-[#111A28] hover:bg-[#182436] border-white/15 text-slate-100 active:scale-95'
                }`}
              >
                {/* Level Number */}
                <span
                  dir="ltr"
                  className={`font-mono-nums text-sm sm:text-base font-bold leading-none ${
                    !isUnlocked ? 'text-slate-500/70' : ''
                  }`}
                >
                  {lvl}
                </span>

                {/* Status Indicator Row */}
                {isCompleted ? (
                  <div className="mt-1 flex items-center gap-1" aria-hidden="true">
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#22FF88] stroke-[3]" />
                    <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400" />
                  </div>
                ) : !isUnlocked ? (
                  <Lock className="mt-1 w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-600" aria-hidden="true" />
                ) : (
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-[#22FF88]" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
