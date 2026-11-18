export type GameStatus =
  | 'START'
  | 'LEVEL_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_COMPLETE'
  | 'CAMPAIGN_COMPLETE'
  | 'GAME_OVER';

export type GameOverReason = 'WALL' | 'SELF' | 'OBSTACLE' | 'TRAP' | 'TIME' | null;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MovingTrapType = 'wall' | 'spike' | 'bomb';

export interface MovingTrap {
  id: number;
  type: MovingTrapType;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  vx: number;
  vy: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  phase: number;
  spin: number;
}

export interface Apple {
  x: number;
  y: number;
  radius: number;
  spawnTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface Ripple {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  maxRadius: number;
  color: string;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

export interface DigestPulse {
  progress: number; // 0 (head) to 1 (tail)
}

export interface LevelConfig {
  level: number;
  speed: number; // logical units per second (board is 1000 x 1000)
  turnRate: number; // radians per second
  applesRequired: number;
  timeLimitSeconds: number;
  obstacleCount: number;
  trapCount: number;
  trapSpeed: number;
  pointsPerApple: number;
  speedLabel: string;
}

export type Language = 'en' | 'ar';

export interface SavedProgress {
  currentLevel: number;
  unlockedLevel: number;
  completedLevels: number[];
  highScore: number;
  totalApples: number;
  bestTime: number | null;
  campaignScore: number;
  language: Language;
}

export interface HudSnapshot {
  status: GameStatus;
  score: number;
  highScore: number;
  isNewBest: boolean;
  level: number;
  maxLevels: number;
  unlockedLevel: number;
  completedLevels: number[];
  applesEatenLevel: number;
  applesRequired: number;
  totalApplesEaten: number;
  timeRemaining: number;
  timeLimit: number;
  lastLevelClearTime: number | null;
  bestTime: number | null;
  isNewBestTime: boolean;
  gameOverReason: GameOverReason;
  lastTimeBonus: number;
  nextLevelConfig: LevelConfig;
  currentLevelConfig: LevelConfig;
}
