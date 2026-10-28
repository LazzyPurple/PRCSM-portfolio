import * as THREE from "three";
import { palette } from "../palette";
import { wrapHour } from "../cycle";

const STOPS = [
  { hour: 0, phase: "night", ambient: 0.075, strength: 0.32, shadow: 0.4, direction: [-0.35, 0.85, -0.25] },
  { hour: 5, phase: "night", ambient: 0.09, strength: 0.32, shadow: 0.4, direction: [-0.45, 0.7, -0.1] },
  { hour: 6, phase: "dawn", ambient: 0.23, strength: 0.68, shadow: 0.7, direction: [-0.9, 0.38, 0.3] },
  { hour: 9, phase: "day", ambient: 0.38, strength: 1, shadow: 1, direction: [-0.55, 0.85, 0.3] },
  { hour: 15, phase: "day", ambient: 0.38, strength: 1, shadow: 1, direction: [0.55, 0.85, 0.3] },
  { hour: 18, phase: "dusk", ambient: 0.22, strength: 0.65, shadow: 0.75, direction: [0.9, 0.38, 0.3] },
  { hour: 20, phase: "night", ambient: 0.09, strength: 0.34, shadow: 0.4, direction: [-0.1, 0.7, -0.6] },
  { hour: 24, phase: "night", ambient: 0.075, strength: 0.32, shadow: 0.4, direction: [-0.35, 0.85, -0.25] },
] as const;

export class Daylight {
  readonly light = new THREE.Color();
  readonly water = new THREE.Color();
  readonly sky = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
  readonly direction = new THREE.Vector3();
  ambient = 0.38;
  shadow = 1;
  private stops = STOPS.map(stop => ({ ...stop, light: new THREE.Color(palette.light[stop.phase]),
    water: new THREE.Color(palette.water[stop.phase === "day" ? "middle" : stop.phase]),
    sky: palette.sky[stop.phase].map(color => new THREE.Color(color)) }));

  update(hour: number) {
    hour = wrapHour(hour);
    let index = 0;
    while (index < this.stops.length - 2 && hour >= this.stops[index + 1].hour) index++;
    const a = this.stops[index], b = this.stops[index + 1];
    const fraction = (hour - a.hour) / (b.hour - a.hour);
    // Smooth endpoints keep dawn, dusk and midnight free of lighting jumps.
    const t = fraction * fraction * (3 - 2 * fraction);
    this.ambient = a.ambient + (b.ambient - a.ambient) * t;
    this.shadow = a.shadow + (b.shadow - a.shadow) * t;
    this.light.copy(a.light).lerp(b.light, t).multiplyScalar(a.strength + (b.strength - a.strength) * t);
    this.water.copy(a.water).lerp(b.water, t);
    for (let i = 0; i < this.sky.length; i++) this.sky[i].copy(a.sky[i]).lerp(b.sky[i], t);
    this.direction.set(a.direction[0] + (b.direction[0] - a.direction[0]) * t,
      a.direction[1] + (b.direction[1] - a.direction[1]) * t, a.direction[2] + (b.direction[2] - a.direction[2]) * t).normalize();
  }
}
