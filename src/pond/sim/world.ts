// Adapted from Dao-Ho/portfolio, src/app/components/koi-pond/ (43a0ae4). See CREDITS.md.
export const TAU = Math.PI * 2;
export const KOI_NODES = 20;
export const RIPPLE_SPEED = 52;
export const POND_SWIM_RADIUS = 0.43;
const FIN_CLEARANCE = 0.31;
const SHORE_ITERATIONS = 12;
const SHORE_TURN_LEAD = 0.65;
const SHORE_TURN_FORCE = 5;
const SHORE_INSET_EPSILON = 0.0001;
const POND_LENGTH_RATIO = 0.38;
const POND_LENGTH_MIN = 120;
const POND_LENGTH_MAX = 360;
const POND_LENGTHS = [0.9, 0.48, 0.7, 0.36, 0.58, 0.8, 0.42, 0.65];
const POND_VARIETIES: Variety[] = ["kohaku", "yamabuki", "shiro", "asagi", "sanke", "showa", "tancho"];
const SPAWN_ANGLE = 2.399963229728653;
const SPAWN_RADIUS = 0.23;
const SPAWN_BODY_CENTER = 0.4;
const SIZE_JITTER = 0.05;
const BODY_SPACE = 0.22;
const FEED_SPACE = 0.19;
const BODY_REPULSION = 4;
const LOOK_AHEAD = 0.18;
const TRAFFIC_MIN_SPEED = 0.45;
const TRAFFIC_BRAKE_RANGE = 0.65;
const POND_SHOALING = 0.04;
const BODY_CONTACT_SPACE = 0.155;
const BODY_CONTACT_RATE = 3;
const BODY_CONTACT_MAX_STEP = 0.25;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export function smoothstep(e0: number, e1: number, x: number) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
}

export function angleDiff(a: number, b: number) {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
}

// Deterministic integer hash to [0, 1), so textures stay pinned to the body.
export function hash3(x: number, y: number, z: number) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

export type Box = { left: number; top: number; right: number; bottom: number };

export type Variety = "kohaku" | "sanke" | "tancho" | "yamabuki" | "shiro" | "asagi" | "showa";

const VARIETY_WEIGHTS: [Variety, number][] = [
    ["kohaku", 3],
    ["sanke", 2],
    ["tancho", 1],
];
const TOTAL_WEIGHT = VARIETY_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);

function pickVariety(): Variety {
    let r = Math.random() * TOTAL_WEIGHT;
    for (const [variety, weight] of VARIETY_WEIGHTS) {
        r -= weight;
        if (r <= 0) return variety;
    }
    return "kohaku";
}

export interface Koi {
    id: number;
    variety: Variety;
    length: number;
    /** Spine positions, snout first: [x0, y0, x1, y1, ...]. */
    nodes: Float32Array;
    heading: number;
    speed: number;
    phase: number;
    /** Smoothed angular velocity, used to splay the fins into turns. */
    turn: number;
    wander: number;
    /** How strongly this koi swims over to the cursor. */
    curiosity: number;
    /** 0.5 deep and dim to 1 just under the surface. */
    depth: number;
    depthTarget: number;
    depthMax: number;
    nextDive: number;
    nextSurface: number;
    /** When a koi swimming near the surface next sends a small ring off its tail. */
    nextWake: number;
    /** 1 just after food hits the water nearby, fading: the koi sprints and turns harder while it lasts. */
    rush: number;
    /** The pellet this koi is going for. It sticks with it so a burst of clicks doesn't yank it around. */
    food: Pellet | null;
    /** Tail-beat intensity: koi swim in bursts of beats, then coast with the tail still. */
    beat: number;
    burstUntil: number;
    nextBurst: number;
    /** Phase of the pectoral fins, which scull gently while the koi coasts or hovers. */
    finPhase: number;
    /** 1 right after a fright, fading as the koi calms down. */
    startle: number;
    fleeX: number;
    fleeY: number;
    /** How far the mouth is open, as the koi closes in on food. */
    gulp: number;
}

