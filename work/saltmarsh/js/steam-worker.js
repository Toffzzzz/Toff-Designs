/*
 * Saltmarsh: the steam, drawn in a worker on the canvas js/steam.js hands over
 * (transferControlToOffscreen), so its work never blocks the page. Messages from the page
 * go straight to the renderer (see createRenderer in js/steam-gl.js); it answers 'ready'
 * once its first frame is on screen, 'fail' if it cannot draw, and 'lost' if the GPU
 * drops the context.
 */
import { createRenderer } from './steam-gl.js';

let renderer = null;
const waiting = [];

self.onmessage = (e) => {
  const m = e.data;
  if (m.type !== 'init') { if (renderer) renderer.apply(m); else waiting.push(m); return; }
  createRenderer(m.canvas, m.bitmap, m.init, () => self.postMessage({ type: 'lost' }))
    .then((r) => {
      renderer = r;
      waiting.splice(0).forEach((w) => r.apply(w));
      self.postMessage({ type: 'ready' });
    })
    .catch((err) => self.postMessage({ type: 'fail', message: (err && err.message) || 'steam' }));
};
