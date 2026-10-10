/** Tunable balancing constants. All rates are per minute unless noted. */
export const BALANCE = {
  /** Simulation is integrated in fixed steps of this many seconds. */
  tickStepSeconds: 10,

  /** Offline catch-up is capped so a holiday does not make the pet sick immediately. */
  maxOfflineMs: 8 * 60 * 60 * 1000,
  /** Needs drop more slowly while the app is closed. */
  offlineRateFactor: 0.5,
  /** Offline simulation never pushes these below the floor. */
  offlineStatFloor: 15,
  offlineHealthFloor: 50,

  sleep: {
    energyGain: 2.5,
    hungerFactor: 0.5,
    hygieneFactor: 0.5,
    bladderFactor: 0.5,
    /** Pet falls asleep on its own when exhausted. */
    autoSleepBelow: 2,
  },

  health: {
    /** Damage per minute for each need in the red zone. */
    damagePerCritical: 0.6,
    regen: 0.25,
    criticalBelow: 15,
    regenAbove: 50,
    sickBelow: 30,
  },

  bladder: {
    needsToiletAt: 70,
    accidentAt: 100,
    afterAccident: 10,
    accidentHygienePenalty: 15,
  },

  poop: {
    max: 5,
    hygienePerMinute: 0.3,
    funPerMinute: 0.15,
  },

  temperature: {
    /** Fun decay multiplier in the ice room. */
    cold: 0.6,
    neutral: 1,
    warm: 1.3,
  },

  coins: {
    careIntervalSeconds: 300,
    carePerInterval: 1,
    goodAbove: 50,
  },

  /** Age thresholds in hours. */
  stages: {
    childAtHours: 24,
    adultAtHours: 72,
  },
} as const;
