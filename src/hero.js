import { $, $$, clamp, reduceMotion } from './utils.js';
import { FRAME_COUNT as N, FRAME_W as SW, FRAME_H as SH, frameUrl } from './data.js';

/*
  The hero is a short video stored as 121 pictures. As you scroll, we draw the picture that matches
  your scroll position on a <canvas>, so scrolling "plays" the video forwards and backwards.
*/

const SAMPLES = 24; // colour samples taken along each edge of a picture

export function initHero() {
  const el = $('#top');
  const canvas = $('#scrub');
  const ctx = canvas.getContext('2d', { alpha: false });

  const images = new Array(N);
  const ready = new Array(N).fill(false);
  const wall = new Array(N); // edge colours of every picture (see readWall)

  // where the picture is drawn on the canvas
  let cw = 0, ch = 0, dx = 0, dy = 0, dw = 0, dh = 0;
  let needsPaint = true;
  let current = 0;   // frame currently shown (moves smoothly towards the target)
  let drawn = -1;
  let lastProgress = 0;
  let firstUpdate = true;

  /* ---------- size and position ---------- */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const box = canvas.getBoundingClientRect();
    cw = Math.max(2, Math.round(box.width * dpr));
    ch = Math.max(2, Math.round(box.height * dpr));
    canvas.width = cw;
    canvas.height = ch;

    let scale = Math.min(cw / SW, ch / SH);
    if (cw / ch < 0.85) scale *= 1.15; // tall phone screens: zoom in a little
    dw = SW * scale;
    dh = SH * scale;
    dx = (cw - dw) / 2;
    dy = (ch - dh) / 2;
    gradCache.length = 0;
    gradCache.length = N;
    featherCache.length = 0;
    featherCache.length = N;
    lastBandIndex = -1;
    needsPaint = true;
  }

  /* ---------- filling the space around the picture ----------
     The camera never moves and the wall is plain, so we read the wall colour along each edge of
     every picture and extend it with smooth gradients. That way the shot fills any screen shape. */
  const sampler = document.createElement('canvas');
  sampler.width = SAMPLES;
  sampler.height = SAMPLES;
  const sctx = sampler.getContext('2d', { willReadFrequently: true });
  sctx.imageSmoothingQuality = 'high';

  function sampleEdge(img, x, y, w, h, horizontal) {
    sctx.clearRect(0, 0, SAMPLES, SAMPLES);
    let data;
    if (horizontal) {
      sctx.drawImage(img, x, y, w, h, 0, 0, SAMPLES, 1);
      data = sctx.getImageData(0, 0, SAMPLES, 1).data;
    } else {
      sctx.drawImage(img, x, y, w, h, 0, 0, 1, SAMPLES);
      data = sctx.getImageData(0, 0, 1, SAMPLES).data;
    }
    const colors = [];
    const light = [];
    for (let k = 0; k < SAMPLES; k++) {
      colors.push([data[k * 4], data[k * 4 + 1], data[k * 4 + 2]]);
      light.push(data[k * 4] * 0.3 + data[k * 4 + 1] * 0.59 + data[k * 4 + 2] * 0.11);
    }
    // ignore shoe parts touching the edge: compare each sample with the median of its neighbours
    let out = colors.map((color, k) => {
      const near = [];
      for (let j = Math.max(0, k - 2); j <= Math.min(SAMPLES - 1, k + 2); j++) near.push(j);
      near.sort((a, b) => light[a] - light[b]);
      const middle = near[near.length >> 1];
      return Math.abs(light[k] - light[middle]) > 12 ? colors[middle] : color;
    });
    for (let pass = 0; pass < 2; pass++) {
      const source = out;
      out = source.map((c, i) => {
        const p = source[Math.max(0, i - 1)];
        const q = source[Math.min(SAMPLES - 1, i + 1)];
        return [(p[0] + c[0] * 2 + q[0]) / 4, (p[1] + c[1] * 2 + q[1]) / 4, (p[2] + c[2] * 2 + q[2]) / 4];
      });
    }
    return out;
  }

  function readWall(index, img) {
    wall[index] = {
      top: sampleEdge(img, 0, 0, SW, 10, true),
      bottom: sampleEdge(img, 0, SH - 10, SW, 10, true),
      left: sampleEdge(img, 0, 0, 10, SH, false),
      right: sampleEdge(img, SW - 10, 0, 10, SH, false),
    };
  }

  function gradient(colors, horizontal, from, to) {
    const g = horizontal ? ctx.createLinearGradient(from, 0, to, 0) : ctx.createLinearGradient(0, from, 0, to);
    colors.forEach((c, k) => g.addColorStop(k / (SAMPLES - 1), `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`));
    return g;
  }

  // Painting the wall bands and the soft "feather" fade at the picture's edge used to rebuild
  // several gradients and fill roughly 70 rectangles from scratch on EVERY animation frame while
  // scrolling. That's cheap on a laptop but slow on a phone, and was the real cause of the lag.
  // Now:
  //  - the 4 band gradients are built once per picture and cached (gradCache)
  //  - the feather fade (previously 16 stacked semi-transparent rectangles per edge, up to 64 a
  //    frame) is pre-rendered once into small offscreen strips (featherCache); every frame we just
  //    stamp those down with one drawImage per edge instead of dozens of fillRect calls
  //  - the wall bands themselves sit outside the picture, so once painted for a given picture they
  //    don't need to be redrawn again until the picture index changes (lastBandIndex)
  const gradCache = new Array(N);
  function bandGradients(index) {
    let g = gradCache[index];
    if (g) return g;
    const w = wall[index];
    if (!w) return null;
    g = {
      top: gradient(w.top, true, dx, dx + dw),
      bottom: gradient(w.bottom, true, dx, dx + dw),
      left: gradient(w.left, false, dy, dy + dh),
      right: gradient(w.right, false, dy, dy + dh),
    };
    gradCache[index] = g;
    return g;
  }

  let lastBandIndex = -1;
  function paintBands(index) {
    if (index === lastBandIndex) return; // nothing outside the picture has changed
    const g = bandGradients(index);
    if (!g) return;
    lastBandIndex = index;
    ctx.globalAlpha = 1;
    if (dy > 0.5) {
      ctx.fillStyle = g.top;
      ctx.fillRect(0, 0, cw, dy + 1);
      ctx.fillStyle = g.bottom;
      ctx.fillRect(0, dy + dh - 1, cw, ch - dy - dh + 2);
    }
    if (dx > 0.5) {
      ctx.fillStyle = g.left;
      ctx.fillRect(0, 0, dx + 1, ch);
      ctx.fillStyle = g.right;
      ctx.fillRect(dx + dw - 1, 0, cw - dx - dw + 1, ch);
    }
  }

  const FEATHER_STEPS = 16;
  const featherAlpha = (k) => Math.pow(1 - (k + 0.5) / FEATHER_STEPS, 1.5);

  // Pre-renders one edge's fade into a small offscreen canvas, once, instead of stacking rectangles
  // on the main canvas every frame. `horizontalColor` picks the colour gradient's direction (matches
  // the wall gradient at that edge); `flip` mirrors which side of the strip is strongest, so the fade
  // is always strongest right at the seam with the picture.
  function buildStrip(colors, w, h, horizontalColor, flip) {
    const strip = document.createElement('canvas');
    strip.width = Math.max(1, Math.round(w));
    strip.height = Math.max(1, Math.round(h));
    const sc = strip.getContext('2d');
    const colourGrad = horizontalColor
      ? sc.createLinearGradient(0, 0, strip.width, 0)
      : sc.createLinearGradient(0, 0, 0, strip.height);
    colors.forEach((c, k) => colourGrad.addColorStop(k / (SAMPLES - 1), `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`));
    sc.fillStyle = colourGrad;
    const fadeLength = horizontalColor ? strip.height : strip.width;
    const step = fadeLength / FEATHER_STEPS;
    for (let k = 0; k < FEATHER_STEPS; k++) {
      sc.globalAlpha = featherAlpha(k);
      const pos = flip ? fadeLength - (k + 1) * step : k * step;
      if (horizontalColor) sc.fillRect(0, pos, strip.width, step + 1);
      else sc.fillRect(pos, 0, step + 1, strip.height);
    }
    return strip;
  }

  const featherCache = new Array(N);
  function featherStrips(index) {
    let f = featherCache[index];
    if (f) return f;
    const w = wall[index];
    if (!w) return null;
    const length = Math.min(dw, dh) * 0.05;
    f = {
      length,
      top: dy > 0.5 ? buildStrip(w.top, dw, length, true, false) : null,
      bottom: dy > 0.5 ? buildStrip(w.bottom, dw, length, true, true) : null,
      left: dx > 0.5 ? buildStrip(w.left, length, dh, false, false) : null,
      right: dx > 0.5 ? buildStrip(w.right, length, dh, false, true) : null,
    };
    featherCache[index] = f;
    return f;
  }

  // softens the join between the extended wall and the picture (runs every frame: it draws on top
  // of the picture itself, which is redrawn every frame, so unlike the bands it can't be skipped)
  function feather(index) {
    const f = featherStrips(index);
    if (!f) return;
    ctx.globalAlpha = 1;
    if (f.top) ctx.drawImage(f.top, dx, dy);
    if (f.bottom) ctx.drawImage(f.bottom, dx, dy + dh - f.length);
    if (f.left) ctx.drawImage(f.left, dx, dy);
    if (f.right) ctx.drawImage(f.right, dx + dw - f.length, dy);
  }

  /* ---------- drawing ---------- */
  // if a picture has not loaded yet, use the closest one that has
  function nearest(i) {
    if (ready[i]) return i;
    for (let d = 1; d < N; d++) {
      if (i - d >= 0 && ready[i - d]) return i - d;
      if (i + d < N && ready[i + d]) return i + d;
    }
    return -1;
  }

  function paint(position) {
    const a = nearest(clamp(Math.round(position), 0, N - 1));
    if (a < 0) return;
    paintBands(a);
    ctx.globalAlpha = 1;
    ctx.drawImage(images[a], dx, dy, dw, dh);
    feather(a);
    if (!canvas.classList.contains('on')) canvas.classList.add('on'); // hide the placeholder picture
  }

  /* ---------- loading ---------- */
  function loadFrame(i) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        images[i] = img;
        try { readWall(i, img); } catch (error) { console.warn('Could not read wall colours', error); }
        ready[i] = true;
        needsPaint = true;
        resolve();
      };
      img.onerror = resolve;
      img.src = frameUrl(i);
    });
  }

  // Load every 40th picture first, then every 20th ... so scrolling works before everything has loaded
  function startLoading() {
    const order = [];
    const seen = new Set();
    [40, 20, 10, 5, 2, 1].forEach((step) => {
      for (let i = 0; i < N; i += step) {
        if (!seen.has(i)) { seen.add(i); order.push(i); }
      }
    });
    let next = 0;
    const worker = () => {
      if (next >= order.length) return;
      loadFrame(order[next++]).then(() => setTimeout(worker, 0));
    };
    for (let w = 0; w < 8; w++) worker();
  }

  /* ---------- text on top of the video ---------- */
  const stage1 = $('#s1');
  const stage2 = $('#s2');
  const stage3 = $('#s3');
  const spec = $('#spec');
  const specItems = $$('#spec li');
  const cue = $('#cue');
  const progressBar = $('#prog');

  // 0 -> 1 -> 0 : fades in between a and b, stays until c, fades out until d
  const visible = (p, a, b, c, d) => {
    if (p < a || p > d) return 0;
    if (p < b) return (p - a) / (b - a);
    if (p <= c) return 1;
    return 1 - (p - c) / (d - c);
  };

  function setStage(element, opacity, shift) {
    element.style.opacity = opacity.toFixed(3);
    element.style.transform = `translate3d(0,${((1 - opacity) * shift).toFixed(1)}px,0)`;
    const v = opacity < 0.01 ? 'hidden' : 'visible';
    if (element.style.visibility !== v) element.style.visibility = v;
  }

  // p = how far through the hero you have scrolled (0 to 1)
  function updateText(p) {
    setStage(stage1, visible(p, -1, -0.5, 0.1, 0.19), -30);
    setStage(stage2, visible(p, 0.2, 0.27, 0.7, 0.77), 28);
    const specOpacity = visible(p, 0.22, 0.29, 0.7, 0.77);
    spec.style.opacity = specOpacity.toFixed(3);
    spec.style.visibility = specOpacity < 0.01 ? 'hidden' : 'visible';
    setStage(stage3, visible(p, 0.8, 0.88, 1, 1.01), 34);
    cue.style.opacity = (1 - clamp(p / 0.05)).toFixed(2);
    progressBar.style.transform = `scaleY(${p.toFixed(3)})`;
    // highlight the part that is being explained (01 to 04)
    specItems.forEach((li, i) => {
      const on = p >= 0.26 + 0.1 * i && p < 0.36 + 0.1 * i;
      if (li.classList.contains('on') !== on) li.classList.toggle('on', on);
    });
  }

  /* ---------- called on every animation frame ---------- */
  function update(smoothScrollActive) {
    const box = el.getBoundingClientRect();
    const total = Math.max(el.offsetHeight - innerHeight, 1);
    const p = clamp(-box.top / total);
    if (!(box.bottom > 0 && box.top < innerHeight)) return; // hero is off screen

    const target = p * (N - 1);
    if (reduceMotion) current = target;
    else {
      current += (target - current) * (smoothScrollActive ? 0.35 : 0.16);
      if (Math.abs(target - current) < 0.01) current = target;
    }
    if (needsPaint || Math.round(current) !== Math.round(drawn) || drawn === -1) {
      paint(current);
      drawn = current;
      needsPaint = false;
    }
    if (Math.abs(p - lastProgress) > 0.0003 || firstUpdate) {
      updateText(p);
      firstUpdate = false;
    }
    lastProgress = p;
  }

  return { el, resize, startLoading, update };
}