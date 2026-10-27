// Adapted from Dao-Ho/portfolio, src/app/components/koi-pond/ (43a0ae4). See CREDITS.md.
import { hash3, type Koi } from './world';

/** A marking in body space: centred at (s, v) along and across the spine, as fractions of length. */
export type Patch = { s: number; v: number; rs: number; rv: number };
export type Markings = { red: Patch[]; black: Patch[] };

/**
 * Each koi gets a fixed set of markings, seeded by its id, so every fish carries a clear pattern:
 * kohaku a red head and two or three red saddles on white, sanke the same plus small black spots,
 * tancho a single red disc on the crown.
 */
export function koiMarkings(k: Koi): Markings {
    const r = (j: number) => hash3(k.id, j, 41);
    if (k.variety === "tancho") return { red: [{ s: 0.11, v: 0, rs: 0.05, rv: 0.055 }], black: [] };

    const red: Patch[] = [];
    if (r(0) < 0.75) red.push({ s: 0.1, v: (r(1) - 0.5) * 0.03, rs: 0.055 + r(2) * 0.03, rv: 0.11 });
    const saddles = 2 + Math.floor(r(3) * 2);
    for (let j = 0; j < saddles; j++) {
        const span = 0.42 / saddles;
        red.push({
            s: 0.25 + span * (j + 0.5) + (r(10 + j) - 0.5) * span * 0.3,
            v: (r(20 + j) - 0.5) * 0.05,
            rs: span * (0.32 + r(30 + j) * 0.12),
            rv: 0.09 + r(40 + j) * 0.05,
        });
    }

    const black: Patch[] = [];
    if (k.variety === "sanke") {
        const spots = 4 + Math.floor(r(50) * 3);
        for (let j = 0; j < spots; j++) {
            black.push({ s: 0.24 + r(60 + j) * 0.44, v: (r(70 + j) - 0.5) * 0.16, rs: 0.022, rv: 0.026 });
        }
    }
    return { red, black };
}

