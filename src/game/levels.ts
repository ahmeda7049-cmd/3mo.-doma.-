import { LevelConfig, MovingTrap, MovingTrapType, Obstacle } from './types';

export const MAX_LEVELS = 50;
export const BOARD_SIZE = 1000;
export const GRID_CELLS = 20;
export const CELL_SIZE = BOARD_SIZE / GRID_CELLS; // 50 logical units per cell

function getSpeedLabel(level: number): string {
  if (level <= 4) return 'Training';
  if (level <= 10) return 'Steady';
  if (level <= 18) return 'Quick';
  if (level <= 28) return 'Fast';
  if (level <= 38) return 'Rapid';
  if (level <= 45) return 'Turbo';
  return 'Hyper';
}

export function getLevelConfig(rawLevel: number): LevelConfig {
  const level = Math.max(1, Math.min(MAX_LEVELS, Math.floor(rawLevel)));

  // Levels 1-4: Easy training levels — very slow snake, long timer, few apples, NO traps/obstacles
  if (level <= 4) {
    const trainingSpeeds = [145, 155, 165, 175];
    const trainingTimers = [90, 88, 85, 82];
    const trainingApples = [3, 3, 4, 5];
    const idx = level - 1;

    return {
      level,
      speed: trainingSpeeds[idx],
      turnRate: Number((10.4 + idx * 0.4).toFixed(2)),
      applesRequired: trainingApples[idx],
      timeLimitSeconds: trainingTimers[idx],
      obstacleCount: 0,
      trapCount: 0,
      trapSpeed: 0,
      pointsPerApple: 100 + idx * 15,
      speedLabel: getSpeedLabel(level),
    };
  }

  // Levels 5-50: Escalates every single level
  const postProgress = (level - 5) / (MAX_LEVELS - 5); // 0.0 at L5 -> 1.0 at L50

  // Snake speed increases strictly every level from 195 (L5) to 440 (L50)
  const speed = Math.round(195 + postProgress * 245);

  // Crisp steering scales smoothly with speed
  const turnRate = Number((12.4 + postProgress * 8.2).toFixed(2));

  // Apples needed increase from 6 (L5) up to 16 (L50)
  const applesRequired = 6 + Math.floor(((level - 5) * 10) / 45);

  // Timer strictly decreases every level: L5=75, L6=70, L7=65, then 64 -> 22
  let timeLimitSeconds: number;
  if (level === 5) {
    timeLimitSeconds = 75;
  } else if (level === 6) {
    timeLimitSeconds = 70;
  } else if (level === 7) {
    timeLimitSeconds = 65;
  } else {
    timeLimitSeconds = Math.max(22, 64 - (level - 8));
  }

  // Obstacles: appear from Level 5, tighten into narrow corridors at Level 20+
  let obstacleCount = 0;
  if (level < 20) {
    obstacleCount = 2 + Math.floor((level - 5) * 0.32); // 2..6
  } else if (level < 30) {
    obstacleCount = 7 + Math.floor((level - 20) * 0.3); // 7..9
  } else {
    obstacleCount = Math.min(14, 10 + Math.floor((level - 30) * 0.22)); // 10..14
  }

  // Moving traps: start at Level 5 and increase in count & speed every tier
  let trapCount = 0;
  let trapSpeed = 0;
  if (level < 10) {
    trapCount = 2 + Math.floor((level - 5) * 0.5); // 2..4
    trapSpeed = 88 + (level - 5) * 8; // 88..120
  } else if (level < 20) {
    trapCount = 5 + Math.floor((level - 10) * 0.34); // 5..8 (>=2 trap types)
    trapSpeed = 128 + (level - 10) * 6; // 128..182
  } else if (level < 30) {
    trapCount = 8 + Math.floor((level - 20) * 0.34); // 8..11 (very fast + narrow paths)
    trapSpeed = 198 + (level - 20) * 6; // 198..252
  } else {
    trapCount = Math.min(16, 11 + Math.floor((level - 30) * 0.26)); // 11..16 (intense swarm)
    trapSpeed = Math.round(260 + (level - 30) * 3.5); // 260..330
  }

  const pointsPerApple = 100 + (level - 1) * 15;

  return {
    level,
    speed,
    turnRate,
    applesRequired,
    timeLimitSeconds,
    obstacleCount,
    trapCount,
    trapSpeed,
    pointsPerApple,
    speedLabel: getSpeedLabel(level),
  };
}

