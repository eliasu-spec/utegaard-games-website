/*! GKartIntro - Golf Kart Racing game-start intro player. Dependency-free. Math MUST match render/gkart_core.py.
 *
 *   const intro = new GKartIntro({canvas, basePath:'assets/gkart-intro/', onDone, onHit, onCue, onSkip});
 *   await intro.load();   // fetches timeline.json + preloads all layer images
 *   intro.play();         // rAF loop driven by performance.now()
 *   intro.skip();         // jump to the 3.20 s final state, then onDone()
 *   intro.seek(t);        // deterministic frame, pauses playback, fires no callbacks
 *   intro.destroy();
 *
 * Options: canvas (required) | basePath (folder holding timeline.json, layers_1024/, layers_2048/) |
 *   quality 'auto'|1024|2048 (auto: 2048 if logo is drawn wider than ~1100 device px) | autoResize (true) |
 *   idleLoop (false: stop rAF at 4.0 s; true: keep the 2 px idle float going until destroy()) |
 *   onDone() once at 4.0 s or on skip | onHit(name,t) at each LAND time (kind 'hit') | onCue(cue) for every audioCues entry (whooshes too) |
 *   onSkip() when skip() is used | timeline (inline timeline object instead of fetching).
 * The canvas stays transparent: the game background shows through. Size the canvas with CSS (e.g. fixed inset 0; 100% x 100%).
 */
const TAU = Math.PI * 2;
function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
function bounceOut(p) {
  const n1 = 7.5625, d1 = 2.75;
  if (p < 1 / d1) return n1 * p * p;
  if (p < 2 / d1) { p -= 1.5 / d1; return n1 * p * p + 0.75; }
  if (p < 2.5 / d1) { p -= 2.25 / d1; return n1 * p * p + 0.9375; }
  p -= 2.625 / d1; return n1 * p * p + 0.984375;
}
/** Compile an easing spec {name, ...params} to a function p->e. */
export function makeEase(spec) {
  switch (spec.name) {
    case 'linear': return (p) => p;
    case 'easeOutCubic': return (p) => { const q = 1 - p; return 1 - q * q * q; };
    case 'easeInCubic': return (p) => p * p * p;
    case 'easeOutBack': { const c1 = spec.c1 === undefined ? 1.70158 : spec.c1, c3 = c1 + 1;
      return (p) => { const q = p - 1; return 1 + c3 * q * q * q + c1 * q * q; }; }
    case 'bounceOut': return bounceOut;
    case 'easeSpeedIn': { const a = spec.a, b = spec.b;   // Kumaraswamy curve: accelerate, peak mid-way, brake to rest
      return (p) => 1 - Math.pow(1 - Math.pow(p, b), a); }
    case 'springOut': { const d = spec.damping, f = spec.freq;
      return (p) => (p >= 1 ? 1 : 1 - Math.exp(-d * p) * Math.cos(TAU * f * p)); }
    default: throw new Error('unknown easing ' + spec.name);
  }
}
/** derivative of easeSpeedIn: a*b*p^(b-1)*(1-p^b)^(a-1) (used for the speed-driven stretch) */
function easeVel(spec, p) {
  const a = spec.a, b = spec.b;
  if (p <= 0) return b > 1 ? 0 : a * b;
  if (p >= 1) return 0;
  return a * b * Math.pow(p, b - 1) * Math.pow(1 - Math.pow(p, b), a - 1);
}
const _vmax = {};
function velMax(spec) {
  const k = spec.a + ':' + spec.b;
  if (_vmax[k] === undefined) { let m = 0; for (let i = 0; i <= 400; i++) { const v = easeVel(spec, i / 400); if (v > m) m = v; } _vmax[k] = m; }
  return _vmax[k];
}
const easeOutCubic = (p) => { const q = 1 - p; return 1 - q * q * q; };
function newPose() { return { x: 0, y: 0, scale: 1, rotation: 0, alpha: 1, ns: 0, sp: [0, 0], sy: [0, 0], sf: [1, 1], sa: [0, 0] }; }

