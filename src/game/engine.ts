import {
  BOARD_SIZE,
  CELL_SIZE,
  GRID_CELLS,
  MAX_LEVELS,
  generateObstacles,
  generateTraps,
  getLevelConfig,
} from './levels';
import { soundEngine } from './sound';
import { loadSavedProgress, saveProgress } from './storage';
import {
  Apple,
  DigestPulse,
  FloatingText,
  GameOverReason,
  GameStatus,
  HudSnapshot,
  LevelConfig,
  MovingTrap,
  Obstacle,
  Particle,
  Ripple,
  SavedProgress,
  Vec2,
} from './types';

const SEGMENT_SPACING = 8.5;
const INITIAL_LENGTH = 115;
const GROWTH_PER_APPLE = 38;
const HEAD_RADIUS = 13.5;
const APPLE_RADIUS = 16;
const WALL_MARGIN = 15;
const SELF_COLLISION_SKIP_SEGMENTS = 15;

function normalizeAngle(a: number): number {
  let res = a;
  while (res > Math.PI) res -= Math.PI * 2;
  while (res < -Math.PI) res += Math.PI * 2;
  return res;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

function circleIntersectsRect(
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  return distSq(cx, cy, closestX, closestY) < r * r;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export class SnakeGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bgCache: HTMLCanvasElement | null = null;
  private cachedPixelSize = 0;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private reducedMotion = false;

  // Game progression & state
  private status: GameStatus = 'START';
  private score = 0;
  private levelStartScore = 0;
  private highScore = 0;
  private isNewBest = false;
  private level = 1;
  private unlockedLevel = 1;
  private completedLevels: number[] = [];
  private levelConfig: LevelConfig = getLevelConfig(1);
  private applesEatenLevel = 0;
  private totalApplesEaten = 0;
  private timeRemaining = 60;
  private lastWholeSecondTicked = 999;
  private lastLevelClearTime: number | null = null;
  private bestTime: number | null = null;
  private isNewBestTime = false;
  private gameOverReason: GameOverReason = null;
  private lastTimeBonus = 0;

  // Snake continuous kinematics
  private headX = BOARD_SIZE * 0.35;
  private headY = BOARD_SIZE * 0.5;
  private angle = 0;
  private targetAngle = 0;
  private queuedAngle: number | null = null;
  private trail: Vec2[] = [];
  private segments: Vec2[] = [];
  private currentLength = INITIAL_LENGTH;
  private targetLength = INITIAL_LENGTH;
  private slitherPhase = 0;
  private tongueTimer = 0;

  // Input state
  private heldKeys = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  private joystickActive = false;
  private joystickAngle = 0;

  // World entities
  private obstacles: Obstacle[] = [];
  private traps: MovingTrap[] = [];
  private apple: Apple | null = null;
  private particles: Particle[] = [];
  private ripples: Ripple[] = [];
  private floatingTexts: FloatingText[] = [];
  private digestPulses: DigestPulse[] = [];

  // Visual juice
  private shakeTimer = 0;
  private impactFlash = 0;

  // HUD listener throttling
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private lastHudSyncTime = 0;

  constructor(canvas: HTMLCanvasElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Could not initialize 2D canvas context');
    }
    this.ctx = context;
    this.onHudUpdate = onHudUpdate;

    if (typeof window !== 'undefined' && window.matchMedia) {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    const saved = loadSavedProgress();
    this.unlockedLevel = saved.unlockedLevel;
    this.completedLevels = [...saved.completedLevels];
    this.level = saved.currentLevel;
    this.levelConfig = getLevelConfig(this.level);
    this.highScore = saved.highScore;
    this.totalApplesEaten = saved.totalApples;
    this.bestTime = saved.bestTime;
    this.score = saved.campaignScore;
    this.levelStartScore = saved.campaignScore;

    this.setupDemoMode();
    this.emitHud(true);
  }

  private persistProgress(nextCurrentLevel: number, nextCampaignScore: number): void {
    const existing = loadSavedProgress();
    const payload: SavedProgress = {
      ...existing,
      currentLevel: clamp(nextCurrentLevel, 1, MAX_LEVELS),
      unlockedLevel: clamp(this.unlockedLevel, 1, MAX_LEVELS),
      completedLevels: [...this.completedLevels],
      highScore: this.highScore,
      totalApples: this.totalApplesEaten,
      bestTime: this.bestTime,
      campaignScore: nextCampaignScore,
    };
    saveProgress(payload);
  }

  public startLoop(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public resize(cssSize: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelSize = Math.max(240, Math.round(cssSize * dpr));
    if (this.canvas.width !== pixelSize || this.canvas.height !== pixelSize) {
      this.canvas.width = pixelSize;
      this.canvas.height = pixelSize;
      this.buildBackgroundCache(pixelSize);
    }
  }

  private buildBackgroundCache(pixelSize: number): void {
    if (this.cachedPixelSize === pixelSize && this.bgCache) return;
    this.cachedPixelSize = pixelSize;

    const off = document.createElement('canvas');
    off.width = pixelSize;
    off.height = pixelSize;
    const octx = off.getContext('2d');
    if (!octx) return;

    const scale = pixelSize / BOARD_SIZE;
    octx.scale(scale, scale);

    // Clean deep dark obsidian floor
    const bgGrad = octx.createRadialGradient(
      BOARD_SIZE * 0.5,
      BOARD_SIZE * 0.5,
      BOARD_SIZE * 0.08,
      BOARD_SIZE * 0.5,
      BOARD_SIZE * 0.5,
      BOARD_SIZE * 0.72
    );
    bgGrad.addColorStop(0, '#0B131E');
    bgGrad.addColorStop(1, '#060A10');
    octx.fillStyle = bgGrad;
    octx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // Subtle neon grid lines
    octx.strokeStyle = 'rgba(34, 255, 136, 0.075)';
    octx.lineWidth = 1;
    octx.beginPath();
    for (let i = 1; i < GRID_CELLS; i++) {
      const pos = i * CELL_SIZE;
      octx.moveTo(pos, 0);
      octx.lineTo(pos, BOARD_SIZE);
      octx.moveTo(0, pos);
      octx.lineTo(BOARD_SIZE, pos);
    }
    octx.stroke();

    // Crisp neon micro-crosshairs at every 2nd grid intersection for spatial depth
    octx.fillStyle = 'rgba(34, 255, 136, 0.22)';
    for (let gx = 2; gx < GRID_CELLS; gx += 2) {
      for (let gy = 2; gy < GRID_CELLS; gy += 2) {
        const px = gx * CELL_SIZE;
        const py = gy * CELL_SIZE;
        octx.fillRect(px - 1.5, py - 1.5, 3, 3);
      }
    }

    // Inner arena perimeter glow rail
    octx.strokeStyle = 'rgba(34, 255, 136, 0.26)';
    octx.lineWidth = 2;
    octx.strokeRect(2, 2, BOARD_SIZE - 4, BOARD_SIZE - 4);

    this.bgCache = off;
  }

  private setupDemoMode(): void {
    this.status = 'START';
    this.obstacles = [];
    this.traps = [];
    this.particles = [];
    this.ripples = [];
    this.floatingTexts = [];
    this.digestPulses = [];
    this.resetSnakePose(BOARD_SIZE * 0.32, BOARD_SIZE * 0.5, 0, 170);
    this.spawnApple();
  }

  private resetSnakePose(startX: number, startY: number, heading: number, length: number): void {
    this.headX = startX;
    this.headY = startY;
    this.angle = heading;
    this.targetAngle = heading;
    this.queuedAngle = null;
    this.currentLength = length;
    this.targetLength = length;
    this.trail = [];
    this.segments = [];

    const step = 2.5;
    const totalPts = Math.ceil((length + 60) / step);
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    for (let i = 0; i < totalPts; i++) {
      this.trail.push({
        x: startX - cos * i * step,
        y: startY - sin * i * step,
      });
    }
    this.rebuildSegments();
  }

  public openLevelSelect(): void {
    soundEngine.unlock();
    soundEngine.playClick();
    this.heldKeys = { up: false, down: false, left: false, right: false };
    this.status = 'LEVEL_SELECT';
    this.emitHud(true);
  }

  public playLevel(levelNum: number): void {
    const targetLevel = clamp(Math.floor(levelNum), 1, MAX_LEVELS);
    if (targetLevel > this.unlockedLevel) return;

    soundEngine.unlock();
    soundEngine.playClick();

    this.isNewBest = false;
    this.isNewBestTime = false;
    this.lastTimeBonus = 0;
    this.lastLevelClearTime = null;
    this.gameOverReason = null;
    this.levelStartScore = this.score;
    this.persistProgress(targetLevel, this.score);
    this.startLevel(targetLevel, targetLevel === 1);
  }

  public startNewGame(): void {
    soundEngine.unlock();
    soundEngine.playClick();

    this.score = 0;
    this.levelStartScore = 0;
    this.isNewBest = false;
    this.isNewBestTime = false;
    this.lastTimeBonus = 0;
    this.lastLevelClearTime = null;
    this.gameOverReason = null;
    this.persistProgress(1, 0);
    this.startLevel(1, true);
  }

  public retryCurrentLevel(): void {
    soundEngine.unlock();
    soundEngine.playClick();

    this.score = this.levelStartScore;
    this.isNewBest = false;
    this.isNewBestTime = false;
    this.lastTimeBonus = 0;
    this.gameOverReason = null;
    this.startLevel(this.level, this.level === 1);
  }

  public returnToHome(): void {
    soundEngine.playClick();
    this.heldKeys = { up: false, down: false, left: false, right: false };
    this.setupDemoMode();
    this.emitHud(true);
  }

  public startNextLevel(): void {
    soundEngine.unlock();
    soundEngine.playClick();
    const nextLvl = Math.min(MAX_LEVELS, this.level + 1);
    this.levelStartScore = this.score;
    this.persistProgress(nextLvl, this.score);
    this.startLevel(nextLvl, false);
  }

  private startLevel(levelNum: number, resetLength: boolean): void {
    this.level = clamp(levelNum, 1, MAX_LEVELS);
    this.levelConfig = getLevelConfig(this.level);
    this.applesEatenLevel = 0;
    this.timeRemaining = this.levelConfig.timeLimitSeconds;
    this.lastWholeSecondTicked = Math.ceil(this.timeRemaining);
    this.gameOverReason = null;
    this.obstacles = generateObstacles(this.level);
    this.traps = generateTraps(this.level, this.obstacles);
    this.particles = [];
    this.ripples = [];
    this.floatingTexts = [];
    this.digestPulses = [];
    this.shakeTimer = 0;
    this.impactFlash = 0;
    this.heldKeys = { up: false, down: false, left: false, right: false };

    // Keep snake length scaling cleanly across levels without becoming unwieldy on spawn
    const spawnLength = resetLength
      ? INITIAL_LENGTH
      : Math.min(230, INITIAL_LENGTH + Math.min(10, this.level - 1) * 14);
    this.resetSnakePose(BOARD_SIZE * 0.28, BOARD_SIZE * 0.5, 0, spawnLength);

    this.spawnApple();
    this.status = 'PLAYING';
    this.emitHud(true);
  }

  public togglePause(): void {
    if (this.status === 'PLAYING') {
      soundEngine.playClick();
      this.status = 'PAUSED';
      this.heldKeys = { up: false, down: false, left: false, right: false };
      this.emitHud(true);
    } else if (this.status === 'PAUSED') {
      soundEngine.playClick();
      this.status = 'PLAYING';
      this.lastTimestamp = performance.now();
      this.emitHud(true);
    }
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  // ---- Input API ----

  public setKeyState(dir: 'up' | 'down' | 'left' | 'right', pressed: boolean): void {
    this.heldKeys[dir] = pressed;
    if (this.status !== 'PLAYING') return;

    const dx = (this.heldKeys.right ? 1 : 0) - (this.heldKeys.left ? 1 : 0);
    const dy = (this.heldKeys.down ? 1 : 0) - (this.heldKeys.up ? 1 : 0);

    if (dx !== 0 || dy !== 0) {
      const desired = Math.atan2(dy, dx);
      this.applyDirectionalCommand(desired);
    }
  }

  public clearHeldKeys(): void {
    this.heldKeys = { up: false, down: false, left: false, right: false };
  }

  public applySwipeAngle(rawAngle: number): void {
    if (this.status !== 'PLAYING') return;
    // Snap touch swipes cleanly to the closest cardinal direction so fast swipes feel reliable
    const snapped = Math.round(rawAngle / (Math.PI / 2)) * (Math.PI / 2);
    this.applyDirectionalCommand(normalizeAngle(snapped));
  }

  private applyDirectionalCommand(desired: number): void {
    const diffFromCurrent = Math.abs(normalizeAngle(desired - this.angle));

    // Prevent instantaneous 180-degree reversal into the snake's own neck
    if (diffFromCurrent > 2.65) {
      // If the player is already mid-turn (e.g., rapid Up -> Left U-turn), queue the reversal
      const pendingTurn = Math.abs(normalizeAngle(this.targetAngle - this.angle));
      if (pendingTurn > 0.35) {
        this.queuedAngle = desired;
      }
      return;
    }

    this.targetAngle = desired;
    this.queuedAngle = null;
  }

  public setJoystick(angle: number, active: boolean): void {
    this.joystickActive = active;
    if (active) {
      this.joystickAngle = angle;
      if (this.status === 'PLAYING') {
        this.targetAngle = angle;
        this.queuedAngle = null;
      }
    }
  }

  // ---- Update Loop ----

  private update(dt: number): void {
    this.elapsedTime += dt;

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }
    if (this.impactFlash > 0) {
      this.impactFlash = Math.max(0, this.impactFlash - dt * 2.4);
    }

    this.updateEffects(dt);

    if (this.status === 'START' || this.status === 'LEVEL_SELECT') {
      this.updateDemoAutopilot(dt);
      return;
    }

    if (this.status !== 'PLAYING') {
      return;
    }

    // Countdown timer
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    const wholeSec = Math.ceil(this.timeRemaining);
    if (wholeSec <= 5 && wholeSec > 0 && wholeSec < this.lastWholeSecondTicked) {
      this.lastWholeSecondTicked = wholeSec;
      soundEngine.playTimerTick();
    }

    if (this.timeRemaining <= 0) {
      this.triggerGameOver('TIME');
      return;
    }

    // Steering interpolation
    if (this.joystickActive) {
      this.targetAngle = this.joystickAngle;
    }

    // Release queued rapid U-turn once head has turned far enough safely
    if (this.queuedAngle !== null) {
      const remainingToTarget = Math.abs(normalizeAngle(this.targetAngle - this.angle));
      if (remainingToTarget < 0.55) {
        this.targetAngle = this.queuedAngle;
        this.queuedAngle = null;
      }
    }

    const angleDiff = normalizeAngle(this.targetAngle - this.angle);
    const maxTurn = this.levelConfig.turnRate * dt;
    if (Math.abs(angleDiff) <= maxTurn) {
      this.angle = this.targetAngle;
    } else {
      // If joystick pulls nearly 180 deg directly behind, curve smoothly around
      const turnDir = Math.abs(angleDiff) > 3.05 ? 1 : Math.sign(angleDiff);
      this.angle = normalizeAngle(this.angle + turnDir * maxTurn);
    }

    // Advance snake continuously
    this.advanceSnake(this.levelConfig.speed, dt);

    // Move dynamic traps (Level 5+)
    if (this.traps.length > 0) {
      this.updateTraps(dt);
    }

    // Check collisions
    if (this.checkWallCollision()) {
      this.triggerGameOver('WALL');
      return;
    }
    if (this.checkObstacleCollision()) {
      this.triggerGameOver('OBSTACLE');
      return;
    }
    if (this.checkTrapCollision()) {
      this.triggerGameOver('TRAP');
      return;
    }
    if (this.checkSelfCollision()) {
      this.triggerGameOver('SELF');
      return;
    }

    // Check apple collection
    if (this.apple) {
      const eatRadius = HEAD_RADIUS + this.apple.radius + 4;
      if (distSq(this.headX, this.headY, this.apple.x, this.apple.y) <= eatRadius * eatRadius) {
        this.handleEatApple();
      }
    }

    // Throttled HUD update (~15Hz for timer display)
    if (this.elapsedTime - this.lastHudSyncTime >= 0.065) {
      this.emitHud(false);
    }
  }

  private updateDemoAutopilot(dt: number): void {
    const demoSpeed = 195;
    let steerAngle = this.angle;

    if (this.apple) {
      steerAngle = Math.atan2(this.apple.y - this.headY, this.apple.x - this.headX);
    }

    // Score candidate angles to steer smoothly toward the apple while avoiding walls & own body
    const candidates = [0, 0.35, -0.35, 0.75, -0.75, 1.25, -1.25, 1.8, -1.8];
    let bestAngle = steerAngle;
    let bestScore = -Infinity;

    for (let c = 0; c < candidates.length; c++) {
      const candAngle = normalizeAngle(steerAngle + candidates[c]);
      const lookX = this.headX + Math.cos(candAngle) * 78;
      const lookY = this.headY + Math.sin(candAngle) * 78;

      let candidateScore = -Math.abs(candidates[c]) * 12;

      // Penalize wall proximity strongly
      const wallMargin = 85;
      if (
        lookX < wallMargin ||
        lookX > BOARD_SIZE - wallMargin ||
        lookY < wallMargin ||
        lookY > BOARD_SIZE - wallMargin
      ) {
        candidateScore -= 500;
      }

      // Penalize self body collision ahead
      for (let i = 10; i < this.segments.length; i += 2) {
        const d2 = distSq(lookX, lookY, this.segments[i].x, this.segments[i].y);
        if (d2 < 52 * 52) {
          candidateScore -= 420;
          break;
        }
      }

      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestAngle = candAngle;
      }
    }

    // Soft center pull if very near perimeter
    const edgePad = 92;
    if (
      this.headX < edgePad ||
      this.headX > BOARD_SIZE - edgePad ||
      this.headY < edgePad ||
      this.headY > BOARD_SIZE - edgePad
    ) {
      bestAngle = Math.atan2(BOARD_SIZE * 0.5 - this.headY, BOARD_SIZE * 0.5 - this.headX);
    }

    const diff = normalizeAngle(bestAngle - this.angle);
    const maxTurn = 6.2 * dt;
    this.angle = normalizeAngle(this.angle + clamp(diff, -maxTurn, maxTurn));

    this.advanceSnake(demoSpeed, dt);

    // Keep demo snake cleanly inside bounds
    this.headX = clamp(this.headX, WALL_MARGIN + 24, BOARD_SIZE - WALL_MARGIN - 24);
    this.headY = clamp(this.headY, WALL_MARGIN + 24, BOARD_SIZE - WALL_MARGIN - 24);

    if (this.apple) {
      const eatR = HEAD_RADIUS + this.apple.radius + 6;
      if (distSq(this.headX, this.headY, this.apple.x, this.apple.y) <= eatR * eatR) {
        this.spawnEatEffects(this.apple.x, this.apple.y, false);
        this.digestPulses.push({ progress: 0 });
        this.targetLength = Math.min(245, this.targetLength + 14);
        this.spawnApple();
      }
    }
  }

  private advanceSnake(speed: number, dt: number): void {
    const moveDist = speed * dt;
    const prevX = this.headX;
    const prevY = this.headY;

    this.headX += Math.cos(this.angle) * moveDist;
    this.headY += Math.sin(this.angle) * moveDist;

    // Sub-step spine trail recording so curve sampling stays silky smooth at all speeds
    const stepSize = 2.5;
    const subSteps = Math.max(1, Math.ceil(moveDist / stepSize));
    for (let s = 1; s <= subSteps; s++) {
      const t = s / subSteps;
      this.trail.unshift({
        x: prevX + (this.headX - prevX) * t,
        y: prevY + (this.headY - prevY) * t,
      });
    }

    // Smoothly grow tail toward target length
    if (this.currentLength < this.targetLength) {
      this.currentLength = Math.min(this.targetLength, this.currentLength + 210 * dt);
    }

    this.slitherPhase += dt * (speed / 35);
    this.tongueTimer += dt;

    this.rebuildSegments();
  }

  private rebuildSegments(): void {
    const segs: Vec2[] = [];
    if (this.trail.length === 0) {
      this.segments = segs;
      return;
    }

    const desiredCount = Math.max(6, Math.floor(this.currentLength / SEGMENT_SPACING));
    segs.push({ x: this.trail[0].x, y: this.trail[0].y });

    let accumulated = 0;
    let nextTargetDist = SEGMENT_SPACING;
    let lastNeededTrailIndex = this.trail.length - 1;

    for (let i = 1; i < this.trail.length && segs.length < desiredCount; i++) {
      const p0 = this.trail[i - 1];
      const p1 = this.trail[i];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segLen = Math.hypot(dx, dy);
      if (segLen < 0.0001) continue;

      while (accumulated + segLen >= nextTargetDist && segs.length < desiredCount) {
        const remain = nextTargetDist - accumulated;
        const frac = remain / segLen;
        segs.push({
          x: p0.x + dx * frac,
          y: p0.y + dy * frac,
        });
        nextTargetDist += SEGMENT_SPACING;
      }

      accumulated += segLen;
      lastNeededTrailIndex = i;
    }

    // Trim unused tail breadcrumbs for O(N) performance
    const maxKeep = lastNeededTrailIndex + 24;
    if (this.trail.length > maxKeep) {
      this.trail.length = maxKeep;
    }

    this.segments = segs;
  }

  private updateTraps(dt: number): void {
    for (let i = 0; i < this.traps.length; i++) {
      const trap = this.traps[i];
      trap.x += trap.vx * dt;
      trap.y += trap.vy * dt;

      if (trap.x <= trap.minX) {
        trap.x = trap.minX;
        trap.vx = Math.abs(trap.vx);
      } else if (trap.x >= trap.maxX) {
        trap.x = trap.maxX;
        trap.vx = -Math.abs(trap.vx);
      }

      if (trap.y <= trap.minY) {
        trap.y = trap.minY;
        trap.vy = Math.abs(trap.vy);
      } else if (trap.y >= trap.maxY) {
        trap.y = trap.maxY;
        trap.vy = -Math.abs(trap.vy);
      }

      trap.phase += dt * 4.8;
      trap.spin += dt * (trap.type === 'spike' ? 5.6 : 1.6);
    }
  }

  private checkWallCollision(): boolean {
    return (
      this.headX < WALL_MARGIN ||
      this.headX > BOARD_SIZE - WALL_MARGIN ||
      this.headY < WALL_MARGIN ||
      this.headY > BOARD_SIZE - WALL_MARGIN
    );
  }

  private checkObstacleCollision(): boolean {
    const hitR = HEAD_RADIUS - 2;
    for (let i = 0; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];
      if (circleIntersectsRect(this.headX, this.headY, hitR, o.x, o.y, o.w, o.h)) {
        return true;
      }
    }
    return false;
  }

  private checkTrapCollision(): boolean {
    const headHitR = HEAD_RADIUS - 2;
    for (let i = 0; i < this.traps.length; i++) {
      const t = this.traps[i];
      if (t.type === 'wall') {
        if (
          circleIntersectsRect(
            this.headX,
            this.headY,
            headHitR,
            t.x - t.w * 0.5,
            t.y - t.h * 0.5,
            t.w,
            t.h
          )
        ) {
          return true;
        }
      } else {
        const hitR = headHitR + t.radius - 2.5;
        if (distSq(this.headX, this.headY, t.x, t.y) < hitR * hitR) {
          return true;
        }
      }
    }
    return false;
  }

  private checkSelfCollision(): boolean {
    if (this.segments.length <= SELF_COLLISION_SKIP_SEGMENTS + 2) return false;
    const hitDist = 17.5;
    const hitDistSq = hitDist * hitDist;

    for (let i = SELF_COLLISION_SKIP_SEGMENTS; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (distSq(this.headX, this.headY, seg.x, seg.y) < hitDistSq) {
        return true;
      }
    }
    return false;
  }

  private handleEatApple(): void {
    if (!this.apple) return;

    const eatenX = this.apple.x;
    const eatenY = this.apple.y;

    this.applesEatenLevel += 1;
    this.totalApplesEaten += 1;
    this.targetLength += GROWTH_PER_APPLE;

    const gained = this.levelConfig.pointsPerApple;
    this.addScore(gained);

    const progress = this.applesEatenLevel / this.levelConfig.applesRequired;
    soundEngine.playEat(progress);

    this.spawnEatEffects(eatenX, eatenY, true, `+${gained}`);
    this.digestPulses.push({ progress: 0 });

    if (this.applesEatenLevel >= this.levelConfig.applesRequired) {
      // Level Cleared!
      const timeBonus = Math.round(this.timeRemaining) * 10;
      this.lastTimeBonus = timeBonus;
      this.addScore(timeBonus);

      const clearTime = Math.max(
        0.5,
        Math.round((this.levelConfig.timeLimitSeconds - this.timeRemaining) * 10) / 10
      );
      this.lastLevelClearTime = clearTime;
      if (this.bestTime === null || clearTime < this.bestTime) {
        this.bestTime = clearTime;
        this.isNewBestTime = true;
      } else {
        this.isNewBestTime = false;
      }

      this.apple = null;
      soundEngine.playLevelUp();

      if (!this.completedLevels.includes(this.level)) {
        this.completedLevels = [...this.completedLevels, this.level].sort((a, b) => a - b);
      }
      if (this.level < MAX_LEVELS) {
        this.unlockedLevel = Math.max(this.unlockedLevel, this.level + 1);
      }

      if (this.level >= MAX_LEVELS) {
        this.status = 'CAMPAIGN_COMPLETE';
        this.persistProgress(MAX_LEVELS, this.score);
      } else {
        this.status = 'LEVEL_COMPLETE';
        this.persistProgress(this.level + 1, this.score);
      }

      this.emitHud(true);
    } else {
      this.persistProgress(this.level, this.levelStartScore);
      this.spawnApple();
      this.emitHud(true);
    }
  }

  private addScore(points: number): void {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewBest = true;
    }
  }

  private triggerGameOver(reason: GameOverReason): void {
    this.gameOverReason = reason;
    this.status = 'GAME_OVER';
    this.shakeTimer = this.reducedMotion ? 0 : reason === 'TRAP' ? 0.3 : 0.24;
    this.impactFlash = 1;
    if (reason === 'TRAP') {
      soundEngine.playTrapHit();
    } else {
      soundEngine.playGameOver(reason === 'TIME');
    }

    // Burst impact sparks at head
    const sparkColor =
      reason === 'TIME' ? '#F59E0B' : reason === 'TRAP' ? '#FF5722' : '#FF3B5C';
    const sparkCount = reason === 'TRAP' ? 24 : 18;
    for (let i = 0; i < sparkCount; i++) {
      const a = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.25;
      const spd = 80 + Math.random() * 190;
      this.particles.push({
        x: this.headX,
        y: this.headY,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.45 + Math.random() * 0.28,
        maxLife: 0.73,
        size: 3 + Math.random() * 3.8,
        color:
          reason === 'TRAP'
            ? i % 2 === 0
              ? '#FF2A44'
              : '#FF8A00'
            : i % 3 === 0
              ? '#22FF88'
              : sparkColor,
      });
    }

    this.emitHud(true);
  }

  private spawnApple(): void {
    const pad = CELL_SIZE * 1.15;
    let bestX = BOARD_SIZE * 0.72;
    let bestY = BOARD_SIZE * 0.5;

    for (let attempt = 0; attempt < 150; attempt++) {
      // Align loosely to grid centers
      const gx = 1 + Math.floor(Math.random() * (GRID_CELLS - 2));
      const gy = 1 + Math.floor(Math.random() * (GRID_CELLS - 2));
      const cx = clamp(gx * CELL_SIZE + CELL_SIZE * 0.5, pad, BOARD_SIZE - pad);
      const cy = clamp(gy * CELL_SIZE + CELL_SIZE * 0.5, pad, BOARD_SIZE - pad);

      // Keep clear of obstacles
      const hitsObstacle = this.obstacles.some((o) =>
        circleIntersectsRect(cx, cy, APPLE_RADIUS + 26, o.x, o.y, o.w, o.h)
      );
      if (hitsObstacle) continue;

      // Keep clear of moving traps (unless very late fallback)
      if (attempt < 110) {
        const nearTrap = this.traps.some((t) => {
          const safeR = (t.type === 'wall' ? Math.max(t.w, t.h) * 0.5 : t.radius) + APPLE_RADIUS + 34;
          return distSq(cx, cy, t.x, t.y) < safeR * safeR;
        });
        if (nearTrap) continue;
      }

      // Keep clear of snake head and body
      const tooCloseToHead = distSq(cx, cy, this.headX, this.headY) < 110 * 110;
      if (tooCloseToHead && attempt < 85) continue;

      const tooCloseToBody = this.segments.some(
        (seg) => distSq(cx, cy, seg.x, seg.y) < 42 * 42
      );
      if (tooCloseToBody) continue;

      bestX = cx;
      bestY = cy;
      break;
    }

    this.apple = {
      x: bestX,
      y: bestY,
      radius: APPLE_RADIUS,
      spawnTime: this.elapsedTime,
    };
  }

  private spawnEatEffects(x: number, y: number, showText: boolean, label = '+100'): void {
    if (!this.reducedMotion) {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 65 + Math.random() * 145;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.36 + Math.random() * 0.22,
          maxLife: 0.58,
          size: 2.5 + Math.random() * 3.5,
          color: i % 3 === 0 ? '#22FF88' : i % 3 === 1 ? '#FF3855' : '#FFD166',
        });
      }
      this.ripples.push({
        x,
        y,
        life: 0.38,
        maxLife: 0.38,
        maxRadius: 56,
        color: '#22FF88',
      });
    }

    if (showText) {
      this.floatingTexts.push({
        x,
        y: y - 16,
        text: label,
        life: 0.72,
        maxLife: 0.72,
        color: '#4ADE80',
      });
    }
  }

  private updateEffects(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.93;
        p.vy *= 0.93;
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.ripples.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 42 * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    for (let i = this.digestPulses.length - 1; i >= 0; i--) {
      const dp = this.digestPulses[i];
      dp.progress += dt * 1.45;
      if (dp.progress >= 1) {
        this.digestPulses.splice(i, 1);
      }
    }
  }

  private emitHud(force: boolean): void {
    if (!force && this.elapsedTime - this.lastHudSyncTime < 0.06) return;
    this.lastHudSyncTime = this.elapsedTime;
    this.onHudUpdate({
      status: this.status,
      score: this.score,
      highScore: this.highScore,
      isNewBest: this.isNewBest,
      level: this.level,
      maxLevels: MAX_LEVELS,
      unlockedLevel: this.unlockedLevel,
      completedLevels: [...this.completedLevels],
      applesEatenLevel: this.applesEatenLevel,
      applesRequired: this.levelConfig.applesRequired,
      totalApplesEaten: this.totalApplesEaten,
      timeRemaining: this.timeRemaining,
      timeLimit: this.levelConfig.timeLimitSeconds,
      lastLevelClearTime: this.lastLevelClearTime,
      bestTime: this.bestTime,
      isNewBestTime: this.isNewBestTime,
      gameOverReason: this.gameOverReason,
      lastTimeBonus: this.lastTimeBonus,
      currentLevelConfig: this.levelConfig,
      nextLevelConfig: getLevelConfig(Math.min(MAX_LEVELS, this.level + 1)),
    });
  }

  // ---- High-Craft Canvas Renderer ----

  private render(): void {
    const ctx = this.ctx;
    const pixelSize = this.canvas.width;
    if (pixelSize <= 0) return;

    if (!this.bgCache || this.cachedPixelSize !== pixelSize) {
      this.buildBackgroundCache(pixelSize);
    }

    ctx.save();

    // Subtle impact screen-shake on collision
    if (this.shakeTimer > 0 && !this.reducedMotion) {
      const mag = (this.shakeTimer / 0.24) * 6 * (pixelSize / BOARD_SIZE);
      ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
    }

    // 1. Blit cached obsidian floor + neon grid (blazing fast single draw call)
    if (this.bgCache) {
      ctx.drawImage(this.bgCache, 0, 0);
    } else {
      ctx.fillStyle = '#070B12';
      ctx.fillRect(0, 0, pixelSize, pixelSize);
    }

    const scale = pixelSize / BOARD_SIZE;
    ctx.scale(scale, scale);

    // 2. Ambient proximity floor illumination under snake head & apple
    this.renderFloorGlow(ctx);

    // 3. Static Obstacles & Moving Traps (Level 5+)
    if (this.obstacles.length > 0) {
      this.renderObstacles(ctx);
    }
    if (this.traps.length > 0) {
      this.renderTraps(ctx);
    }

    // 4. Expanding ripple rings
    this.renderRipples(ctx);

    // 5. Shiny Red Apple
    if (this.apple) {
      this.renderApple(ctx, this.apple);
    }

    // 6. Fluid Neon Green Snake
    this.renderSnake(ctx);

    // 7. Particles & Floating score text
    this.renderParticlesAndText(ctx);

    // 8. Border impact flash on wall collision
    if (this.impactFlash > 0) {
      ctx.strokeStyle = `rgba(255, 56, 85, ${this.impactFlash * 0.8})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, BOARD_SIZE - 8, BOARD_SIZE - 8);
    }

    ctx.restore();
  }

  private renderFloorGlow(ctx: CanvasRenderingContext2D): void {
    // Snake head neon floor bounce
    const headGlow = ctx.createRadialGradient(
      this.headX,
      this.headY,
      4,
      this.headX,
      this.headY,
      115
    );
    headGlow.addColorStop(0, 'rgba(34, 255, 136, 0.14)');
    headGlow.addColorStop(0.55, 'rgba(34, 255, 136, 0.045)');
    headGlow.addColorStop(1, 'rgba(34, 255, 136, 0)');
    ctx.fillStyle = headGlow;
    ctx.fillRect(this.headX - 115, this.headY - 115, 230, 230);

    // Apple crimson floor bounce
    if (this.apple) {
      const pulse = 0.85 + Math.sin(this.elapsedTime * 4.5) * 0.15;
      const r = 82 * pulse;
      const appleGlow = ctx.createRadialGradient(
        this.apple.x,
        this.apple.y,
        4,
        this.apple.x,
        this.apple.y,
        r
      );
      appleGlow.addColorStop(0, 'rgba(255, 42, 68, 0.24)');
      appleGlow.addColorStop(0.55, 'rgba(255, 42, 68, 0.07)');
      appleGlow.addColorStop(1, 'rgba(255, 42, 68, 0)');
      ctx.fillStyle = appleGlow;
      ctx.fillRect(this.apple.x - r, this.apple.y - r, r * 2, r * 2);
    }
  }

  private renderObstacles(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];

      // Subtle amber outer glow
      ctx.save();
      roundRectPath(ctx, o.x - 3, o.y - 3, o.w + 6, o.h + 6, 11);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.13)';
      ctx.fill();

      // Main dark metallic block body
      roundRectPath(ctx, o.x, o.y, o.w, o.h, 8);
      const grad = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h);
      grad.addColorStop(0, '#1D2534');
      grad.addColorStop(1, '#101622');
      ctx.fillStyle = grad;
      ctx.fill();

      // Diagonal hazard stripes clipped cleanly inside obstacle for color-blind clarity
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.22)';
      ctx.lineWidth = 4;
      const maxSpan = o.w + o.h;
      ctx.beginPath();
      for (let d = -o.h; d < maxSpan; d += 16) {
        ctx.moveTo(o.x + d, o.y);
        ctx.lineTo(o.x + d - o.h, o.y + o.h);
      }
      ctx.stroke();
      ctx.restore();

      // Crisp luminous orange-amber rim
      roundRectPath(ctx, o.x + 1, o.y + 1, o.w - 2, o.h - 2, 7);
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Subtle top inner specular highlight
      ctx.strokeStyle = 'rgba(255, 200, 150, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(o.x + 8, o.y + 3);
      ctx.lineTo(o.x + o.w - 8, o.y + 3);
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderTraps(ctx: CanvasRenderingContext2D): void {
    // 1. Subtle dashed patrol rails under all traps so players can read trajectories cleanly
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(255, 68, 58, 0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < this.traps.length; i++) {
      const t = this.traps[i];
      ctx.beginPath();
      ctx.moveTo(t.minX, t.minY);
      ctx.lineTo(t.maxX, t.maxY);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Render each moving trap in pulsing red / orange warning colors
    for (let i = 0; i < this.traps.length; i++) {
      const t = this.traps[i];
      const pulse = this.reducedMotion ? 0.65 : 0.5 + 0.5 * Math.sin(t.phase);

      if (t.type === 'wall') {
        const left = t.x - t.w * 0.5;
        const top = t.y - t.h * 0.5;

        ctx.save();
        // Pulsing red/orange outer danger halo
        roundRectPath(ctx, left - 4, top - 4, t.w + 8, t.h + 8, 10);
        ctx.fillStyle = `rgba(255, 60, 38, ${0.14 + pulse * 0.18})`;
        ctx.fill();

        // Dark crimson metallic core
        roundRectPath(ctx, left, top, t.w, t.h, 7);
        const grad = ctx.createLinearGradient(left, top, left + t.w, top + t.h);
        grad.addColorStop(0, '#3D0F18');
        grad.addColorStop(1, '#1E080D');
        ctx.fillStyle = grad;
        ctx.fill();

        // Animated red/orange hazard chevrons
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = `rgba(255, 115, 36, ${0.35 + pulse * 0.25})`;
        ctx.lineWidth = 4;
        const maxSpan = t.w + t.h;
        ctx.beginPath();
        for (let d = -t.h; d < maxSpan; d += 14) {
          ctx.moveTo(left + d, top);
          ctx.lineTo(left + d - t.h, top + t.h);
        }
        ctx.stroke();
        ctx.restore();

        // Luminous pulsing red-orange rim
        roundRectPath(ctx, left + 1, top + 1, t.w - 2, t.h - 2, 6);
        ctx.strokeStyle = pulse > 0.5 ? '#FF3B30' : '#FF7A1A';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();
      } else if (t.type === 'spike') {
        const r = t.radius;
        ctx.save();
        ctx.translate(t.x, t.y);

        // Pulsing red warning aura
        const auraR = r * (1.45 + pulse * 0.25);
        const aura = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, auraR);
        aura.addColorStop(0, `rgba(255, 45, 65, ${0.32 + pulse * 0.18})`);
        aura.addColorStop(1, 'rgba(255, 45, 65, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, auraR, 0, Math.PI * 2);
        ctx.fill();

        // Rotating 8-tooth spiked saw disc
        ctx.rotate(t.spin);
        const teeth = 8;
        ctx.beginPath();
        for (let k = 0; k < teeth * 2; k++) {
          const ang = (k * Math.PI) / teeth;
          const rad = k % 2 === 0 ? r * 1.12 : r * 0.64;
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const bladeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.12);
        bladeGrad.addColorStop(0, '#FF8A33');
        bladeGrad.addColorStop(0.5, '#FF2A44');
        bladeGrad.addColorStop(1, '#7A0D1C');
        ctx.fillStyle = bladeGrad;
        ctx.fill();

        ctx.strokeStyle = '#FFD0B0';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Glowing hot center hub
        ctx.fillStyle = pulse > 0.5 ? '#FFEDD5' : '#FF7A1A';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else {
        // Moving Bomb trap
        const r = t.radius;
        ctx.save();
        ctx.translate(t.x, t.y);

        // Pulsing orange/red danger ring
        ctx.strokeStyle = `rgba(255, 68, 42, ${0.35 + pulse * 0.45})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, r + 4 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();

        // Armored dark crimson bomb sphere
        const bombGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
        bombGrad.addColorStop(0, '#591822');
        bombGrad.addColorStop(0.55, '#260A10');
        bombGrad.addColorStop(1, '#120508');
        ctx.fillStyle = bombGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FF4D2E';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Armed pulsing warning LED core
        ctx.fillStyle = pulse > 0.45 ? '#FF3B30' : '#FF9500';
        ctx.beginPath();
        ctx.arc(0, 1, r * 0.36, 0, Math.PI * 2);
        ctx.fill();

        // Top fuse cap & glowing orange spark
        ctx.strokeStyle = '#9CA3AF';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.85);
        ctx.quadraticCurveTo(r * 0.28, -r * 1.32, r * 0.56, -r * 1.18);
        ctx.stroke();

        ctx.fillStyle = pulse > 0.5 ? '#FFD166' : '#FF6B1A';
        ctx.beginPath();
        ctx.arc(r * 0.58, -r * 1.18, 3.4 + pulse * 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  private renderApple(ctx: CanvasRenderingContext2D, apple: Apple): void {
    const age = this.elapsedTime - apple.spawnTime;
    // Snappy elastic spawn-in scale
    let popScale = 1;
    if (age < 0.26) {
      const t = age / 0.26;
      const c1 = 1.70158;
      const c3 = c1 + 1;
      popScale = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    const breathe = this.reducedMotion ? 1 : 1 + Math.sin(this.elapsedTime * 4.4) * 0.045;
    const bobY = this.reducedMotion ? 0 : Math.sin(this.elapsedTime * 3.4) * 2.2;
    const s = popScale * breathe;
    const r = apple.radius;

    ctx.save();
    ctx.translate(apple.x, apple.y + bobY);
    ctx.scale(s, s);

    // Soft grounded shadow under apple
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.92, r * 0.72, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sculpted shiny red apple silhouette (subtle top dimple & tapered bottom)
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.72);
    ctx.bezierCurveTo(r * 0.55, -r * 1.12, r * 1.18, -r * 0.55, r * 1.0, r * 0.2);
    ctx.bezierCurveTo(r * 0.88, r * 0.85, r * 0.38, r * 1.08, 0, r * 0.92);
    ctx.bezierCurveTo(-r * 0.38, r * 1.08, -r * 0.88, r * 0.85, -r * 1.0, r * 0.2);
    ctx.bezierCurveTo(-r * 1.18, -r * 0.55, -r * 0.55, -r * 1.12, 0, -r * 0.72);
    ctx.closePath();

    const bodyGrad = ctx.createRadialGradient(-r * 0.32, -r * 0.36, r * 0.12, 0, 0, r * 1.15);
    bodyGrad.addColorStop(0, '#FF7B8E');
    bodyGrad.addColorStop(0.28, '#FF2A44');
    bodyGrad.addColorStop(0.75, '#C8112B');
    bodyGrad.addColorStop(1, '#780818');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Rim highlight for crispy readability against dark neon grid
    ctx.strokeStyle = 'rgba(255, 145, 160, 0.55)';
    ctx.lineWidth = 1.25;
    ctx.stroke();

    // Glossy specular crescent highlight on upper-left cheek
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.36, -r * 0.32, r * 0.26, r * 0.14, -0.62, 0, Math.PI * 2);
    ctx.fill();

    // Tiny crisp pinpoint glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    ctx.arc(-r * 0.54, -r * 0.04, r * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dark curved apple stem
    ctx.strokeStyle = '#7C4A2D';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.66);
    ctx.quadraticCurveTo(r * 0.08, -r * 1.18, r * 0.32, -r * 1.24);
    ctx.stroke();

    // Vibrant emerald leaf
    ctx.save();
    ctx.translate(r * 0.14, -r * 0.94);
    ctx.rotate(-0.42);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.48, -r * 0.35, r * 0.72, 0.04);
    ctx.quadraticCurveTo(r * 0.35, r * 0.28, 0, 0);
    ctx.closePath();
    const leafGrad = ctx.createLinearGradient(0, 0, r * 0.7, 0);
    leafGrad.addColorStop(0, '#22C55E');
    leafGrad.addColorStop(1, '#86EFAC');
    ctx.fillStyle = leafGrad;
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  private renderSnake(ctx: CanvasRenderingContext2D): void {
    const segs = this.segments;
    if (segs.length < 2) return;

    // Build smoothly undulating organic render spine
    const n = segs.length;
    const renderPts: Vec2[] = new Array(n);
    const waveAmp = this.reducedMotion ? 0 : 3.2;

    for (let i = 0; i < n; i++) {
      const p = segs[i];
      if (i === 0 || waveAmp === 0) {
        renderPts[i] = { x: p.x, y: p.y };
        continue;
      }
      const prev = segs[i - 1];
      const next = i < n - 1 ? segs[i + 1] : p;
      const tx = prev.x - next.x;
      const ty = prev.y - next.y;
      const len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len;
      const ny = tx / len;

      const taperIn = Math.min(1, i / 5);
      const taperOut = 0.4 + 0.6 * (1 - i / n);
      const wave = Math.sin(this.slitherPhase - i * 0.38) * waveAmp * taperIn * taperOut;

      renderPts[i] = {
        x: p.x + nx * wave,
        y: p.y + ny * wave,
      };
    }

    // 1. Soft wide neon outer aura along spine (fast single stroke — zero lag!)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(renderPts[0].x, renderPts[0].y);
    for (let i = 1; i < n; i++) {
      ctx.lineTo(renderPts[i].x, renderPts[i].y);
    }
    ctx.strokeStyle = 'rgba(34, 255, 136, 0.14)';
    ctx.lineWidth = HEAD_RADIUS * 2.9;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(34, 255, 136, 0.24)';
    ctx.lineWidth = HEAD_RADIUS * 2.15;
    ctx.stroke();
    ctx.restore();

    // 2. Tapered articulated body drawn tail -> head for smooth organic overlap
    for (let i = n - 1; i >= 1; i--) {
      const pt = renderPts[i];
      const frac = i / (n - 1); // 0 = neck, 1 = tail tip

      // Smooth muscular taper toward sleek pointed tail
      let radius = HEAD_RADIUS * (1 - Math.pow(frac, 1.45) * 0.72);
      if (i <= 3) {
        radius *= 0.92 + (i / 3) * 0.08;
      }

      // Apply subtle digestive bulge & glow as eaten apple pulse travels down spine
      let pulseBoost = 0;
      for (let d = 0; d < this.digestPulses.length; d++) {
        const distFromPulse = Math.abs(frac - this.digestPulses[d].progress);
        if (distFromPulse < 0.14) {
          pulseBoost = Math.max(pulseBoost, 1 - distFromPulse / 0.14);
        }
      }
      radius += pulseBoost * 2.8;

      // Dark outer rim for crisp separation when snake coils near itself
      ctx.fillStyle = '#063B20';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius + 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Vibrant neon green body segment with subtle shade gradient from neck to tail
      const hue = 148 + frac * 10;
      const lightness = 53 - frac * 14 + pulseBoost * 22;
      ctx.fillStyle = `hsl(${hue}, 96%, ${lightness}%)`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Subtle luminous dorsal scale highlight every 2nd segment
      if (i % 2 === 0 && radius > 5.5) {
        const prev = renderPts[i - 1];
        const segAngle = Math.atan2(prev.y - pt.y, prev.x - pt.x);
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(segAngle);
        ctx.fillStyle =
          pulseBoost > 0.2
            ? 'rgba(220, 255, 210, 0.75)'
            : 'rgba(180, 255, 215, 0.32)';
        ctx.beginPath();
        ctx.ellipse(radius * 0.1, 0, radius * 0.42, radius * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 3. Sculpted Articulated Snake Head + Flicking Tongue + Apple-Tracking Eyes
    this.renderSnakeHead(ctx, renderPts[0]);
  }

  private renderSnakeHead(ctx: CanvasRenderingContext2D, head: Vec2): void {
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(this.angle);

    // Check proximity to apple for tongue excitement & eye tracking
    let appleDist = 9999;
    let localAppleAngle = 0;
    if (this.apple) {
      const dx = this.apple.x - head.x;
      const dy = this.apple.y - head.y;
      appleDist = Math.hypot(dx, dy);
      localAppleAngle = normalizeAngle(Math.atan2(dy, dx) - this.angle);
    }

    // Animated forked crimson tongue (flicks periodically OR eagerly when close to apple)
    const cycle = this.tongueTimer % 2.4;
    const nearApple = appleDist < 185;
    let tongueExt = 0;
    if (nearApple) {
      tongueExt = 0.55 + Math.abs(Math.sin(this.tongueTimer * 14)) * 0.45;
    } else if (cycle < 0.28) {
      tongueExt = Math.sin((cycle / 0.28) * Math.PI);
    }

    if (tongueExt > 0.05) {
      const tLen = HEAD_RADIUS * 1.15 + tongueExt * 14;
      const forkLen = 5.5 * tongueExt;
      const wiggle = Math.sin(this.tongueTimer * 36) * 1.4;

      ctx.strokeStyle = '#FF3855';
      ctx.lineWidth = 2.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(HEAD_RADIUS * 0.85, 0);
      ctx.lineTo(tLen, wiggle);
      ctx.moveTo(tLen, wiggle);
      ctx.lineTo(tLen + forkLen, wiggle - 4.2);
      ctx.moveTo(tLen, wiggle);
      ctx.lineTo(tLen + forkLen, wiggle + 4.2);
      ctx.stroke();
    }

    // Sleek angular viper head shape
    const r = HEAD_RADIUS;
    ctx.beginPath();
    ctx.moveTo(r * 1.42, 0); // snout tip
    ctx.bezierCurveTo(r * 1.32, r * 0.65, r * 0.45, r * 1.15, -r * 0.32, r * 1.06);
    ctx.bezierCurveTo(-r * 0.92, r * 0.98, -r * 1.12, r * 0.45, -r * 1.05, 0);
    ctx.bezierCurveTo(-r * 1.12, -r * 0.45, -r * 0.92, -r * 0.98, -r * 0.32, -r * 1.06);
    ctx.bezierCurveTo(r * 0.45, -r * 1.15, r * 1.32, -r * 0.65, r * 1.42, 0);
    ctx.closePath();

    const headGrad = ctx.createRadialGradient(r * 0.2, -r * 0.25, 2, 0, 0, r * 1.5);
    headGrad.addColorStop(0, '#7CFFB8');
    headGrad.addColorStop(0.45, '#22FF88');
    headGrad.addColorStop(1, '#0BA858');
    ctx.fillStyle = headGrad;
    ctx.fill();

    ctx.strokeStyle = '#063D22';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Subtle glowing crown chevron on top of head
    ctx.strokeStyle = 'rgba(235, 255, 245, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.34);
    ctx.lineTo(r * 0.1, 0);
    ctx.lineTo(-r * 0.45, r * 0.34);
    ctx.stroke();

    // Expressive eyes that gaze toward the nearest apple
    const pupilShiftX = Math.cos(localAppleAngle) * 1.35;
    const pupilShiftY = Math.sin(localAppleAngle) * 1.35;
    const eyeX = r * 0.38;
    const eyeOffsetY = r * 0.56;

    [-eyeOffsetY, eyeOffsetY].forEach((ey) => {
      // Dark eye socket ring
      ctx.fillStyle = '#052E1A';
      ctx.beginPath();
      ctx.ellipse(eyeX, ey, 4.4, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Luminous bright eye
      ctx.fillStyle = '#ECFFF4';
      ctx.beginPath();
      ctx.ellipse(eyeX, ey, 3.5, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark pupil tracking apple
      ctx.fillStyle = '#070B12';
      ctx.beginPath();
      ctx.arc(eyeX + pupilShiftX, ey + pupilShiftY, 1.75, 0, Math.PI * 2);
      ctx.fill();

      // Micro eye glint
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(eyeX + 1.1, ey - 0.9, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  private renderRipples(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i];
      const progress = 1 - r.life / r.maxLife;
      const radius = 12 + progress * r.maxRadius;
      const alpha = (1 - progress) * 0.65;

      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.5 * (1 - progress) + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderParticlesAndText(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      const alpha = clamp(ft.life / ft.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#070B12';
      ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