export interface Pellet {
    x: number;
    y: number;
    born: number;
    /** Seconds after `born` that it hits the water; until then it's falling and koi can't eat it. */
    landAt: number;
    landed: boolean;
    /** Slow drift once it's floating. */
    vx: number;
    vy: number;
}

/** The moment a koi takes a pellet, drawn as a brief flash where it happened. */
export interface Bite {
    x: number;
    y: number;
    born: number;
}

export interface Ripple {
    x: number;
    y: number;
    born: number;
    strength: number;
}

const push = { x: 0, y: 0 };

function bodyDistance(k: Koi, other: Koi, lookAhead: number) {
    let nearest = Infinity, awayX = 0, awayY = 0;
    const aheadX = Math.cos(k.heading) * k.length * lookAhead, aheadY = Math.sin(k.heading) * k.length * lookAhead;
    for (let a = 0; a < KOI_NODES; a += 3) for (let b = 0; b < KOI_NODES; b += 3) {
        const x = k.nodes[a * 2] + (a === 0 ? aheadX : 0) - other.nodes[b * 2];
        const y = k.nodes[a * 2 + 1] + (a === 0 ? aheadY : 0) - other.nodes[b * 2 + 1];
        const squared = x * x + y * y;
        if (squared < nearest) { nearest = squared; awayX = x; awayY = y; }
    }
    const d = Math.sqrt(nearest);
    push.x = d > 0.001 ? awayX / d : k.id < other.id ? -1 : 1;
    push.y = d > 0.001 ? awayY / d : 0;
    return d;
}

/** Sum of pushes away from every box within `margin` of (x, y), each scaled 0..1 by closeness. */
function repel(boxes: Box[], x: number, y: number, margin: number, out: { x: number; y: number }) {
    out.x = 0;
    out.y = 0;
    for (const b of boxes) {
        let ox = x - clamp(x, b.left, b.right);
        let oy = y - clamp(y, b.top, b.bottom);
        let d = Math.hypot(ox, oy);
        if (d > margin) continue;
        if (d < 1e-3) {
            // Inside the box: head for the nearest edge.
            const nearestValue = Math.max(b.left - x, x - b.right, b.top - y, y - b.bottom);
            const nearest = b.left - x === nearestValue ? 0 : x - b.right === nearestValue ? 1 : b.top - y === nearestValue ? 2 : 3;
            ox = nearest === 0 ? -1 : nearest === 1 ? 1 : 0;
            oy = nearest === 2 ? -1 : nearest === 3 ? 1 : 0;
            d = 0;
        }
        const len = Math.hypot(ox, oy) || 1;
        out.x += (ox / len) * (1 - d / margin);
        out.y += (oy / len) * (1 - d / margin);
    }
    return out;
}

export const PELLET_LIFE = 14;
export const BITE_LIFE = 0.45;
const RUSH_RANGE = 650;
const FEED_CALM = 2;
/** Uneaten pellets start to sink this many seconds in, fading out by PELLET_LIFE. */
export const PELLET_SINK = 9;
const THROW_RADIUS = 34;
const STARTLE_SPEED = 1100;
const MAX_PELLETS = 24;

export class World {
    width = 0;
    height = 0;
    time = 0;
    koi: Koi[] = [];
    pellets: Pellet[] = [];
    bites: Bite[] = [];
    /** Moving the mouse to throw food isn't a threat, so swipes don't startle koi for a moment after a throw. */
    private lastFeed = -Infinity;
    ripples: Ripple[] = [];
    pointer = { x: 0, y: 0, speed: 0, active: false };
    /** Page content the koi steer around, in canvas space. */
    avoid: Box[] = [];
    /** Optional physical shore; absent for the original, open canvas simulation. */
    shore?: number;
    private pondFishLength?: number;

