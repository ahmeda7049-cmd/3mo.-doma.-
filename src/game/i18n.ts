import { GameOverReason, Language } from './types';

export interface Translations {
  score: string;
  highScore: string;
  level: string;
  apples: string;
  time: string;
  lowTime: string;
  best: string;
  totalApples: string;
  bestTime: string;
  clearTime: string;
  timeBonus: string;
  newBadge: string;
  startButton: string;
  chooseLevelTitle: string;
  backButton: string;
  backToLevels: string;
  levelsProgress: (completed: number, max: number) => string;
  levelTileAria: (lvl: number, state: 'completed' | 'unlocked' | 'locked') => string;
  startNewGame: string;
  homeSubtitle: string;
  controlsHintDesktop: string;
  controlsHintMobile: string;
  analogStick: string;
  paused: string;
  resume: string;
  retryLevel: (lvl: number) => string;
  levelClearedTag: (lvl: number, max: number) => string;
  levelCompleteTitle: string;
  upNextLevel: (lvl: number, max: number) => string;
  target: string;
  applesAndTimer: (apples: number, seconds: number) => string;
  paceAndObstacles: string;
  hazardsSummary: (obstacles: number, traps: number) => string;
  nextLevel: string;
  allLevelsCleared: (max: number) => string;
  masterVictoryTitle: string;
  masterVictoryDesc: string;
  finalScore: string;
  timeExpiredTag: string;
  trapTriggeredTag: string;
  collisionTag: string;
  gameOverTitle: string;
  gameOverReason: (reason: GameOverReason) => string;
  retry: string;
  pressEnterRetry: (lvl: number) => string;
  footerControls: string;
  footerPause: string;
  footerLevelInfo: (lvl: number, max: number, pace: string, obstacles: number, traps: number) => string;
  installApp: string;
  installIOS: string;
  installIOSTitle: string;
  installIOSStep1: string;
  installIOSStep2: string;
  close: string;
  offlineMessage: string;
  pauseTitle: string;
  resumeTitle: string;
  muteTitle: string;
  unmuteTitle: string;
  homeTitle: string;
  levelsTitle: string;
  showJoystickTitle: string;
  hideJoystickTitle: string;
  shareAppTitle: string;
  shareModalTitle: string;
  shareModalDesc: string;
  shareMessageText: (url: string) => string;
  copyLink: string;
  linkCopied: string;
  sendWhatsApp: string;
  sendEmail: string;
  emailSubject: string;
  shareViaDevice: string;
  paceLabel: (englishLabel: string) => string;
}