/**
 * Generates deterministic, fair, grid-aligned static obstacles.
 * Returns [] for training levels 1–4.
 * Levels 20+ introduce tighter corridor pillars while preserving clear spawn & reachability.
 */
export function generateObstacles(rawLevel: number): Obstacle[] {
  const level = Math.max(1, Math.min(MAX_LEVELS, Math.floor(rawLevel)));
  if (level <= 4) {
    return [];
  }

  const config = getLevelConfig(level);
  if (config.obstacleCount <= 0) {
    return [];
  }

  const makeBlock = (id: number, gx: number, gy: number, gw: number, gh: number): Obstacle => ({
    id,
    x: gx * CELL_SIZE + 4,
    y: gy * CELL_SIZE + 4,
    w: gw * CELL_SIZE - 8,
    h: gh * CELL_SIZE - 8,
  });

  const obstacles: Obstacle[] = [];
  let id = 1;

  // Level 20+: Add structured corridor pillars to create narrower tactical lanes
  if (level >= 20) {
    const corridorPresets: Array<[number, number, number, number]> = [
      [5, 3, 1, 3],
      [14, 3, 1, 3],
      [5, 14, 1, 3],
      [14, 14, 1, 3],
    ];
    if (level >= 30) {
      corridorPresets.push([9, 3, 2, 1], [9, 16, 2, 1]);
    }
    for (let i = 0; i < corridorPresets.length && obstacles.length < config.obstacleCount; i++) {
      const [gx, gy, gw, gh] = corridorPresets[i];
      obstacles.push(makeBlock(id++, gx, gy, gw, gh));
    }
  }

  let seed = level * 7919 + 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  let attempts = 0;
  const minClearanceCells = level >= 30 ? 1.75 : level >= 20 ? 1.95 : 2.25;

  while (obstacles.length < config.obstacleCount && attempts < 420) {
    attempts++;
    const horizontal = rand() > 0.5;
    const gw = horizontal ? 2 : 1;
    const gh = horizontal ? 1 : 2;
    const gx = 2 + Math.floor(rand() * (GRID_CELLS - 4 - gw));
    const gy = 2 + Math.floor(rand() * (GRID_CELLS - 4 - gh));

    // Keep the horizontal spawn corridor clear (rows 7..12, cols 2..16)
    const inSpawnCorridor = gy + gh > 7 && gy < 13 && gx + gw > 2 && gx < 17;
    if (inSpawnCorridor) continue;

    const candidate = makeBlock(id, gx, gy, gw, gh);
    const padding = CELL_SIZE * minClearanceCells;

    const overlapsExisting = obstacles.some(
      (o) =>
        candidate.x < o.x + o.w + padding &&
        candidate.x + candidate.w + padding > o.x &&
        candidate.y < o.y + o.h + padding &&
        candidate.y + candidate.h + padding > o.y
    );

    if (!overlapsExisting) {
      obstacles.push(candidate);
      id++;
    }
  }

  return obstacles;
}

/**
 * Generates deterministic moving traps (moving walls, moving spikes, moving bombs).
 * Returns [] for training levels 1–4.
 * Guarantees >= 2 trap types at Level 10+, and all 3 types at higher tiers.
 */
