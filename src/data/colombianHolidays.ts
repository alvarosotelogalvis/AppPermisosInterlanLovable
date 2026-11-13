/**
 * Colombian official holidays 2025–2036 (hardcoded).
 * Format: 'YYYY-MM-DD'
 */
export const colombianHolidays: string[] = [
  // 2025
  '2025-01-01','2025-01-06','2025-03-24','2025-04-17','2025-04-18','2025-05-01','2025-06-02','2025-06-23','2025-06-30','2025-07-20','2025-08-07','2025-08-18','2025-10-13','2025-11-03','2025-11-17','2025-12-08','2025-12-25',
  // 2026
  '2026-01-01','2026-01-12','2026-03-23','2026-04-02','2026-04-03','2026-05-01','2026-05-18','2026-06-08','2026-06-15','2026-06-29','2026-07-20','2026-08-07','2026-08-17','2026-10-12','2026-11-02','2026-11-16','2026-12-08','2026-12-25',
  // 2027
  '2027-01-01','2027-01-11','2027-03-22','2027-03-25','2027-03-26','2027-05-01','2027-05-10','2027-05-31','2027-06-07','2027-07-05','2027-07-20','2027-08-07','2027-08-16','2027-10-18','2027-11-01','2027-11-15','2027-12-08','2027-12-25',
  // 2028
  '2028-01-01','2028-01-10','2028-03-20','2028-04-13','2028-04-14','2028-05-01','2028-05-29','2028-06-19','2028-06-26','2028-07-03','2028-07-20','2028-08-07','2028-08-21','2028-10-16','2028-11-06','2028-11-13','2028-12-08','2028-12-25',
  // 2029
  '2029-01-01','2029-01-08','2029-03-19','2029-03-29','2029-03-30','2029-05-01','2029-05-14','2029-06-04','2029-06-11','2029-07-02','2029-07-20','2029-08-07','2029-08-20','2029-10-15','2029-11-05','2029-11-12','2029-12-08','2029-12-25',
  // 2030
  '2030-01-01','2030-01-07','2030-03-25','2030-04-18','2030-04-19','2030-05-01','2030-06-03','2030-06-24','2030-07-01','2030-07-20','2030-08-07','2030-08-19','2030-10-14','2030-11-04','2030-11-11','2030-12-08','2030-12-25',
  // 2031
  '2031-01-01','2031-01-06','2031-03-24','2031-04-10','2031-04-11','2031-05-01','2031-05-26','2031-06-16','2031-06-23','2031-06-30','2031-07-20','2031-08-07','2031-08-18','2031-10-13','2031-11-03','2031-11-17','2031-12-08','2031-12-25',
  // 2032
  '2032-01-01','2032-01-12','2032-03-22','2032-03-25','2032-03-26','2032-05-01','2032-05-10','2032-05-31','2032-06-07','2032-07-05','2032-07-20','2032-08-07','2032-08-16','2032-10-18','2032-11-01','2032-11-15','2032-12-08','2032-12-25',
  // 2033
  '2033-01-01','2033-01-10','2033-03-21','2033-04-14','2033-04-15','2033-05-01','2033-05-30','2033-06-20','2033-06-27','2033-07-04','2033-07-20','2033-08-07','2033-08-15','2033-10-17','2033-11-07','2033-11-14','2033-12-08','2033-12-25',
  // 2034
  '2034-01-01','2034-01-09','2034-03-20','2034-04-06','2034-04-07','2034-05-01','2034-05-22','2034-06-12','2034-06-19','2034-07-03','2034-07-20','2034-08-07','2034-08-21','2034-10-16','2034-11-06','2034-11-13','2034-12-08','2034-12-25',
  // 2035
  '2035-01-01','2035-01-08','2035-03-19','2035-03-22','2035-03-23','2035-05-01','2035-05-07','2035-05-28','2035-06-04','2035-07-02','2035-07-20','2035-08-07','2035-08-20','2035-10-15','2035-11-05','2035-11-12','2035-12-08','2035-12-25',
  // 2036
  '2036-01-01','2036-01-07','2036-03-24','2036-04-10','2036-04-11','2036-05-01','2036-05-26','2036-06-16','2036-06-23','2036-07-07','2036-07-20','2036-08-07','2036-08-18','2036-10-13','2036-11-03','2036-11-17','2036-12-08','2036-12-25',
];

const holidaySet = new Set(colombianHolidays);

/** Check if a date is a Colombian holiday */
export const isHoliday = (date: Date): boolean => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return holidaySet.has(`${y}-${m}-${d}`);
};

/** Business day = Mon–Fri, not a holiday. Sat & Sun excluded. */
export const isBusinessDay = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 6 && !isHoliday(date);
};

/**
 * Count business days between start and end (inclusive).
 * Excludes Saturdays, Sundays and Colombian holidays.
 */
export const contarDiasHabiles = (start: Date, end: Date): number => {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);
  while (current <= endNorm) {
    if (isBusinessDay(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

/**
 * Add n business days to a base date. Returns the resulting date.
 */
export const sumarDiasHabiles = (base: Date, n: number): Date => {
  const result = new Date(base);
  result.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < n) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) added++;
  }
  return result;
};

/**
 * Get the next business day after the given date.
 */