const EN: Translations = {
  score: 'Score',
  highScore: 'High Score',
  level: 'Level',
  apples: 'Apples',
  time: 'Time',
  lowTime: 'Low Time',
  best: 'Best',
  totalApples: 'Total Apples',
  bestTime: 'Best Time',
  clearTime: 'Clear Time',
  timeBonus: 'Time Bonus',
  newBadge: 'New',
  startButton: 'ابدأ / START',
  chooseLevelTitle: 'Choose Level',
  backButton: 'Back',
  backToLevels: 'Back to Levels',
  levelsProgress: (completed, max) => `${completed} / ${max} Completed`,
  levelTileAria: (lvl, state) =>
    state === 'locked'
      ? `Level ${lvl}, locked`
      : state === 'completed'
        ? `Level ${lvl}, completed — click to play`
        : `Level ${lvl}, unlocked — click to play`,
  startNewGame: 'Start New Game',
  homeSubtitle: 'Levels 1–4 for training, then 46 escalating levels with moving traps.',
  controlsHintDesktop: 'Arrows / WASD on PC · Swipe or Joystick on mobile',
  controlsHintMobile: 'Swipe board or use joystick',
  analogStick: '360° Analog Stick',
  paused: 'Paused',
  resume: 'Resume',
  retryLevel: (lvl) => `Retry Level ${lvl}`,
  levelClearedTag: (lvl, max) => `Level ${lvl} / ${max} Cleared`,
  levelCompleteTitle: 'Level Complete!',
  upNextLevel: (lvl, max) => `Up Next: Level ${lvl} / ${max}`,
  target: 'Target',
  applesAndTimer: (apples, seconds) => `${apples} apples · ${seconds}s`,
  paceAndObstacles: 'Pace & Hazards',
  hazardsSummary: (obstacles, traps) => {
    if (obstacles === 0 && traps === 0) return 'No traps';
    const parts: string[] = [];
    if (traps > 0) parts.push(`${traps} moving traps`);
    if (obstacles > 0) parts.push(`${obstacles} blocks`);
    return parts.join(' · ');
  },
  nextLevel: 'Next Level',
  allLevelsCleared: (max) => `All ${max} / ${max} Levels Cleared`,
  masterVictoryTitle: 'Master Victory!',
  masterVictoryDesc: 'You conquered every stage of 3mo.doma.',
  finalScore: 'Final Score',
  timeExpiredTag: 'Time Expired',
  trapTriggeredTag: 'Moving Trap Hit',
  collisionTag: 'Collision Detected',
  gameOverTitle: 'Game Over',
  gameOverReason: (reason) => {
    switch (reason) {
      case 'TIME':
        return 'Time expired before collecting all required apples.';
      case 'TRAP':
        return 'Struck by a moving hazard trap!';
      case 'WALL':
        return 'Collided with the arena boundary.';
      case 'OBSTACLE':
        return 'Collided with an arena obstacle.';
      case 'SELF':
        return 'Ran into your own tail.';
      default:
        return 'Level attempt ended.';
    }
  },
  retry: 'Retry',
  pressEnterRetry: (lvl) => `Press Space or Enter to retry Level ${lvl}`,
  footerControls: 'Arrows / WASD to steer',
  footerPause: 'P to pause',
  footerLevelInfo: (lvl, max, pace, obstacles, traps) => {
    const extras: string[] = [];
    if (traps > 0) extras.push(`${traps} moving traps`);
    if (obstacles > 0) extras.push(`${obstacles} blocks`);
    return `Level ${lvl} / ${max}: ${pace} pace${extras.length > 0 ? ` (${extras.join(', ')})` : ''}`;
  },
  installApp: 'Install App',
  installIOS: 'Install App',
  installIOSTitle: 'Install 3mo.doma on iPhone / iPad',
  installIOSStep1: '1. Tap the Share button in Safari.',
  installIOSStep2: '2. Scroll down and tap Add to Home Screen.',
  close: 'Close',
  offlineMessage: 'Offline Mode — Ready to play offline.',
  pauseTitle: 'Pause (P)',
  resumeTitle: 'Resume (P)',
  muteTitle: 'Mute Sound',
  unmuteTitle: 'Unmute Sound',
  homeTitle: 'Home',
  levelsTitle: 'Levels',
  showJoystickTitle: 'Show Joystick',
  hideJoystickTitle: 'Hide Joystick',
  shareAppTitle: 'Send App Link',
  shareModalTitle: 'Send 3mo.doma Link',
  shareModalDesc: 'Open this link on your phone or share it with friends to play or install the app.',
  shareMessageText: (url) => `Play 3mo.doma Snake Game (50 levels & offline mode): ${url}`,
  copyLink: 'Copy Link',
  linkCopied: 'Copied!',
  sendWhatsApp: 'Send via WhatsApp',
  sendEmail: 'Send via Email',
  emailSubject: '3mo.doma Snake Game Link',
  shareViaDevice: 'Share via Apps',
  paceLabel: (label) => label,
};

