import { Vector3, type PerspectiveCamera } from "three";
import type { World } from "../sim/world";

// Portrait screens crop the same broad pond instead of stretching it into an oval.
const MIN_POND_ASPECT = 1.35;
export const SMALL_SCREEN_WIDTH = 1024;
const OPENING_COLUMNS = [0.32, 0.68];
const OPENING_TOP = 0.3;
const OPENING_ROW_GAP = 0.18;
const OPENING_TILT = 0.12;
export const POND_SCALE = 0.01;
export const POND_MAX_DEPTH = 1.5;
export const pondWidth = (width: number, height: number) => Math.max(width, height * MIN_POND_ASPECT);

export function frameOpeningSchool(world: World, camera: PerspectiveCamera, width: number, height: number, visibleHeight: number) {
  if (width >= SMALL_SCREEN_WIDTH) return;
  const direction = new Vector3();
  for (let i = 0; i < world.koi.length; i++) {
    const koi = world.koi[i];
    // Use the fish's depth plane, so submerged bodies land at the intended screen position.
    direction.set(OPENING_COLUMNS[i % 2] * 2 - 1, 1 - (OPENING_TOP + Math.floor(i / 2) * OPENING_ROW_GAP) * visibleHeight / height * 2, 0.5)
      .unproject(camera).sub(camera.position).normalize();
    const distance = (-(1 - koi.depth) * POND_MAX_DEPTH - camera.position.y) / direction.y;
    const x = (camera.position.x + direction.x * distance) / POND_SCALE + world.width / 2;
    const y = (camera.position.z + direction.z * distance) / POND_SCALE + world.height / 2;
    let cx = 0, cy = 0;
    for (let n = 0; n < koi.nodes.length; n += 2) { cx += koi.nodes[n]; cy += koi.nodes[n + 1]; }
    cx /= koi.nodes.length / 2; cy /= koi.nodes.length / 2;
    const heading = Math.PI / 2 + (i % 2 ? OPENING_TILT : -OPENING_TILT);
    const cosine = Math.cos(heading - koi.heading), sine = Math.sin(heading - koi.heading);
    for (let n = 0; n < koi.nodes.length; n += 2) {
      const dx = koi.nodes[n] - cx, dy = koi.nodes[n + 1] - cy;
      koi.nodes[n] = x + dx * cosine - dy * sine;
      koi.nodes[n + 1] = y + dx * sine + dy * cosine;
    }
    koi.heading = heading;
  }
  world.confine();
}