    resize(width: number, height: number, visibleWidth = width, visibleHeight = height) {
        const first = this.width === 0;
        if (this.shore) {
            const length = Math.min(clamp(Math.min(visibleWidth, visibleHeight) * POND_LENGTH_RATIO, POND_LENGTH_MIN, POND_LENGTH_MAX), Math.min(width, height) * POND_LENGTH_RATIO);
            if (this.pondFishLength) for (const k of this.koi) {
                const ratio = length / this.pondFishLength;
                k.length *= ratio;
                for (let n = 2; n < k.nodes.length; n += 2) {
                    k.nodes[n] = k.nodes[0] + (k.nodes[n] - k.nodes[0]) * ratio;
                    k.nodes[n + 1] = k.nodes[1] + (k.nodes[n + 1] - k.nodes[1]) * ratio;
                }
            }
            this.pondFishLength = length;
        }
        this.width = width;
        this.height = height;
        if (first) this.seed(visibleWidth, visibleHeight);
        if (this.shore) this.confine();
    }

    contains(x: number, y: number, margin = 0) {
        if (!this.shore) return x >= margin && y >= margin && x <= this.width - margin && y <= this.height - margin;
        const inset = Math.max(0.01, 1 - margin / (Math.min(this.width, this.height) * this.shore));
        return ((x - this.width / 2) / (this.width * this.shore * inset)) ** 2
            + ((y - this.height / 2) / (this.height * this.shore * inset)) ** 2 <= 1;
    }

    confine() {
        if (!this.shore) return;
        for (const k of this.koi) {
            const inset = Math.max(0.1, 1 - k.length * FIN_CLEARANCE / (Math.min(this.width, this.height) * this.shore));
            const rx = this.width * this.shore * inset, ry = this.height * this.shore * inset;
            // Translate the whole spine so a collision preserves all segment lengths and bends.
            for (let pass = 0; pass < SHORE_ITERATIONS; pass++) {
                let farthest = 1, at = -1;
                for (let n = 0; n < k.nodes.length; n += 2) {
                    const radius = ((k.nodes[n] - this.width / 2) / rx) ** 2 + ((k.nodes[n + 1] - this.height / 2) / ry) ** 2;
                    if (radius > farthest) { farthest = radius; at = n; }
                }
                if (at < 0) break;
                const correction = 1 - (1 - SHORE_INSET_EPSILON) / Math.sqrt(farthest);
                const dx = (k.nodes[at] - this.width / 2) * correction, dy = (k.nodes[at + 1] - this.height / 2) * correction;
                for (let n = 0; n < k.nodes.length; n += 2) { k.nodes[n] -= dx; k.nodes[n + 1] -= dy; }
            }
        }
    }

    private separate(dt: number) {
        for (let a = 0; a < this.koi.length; a++) for (let b = a + 1; b < this.koi.length; b++) {
            const k = this.koi[a], other = this.koi[b];
            const gap = (k.length + other.length) * BODY_CONTACT_SPACE;
            const reach = k.length + other.length + gap;
            if (Math.abs(k.nodes[0] - other.nodes[0]) > reach || Math.abs(k.nodes[1] - other.nodes[1]) > reach) continue;
            const d = bodyDistance(k, other, 0);
            if (d >= gap) continue;
            // A gentle lateral drift resolves contact without snapping or bending the spine.
            const shift = (gap - d) * Math.min(BODY_CONTACT_MAX_STEP, dt * BODY_CONTACT_RATE) * 0.5;
            const x = push.x * shift, y = push.y * shift;
            for (let n = 0; n < KOI_NODES; n++) {
                k.nodes[n * 2] += x; k.nodes[n * 2 + 1] += y;
                other.nodes[n * 2] -= x; other.nodes[n * 2 + 1] -= y;
            }
        }
    }

