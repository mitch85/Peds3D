const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface DayPhase {
  /** 0 = night, 1 = full day. */
  daylight: number;
  /** 0..1, strongest around sunrise/sunset (orange tint). */
  dusk: number;
  /** Sun angle across the sky, 0 = east horizon, 1 = west horizon. */
  sunProgress: number;
  hour: number;
}

/** Day/night cycle from the real local time. */
export function dayPhase(date: Date): DayPhase {
  const hour = date.getHours() + date.getMinutes() / 60;
  const daylight = smoothstep(5.5, 8, hour) * (1 - smoothstep(18, 20.5, hour));
  const dusk = Math.max(0, 1 - Math.abs(hour - 7) / 1.5) + Math.max(0, 1 - Math.abs(hour - 19.3) / 1.5);
  return { daylight, dusk: Math.min(1, dusk), sunProgress: Math.min(1, Math.max(0, (hour - 6) / 14)), hour };
}
