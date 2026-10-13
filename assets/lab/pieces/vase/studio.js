/*
 * Shape a vase: the midnight studio around the pot (a 2D canvas behind the WebGL one, and the
 * background of the product shot).
 *
 *   footprint(aspect, profile)  where the pot's foot lands in a canvas of that aspect, as fractions
 *                               of its width and height. It repeats the framing in Hollis & Pine's
 *                               vase.js (frame(): fov 26, 1.66 units tall, look at 0.42, 11 degrees
 *                               above): if that framing changes, change it here too.
 *   paintStudio(ctx, w, h, box, T)  paints the backdrop: a dark sweep, a soft pool of light on the
 *                               floor and the pot's contact shadow. box = the pot canvas's rectangle
 *                               inside (0, 0, w, h) with its footprint.
 */
import { PerspectiveCamera, Vector3, MathUtils } from 'three';
import { buildOutline } from '../../../../work/hollis-and-pine/js/vase.js';
import { normalise } from './profile.js';

export function footprint(aspect, profile) {
  const outline = buildOutline(profile, { samples: 40 });
  const P = normalise(profile);
  const maxR = outline.maxR, footR = P[0][0];
  const cam = new PerspectiveCamera(26, aspect, 0.1, 50);
  const needH = 1.66, needW = Math.max(maxR * 2 * 1.6, 1.3);
  const half = Math.tan(MathUtils.degToRad(cam.fov) / 2);
  const dist = Math.max(needH / 2 / half, needW / 2 / (half * aspect));
  const lookY = 0.42, elev = MathUtils.degToRad(11);
  cam.position.set(0, lookY + Math.sin(elev) * dist, Math.cos(elev) * dist);
  cam.lookAt(0, lookY, 0);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const p = (x, y, z) => { const v = new Vector3(x, y, z).project(cam); return [(v.x + 1) / 2, (1 - v.y) / 2]; };
  const c = p(0, 0, 0), side = p(footR, 0, 0), front = p(0, 0, footR), back = p(0, 0, -footR), wide = p(maxR, 0, 0), top = p(0, 1, 0);
  return { cx: c[0], cy: c[1], rx: side[0] - c[0], ryF: front[1] - c[1], ryB: c[1] - back[1], wide: wide[0] - c[0], top: top[1] };
}

const hexRgb = (hex) => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function ellipseGlow(ctx, x, y, rx, ry, stops) {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

export function paintStudio(ctx, w, h, box, T) {
  const bg = hexRgb(T.bg), deep = hexRgb(T.deep), tint = hexRgb(T.tint), ink = hexRgb(T.ink), gold = hexRgb(T.gold);
  ctx.fillStyle = T.bg; ctx.fillRect(0, 0, w, h);
  if (!box) return;
  const f = box.fp;
  const fx = box.x + f.cx * box.w, fy = box.y + f.cy * box.h;
  const footPx = Math.max(6, f.rx * box.w), widePx = Math.max(footPx, f.wide * box.w);
  const potH = Math.max(40, fy - (box.y + f.top * box.h));
  // the sweep: a little lift of light behind the pot, falling away to midnight
  const sweep = ctx.createRadialGradient(fx, fy - potH * 0.55, 0, fx, fy - potH * 0.55, Math.max(w, h) * 0.75);
  sweep.addColorStop(0, rgba(mix(bg, tint, 0.95), 1));
  sweep.addColorStop(0.45, rgba(mix(bg, tint, 0.35), 1));
  sweep.addColorStop(1, rgba(mix(bg, deep, 0.6), 1));
  ctx.fillStyle = sweep; ctx.fillRect(0, 0, w, h);
  // the floor: everything below the horizon a shade deeper, met by a soft pool of light
  const horizon = fy - potH * 0.32;
  const fl = ctx.createLinearGradient(0, horizon - potH * 0.25, 0, h);
  fl.addColorStop(0, rgba(deep, 0)); fl.addColorStop(0.5, rgba(deep, 0.42)); fl.addColorStop(1, rgba(deep, 0.72));
  ctx.fillStyle = fl; ctx.fillRect(0, horizon - potH * 0.25, w, h);
  const pool = Math.max(widePx * 2.6, Math.min(w, h) * 0.42);
  ellipseGlow(ctx, fx, fy - pool * 0.035, pool, pool * 0.2, [[0, rgba(mix(tint, ink, 0.12), 0.85)], [0.5, rgba(tint, 0.42)], [1, rgba(tint, 0)]]);
  ellipseGlow(ctx, fx - widePx * 0.2, fy - footPx * 0.05, pool * 0.5, pool * 0.1, [[0, rgba(ink, 0.06)], [1, rgba(ink, 0)]]);
  // a fine gold glint where the light falls hardest, barely there
  ellipseGlow(ctx, fx, fy - footPx * 0.05, pool * 0.9, pool * 0.022, [[0, rgba(gold, 0.05)], [1, rgba(gold, 0)]]);
  // shadows: the one the window light throws (away to the right) and the contact under the foot
  const ry = Math.max(2, (f.ryF + f.ryB) / 2 * box.h);
  ellipseGlow(ctx, fx + widePx * 0.75, fy - ry * 0.35, widePx * 1.55, ry * 1.7, [[0, rgba(deep, 0.5)], [0.6, rgba(deep, 0.22)], [1, rgba(deep, 0)]]);
  ellipseGlow(ctx, fx + footPx * 0.08, fy, footPx * 1.35, ry * 1.5, [[0, 'rgba(2,4,10,0.85)'], [0.55, 'rgba(2,4,10,0.45)'], [1, 'rgba(2,4,10,0)']]);
}