    private seed(visibleWidth: number, visibleHeight: number) {
        const { width: W, height: H } = this;
        const minSide = Math.min(visibleWidth, visibleHeight);
        const baseLength = this.pondFishLength ?? clamp(minSide * 0.5, 170, 420);
        const count = clamp(Math.round((visibleWidth * visibleHeight) / 240000), 3, 6);
        // Wide screens also get a couple of young koi that keep to the deep water, for a sense of depth.
        const young = visibleWidth >= 1024 ? 2 : 0;

        this.koi = [];
        for (let i = 0; i < count + young; i++) {
            const isYoung = i >= count;
            const length = baseLength * (this.shore ? POND_LENGTHS[i % POND_LENGTHS.length] * rand(1 - SIZE_JITTER, 1 + SIZE_JITTER) : isYoung ? rand(0.32, 0.45) : rand(0.6, 1));
            const depthMax = isYoung ? 0.72 : 1;
            const heading = rand(0, TAU);
            const x = this.shore ? W * (0.5 + Math.cos(i * SPAWN_ANGLE) * SPAWN_RADIUS) + Math.cos(heading) * length * SPAWN_BODY_CENTER : rand(W * 0.1, W * 0.9);
            const y = this.shore ? H * (0.5 + Math.sin(i * SPAWN_ANGLE) * SPAWN_RADIUS) + Math.sin(heading) * length * SPAWN_BODY_CENTER : rand(H * 0.1, H * 0.9);
            const nodes = new Float32Array(KOI_NODES * 2);
            const seg = length / (KOI_NODES - 1);
            for (let n = 0; n < KOI_NODES; n++) {
                nodes[n * 2] = x - Math.cos(heading) * seg * n;
                nodes[n * 2 + 1] = y - Math.sin(heading) * seg * n;
            }
            this.koi.push({
                id: i + 1,
                variety: this.shore ? POND_VARIETIES[i % POND_VARIETIES.length] : pickVariety(),
                length,
                nodes,
                heading,
                speed: 20,
                phase: rand(0, TAU),
                turn: 0,
                wander: 0,
                curiosity: rand(0.35, 1),
                depth: rand(0.5, depthMax),
                depthTarget: rand(0.5, depthMax),
                depthMax,
                nextDive: rand(6, 18),
                nextSurface: rand(3, 14),
                nextWake: rand(0, 2),
                beat: 0,
                rush: 0,
                food: null,
                burstUntil: 0,
                nextBurst: rand(0, 3),
                finPhase: rand(0, TAU),
                startle: 0,
                fleeX: 0,
                fleeY: 0,
                gulp: 0,
            });
        }
    }

    /** A loose handful thrown at (x, y): each pellet lands a beat apart with its own splash, then drifts and sinks. */
    feed(x: number, y: number) {
        if (this.shore && !this.contains(x, y, THROW_RADIUS * 1.3)) return;
        this.lastFeed = this.time;
        this.ripples.push({ x, y, born: this.time, strength: 0.35 });
        // A full pond takes no more food, rather than dropping old pellets out from under koi already going for them.
        const count = Math.min(5 + Math.floor(Math.random() * 3), MAX_PELLETS - this.pellets.length);
        for (let k = 0; k < count; k++) {
            const a = rand(0, TAU);
            const r = Math.sqrt(Math.random()) * THROW_RADIUS;
            const drift = rand(2, 6);
            this.pellets.push({
                x: x + Math.cos(a) * r * 1.3,
                y: y + Math.sin(a) * r,
                born: this.time,
                landAt: rand(0.15, 0.45),
                landed: false,
                vx: Math.cos(a) * drift,
                vy: Math.sin(a) * drift,
            });
        }
    }

