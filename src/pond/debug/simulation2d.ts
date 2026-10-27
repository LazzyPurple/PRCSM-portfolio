import { palette } from "../palette";
import { BITE_LIFE, KOI_NODES, RIPPLE_SPEED, rippleLife, type World } from "../sim/world";

export function drawSimulation(ctx: CanvasRenderingContext2D, world: World, width: number, height: number) {
  const sx = width / world.width;
  const sy = height / world.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(ctx.canvas.width / world.width, 0, 0, ctx.canvas.height / world.height, 0, 0);
  ctx.fillStyle = palette.water.deep;
  ctx.fillRect(0, 0, world.width, world.height);
  if (world.shore) {
    ctx.strokeStyle = palette.bank.light;
    ctx.beginPath();
    ctx.ellipse(world.width / 2, world.height / 2, world.width * world.shore, world.height * world.shore, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = palette.koi.vermilion;
  ctx.lineWidth = 1 / Math.min(sx, sy);
  for (const box of world.avoid) ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
  for (const koi of world.koi) {
    ctx.globalAlpha = koi.depth;
    ctx.strokeStyle = koi.variety === "yamabuki" ? palette.koi.gold : koi.variety === "asagi" ? palette.koi.slate
      : koi.variety === "showa" ? palette.koi.charcoal : koi.variety === "tancho" ? palette.koi.vermilion : palette.koi.white;
    ctx.lineWidth = koi.length * 0.065;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < KOI_NODES; i++) {
      if (i === 0) ctx.moveTo(koi.nodes[0], koi.nodes[1]);
      else ctx.lineTo(koi.nodes[i * 2], koi.nodes[i * 2 + 1]);
    }
    ctx.stroke();
    ctx.fillStyle = palette.koi.vermilion;
    ctx.beginPath();
    ctx.arc(koi.nodes[0], koi.nodes[1], koi.length * 0.024, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = palette.koi.white;
  for (const ripple of world.ripples) {
    const age = world.time - ripple.born;
    ctx.globalAlpha = (1 - age / rippleLife(ripple)) * ripple.strength;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, age * RIPPLE_SPEED * (0.7 + 0.5 * ripple.strength), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.koi.white;
  for (const pellet of world.pellets) {
    ctx.beginPath();
    ctx.arc(pellet.x, pellet.y, pellet.landed ? 3 : 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const bite of world.bites) {
    ctx.globalAlpha = 1 - (world.time - bite.born) / BITE_LIFE;
    ctx.fillRect(bite.x - 4, bite.y - 4, 8, 8);
  }
  ctx.globalAlpha = 1;
}