export const getNextBusinessDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  do {
    result.setDate(result.getDate() + 1);
  } while (!isBusinessDay(result));
  return result;
};

// Work schedule constants (minutes from midnight)
// Monday:      08:00–12:30  +  13:30–17:00  = 8h        (480 min)
// Tuesday–Fri: 08:00–12:30  +  13:30–17:30  = 8h 30min  (510 min)
// Lunch: 12:30–13:30 (no cuenta en la duración)
const MORNING_START = 8 * 60;             // 08:00
const MORNING_END = 12 * 60 + 30;         // 12:30
const LUNCH_START = 12 * 60 + 30;         // 12:30
const LUNCH_END = 13 * 60 + 30;           // 13:30
const AFTERNOON_START = 13 * 60 + 30;     // 13:30
const AFTERNOON_END_MON = 17 * 60;        // 17:00 (lunes)
const AFTERNOON_END_TUE_FRI = 17 * 60 + 30; // 17:30 (martes a viernes)

const FULL_DAY_MINUTES_MON = 480;         // 8h
const FULL_DAY_MINUTES_TUE_FRI = 510;     // 8h 30min
const HALF_DAY_MINUTES_MON = 240;         // 4h
const HALF_DAY_MINUTES_TUE_FRI = 255;     // 4h 15min

// Legacy constants (Tue–Fri length) — kept only for imports that don't know the date.
const FULL_DAY_MINUTES = FULL_DAY_MINUTES_TUE_FRI;
const HALF_DAY_MINUTES = HALF_DAY_MINUTES_TUE_FRI;
const LUNCH_DURATION = 60;

/** True if the given date is a Monday (short workday). */
const isMonday = (date: Date): boolean => date.getDay() === 1;

/** Afternoon end (minutes from midnight) for the given date. */
export const getAfternoonEndMinutes = (date: Date): number =>
  isMonday(date) ? AFTERNOON_END_MON : AFTERNOON_END_TUE_FRI;

/** "HH:MM" of the afternoon end for the given date. */
export const getAfternoonEndTime = (date: Date): string =>
  isMonday(date) ? '17:00' : '17:30';

/** Full working-day minutes for the given date. */
export const getFullDayMinutes = (date: Date): number =>
  isMonday(date) ? FULL_DAY_MINUTES_MON : FULL_DAY_MINUTES_TUE_FRI;

/** Half working-day minutes for the given date. */
export const getHalfDayMinutes = (date: Date): number =>
  isMonday(date) ? HALF_DAY_MINUTES_MON : HALF_DAY_MINUTES_TUE_FRI;

/**
 * Calculate effective working minutes between two times on the same day.
 * Deducts lunch (12:30–13:30) only if the range crosses it.
 */
export const calcEffectiveMinutes = (horaInicio: string, horaFin: string): number => {
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  const startMin = h1 * 60 + m1;
  const endMin = h2 * 60 + m2;
  if (endMin <= startMin) return 0;

  let totalMin = endMin - startMin;

  const overlapStart = Math.max(startMin, LUNCH_START);
  const overlapEnd = Math.min(endMin, LUNCH_END);
  if (overlapEnd > overlapStart) {
    totalMin -= (overlapEnd - overlapStart);
  }

  return totalMin;
};

/**
 * Sum real workday minutes of every business day in [start, end].
 * Each day contributes its own jornada length (Mon=480, Tue–Fri=510).
 */
export const sumBusinessMinutesRange = (start: Date, end: Date): number => {
  let total = 0;
  const cur = new Date(start); cur.setHours(0, 0, 0, 0);
  const endN = new Date(end); endN.setHours(0, 0, 0, 0);
  while (cur <= endN) {
    if (isBusinessDay(cur)) total += getFullDayMinutes(cur);
    cur.setDate(cur.getDate() + 1);
  }
  return total;
};

/**
 * Multi-day range with partial first/last day bounded by horaInicio/horaFin.
 * First day: from horaInicio to end-of-day. Last day: from 08:00 to horaFin.
 * Middle days: full jornada. Lunch (12:30–13:30) deducted on partial days.
 */
export const sumBusinessMinutesRangeWithBounds = (
  start: Date,
  end: Date,
  horaInicio: string,
  horaFin: string,
): number => {
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = new Date(end); e.setHours(0, 0, 0, 0);
  if (e < s) return 0;
  // Same day
  if (s.getTime() === e.getTime()) {
    if (!isBusinessDay(s)) return 0;
    return calcEffectiveMinutes(horaInicio, horaFin);
  }
  let total = 0;
  // First day: horaInicio → end-of-day
  if (isBusinessDay(s)) {
    total += calcEffectiveMinutes(horaInicio, getAfternoonEndTime(s));
  }
  // Middle days
  const cur = new Date(s); cur.setDate(cur.getDate() + 1);
  while (cur < e) {
    if (isBusinessDay(cur)) total += getFullDayMinutes(cur);
    cur.setDate(cur.getDate() + 1);
  }
  // Last day: 08:00 → horaFin
  if (isBusinessDay(e)) {
    total += calcEffectiveMinutes('08:00', horaFin);
  }
  return total;
};

/** Format minutes as "Xh Ymin" */
export const formatMinutes = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

export { FULL_DAY_MINUTES, HALF_DAY_MINUTES, LUNCH_START, LUNCH_END };