const AR: Translations = {
  score: 'النقاط',
  highScore: 'أعلى نتيجة',
  level: 'المستوى',
  apples: 'التفاح',
  time: 'الوقت',
  lowTime: 'الوقت ينفد',
  best: 'الأفضل',
  totalApples: 'إجمالي التفاح',
  bestTime: 'أفضل وقت',
  clearTime: 'وقت الإنهاء',
  timeBonus: 'مكافأة الوقت',
  newBadge: 'جديد',
  startButton: 'ابدأ / START',
  chooseLevelTitle: 'اختر المستوى',
  backButton: 'رجوع',
  backToLevels: 'العودة للمستويات',
  levelsProgress: (completed, max) => `تم إنهاء ${completed} / ${max}`,
  levelTileAria: (lvl, state) =>
    state === 'locked'
      ? `المستوى ${lvl}، مقفل`
      : state === 'completed'
        ? `المستوى ${lvl}، مكتمل — اضغط للعب`
        : `المستوى ${lvl}، مفتوح — اضغط للعب`,
  startNewGame: 'ابدأ لعبة جديدة',
  homeSubtitle: 'المستويات ١–٤ للتدريب السهل، ثم ٤٦ مستوى متصاعد بفخاخ متحركة.',
  controlsHintDesktop: 'الأسهم أو WASD للكمبيوتر · السحب أو عصا التحكم للموبايل',
  controlsHintMobile: 'اسحب على اللوحة أو استخدم عصا التحكم',
  analogStick: 'عصا تحكم ٣٦٠°',
  paused: 'إيقاف مؤقت',
  resume: 'استئناف',
  retryLevel: (lvl) => `إعادة المستوى ${lvl}`,
  levelClearedTag: (lvl, max) => `تم اجتياز المستوى ${lvl} / ${max}`,
  levelCompleteTitle: 'أحسنت! عديت المستوى',
  upNextLevel: (lvl, max) => `التالي: المستوى ${lvl} / ${max}`,
  target: 'الهدف',
  applesAndTimer: (apples, seconds) => `${apples} تفاحات · ${seconds}ث`,
  paceAndObstacles: 'السرعة والمخاطر',
  hazardsSummary: (obstacles, traps) => {
    if (obstacles === 0 && traps === 0) return 'بدون فخاخ';
    const parts: string[] = [];
    if (traps > 0) parts.push(`${traps} فخاخ متحركة`);
    if (obstacles > 0) parts.push(`${obstacles} عوائق`);
    return parts.join(' · ');
  },
  nextLevel: 'المستوى التالي',
  allLevelsCleared: (max) => `تم إنهاء جميع المستويات ${max} / ${max}`,
  masterVictoryTitle: 'فوز أسطوري!',
  masterVictoryDesc: 'لقد أنهيت جميع مستويات لعبة 3mo.doma بنجاح.',
  finalScore: 'النتيجة النهائية',
  timeExpiredTag: 'انتهى الوقت',
  trapTriggeredTag: 'إصابة بفخ متحرك',
  collisionTag: 'تصادم',
  gameOverTitle: 'انتهت اللعبة',
  gameOverReason: (reason) => {
    switch (reason) {
      case 'TIME':
        return 'انتهى الوقت قبل جمع كل التفاح المطلوب.';
      case 'TRAP':
        return 'اصطدمت بأحد الفخاخ المتحركة!';
      case 'WALL':
        return 'اصطدمت بجدار الساحة.';
      case 'OBSTACLE':
        return 'اصطدمت بأحد العوائق.';
      case 'SELF':
        return 'اصطدمت بجسم الثعبان.';
      default:
        return 'انتهت المحاولة.';
    }
  },
  retry: 'إعادة المحاولة',
  pressEnterRetry: (lvl) => `اضغط مسافة أو Enter لإعادة المستوى ${lvl}`,
  footerControls: 'الأسهم أو WASD للتوجيه',
  footerPause: 'P للإيقاف المؤقت',
  footerLevelInfo: (lvl, max, pace, obstacles, traps) => {
    const extras: string[] = [];
    if (traps > 0) extras.push(`${traps} فخاخ متحركة`);
    if (obstacles > 0) extras.push(`${obstacles} عوائق`);
    return `المستوى ${lvl} / ${max}: ${pace}${extras.length > 0 ? ` (${extras.join('، ')})` : ''}`;
  },
  installApp: 'تثبيت التطبيق',
  installIOS: 'تثبيت التطبيق',
  installIOSTitle: 'تثبيت 3mo.doma على الآيفون / الآيباد',
  installIOSStep1: '١. اضغط على زر المشاركة (Share) في متصفح Safari.',
  installIOSStep2: '٢. اختر إضافة إلى الشاشة الرئيسية (Add to Home Screen).',
  close: 'إغلاق',
  offlineMessage: 'وضع عدم الاتصال — اللعبة تعمل بدون إنترنت.',
  pauseTitle: 'إيقاف مؤقت (P)',
  resumeTitle: 'استئناف (P)',
  muteTitle: 'كتم الصوت',
  unmuteTitle: 'تشغيل الصوت',
  homeTitle: 'الرئيسية',
  levelsTitle: 'المستويات',
  showJoystickTitle: 'إظهار عصا التحكم',
  hideJoystickTitle: 'إخفاء عصا التحكم',
  shareAppTitle: 'إرسال رابط التطبيق',
  shareModalTitle: 'إرسال رابط لعبة 3mo.doma',
  shareModalDesc: 'أرسل هذا الرابط لهاتفك أو لأصدقائك لفتح اللعبة وتثبيتها مباشرة.',
  shareMessageText: (url) => `جرّب لعبة الثعبان 3mo.doma (٥٠ مستوى وتعمل بدون إنترنت): ${url}`,
  copyLink: 'نسخ الرابط',
  linkCopied: 'تم النسخ!',
  sendWhatsApp: 'إرسال عبر واتساب',
  sendEmail: 'إرسال عبر البريد الإلكتروني',
  emailSubject: 'رابط لعبة 3mo.doma',
  shareViaDevice: 'مشاركة عبر تطبيقات الجهاز',
  paceLabel: (label) => {
    switch (label) {
      case 'Training':
        return 'تدريب';
      case 'Steady':
        return 'ثابتة';
      case 'Quick':
        return 'سريعة';
      case 'Fast':
        return 'سريعة جداً';
      case 'Rapid':
        return 'فائقة';
      case 'Turbo':
        return 'تيربو';
      case 'Hyper':
        return 'خارقة';
      default:
        return label;
    }
  },
};

export function getTranslations(lang: Language): Translations {
  return lang === 'ar' ? AR : EN;
}
