import { MAX_LEVELS } from './levels';
import { Language, SavedProgress } from './types';

const PROGRESS_STORAGE_KEY = '3mo_doma_progress_v1';
const LEGACY_HIGH_SCORE_KEY = '3mo_doma_high_score';

const DEFAULT_PROGRESS: SavedProgress = {
  currentLevel: 1,
  unlockedLevel: 1,
  completedLevels: [],
  highScore: 0,
  totalApples: 0,
  bestTime: null,
  campaignScore: 0,
  language: 'en',
};

export function loadSavedProgress(): SavedProgress {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PROGRESS };
  }

  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    let legacyBest = 0;
    const legacyRaw = window.localStorage.getItem(LEGACY_HIGH_SCORE_KEY);
    if (legacyRaw) {
      const parsedLegacy = parseInt(legacyRaw, 10);
      if (Number.isFinite(parsedLegacy) && parsedLegacy > 0) {
        legacyBest = parsedLegacy;
      }
    }

    if (!raw) {
      return {
        ...DEFAULT_PROGRESS,
        highScore: legacyBest,
      };
    }

    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    const currentLevel =
      typeof parsed.currentLevel === 'number' && Number.isFinite(parsed.currentLevel)
        ? Math.max(1, Math.min(MAX_LEVELS, Math.floor(parsed.currentLevel)))
        : 1;

    const completedLevels = Array.isArray(parsed.completedLevels)
      ? Array.from(
          new Set(
            parsed.completedLevels
              .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
              .map((n) => Math.floor(n))
              .filter((n) => n >= 1 && n <= MAX_LEVELS)
          )
        ).sort((a, b) => a - b)
      : [];

    // Backward-compatible migration: if currentLevel > 1 from older save, mark prior levels unlocked
    const maxCompleted = completedLevels.length > 0 ? completedLevels[completedLevels.length - 1] : 0;
    const rawUnlocked =
      typeof parsed.unlockedLevel === 'number' && Number.isFinite(parsed.unlockedLevel)
        ? Math.floor(parsed.unlockedLevel)
        : Math.max(currentLevel, maxCompleted + 1);
    const unlockedLevel = Math.max(1, Math.min(MAX_LEVELS, Math.max(rawUnlocked, currentLevel)));

    // If user migrated from earlier version without completedLevels array, infer completed up to unlockedLevel - 1
    if (!Array.isArray(parsed.completedLevels) && unlockedLevel > 1) {
      for (let i = 1; i < unlockedLevel; i++) {
        completedLevels.push(i);
      }
    }

    const highScore =
      typeof parsed.highScore === 'number' && Number.isFinite(parsed.highScore)
        ? Math.max(legacyBest, Math.max(0, Math.floor(parsed.highScore)))
        : legacyBest;
    const totalApples =
      typeof parsed.totalApples === 'number' && Number.isFinite(parsed.totalApples)
        ? Math.max(0, Math.floor(parsed.totalApples))
        : 0;
    const bestTime =
      typeof parsed.bestTime === 'number' && Number.isFinite(parsed.bestTime) && parsed.bestTime > 0
        ? Math.round(parsed.bestTime * 10) / 10
        : null;
    const campaignScore =
      typeof parsed.campaignScore === 'number' && Number.isFinite(parsed.campaignScore)
        ? Math.max(0, Math.floor(parsed.campaignScore))
        : 0;
    const language: Language = parsed.language === 'ar' ? 'ar' : 'en';

    return {
      currentLevel,
      unlockedLevel,
      completedLevels,
      highScore,
      totalApples,
      bestTime,
      campaignScore,
      language,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: SavedProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota or private-browsing errors
  }
}

export function saveLanguagePreference(language: Language): void {
  const current = loadSavedProgress();
  saveProgress({
    ...current,
    language,
  });
}