    step(dt: number) {
        this.time += dt;
        this.pointer.speed *= Math.exp(-dt * 8);
        for (const k of this.koi) this.stepKoi(k, dt);
        if (this.shore) { this.separate(dt); this.confine(); }
        const t = this.time;
        let kept = 0;
        for (let i = 0; i < this.pellets.length; i++) {
            const p = this.pellets[i];
            if (t - p.born < PELLET_LIFE) this.pellets[kept++] = p;
        }
        this.pellets.length = kept;
        for (const p of this.pellets) {
            if (!p.landed) {
                if (t - p.born < p.landAt) continue;
                p.landed = true;
                this.ripples.push({ x: p.x, y: p.y, born: t, strength: 0.1 });
                // The splash is what koi react to: every koi in range turns and bolts for it at once.
                for (const k of this.koi) {
                    if (Math.hypot(k.nodes[0] - p.x, k.nodes[1] - p.y) < RUSH_RANGE) k.rush = 1;
                }
                continue;
            }
            const damp = Math.exp(-dt * 0.2);
            p.vx *= damp;
            p.vy *= damp;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
        kept = 0;
        for (let i = 0; i < this.ripples.length; i++) {
            const r = this.ripples[i];
            if (t - r.born < rippleLife(r)) this.ripples[kept++] = r;
        }
        this.ripples.length = kept;
        kept = 0;
        for (let i = 0; i < this.bites.length; i++) {
            const b = this.bites[i];
            if (t - b.born < BITE_LIFE) this.bites[kept++] = b;
        }
        this.bites.length = kept;
    }

    private stepKoi(k: Koi, dt: number) {
        const { width: W, height: H, pointer, time } = this;
        const L = k.length;
        const nodes = k.nodes;
        const hx = nodes[0];
        const hy = nodes[1];

        let dx = Math.cos(k.heading);
        let dy = Math.sin(k.heading);

        k.wander = clamp(k.wander + (Math.random() - 0.5) * dt * 2.4, -0.9, 0.9);
        dx += Math.cos(k.heading + k.wander) * 0.6;
        dy += Math.sin(k.heading + k.wander) * 0.6;

        const food = this.pickFood(k, hx, hy, Math.max(L * 1.6 + 220, k.rush > 0 ? RUSH_RANGE : 0));

        // A fast swipe close by spooks a koi: it bolts away, then calms down over a couple of seconds.
        // A koi already going for food ignores it; feeding beats fear, and clicking to feed moves the mouse fast.
        const pointerD = Math.hypot(pointer.x - hx, pointer.y - hy);
        const feeding = time - this.lastFeed < FEED_CALM;
        if (!food && !feeding && pointer.active && pointer.speed > STARTLE_SPEED && pointerD < L * 0.9) {
            k.startle = 1;
            k.fleeX = pointer.x;
            k.fleeY = pointer.y;
        }
        k.startle = Math.max(0, k.startle - dt * 0.6);
        const fleeing = k.startle > 0.3 && !food;

        let chasing = false;
        let curious = false;
        let closing = 0;
        if (fleeing) {
            const ox = hx - k.fleeX;
            const oy = hy - k.fleeY;
            const d = Math.hypot(ox, oy) || 1;
            dx += (ox / d) * 4 * k.startle;
            dy += (oy / d) * 4 * k.startle;
        } else if (food) {
            const tx = food.x - hx;
            const ty = food.y - hy;
            const d = Math.hypot(tx, ty) || 1;
            dx += (tx / d) * 3;
            dy += (ty / d) * 3;
            chasing = true;
            closing = clamp(1 - d / (L * 1.2), 0, 1);
        } else if (pointer.active) {
            const tx = pointer.x - hx;
            const ty = pointer.y - hy;
            const d = Math.hypot(tx, ty) || 1;
            const range = 300;
            if (d < range) {
                // Swim up to the cursor, then circle under it rather than parking.
                const w = k.curiosity * (1 - d / range) * 2.2;
                const near = clamp(d / (L * 0.6), 0, 1);
                dx += ((tx / d) * near - (ty / d) * (1 - near)) * w;
                dy += ((ty / d) * near + (tx / d) * (1 - near)) * w;
                curious = true;
            }
        }

        let traffic = 1;
        for (const other of this.koi) {
            if (other === k) continue;
            const ohx = other.nodes[0];
            const ohy = other.nodes[1];
            const reach = this.shore ? L + other.length : L * 2;
            if (Math.abs(ohx - hx) > reach || Math.abs(ohy - hy) > reach) continue;
            if (this.shore) {
                // Anticipate nose contact and watch both bodies, rather than heads alone.
                const d = bodyDistance(k, other, LOOK_AHEAD), range = (L + other.length) * (food ? FEED_SPACE : BODY_SPACE);
                if (d < range) {
                    const w = (1 - d / range) * BODY_REPULSION;
                    dx += push.x * w;
                    dy += push.y * w;
                    traffic = Math.min(traffic, clamp(d / (range * TRAFFIC_BRAKE_RANGE), TRAFFIC_MIN_SPEED, 1));
                }
            } else for (let n = 0; n < KOI_NODES; n += 3) {
                const ox = hx - other.nodes[n * 2];
                const oy = hy - other.nodes[n * 2 + 1];
                const d = Math.hypot(ox, oy);
                // Koi going for food jostle in close, so personal space shrinks and never outweighs the pull.
                const range = (L + other.length) * (food ? 0.12 : 0.28);
                if (d < range && d > 1e-3) {
                    const w = (1 - d / range) * 2.4;
                    dx += (ox / d) * w;
                    dy += (oy / d) * w;
                }
            }
            // Loose shoaling: nearby koi drift the same way.
            if (!chasing && Math.hypot(ohx - hx, ohy - hy) < L * 1.6) {
                dx += Math.cos(other.heading) * (this.shore ? POND_SHOALING : 0.18);
                dy += Math.sin(other.heading) * (this.shore ? POND_SHOALING : 0.18);
            }
        }

        // Drift around page content rather than under it; food and the cursor can still lure them across.
        repel(this.avoid, hx, hy, L * 0.4, push);
        dx += push.x * (chasing || curious ? 0.5 : 1.8);
        dy += push.y * (chasing || curious ? 0.5 : 1.8);

        // A physical pond turns earlier, leaving room for the fins and turning circle.
        const over = this.shore
            ? (Math.hypot((hx - W / 2) / (W * this.shore), (hy - H / 2) / (H * this.shore)) - 1) * Math.min(W, H) * this.shore
            : Math.max(-hx, hx - W, -hy, hy - H);
        const lead = this.shore ? SHORE_TURN_LEAD : 0.25;
        if (over > -L * lead) {
            const w = clamp((over + L * lead) / (L * 0.5), 0, 1) * (this.shore ? SHORE_TURN_FORCE : 3.5);
            const toX = W / 2 - hx;
            const toY = H / 2 - hy;
            const d = Math.hypot(toX, toY) || 1;
            dx += (toX / d) * w;
            dy += (toY / d) * w;
        }

        const desired = Math.atan2(dy, dx);
        // Long bodies can't pivot on the spot: the turning circle grows with length.
        const agility =
            (1 + k.rush * 0.6) *
            Math.min(fleeing ? 3 : chasing ? 1.9 + closing : curious ? 1.2 : 0.7, (k.speed / L) * 4);
        const maxTurn = agility * dt;
        const turned = clamp(angleDiff(k.heading, desired), -maxTurn, maxTurn);
        k.heading += turned;
        k.turn += (turned / dt - k.turn) * Math.min(1, dt * 3);

        // Burst and coast: a few strong tail beats, then a long glide that bleeds off speed.
        // Chasing or fleeing koi beat without pause.
        if (time > k.nextBurst && time > k.burstUntil) {
            k.burstUntil = time + rand(0.7, 1.6);
            k.nextBurst = k.burstUntil + rand(1.2, 4);
        }
        const bursting = fleeing || chasing || time < k.burstUntil;
        k.beat += ((bursting ? 1 : 0) - k.beat) * Math.min(1, dt * 3);
        // Tail beats near the surface push small rings out behind the koi; gliding or deep koi leave none.
        if (k.beat > 0.6 && k.depth > 0.65 && time > k.nextWake) {
            const tail = (KOI_NODES - 3) * 2;
            this.ripples.push({ x: nodes[tail], y: nodes[tail + 1], born: time, strength: 0.25 + 0.2 * k.depth });
            k.nextWake = time + rand(0.8, 1.6) / k.beat;
        }
        k.rush = Math.max(0, k.rush - dt * 0.7);
        const cruise = 12 + L * 0.05;
        const target =
            (1 + k.rush * 0.8) *
            (fleeing
                ? cruise * 3.2
                : chasing
                  ? cruise * (1.9 + closing)
                  : bursting
                    ? cruise * (curious ? 1.6 : 1.35)
                    : cruise * 0.45);
        k.speed += (target * traffic - k.speed) * Math.min(1, dt * (bursting ? 1.6 + k.rush * 3 : 0.35));
        k.phase += dt * (0.6 + k.beat * (2.2 + k.speed / 11));
        k.finPhase += dt * 2.4;
        k.gulp += ((chasing && closing > 0.55 ? 1 : 0) - k.gulp) * Math.min(1, dt * 6);

        // Koi drift between the deep and the surface, and rise for food.
        if (time > k.nextDive) {
            k.depthTarget = rand(0.5, k.depthMax);
            k.nextDive = time + rand(8, 20);
        }
        k.depth += ((chasing ? 1 : k.depthTarget) - k.depth) * Math.min(1, dt * (chasing ? 0.8 : 0.15));

        nodes[0] += Math.cos(k.heading) * k.speed * dt;
        nodes[1] += Math.sin(k.heading) * k.speed * dt;

        const seg = L / (KOI_NODES - 1);
        const maxBend = 0.16;
        let prevAngle = k.heading + Math.PI;
        for (let n = 1; n < KOI_NODES; n++) {
            const px = nodes[(n - 1) * 2];
            const py = nodes[(n - 1) * 2 + 1];
            let angle = Math.atan2(nodes[n * 2 + 1] - py, nodes[n * 2] - px);
            angle = prevAngle + clamp(angleDiff(prevAngle, angle), -maxBend, maxBend);
            nodes[n * 2] = px + Math.cos(angle) * seg;
            nodes[n * 2 + 1] = py + Math.sin(angle) * seg;
            prevAngle = angle;
        }

        const mouthR = L * 0.08 + 6;
        const before = this.pellets.length;
        let kept = 0;
        for (let i = 0; i < this.pellets.length; i++) {
            const p = this.pellets[i];
            if (!p.landed || (p.x - nodes[0]) ** 2 + (p.y - nodes[1]) ** 2 > mouthR * mouthR) this.pellets[kept++] = p;
        }
        this.pellets.length = kept;
        if (this.pellets.length < before) {
            this.ripples.push({ x: nodes[0], y: nodes[1], born: time, strength: 0.6 });
            this.bites.push({ x: nodes[0], y: nodes[1], born: time });
            k.nextSurface = time + rand(6, 16);
        } else if (time > k.nextSurface) {
            this.ripples.push({ x: nodes[0], y: nodes[1], born: time, strength: 0.3 });
            k.nextSurface = time + rand(8, 20);
        }
    }

    /** Keep the current target while it lasts; only switch for a pellet less than half as far away. */
    private pickFood(k: Koi, x: number, y: number, range: number) {
        if (k.food && !this.pellets.includes(k.food)) k.food = null;
        const nearest = this.nearestPellet(x, y, range);
        if (!k.food) return (k.food = nearest);
        const current = Math.hypot(k.food.x - x, k.food.y - y);
        if (current > range * 1.3) k.food = nearest;
        else if (nearest && Math.hypot(nearest.x - x, nearest.y - y) < current * 0.5) k.food = nearest;
        return k.food;
    }

    private nearestPellet(x: number, y: number, range: number) {
        let best: Pellet | null = null;
        let bestD = range * range;
        for (const p of this.pellets) {
            if (!p.landed) continue;
            const d = (p.x - x) ** 2 + (p.y - y) ** 2;
            if (d < bestD) {
                bestD = d;
                best = p;
            }
        }
        return best;
    }
}

export function rippleLife(r: Ripple) {
    return 2.2 + r.strength * 1.6;
}