export function generateTraps(rawLevel: number, obstacles: Obstacle[]): MovingTrap[] {
  const level = Math.max(1, Math.min(MAX_LEVELS, Math.floor(rawLevel)));
  if (level <= 4) {
    return [];
  }

  const config = getLevelConfig(level);
  if (config.trapCount <= 0) {
    return [];
  }

  let seed = level * 104729 + 524287;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const traps: MovingTrap[] = [];
  const allTypes: MovingTrapType[] = ['wall', 'spike', 'bomb'];

  // Ensure multi-type variety starting from Level 5 and strictly >= 2 types at Level 10+
  const typeQueue: MovingTrapType[] = [];
  if (level >= 10) {
    typeQueue.push('wall', 'spike', 'bomb');
  } else {
    typeQueue.push('wall', 'spike');
  }

  let attempts = 0;
  let id = 1;

  while (traps.length < config.trapCount && attempts < 450) {
    attempts++;

    const type: MovingTrapType =
      traps.length < typeQueue.length
        ? typeQueue[traps.length]
        : allTypes[Math.floor(rand() * allTypes.length)];

    const speedVar = 0.88 + rand() * 0.28;
    const spd = config.trapSpeed * speedVar;

    const horizontalPatrol = rand() > 0.5;
    const w = type === 'wall' ? (horizontalPatrol ? 74 : 26) : 0;
    const h = type === 'wall' ? (horizontalPatrol ? 26 : 74) : 0;
    const radius = type === 'spike' ? 19 : type === 'bomb' ? 17 : 0;

    const halfW = type === 'wall' ? w / 2 : radius;
    const halfH = type === 'wall' ? h / 2 : radius;

    const margin = 65 + Math.max(halfW, halfH);
    const span = 180 + rand() * 250;

    let minX: number;
    let maxX: number;
    let minY: number;
    let maxY: number;
    let x: number;
    let y: number;
    let vx = 0;
    let vy = 0;

    if (horizontalPatrol) {
      const cy = margin + rand() * (BOARD_SIZE - margin * 2);
      const startX = margin + rand() * Math.max(40, BOARD_SIZE - margin * 2 - span);
      minX = startX;
      maxX = Math.min(BOARD_SIZE - margin, startX + span);
      minY = cy;
      maxY = cy;
      x = minX + rand() * (maxX - minX);
      y = cy;
      vx = (rand() > 0.5 ? 1 : -1) * spd;
      // Add subtle vertical drift for some spikes/bombs in Level 20+
      if (level >= 20 && type !== 'wall' && rand() > 0.55) {
        minY = Math.max(margin, cy - 85);
        maxY = Math.min(BOARD_SIZE - margin, cy + 85);
        vy = (rand() > 0.5 ? 1 : -1) * spd * 0.55;
      }
    } else {
      const cx = margin + rand() * (BOARD_SIZE - margin * 2);
      const startY = margin + rand() * Math.max(40, BOARD_SIZE - margin * 2 - span);
      minX = cx;
      maxX = cx;
      minY = startY;
      maxY = Math.min(BOARD_SIZE - margin, startY + span);
      x = cx;
      y = minY + rand() * (maxY - minY);
      vy = (rand() > 0.5 ? 1 : -1) * spd;
      if (level >= 20 && type !== 'wall' && rand() > 0.55) {
        minX = Math.max(margin, cx - 85);
        maxX = Math.min(BOARD_SIZE - margin, cx + 85);
        vx = (rand() > 0.5 ? 1 : -1) * spd * 0.55;
      }
    }

    // Spawn safety: keep clear of snake starting corridor at initial spawn (head at x~280, y~500 going right)
    const inStartDangerZone =
      x + halfW > 100 && x - halfW < 470 && y + halfH > 405 && y - halfH < 595;
    if (inStartDangerZone) continue;

    // Also make sure trap doesn't immediately sweep over start head in first ~0.8s
    const futureX = Math.max(minX, Math.min(maxX, x + vx * 0.7));
    const futureY = Math.max(minY, Math.min(maxY, y + vy * 0.7));
    const futureHitsHead =
      futureX + halfW > 180 && futureX - halfW < 450 && futureY + halfH > 430 && futureY - halfH < 570;
    if (futureHitsHead) continue;

    // Avoid colliding directly with static obstacles along patrol box
    const obsPad = 14;
    const hitsObstacle = obstacles.some(
      (o) =>
        maxX + halfW + obsPad > o.x &&
        minX - halfW - obsPad < o.x + o.w &&
        maxY + halfH + obsPad > o.y &&
        minY - halfH - obsPad < o.y + o.h
    );
    if (hitsObstacle) continue;

    // Keep reasonable spacing between trap starting anchors
    const tooCloseToTrap = traps.some((t) => {
      const dx = t.x - x;
      const dy = t.y - y;
      return dx * dx + dy * dy < 115 * 115;
    });
    if (tooCloseToTrap && attempts < 320) continue;

    traps.push({
      id: id++,
      type,
      x,
      y,
      w,
      h,
      radius,
      vx,
      vy,
      minX,
      maxX,
      minY,
      maxY,
      phase: rand() * Math.PI * 2,
      spin: rand() * Math.PI * 2,
    });
  }

  return traps;
}
