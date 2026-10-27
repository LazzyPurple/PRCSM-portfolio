// Portrait screens crop the same broad pond instead of stretching it into an oval.
const MIN_POND_ASPECT = 1.35;
export const pondWidth = (width: number, height: number) => Math.max(width, height * MIN_POND_ASPECT);

