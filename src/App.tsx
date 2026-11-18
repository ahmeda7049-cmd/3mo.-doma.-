import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GameOverlays } from './components/GameOverlays';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ShareAppModal } from './components/ShareAppModal';
import { VirtualJoystick } from './components/VirtualJoystick';
import { SnakeGameEngine } from './game/engine';
import { getTranslations } from './game/i18n';
import { MAX_LEVELS, getLevelConfig } from './game/levels';
import { soundEngine } from './game/sound';
import { loadSavedProgress, saveLanguagePreference } from './game/storage';
import { HudSnapshot, Language } from './game/types';

function createInitialHud(): HudSnapshot {
  const saved = loadSavedProgress();
  const levelCfg = getLevelConfig(saved.currentLevel);
  return {
    status: 'START',
    score: saved.campaignScore,
    highScore: saved.highScore,
    isNewBest: false,
    level: saved.currentLevel,
    maxLevels: MAX_LEVELS,
    unlockedLevel: saved.unlockedLevel,
    completedLevels: [...saved.completedLevels],
    applesEatenLevel: 0,
    applesRequired: levelCfg.applesRequired,
    totalApplesEaten: saved.totalApples,
    timeRemaining: levelCfg.timeLimitSeconds,
    timeLimit: levelCfg.timeLimitSeconds,
    lastLevelClearTime: null,
    bestTime: saved.bestTime,
    isNewBestTime: false,
    gameOverReason: null,
    lastTimeBonus: 0,
    currentLevelConfig: levelCfg,
    nextLevelConfig: getLevelConfig(Math.min(MAX_LEVELS, saved.currentLevel + 1)),
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SnakeGameEngine | null>(null);
  const swipeOriginRef = useRef<{ x: number; y: number } | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(() => createInitialHud());
  const [lang, setLang] = useState<Language>(() => loadSavedProgress().language);
  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [showDesktopJoystick, setShowDesktopJoystick] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [boardSize, setBoardSize] = useState<number>(520);

  const t = getTranslations(lang);

  // Apply RTL/LTR direction and document language cleanly whenever language changes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    saveLanguagePreference(lang);
  }, [lang]);

  // Initialize Snake Game Engine once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new SnakeGameEngine(canvas, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    engine.resize(boardSize);
    engine.startLoop();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamically size the centered square board to maximize viewport presence without overflow
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateBoardSize = () => {
      const rect = stage.getBoundingClientRect();
      const pad = 12;
      const availableW = Math.max(240, rect.width - pad * 2);
      const availableH = Math.max(240, rect.height - pad * 2);
      const nextSize = Math.floor(Math.min(availableW, availableH, 760));
      setBoardSize(nextSize);
      engineRef.current?.resize(nextSize);
    };

    updateBoardSize();
    const observer = new ResizeObserver(updateBoardSize);
    observer.observe(stage);
    window.addEventListener('resize', updateBoardSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBoardSize);
    };
  }, [showDesktopJoystick]);

  // Keyboard controls: Arrow keys + WASD + Space/Enter + P/Escape
  useEffect(() => {
    const mapKey = (key: string): 'up' | 'down' | 'left' | 'right' | null => {
      switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          return 'up';
        case 'ArrowDown':
        case 's':
        case 'S':
          return 'down';
        case 'ArrowLeft':
        case 'a':
        case 'A':
          return 'left';
        case 'ArrowRight':
        case 'd':
        case 'D':
          return 'right';
        default:
          return null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const dir = mapKey(e.key);
      if (dir) {
        e.preventDefault();
        soundEngine.unlock();
        engine.setKeyState(dir, true);
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        const status = engine.getStatus();
        if (status === 'PLAYING' || status === 'PAUSED') {
          e.preventDefault();
          engine.togglePause();
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        const status = engine.getStatus();
        if (status === 'START') {
          e.preventDefault();
          engine.openLevelSelect();
        } else if (status === 'GAME_OVER') {
          e.preventDefault();
          engine.retryCurrentLevel();
        } else if (status === 'CAMPAIGN_COMPLETE') {
          e.preventDefault();
          engine.openLevelSelect();
        } else if (status === 'LEVEL_COMPLETE') {
          e.preventDefault();
          engine.startNextLevel();
        } else if (status === 'PAUSED') {
          e.preventDefault();
          engine.togglePause();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const dir = mapKey(e.key);
      if (dir) {
        engine.setKeyState(dir, false);
      }
    };

    const onBlur = () => {
      engineRef.current?.clearHeldKeys();
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Touch swipe handlers on the playing board (supports continuous chained swipes without lifting finger)
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    soundEngine.unlock();
    const tTouch = e.touches[0];
    swipeOriginRef.current = { x: tTouch.clientX, y: tTouch.clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!swipeOriginRef.current || e.touches.length === 0) return;
    const tTouch = e.touches[0];
    const dx = tTouch.clientX - swipeOriginRef.current.x;
    const dy = tTouch.clientY - swipeOriginRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist >= 24) {
      const angle = Math.atan2(dy, dx);
      engineRef.current?.applySwipeAngle(angle);
      swipeOriginRef.current = { x: tTouch.clientX, y: tTouch.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    swipeOriginRef.current = null;
  }, []);

  const handleJoystickChange = useCallback((angle: number, active: boolean) => {
    if (active) {
      soundEngine.unlock();
    }
    engineRef.current?.setJoystick(angle, active);
  }, []);

  const handleOpenLevelSelect = useCallback(() => {
    engineRef.current?.openLevelSelect();
  }, []);

  const handleSelectLevel = useCallback((level: number) => {
    engineRef.current?.playLevel(level);
  }, []);

  const handleStartNewGame = useCallback(() => {
    engineRef.current?.startNewGame();
  }, []);

  const handleRetryLevel = useCallback(() => {
    engineRef.current?.retryCurrentLevel();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleNextLevel = useCallback(() => {
    engineRef.current?.startNextLevel();
  }, []);

  const handleGoHome = useCallback(() => {
    engineRef.current?.returnToHome();
  }, []);

  const handleChangeLanguage = useCallback((nextLang: Language) => {
    soundEngine.playClick();
    setLang(nextLang);
  }, []);

  const handleToggleMute = useCallback(() => {
    const nowMuted = soundEngine.toggleMute();
    setMuted(nowMuted);
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleToggleDesktopJoystick = useCallback(() => {
    soundEngine.playClick();
    setShowDesktopJoystick((prev) => !prev);
  }, []);

  const handleOpenShare = useCallback(() => {
    soundEngine.playClick();
    if (engineRef.current?.getStatus() === 'PLAYING') {
      engineRef.current.togglePause();
    }
    setShareModalOpen(true);
  }, []);

  const timerRatio = hud.timeLimit > 0 ? Math.max(0, Math.min(1, hud.timeRemaining / hud.timeLimit)) : 0;
  const timerBarColor =
    hud.status === 'PLAYING' && hud.timeRemaining <= 5
      ? 'bg-[#FF3855]'
      : hud.status === 'PLAYING' && hud.timeRemaining <= 10
        ? 'bg-amber-400'
        : 'bg-[#22FF88]';

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-[#070B12] text-slate-100">
      {/* Top Bar & Game HUD */}
      <GameHud
        hud={hud}
        lang={lang}
        t={t}
        muted={muted}
        showDesktopJoystick={showDesktopJoystick}
        onChangeLanguage={handleChangeLanguage}
        onToggleMute={handleToggleMute}
        onTogglePause={handleTogglePause}
        onToggleDesktopJoystick={handleToggleDesktopJoystick}
        onGoHome={handleGoHome}
        onOpenLevels={handleOpenLevelSelect}
        onOpenShare={handleOpenShare}
      />

      {/* Main Arena Stage */}
      <main className="flex-1 min-h-0 w-full max-w-[1220px] mx-auto px-3 sm:px-6 pb-2 sm:pb-4 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
        {/* Centered Square Game Board Container (keep dir="ltr" on board geometry) */}
        <div
          ref={stageRef}
          className="flex-1 min-h-0 min-w-0 w-full h-full flex items-center justify-center"
        >
          <div
            style={{ width: boardSize, height: boardSize, touchAction: 'none' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className="relative rounded-2xl overflow-hidden bg-[#070C14] border border-[#22FF88]/28 shadow-[0_0_48px_rgba(34,255,136,0.08),0_20px_50px_rgba(0,0,0,0.65)] shrink-0"
          >
            {/* Subtle top countdown progress hairline */}
            <div dir="ltr" className="absolute top-0 left-0 right-0 h-[3px] bg-white/6 z-10 pointer-events-none">
              <div
                className={`h-full origin-left transition-colors duration-200 ${timerBarColor}`}
                style={{
                  transform: `scaleX(${
                    hud.status === 'START' || hud.status === 'LEVEL_SELECT' ? 1 : timerRatio
                  })`,
                }}
              />
            </div>

            {/* High-DPI Fluid Canvas */}
            <canvas
              ref={canvasRef}
              dir="ltr"
              className="block w-full h-full"
              aria-label="3mo.doma Snake game board"
            />

            {/* Game State Overlays (Home, Level Select, Pause, Level Complete, Campaign Complete, Game Over) */}
            <GameOverlays
              hud={hud}
              lang={lang}
              t={t}
              onOpenLevelSelect={handleOpenLevelSelect}
              onBackToHome={handleGoHome}
              onSelectLevel={handleSelectLevel}
              onStartNewGame={handleStartNewGame}
              onRetryLevel={handleRetryLevel}
              onResume={handleResume}
              onNextLevel={handleNextLevel}
              onOpenShare={handleOpenShare}
            />
          </div>
        </div>

        {/* Desktop Optional Side Virtual Joystick (toggleable from header icon) */}
        {showDesktopJoystick && (
          <aside className="hidden md:flex flex-col items-center justify-center shrink-0 w-[168px] py-5 px-4 rounded-2xl bg-[#0B111C] border border-white/8">
            <VirtualJoystick
              onChange={handleJoystickChange}
              disabled={hud.status !== 'PLAYING'}
              size={132}
            />
            <span className="mt-3 text-xs text-slate-400 text-center">
              {t.analogStick}
            </span>
          </aside>
        )}

        {/* Mobile Bottom Control Dock: On-Screen Virtual Joystick + Swipe Hint */}
        <div className="md:hidden shrink-0 w-full flex items-center justify-between gap-4 px-2 pb-1">
          <div className="flex flex-col justify-center text-start min-w-0">
            <span className="text-xs font-medium text-slate-300">
              {t.best}:{' '}
              <span dir="ltr" className="font-mono-nums font-bold text-[#22FF88]">
                {hud.highScore.toLocaleString()}
              </span>
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              {t.controlsHintMobile}
            </span>
          </div>

          <VirtualJoystick
            onChange={handleJoystickChange}
            disabled={hud.status !== 'PLAYING'}
            size={118}
          />
        </div>
      </main>

      {/* Quiet Single-Line Desktop Footer Controls Hint */}
      <footer className="hidden md:flex items-center justify-center pb-2.5 px-6 text-xs text-slate-500 shrink-0 select-none">
        <span>{t.footerControls}</span>
        <span className="mx-2 text-slate-700" aria-hidden="true">·</span>
        <span>{t.footerPause}</span>
        <span className="mx-2 text-slate-700" aria-hidden="true">·</span>
        <span>
          {t.footerLevelInfo(
            hud.level,
            hud.maxLevels,
            t.paceLabel(hud.currentLevelConfig.speedLabel),
            hud.currentLevelConfig.obstacleCount,
            hud.currentLevelConfig.trapCount
          )}
        </span>
      </footer>

      <OfflineIndicator t={t} />
      <ShareAppModal
        open={shareModalOpen}
        t={t}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}
