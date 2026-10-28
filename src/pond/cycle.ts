export const CYCLE_SECONDS = 480;
export const START_HOUR = 10;
const HOURS_PER_DAY = 24;

export const wrapHour = (hour: number) => ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
export const advanceHour = (hour: number, seconds: number) => wrapHour(hour + seconds * HOURS_PER_DAY / CYCLE_SECONDS);

export function phaseAt(hour: number) {
  hour = wrapHour(hour);
  return hour < 5 || hour >= 20 ? "Nuit" : hour < 8 ? "Aube" : hour < 17.5 ? "Jour" : "Crépuscule";
}

export function formatHour(hour: number) {
  const minutes = Math.floor(wrapHour(hour) * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