export class GKartIntro {
  constructor(opts) {
    if (!opts || !opts.canvas) throw new Error('GKartIntro: canvas required');
    this.canvas = opts.canvas; this.basePath = opts.basePath || '';
    if (this.basePath && !/\/$/.test(this.basePath)) this.basePath += '/';
    this.opts = opts; this.onDone = opts.onDone; this.onHit = opts.onHit; this.onCue = opts.onCue; this.onSkip = opts.onSkip;
    this.quality = opts.quality || 'auto'; this.autoResize = opts.autoResize !== false; this.idleLoop = !!opts.idleLoop;
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.tl = null; this.t = 0; this.playing = false; this.finished = false; this.skipped = false; this.destroyed = false;
    this._raf = 0; this._t0 = 0; this._hitIdx = 0; this._cueIdx = 0; this.loaded = false;
    this._pose = newPose(); this._gpose = newPose(); this._off = { x: 0, y: 0 };
    this._onResize = () => { this.resize(); if (this.loaded) this._draw(this.t); };
    this._tick = (now) => this._frame(now);
  }
  get duration() { return this.tl ? this.tl.duration : 4.0; }
  get audioCues() { return this.tl ? this.tl.audioCues : []; }
  get hits() { return this.tl ? this.tl.hits : []; }
  get time() { return this.t; }
  async load() {
    const tl = this.opts.timeline || await (await fetch(this.basePath + (this.opts.timelineUrl || 'timeline.json'))).json();
    this.tl = tl; this.resize();
    const c = tl.logo.content;
    let q = this.quality;
    if (q === 'auto') q = (c.w * this._S > 1100) ? 2048 : 1024;
    this.usedQuality = q;
    const dir = this.basePath + tl.layerDirs[String(q)] + '/';
    const jobs = tl.layers.map((L) => new Promise((res, rej) => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => res(im); im.onerror = () => rej(new Error('failed to load ' + dir + L.png)); im.src = dir + L.png;
    }));
    const imgs = await Promise.all(jobs);
    this._layers = tl.layers.map((L, i) => {
      const E = {}; for (const ch of ['x', 'y', 'scale', 'rotation']) E[ch] = makeEase(L.easing[ch] || L.easing.default);
      return { L, img: imgs[i], k: imgs[i].naturalWidth / L.rect.w, E, hasGhost: !!L.ghost };
    });
    this.tl.hits.sort((a, b) => a.time - b.time);
    this.tl.audioCues.sort((a, b) => a.time - b.time);
    this._hits = tl.hits; this._cues = tl.audioCues; this._shakes = tl.shakes;
    this._buildShine();
    if (this.autoResize) {
      if (typeof ResizeObserver !== 'undefined') { this._ro = new ResizeObserver(this._onResize); this._ro.observe(this.canvas); }
      window.addEventListener('resize', this._onResize);
    }
    this.loaded = true; this._draw(0);
    return this;
  }
  /** (Re)size the backing store to CSS size * devicePixelRatio and recompute the stage fit. */
  resize() {
    const cv = this.canvas, dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const cssW = cv.clientWidth || cv.width / dpr || 1920, cssH = cv.clientHeight || cv.height / dpr || 1080;
    const w = Math.max(2, Math.round(cssW * dpr)), h = Math.max(2, Math.round(cssH * dpr));
    if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h;
    this.cw = w; this.ch = h;
    if (this.tl) {
      const st = this.tl.stage, c = this.tl.logo.content;
      this._sS = Math.min(w / st.refW, h / st.refH);
      this._S = this._sS * Math.min(st.logoWidthFrac * st.refW / c.w, st.maxHeightFrac * st.refH / c.h);
      this._cx = this.tl.logo.center.x; this._cy = this.tl.logo.center.y;
      if (this._layers) this._buildShine();
    }
  }
  _buildShine() {
    const s = this.tl.shine, th = s.angleDeg * Math.PI / 180, c = this.tl.logo.content;
    this._ux = Math.sin(th); this._uy = Math.cos(th);
    const xs = [c.x - this._cx, c.x + c.w - this._cx], ys = [c.y - this._cy, c.y + c.h - this._cy];
    let mn = Infinity, mx = -Infinity;
    for (const x of xs) for (const y of ys) { const d = x * this._ux + y * this._uy; if (d < mn) mn = d; if (d > mx) mx = d; }
    this._smin = mn; this._smax = mx;
    const g = this.ctx.createLinearGradient(-0.5, 0, 0.5, 0);   // unit gradient, positioned by transform
    for (const st of s.stops) g.addColorStop(st[0], 'rgba(255,255,255,' + (st[1] * s.peakAlpha) + ')');
    this._shineGrad = g;
  }
  // ---------- pose math (identical to gkart_core.py) ----------
  _poseOf(lay, t, o) {
    const L = lay.L; if (t < L.start) return false;
    const fr = L.from, to = L.to, p = clamp01((t - L.start) / (L.land - L.start)), E = lay.E;
    o.x = fr.x + (to.x - fr.x) * E.x(p); o.y = fr.y + (to.y - fr.y) * E.y(p);
    o.scale = fr.scale + (to.scale - fr.scale) * E.scale(p); o.rotation = fr.rotation + (to.rotation - fr.rotation) * E.rotation(p);
    const af = L.alphaFrac || 1;
    o.alpha = fr.alpha + (to.alpha - fr.alpha) * clamp01(p / af);
    let tt = t - L.land;
    if (tt > 0) {
      const bs = L.bounces;
      if (bs) for (let i = 0; i < bs.length; i++) {
        if (tt < bs[i].dur) { const q = tt / bs[i].dur; o.y -= bs[i].h * 4 * q * (1 - q); break; }
        tt -= bs[i].dur;
      }
      const sw = L.sway;
      if (sw) { const q = (t - L.land) / sw.dur; if (q >= 0 && q < 1) o.rotation += sw.amp * Math.sin(TAU * sw.swings * q) * (1 - q); }
      const ov = L.overshoot;   // hard-stop rebound: +px along x, rise then fall back to exactly 0
      if (ov) {
        const u = t - L.land;
        let k = 0;
        if (u > 0 && u < ov.rise) k = ov.px * easeOutCubic(u / ov.rise);
        else if (u >= ov.rise && u < ov.rise + ov.fall) k = ov.px * (1 - easeOutCubic((u - ov.rise) / ov.fall));
        if (k !== 0) { const dd = (ov.dirDeg || 0) * Math.PI / 180; o.x += k * Math.cos(dd); o.y -= k * Math.sin(dd); }   // along the path angle
      }
    }
    const stl = L.stretch; o.ns = 0;
    if (stl) for (let i = 0; i < stl.length; i++) {
      const g = stl[i].group, pg = clamp01((t - g.start) / (g.land - g.start));
      const v = t >= g.start ? easeVel(g.easing, pg) / velMax(g.easing) : 0;
      o.sp[i] = stl[i].pivotX; o.sy[i] = stl[i].pivotY || 0; o.sf[i] = 1 + stl[i].amount * v; o.sa[i] = (stl[i].angleDeg || 0) * Math.PI / 180; o.ns = i + 1;
    }
    return true;
  }
  _drawLayer(lay, o, aMul) {
    const a = o.alpha * aMul; if (a <= 0.001 || o.scale <= 0.001) return;
    const ctx = this.ctx, S = this._S, L = lay.L, r = L.rect, pv = L.pivot;
    const th = o.rotation * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), sc = o.scale;
    const vx = r.x - pv.x, vy = r.y - pv.y;
    const tx = this.cw / 2 + this._off.x + S * (pv.x + o.x - this._cx) + S * sc * (c * vx - s * vy);
    const ty = this.ch / 2 + this._off.y + S * (pv.y + o.y - this._cy) + S * sc * (s * vx + c * vy);
    const m = S * sc / lay.k;
    let ma = m * c, mb = m * s, mc = -m * s, md = m * c, me = tx, mf = ty;
    for (let i = 0; i < o.ns; i++) {   // speed stretch ALONG the path angle about pivot: M = I + (f-1) u u^T, u=(cos a, -sin a)
      const f = o.sf[i]; if (f === 1) continue;
      const ox = this.cw / 2 + this._off.x + S * (o.sp[i] - this._cx), oy = this.ch / 2 + this._off.y + S * (o.sy[i] - this._cy);
      const ux = Math.cos(o.sa[i]), uy = -Math.sin(o.sa[i]), g = f - 1;
      const m00 = 1 + g * ux * ux, m01 = g * ux * uy, m11 = 1 + g * uy * uy;
      const na = m00 * ma + m01 * mb, nb = m01 * ma + m11 * mb, nc = m00 * mc + m01 * md, nd = m01 * mc + m11 * md;
      const dx = me - ox, dy = mf - oy;
      me = ox + m00 * dx + m01 * dy; mf = oy + m01 * dx + m11 * dy; ma = na; mb = nb; mc = nc; md = nd;
    }
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.setTransform(ma, mb, mc, md, me, mf);
    ctx.drawImage(lay.img, 0, 0);
  }
  _draw(t) {
    if (!this.loaded) return;
    const ctx = this.ctx, tl = this.tl, sS = this._sS;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, this.cw, this.ch);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // global offsets: shake + idle (reference px -> canvas px)
    let dx = 0, dy = 0; const sk = this._shakes;
    for (let i = 0; i < sk.length; i++) {
      const q = (t - sk[i].time) / sk[i].dur;
      if (q >= 0 && q < 1) { const a = sk[i].px * (1 - q) * (1 - q);
        if (sk[i].dirDeg !== undefined) {   // jolt along the path angle + smaller perpendicular wobble
          const th = sk[i].dirDeg * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
          const al = a * Math.cos(TAU * sk[i].fx * q), pe = 0.35 * a * Math.cos(TAU * sk[i].fy * q + 1.1);
          dx += al * c + pe * sn; dy += -al * sn + pe * c;
        } else { dx += 0.7 * a * Math.cos(TAU * sk[i].fx * q + 1.1); dy += a * Math.cos(TAU * sk[i].fy * q); } }
    }
    const id = tl.idle; if (t >= id.start) dy += id.ampPx * Math.sin(TAU * (t - id.start) / id.period);
    this._off.x = dx * sS; this._off.y = dy * sS;
    const lays = this._layers, o = this._pose, go = this._gpose;
    for (let i = 0; i < lays.length; i++) {
      const lay = lays[i], L = lay.L;
      if (lay.hasGhost) {
        const g = L.ghost;
        for (let n = g.count; n >= 1; n--) {
          const tg = t - n * g.lag;
          if (tg > L.start && tg < L.land && this._poseOf(lay, tg, go)) this._drawLayer(lay, go, g.alpha * (1 - (n - 1) / g.count));
        }
      }
      if (this._poseOf(lay, t, o)) this._drawLayer(lay, o, 1);
    }
    const s = tl.shine;
    if (t >= s.start && t <= s.end) {
      const lin = clamp01((t - s.start) / (s.end - s.start));
      const sc = (this._smin - s.width / 2) + (this._smax - this._smin + s.width) * lin, S = this._S;
      const cx = this.cw / 2 + this._off.x + S * this._ux * sc, cy = this.ch / 2 + this._off.y + S * this._uy * sc;
      const phi = Math.PI / 2 - s.angleDeg * Math.PI / 180, k = S * s.width;
      ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 1;
      ctx.setTransform(k * Math.cos(phi), k * Math.sin(phi), -k * Math.sin(phi), k * Math.cos(phi), cx, cy);
      ctx.fillStyle = this._shineGrad; ctx.fillRect(-1000, -1000, 2000, 2000);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  }
  // ---------- playback ----------
  _resetPointers(t) {
    let i = 0; while (i < this._hits.length && this._hits[i].time <= t) i++; this._hitIdx = i;
    let j = 0; while (j < this._cues.length && this._cues[j].time <= t) j++; this._cueIdx = j;
  }
  _fire(t) {
    const stale = 0.15;   // never fire cues older than 150 ms (tab stall) so SFX can't pile up
    while (this._cueIdx < this._cues.length && this._cues[this._cueIdx].time <= t) {
      const c = this._cues[this._cueIdx++]; if (t - c.time <= stale && this.onCue) this.onCue(c);
    }
    while (this._hitIdx < this._hits.length && this._hits[this._hitIdx].time <= t) {
      const h = this._hits[this._hitIdx++]; if (t - h.time <= stale && this.onHit) this.onHit(h.name, h.time);
    }
  }
  play() {
    if (!this.loaded || this.destroyed) return;
    cancelAnimationFrame(this._raf);
    if (this.finished && !this.idleLoop) { this.t = 0; }
    this.finished = false; this.skipped = false; this.playing = true;
    this._resetPointers(this.t - 1e-9); this._t0 = performance.now() - this.t * 1000;
    this._raf = requestAnimationFrame(this._tick);
  }
  _frame(now) {
    if (!this.playing || this.destroyed) return;
    let t = (now - this._t0) / 1000; const dur = this.tl.duration;
    if (t < 0) t = 0;
    if (t >= dur && !this.idleLoop) t = dur;
    this.t = t; this._fire(t); this._draw(t);
    if (t >= dur && !this.finished) { this.finished = true; if (this.onDone) this.onDone(); if (!this.idleLoop) { this.playing = false; return; } }
    this._raf = requestAnimationFrame(this._tick);
  }
  pause() { this.playing = false; cancelAnimationFrame(this._raf); }
  /** Jump to the final 3.20 s state, hold it, then call onDone() once. */
  skip() {
    if (!this.loaded || this.destroyed || this.skipped) return;
    cancelAnimationFrame(this._raf); this.skipped = true; this.playing = false;
    const wasDone = this.finished; this.t = this.tl.skipTime; this._resetPointers(this.t); this._draw(this.t);
    if (this.idleLoop) { this.playing = true; this._t0 = performance.now() - this.t * 1000; this._raf = requestAnimationFrame(this._tick); }
    if (this.onSkip) this.onSkip();
    if (!wasDone) { this.finished = true; if (this.onDone) this.onDone(); }
  }
  /** Deterministic frame at time t (seconds). Pauses playback; fires no callbacks. */
  seek(t) {
    this.pause(); this.t = Math.max(0, t); this.finished = false; this.skipped = false;
    this._resetPointers(this.t); this._draw(this.t);
  }
  destroy() {
    this.destroyed = true; cancelAnimationFrame(this._raf); this.playing = false;
    if (this._ro) this._ro.disconnect(); window.removeEventListener('resize', this._onResize);
    if (this.ctx) { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
    this._layers = null;
  }
}
export default GKartIntro;
