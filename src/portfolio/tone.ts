const DAY_START = 7;
const NIGHT_START = 19;

export function heroTone(hour: number) {
  // Switch text and its veil together; intermediate grays would weaken contrast.
  return hour >= DAY_START && hour < NIGHT_START ? "day" : "night";
}
