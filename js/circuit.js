// ===== Circuitos: red de caminos, atajos, rampas, huecos, túneles y trampas =====
import * as THREE from '../vendor/three.module.min.js';
import { THEMES, rng } from './data.js';
import { makeSky, buildDecos, M, roadTexture, padTexture, checkerTexture, canvasTex } from './track.js';

export const SH = 6;          // franja lateral (pasto/arena) hasta el muro
const CURB = 1.2, WALL_H = 1.3, STEP = 1.6;
const RAMP_LEN = 5, RAMP_H = 3.0, GAP_LEN = 8; // en muestras
const VOID = t => t.ground === null;

// ---------------------------------------------------------------------------
// FORMAS
// ---------------------------------------------------------------------------
const SHAPES = {
  U: [[-1, 1], [-1, -1], [1, -1], [1, 1], [0.42, 1], [0.42, -0.25], [-0.42, -0.25], [-0.42, 1]],
  L: [[-1, 1.1], [-1, -1], [1.2, -1], [1.2, -0.15], [-0.15, -0.15], [-0.15, 1.1]],
  tri: [[-1.2, -0.9], [1.2, -0.9], [0, 1.2]],
  zig: [[-1.3, -0.9], [1.3, -0.9], [1.3, 0.9], [0.75, 0.9], [0.45, -0.05], [0.15, 0.9], [-0.15, 0.9], [-0.45, -0.05], [-0.75, 0.9], [-1.3, 0.9]],
  stadium: [[-1.4, -0.55], [1.4, -0.55], [1.4, 0.55], [0.5, 0.55], [0.25, 0.1], [0, 0.55], [-1.4, 0.55]],
  clover: Array.from({ length: 18 }, (_, i) => { const t = i / 18 * Math.PI * 2, rr = 0.75 + 0.35 * Math.cos(3 * t); return [Math.cos(t) * rr * 1.2, Math.sin(t) * rr * 1.2]; }),
  heart: Array.from({ length: 20 }, (_, i) => { const t = i / 20 * Math.PI * 2; return [Math.pow(Math.sin(t), 3) * 1.4, (13 * Math.cos(t) - 3.5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 13]; }),
  T: [[-1.3, 0.3], [-1.3, 1], [1.3, 1], [1.3, 0.3], [0.35, 0.3], [0.35, -1.1], [-0.35, -1.1], [-0.35, 0.3]],
  bean: Array.from({ length: 16 }, (_, i) => { const t = i / 16 * Math.PI * 2, rr = 1 - 0.32 * Math.max(0, Math.sin(t)) ** 3; return [Math.cos(t) * rr * 1.35, Math.sin(t) * rr * 0.85]; }),
  // trazos técnicos dibujados a mano
  serpiente: [[-1.5, -1], [1.5, -1], [1.5, -0.35], [-0.6, -0.35], [-0.6, 0.15], [1.5, 0.15], [1.5, 1], [-1.5, 1]],
  gancho: [[-1.4, -1], [0.6, -1], [1.4, -0.3], [1.4, 1], [0.6, 1], [0.6, 0], [-0.3, 0], [-0.3, 1], [-1.4, 1]],
  rayo: [[-1.4, -1], [1.4, -1], [1.4, -0.2], [0.3, 0.1], [1.2, 1], [-0.2, 1], [-0.6, 0.2], [-1.4, 0.4]],
  escalera: [[-1.5, -1], [1.5, -1], [1.5, 1], [0.9, 1], [0.9, 0.45], [0.3, 0.45], [0.3, -0.1], [-0.3, -0.1], [-0.3, 0.45], [-0.9, 0.45], [-0.9, 1], [-1.5, 1]],
  dona: [[-1.4, 0], [-1, -1], [0, -1.2], [1, -1], [1.4, 0], [1, 1], [0.35, 1.1], [0.35, 0.35], [-0.35, 0.35], [-0.35, 1.1], [-1, 1]],
  garra: [[-1.4, -1], [1.4, -1], [1.4, 1], [0.95, 1], [0.95, -0.1], [0.5, -0.1], [0.5, 1], [0.05, 1], [0.05, -0.1], [-0.4, -0.1], [-0.4, 1], [-1.4, 1]],
};

function convexHull(p) {
  p = p.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// Generador procedural tipo "circuito real": casco convexo + desplazamientos + separación
function genPoly(r, cx) {
  const pts = [];
  for (let i = 0; i < 16 + Math.floor(cx * 14); i++) pts.push([(r() - 0.5) * 3, (r() - 0.5) * 2.2]);
  let h = convexHull(pts);
  for (let pass = 0; pass < (cx > 0.55 ? 2 : 1); pass++) {
    const out = [];
    for (let i = 0; i < h.length; i++) {
      const a = h[i], b = h[(i + 1) % h.length];
      out.push(a);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.45) continue;
      const nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
      const disp = (r() - 0.62) * len * (0.5 + cx * 0.7) / (pass + 1);
      out.push([(a[0] + b[0]) / 2 + nx * disp, (a[1] + b[1]) / 2 + nz * disp]);
    }
    h = out;
  }
  // separar puntos demasiado cercanos
  for (let it = 0; it < 12; it++) for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) {
    const dx = h[j][0] - h[i][0], dz = h[j][1] - h[i][1], d = Math.hypot(dx, dz);
    if (d < 0.32 && d > 1e-6) { const f = (0.32 - d) / 2 / d; h[i][0] -= dx * f; h[i][1] -= dz * f; h[j][0] += dx * f; h[j][1] += dz * f; }
  }
  return h;
}
function chamferPoly(poly, ch = 0.2) {
  const pts = [], m = poly.length;
  for (let i = 0; i < m; i++) {
    const p = poly[i], a = poly[(i - 1 + m) % m], b = poly[(i + 1) % m];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ca = Math.min(ch, la * 0.4), cb = Math.min(ch, lb * 0.4);
    pts.push([p[0] + (a[0] - p[0]) / la * ca, p[1] + (a[1] - p[1]) / la * ca]);
    pts.push([p[0] + (b[0] - p[0]) / lb * cb, p[1] + (b[1] - p[1]) / lb * cb]);
    const nb = Math.floor((lb - 2 * cb) / 0.55);
    for (let k = 1; k <= nb; k++) { const t = cb / lb + (1 - 2 * cb / lb) * k / (nb + 1); pts.push([p[0] + (b[0] - p[0]) * t, p[1] + (b[1] - p[1]) * t]); }
  }
  return pts;
}
function to3D(pts2, def, r, scale = 1) {
  const rot = r() * Math.PI * 2, flip = r() < 0.5 ? -1 : 1, hp = [r() * 6.28, r() * 6.28, r() * 6.28];
  return pts2.map(([x0, z0]) => {
    const x = (x0 * Math.cos(rot) - z0 * Math.sin(rot)) * flip, z = x0 * Math.sin(rot) + z0 * Math.cos(rot);
    const th = Math.atan2(z, x);
    const y = def.hills * (0.5 + 0.3 * Math.sin(th * 2 + hp[0]) + 0.15 * Math.sin(th * 3 + hp[1]) + 0.05 * Math.sin(th * 5 + hp[2]));
    return new THREE.Vector3(x * def.size * scale, y, z * def.size * scale);
  });
}
export function candidate(def, r, attempt) {
  if (def.eight) {
    const N = 22, pts = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2, wob = 1 + 0.08 * Math.sin(3 * t + def.seed);
      pts.push(new THREE.Vector3(Math.sin(t) * def.size * 1.35 * wob, 7 + 7 * Math.cos(t) + def.hills * 0.3 * Math.sin(2 * t), Math.sin(2 * t) * def.size * 0.62 * wob));
    }
    return pts;
  }
  const shape = attempt > 10 ? 'blob' : def.shape;
  if (shape === 'gen') return to3D(chamferPoly(genPoly(r, def.cx), 0.16), def, r, 1.0);
  if (SHAPES[shape]) return to3D(chamferPoly(SHAPES[shape].map(([x, z]) => [x + (r() - 0.5) * 0.1, z + (r() - 0.5) * 0.1])), def, r);
  // blob
  const N = 9 + Math.floor(def.cx * 9), harm = [];
  let budget = 0.18 + def.cx * 0.32;
  for (let k = 2; k <= 5; k++) { const a = r() * budget * 0.6; budget -= a; harm.push([k, a, r() * 6.28]); }
  const pts2 = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2; let rad = 1; for (const [k, a, ph] of harm) rad += a * Math.sin(k * th + ph);
    pts2.push([Math.cos(th) * rad * 1.15, Math.sin(th) * rad]);
  }
  return to3D(pts2, def, r);
}
// comprueba que la pista no se encime y no tenga curvas imposibles
function minRadius(pts) {
  const c = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const L = c.getLength(), n = Math.floor(L / 3), sp = c.getSpacedPoints(n); sp.pop();
  let mr = Infinity;
  for (let i = 0; i < n; i++) {
    const a = sp[(i - 2 + n) % n], b = sp[i], d = sp[(i + 2) % n];
    const ang = Math.abs(Math.atan2((b.x - a.x) * (d.z - b.z) - (b.z - a.z) * (d.x - b.x), (b.x - a.x) * (d.x - b.x) + (b.z - a.z) * (d.z - b.z)));
    if (ang > 1e-3) mr = Math.min(mr, 6 / ang);
  }
  return { mr, L, sp, n };
}
export function validate(pts, def, dbg) {
  const { mr, L, sp, n } = minRadius(pts);
  const need = 2 * (def.w / 2 + SH) + 6, minR = def.w / 2 + SH;
  if (mr < minR) { if (dbg) dbg.push('radio ' + mr.toFixed(1)); return false; }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const gap = Math.min(j - i, n - (j - i)) * 3; if (gap < need * 2) continue;
    if (Math.abs(sp[i].y - sp[j].y) > 6) continue;
    const d = Math.hypot(sp[i].x - sp[j].x, sp[i].z - sp[j].z);
    if (d < need) { if (dbg) dbg.push('cerca ' + d.toFixed(1)); return false; }
  }
  return L > 500;
}
// redondea curvas demasiado cerradas (suavizado laplaciano sobre puntos densos)
function smoothTrack(pts, def) {
  const c = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  let P = c.getSpacedPoints(Math.max(40, Math.floor(c.getLength() / 9))); P.pop();
  const minR = def.w / 2 + SH;
  for (let it = 0; it < 60; it++) {
    if (minRadius(P).mr >= minR) break;
    const m = P.length;
    P = P.map((p, i) => { const a = P[(i - 1 + m) % m], b = P[(i + 1) % m]; return new THREE.Vector3(p.x + ((a.x + b.x) / 2 - p.x) * 0.5, p.y + ((a.y + b.y) / 2 - p.y) * 0.5, p.z + ((a.z + b.z) / 2 - p.z) * 0.5); });
  }
  return P;
}
export let lastAttempt = 0;
export function trackPoints(def, mirror = false) {
  let pts;
  for (let attempt = 0; attempt < 16; attempt++) {
    const r = rng(def.seed + attempt * 1013);
    pts = candidate(def, r, attempt);
    if (def.eight) break;
    pts = smoothTrack(pts, def);
    lastAttempt = attempt;
    if (validate(pts, def)) break;
  }
  if (mirror) pts.forEach(p => p.x = -p.x);
  return pts;
}
export function trackOutline(def, mirror = false, n = 120) {
  const c = new THREE.CatmullRomCurve3(trackPoints(def, mirror), true, 'centripetal');
  return c.getSpacedPoints(n).map(p => [p.x, p.z, p.y]);
}

// ---------------------------------------------------------------------------
// CAMINOS
// ---------------------------------------------------------------------------
function makeRoad(id, pts, closed, W, extra = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
  const L0 = curve.getLength(), n0 = Math.max(4, Math.round(L0 / STEP));
  const sp = curve.getSpacedPoints(n0); if (closed) sp.pop();
  const n = sp.length, S = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const p = sp[i];
    const nx = closed ? sp[(i + 1) % n] : sp[Math.min(n - 1, i + 1)], pv = closed ? sp[(i - 1 + n) % n] : sp[Math.max(0, i - 1)];
    let tx = nx.x - pv.x, tz = nx.z - pv.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const nn = closed ? sp[(i + 1) % n] : sp[Math.min(n - 1, i + 1)];
    const seg = (closed || i < n - 1) ? Math.hypot(nn.x - p.x, nn.y - p.y, nn.z - p.z) : 0;
    S.push({ x: p.x, y: p.y, z: p.z, gy: p.y, tx, tz, rx: -tz, rz: tx, s: acc, seg, ramp: 0, gap: false, wallL: true, wallR: true, openL: false, openR: false, curbL: true, curbR: true, shL: true, shR: true, tunnel: false });
    acc += seg;
  }
  return { id, S, n, L: acc, W, closed, main: id === 0, dirt: false, s0: 0, s1: acc, ...extra };
}
function roadPoint(road, ls, off = 0) {
  const { S, n, L } = road;
  ls = road.closed ? ((ls % L) + L) % L : Math.max(0, Math.min(L - 0.01, ls));
  let lo = 0, hi = n - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (S[m].s <= ls) lo = m; else hi = m - 1; }
  const a = S[lo], b = S[road.closed ? (lo + 1) % n : Math.min(n - 1, lo + 1)], t = a.seg > 0 ? (ls - a.s) / a.seg : 0;
  return { x: a.x + (b.x - a.x) * t + a.rx * off, y: a.gy + (b.gy - a.gy) * t, z: a.z + (b.z - a.z) * t + a.rz * off, tx: a.tx, tz: a.tz, idx: lo };
}
function curvatureAt(S, n, i, span = 6) {
  const a = S[(i - span + n) % n], b = S[(i + span) % n];
  return Math.atan2(a.tx * b.tz - a.tz * b.tx, a.tx * b.tx + a.tz * b.tz); // + izquierda / - derecha
}

// ---------------------------------------------------------------------------
// GEOMETRÍA
// ---------------------------------------------------------------------------
// Franja lateral entre desplazamientos a..b. skip(i) omite el cuadro i→i+1.
function strip(road, a, b, yA, yB, opts = {}) {
  const { S, n, closed } = road, pos = [], uv = [], col = [];
  const cA = new THREE.Color(opts.colA ?? 0xffffff), cB = new THREE.Color(opts.colB ?? opts.colA ?? 0xffffff);
  const segs = closed ? n : n - 1, uvL = opts.uvLen || 10;
  for (let i = 0; i < segs; i++) {
    if (opts.skip && opts.skip(i)) continue;
    const s0 = S[i], s1 = S[(i + 1) % n];
    const v0 = s0.s / uvL, v1 = (s0.s + s0.seg) / uvL;
    const c = opts.checker ? ((Math.floor(s0.s / 2.5) % 2) ? cA : cB) : cA;
    const P = (s, o, y) => [s.x + s.rx * o, s.gy + y, s.z + s.rz * o];
    const q = [P(s0, a, yA), P(s0, b, yB), P(s1, a, yA), P(s1, b, yB)], u = [[0, v0], [1, v0], [0, v1], [1, v1]];
    const tri = (a < b) !== !!opts.flip ? [0, 1, 2, 1, 3, 2] : [0, 2, 1, 1, 2, 3];
    for (const t of tri) { pos.push(...q[t]); uv.push(...u[t]); col.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
function wallGeo(road, side, color) {
  const { S, n, closed, W } = road, pos = [], col = [];
  const c1 = new THREE.Color(color), c2 = new THREE.Color(color).multiplyScalar(0.78);
  const o = side * (W + SH), segs = closed ? n : n - 1, key = side > 0 ? 'wallR' : 'wallL';
  for (let i = 0; i < segs; i++) {
    const s0 = S[i], s1 = S[(i + 1) % n];
    if (!s0[key] || !s1[key] || s0.gap) continue;
    const c = (Math.floor(i / 4) % 2) ? c1 : c2;
    const q = [[s0.x + s0.rx * o, s0.gy - 1.2, s0.z + s0.rz * o], [s0.x + s0.rx * o, s0.gy + WALL_H, s0.z + s0.rz * o], [s1.x + s1.rx * o, s1.gy - 1.2, s1.z + s1.rz * o], [s1.x + s1.rx * o, s1.gy + WALL_H, s1.z + s1.rz * o]];
    for (const t of [0, 1, 2, 1, 3, 2]) { pos.push(...q[t]); col.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals(); return g;
}
const tex = {};
function rampTex() { return tex.ramp || (tex.ramp = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffd60a'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; for (let k = -2; k < 4; k++) { g.beginPath(); g.moveTo(k * 24, h); g.lineTo(k * 24 + 12, h); g.lineTo(k * 24 + 12 + h, 0); g.lineTo(k * 24 + h, 0); g.fill(); } })); }
function dirtTex() { return tex.dirt || (tex.dirt = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#9c6b3c'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? '#7a5230' : '#b98552'; g.fillRect(r() * w, r() * h, 3, 3); } g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(14, 0, 6, h); g.fillRect(w - 20, 0, 6, h); })); }
function chevronTex() { return tex.chev || (tex.chev = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#ffd60a'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; for (let k = 0; k < 3; k++) { const x = 18 + k * 36; g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 22, h / 2); g.lineTo(x, h - 8); g.lineTo(x + 10, h - 8); g.lineTo(x + 32, h / 2); g.lineTo(x + 10, 8); g.fill(); } g.strokeStyle = '#111'; g.lineWidth = 6; g.strokeRect(0, 0, w, h); })); }

// ---------------------------------------------------------------------------
// TRAMPAS (deterministas en función del tiempo de carrera)
// ---------------------------------------------------------------------------
const HZ_THEME = {
  prado: ['cow', 'mud', 'cow'], playa: ['crab', 'spout', 'crab'], desierto: ['boulder', 'quicksand', 'boulder'], nieve: ['snowball', 'ice', 'snowball'],
  bosque: ['plant', 'mud', 'log'], volcan: ['firebar', 'lavageyser', 'boulder'], ciudad: ['traffic', 'oil', 'crusher'], castillo: ['crusher', 'firebar', 'firebar'],
  espacio: ['asteroid', 'crusher', 'asteroid'], selva: ['plant', 'boulder', 'mud'], cielo: ['thunder', 'spout', 'thunder'], fabrica: ['crusher', 'oil', 'crate'],
  canon: ['boulder', 'crusher', 'boulder'], dulce: ['gumball', 'jelly', 'gumball'],
};
const SWEEP = { cow: 'spin', crab: 'spin', boulder: 'tumble', snowball: 'tumble', asteroid: 'tumble', gumball: 'spin', thunder: 'spin', crate: 'spin', log: 'tumble' };
const PUDDLE = { mud: ['slow', 0x4a3220, 0.95], quicksand: ['slow', 0xd9a650, 0.95], jelly: ['slow', 0xff6fb5, 0.7], oil: ['spin', 0x111111, 0.95], ice: ['spin', 0xbde0fe, 0.75] };
export const HAZARD_NAMES = { cow: 'Vacas', crab: 'Cangrejos', boulder: 'Rocas rodantes', snowball: 'Bolas de nieve', asteroid: 'Asteroides', gumball: 'Chicles gigantes', thunder: 'Nubes de tormenta', crate: 'Cajas en banda', log: 'Troncos', mud: 'Lodo', quicksand: 'Arenas movedizas', jelly: 'Gelatina', oil: 'Aceite', ice: 'Hielo', spout: 'Géiseres', lavageyser: 'Géiseres de lava', firebar: 'Barras de fuego', crusher: 'Aplastadores', traffic: 'Tráfico', plant: 'Plantas carnívoras' };

function hazardMesh(kind) {
  const g = new THREE.Group();
  const add = (geo, c, x = 0, y = 0, z = 0, e = 0) => { const m = new THREE.Mesh(geo, M(c, e)); m.position.set(x, y, z); g.add(m); return m; };
  switch (kind) {
    case 'cow': add(new THREE.BoxGeometry(2, 1.4, 3), 0xffffff, 0, 1.6); add(new THREE.BoxGeometry(1.1, 1, 1.1), 0xffffff, 0, 2.1, 1.9); add(new THREE.BoxGeometry(0.8, 0.5, 0.3), 0xffb3c6, 0, 1.8, 2.5);
      add(new THREE.BoxGeometry(0.9, 0.8, 0.2), 0x111111, 0.6, 1.9, -0.4); add(new THREE.BoxGeometry(0.7, 0.6, 0.2), 0x111111, -1.01, 1.6, 0.6);
      for (const [x, z] of [[-0.7, -1.1], [0.7, -1.1], [-0.7, 1.1], [0.7, 1.1]]) add(new THREE.CylinderGeometry(0.18, 0.18, 1), 0x333333, x, 0.5, z); break;
    case 'crab': add(new THREE.SphereGeometry(1.3, 10, 6), 0xe63946, 0, 0.9).scale.set(1.3, 0.6, 1); for (const s of [-1, 1]) { add(new THREE.SphereGeometry(0.55, 8, 6), 0xe63946, s * 1.9, 1.1, 0.6); add(new THREE.SphereGeometry(0.2, 6, 4), 0xffffff, s * 0.4, 1.6, 0.8); } break;
    case 'boulder': add(new THREE.DodecahedronGeometry(2.1), 0x8d6e63, 0, 2.1); break;
    case 'snowball': add(new THREE.IcosahedronGeometry(2.1, 1), 0xf8fbff, 0, 2.1); break;
    case 'asteroid': add(new THREE.DodecahedronGeometry(2.2), 0x4a3b6b, 0, 2.2, 0, 0x220044); break;
    case 'gumball': add(new THREE.SphereGeometry(2, 14, 10), 0x4cc9f0, 0, 2, 0, 0x113355); break;
    case 'thunder': add(new THREE.IcosahedronGeometry(1.8, 1), 0x555566, 0, 3.5); add(new THREE.IcosahedronGeometry(1.4, 1), 0x555566, 1.6, 3.3); add(new THREE.IcosahedronGeometry(1.4, 1), 0x555566, -1.6, 3.3);
      { const b = add(new THREE.ConeGeometry(0.5, 2.6, 4), 0xffee00, 0, 1.4, 0, 0xffcc00); b.rotation.x = Math.PI; } break;
    case 'crate': add(new THREE.BoxGeometry(3, 3, 3), 0xa0522d, 0, 1.5); add(new THREE.BoxGeometry(3.1, 0.3, 3.1), 0x6d3a1a, 0, 1.5); break;
    case 'log': { const m = add(new THREE.CylinderGeometry(1, 1, 7, 10), 0x7f5539, 0, 1); m.rotation.z = Math.PI / 2; } break;
    case 'plant': add(new THREE.CylinderGeometry(1.2, 0.9, 1.2, 10), 0x6d4c41, 0, 0.6); add(new THREE.SphereGeometry(1.3, 12, 8), 0xc1121f, 0, 2.6, 0); add(new THREE.BoxGeometry(1.6, 0.25, 0.5), 0xffffff, 0, 2.5, 1.1);
      for (const [x, y] of [[0.6, 3.2], [-0.5, 3.4], [0.2, 2.0]]) add(new THREE.SphereGeometry(0.22, 6, 4), 0xffffff, x, y, 0.95); break;
  }
  return g;
}

function buildHazards(group, main, roadsAll, r, plan, theme, timeOffset) {
  const hz = [];
  const W = main.W;
  for (const p of plan) {
    const s = main.S[p.i];
    const base = new THREE.Vector3(s.x, s.gy, s.z), T = new THREE.Vector2(s.tx, s.tz), R = new THREE.Vector2(s.rx, s.rz);
    const ph = r() * 10, k = p.kind;
    if (SWEEP[k]) {
      const m = hazardMesh(k); group.add(m);
      const per = 4.5 + r() * 2.5, amp = W * 0.95, eff = SWEEP[k], rad = k === 'log' ? 1.2 : 2.1;
      const lanes = k === 'cow' ? 2 : 1, extra = [];
      for (let e = 1; e < lanes; e++) { const m2 = hazardMesh(k); group.add(m2); extra.push(m2); }
      const pos = (t, e) => { const off = Math.sin((t + ph + e * per / 2) * Math.PI * 2 / per) * amp; return [base.x + R.x * off + T.x * e * 6, base.z + R.y * off + T.y * e * 6, off]; };
      hz.push({
        kind: k, cx: base.x, cz: base.z, rad: W + 8,
        update(t) {
          [m, ...extra].forEach((mm, e) => {
            const [x, z, off] = pos(t, e); mm.position.set(x, base.y, z);
            const dir = Math.cos((t + ph + e * per / 2) * Math.PI * 2 / per);
            if (k === 'cow' || k === 'crab') mm.rotation.y = Math.atan2(R.x * Math.sign(dir), R.y * Math.sign(dir));
            else if (k === 'log') { mm.rotation.y = Math.atan2(T.x, T.y); mm.children[0].rotation.x = off * 0.6; }
            else { mm.rotation.y = Math.atan2(T.x, T.y); mm.children.forEach(c => c.rotation.x = off * 0.5); }
          });
        },
        hit(x, y, z, t) {
          if (Math.abs(y - base.y) > 4) return null;
          for (let e = 0; e < lanes; e++) {
            const [hx, hz2] = pos(t, e);
            if (k === 'log') { // tronco: segmento a lo largo de la pista
              const dx = x - hx, dz = z - hz2, along = dx * T.x + dz * T.y, lat = dx * R.x + dz * R.y;
              if (Math.abs(along) < 1.9 && Math.abs(lat) < 4.6) return eff;
            } else if ((x - hx) ** 2 + (z - hz2) ** 2 < (rad + 1.1) ** 2) return eff;
          }
          return null;
        },
      });
    } else if (PUDDLE[k]) {
      const [eff, col, op] = PUDDLE[k], off = (r() - 0.5) * W * 0.9, rx = 3.6, rz = 6;
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshLambertMaterial({ color: col, transparent: op < 1, opacity: op, emissive: k === 'oil' ? 0x111122 : 0 }));
      m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.rotation.z = -Math.atan2(T.x, T.y);
      m.material.polygonOffset = true; m.material.polygonOffsetFactor = -4;
      const cx = base.x + R.x * off, cz = base.z + R.y * off; m.position.set(cx, base.y + 0.06, cz); group.add(m);
      if (k === 'oil') { const sh = new THREE.Mesh(new THREE.CircleGeometry(0.4, 8), new THREE.MeshBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.5 })); sh.rotation.x = -Math.PI / 2; sh.position.set(cx + 0.8, base.y + 0.08, cz); group.add(sh); }
      hz.push({ kind: k, cx, cz, rad: 8, update() {}, hit(x, y, z) { if (Math.abs(y - base.y) > 1.5) return null; const dx = x - cx, dz = z - cz; const a = dx * R.x + dz * R.y, b = dx * T.x + dz * T.y; return (a / (rx + 0.4)) ** 2 + (b / (rz + 0.4)) ** 2 < 1 ? eff : null; } });
    } else if (k === 'spout' || k === 'lavageyser') {
      const cols = [];
      const n = 2, per = 4.2;
      for (let e = 0; e < n; e++) {
        const off = (e === 0 ? -1 : 1) * W * 0.45, cx = base.x + R.x * off, cz = base.z + R.y * off;
        const c = k === 'spout' ? 0x48cae4 : 0xff5400;
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.4, 14), M(k === 'spout' ? 0x0077b6 : 0x3a1a10, k === 'spout' ? 0 : 0x661100)); ring.position.set(cx, base.y + 0.2, cz); group.add(ring);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8 }));
        col.position.set(cx, base.y, cz); group.add(col);
        cols.push({ col, cx, cz, phase: e * 0.5 });
      }
      const state = (t, e) => ((t + ph) / per + cols[e].phase) % 1;
      hz.push({
        kind: k, cx: base.x, cz: base.z, rad: W + 6,
        update(t) { cols.forEach((c, e) => { const p = state(t, e); const hgt = p > 0.55 && p < 0.85 ? 12 : p > 0.4 && p <= 0.55 ? 0.6 + Math.sin(t * 40) * 0.3 : 0.05; c.col.scale.y = hgt; c.col.position.y = base.y + hgt / 2; c.col.visible = hgt > 0.1; }); },
        hit(x, y, z, t) { for (let e = 0; e < cols.length; e++) { const p = state(t, e); if (p > 0.55 && p < 0.85 && (x - cols[e].cx) ** 2 + (z - cols[e].cz) ** 2 < 6.5 && Math.abs(y - base.y) < 12) return 'tumble'; } return null; },
      });
    } else if (k === 'firebar') {
      const piv = new THREE.Group(); piv.position.copy(base); group.add(piv);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 2.2, 8), M(0x555555)); post.position.y = 1.1; piv.add(post);
      const arm = new THREE.Group(); arm.position.y = 1.6; piv.add(arm);
      const len = W * 0.95, fm = M(0xff7b00, 0xff4500);
      for (const sd of [-1, 1]) for (let d = 1.6; d < len; d += 1.3) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), fm); f.position.set(sd * d, 0, 0); arm.add(f); }
      const w = (r() < 0.5 ? -1 : 1) * (0.9 + r() * 0.5);
      hz.push({
        kind: k, cx: base.x, cz: base.z, rad: len + 4,
        update(t) { arm.rotation.y = (t + ph) * w; },
        hit(x, y, z, t) {
          if (Math.abs(y - base.y) > 3) return null;
          const a = (t + ph) * w, ax = Math.cos(a), az = -Math.sin(a);
          const dx = x - base.x, dz = z - base.z, along = dx * ax + dz * az;
          if (Math.abs(along) > len + 0.5 || Math.abs(along) < 1.2) return Math.hypot(dx, dz) < 2 ? 'spin' : null;
          return Math.abs(dx * -az + dz * ax) < 1.4 ? 'spin' : null;
        },
      });
    } else if (k === 'crusher') {
      const blocks = [], per = 3.4;
      const offs = W > 7.5 ? [-W * 0.6, 0, W * 0.6] : [-W * 0.5, W * 0.5];
      const bm = M(theme.wall === 0xffffff ? 0x8d99ae : 0x6c757d), sp = M(0x333333);
      offs.forEach((off, e) => {
        const b = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 4, 4.6), bm); body.position.y = 2; b.add(body);
        for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5], [0, 0]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 5), sp); c.rotation.x = Math.PI; c.position.set(x, -0.4, z); b.add(c); }
        for (const sd of [-1, 1]) { const ey = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.1), M(0xffffff)); ey.position.set(sd * 0.9, 2.8, 2.31); b.add(ey); }
        b.rotation.y = Math.atan2(T.x, T.y);
        const cx = base.x + R.x * off, cz = base.z + R.y * off; b.position.set(cx, base.y + 8, cz); group.add(b);
        blocks.push({ b, cx, cz, phase: e * 0.33 });
      });
      const hgt = (t, e) => { const p = ((t + ph) / per + blocks[e].phase) % 1; if (p < 0.45) return 8; if (p < 0.55) return 8 * (1 - (p - 0.45) / 0.1) ** 2 * 0 + 8 - 8 * ((p - 0.45) / 0.1) ** 2; if (p < 0.8) return 0; return (p - 0.8) / 0.2 * 8; };
      hz.push({
        kind: k, cx: base.x, cz: base.z, rad: W + 6,
        update(t) { blocks.forEach((bk, e) => bk.b.position.y = base.y + 0.8 + hgt(t, e)); },
        hit(x, y, z, t) {
          for (let e = 0; e < blocks.length; e++) {
            const bk = blocks[e]; if (hgt(t, e) > 2.2) continue;
            const dx = x - bk.cx, dz = z - bk.cz;
            if (Math.abs(dx * T.x + dz * T.y) < 3.2 && Math.abs(dx * R.x + dz * R.y) < 3.2) return 'crush';
          }
          return null;
        },
      });
    } else if (k === 'plant') {
      const plants = [];
      for (const side of [-1, 1]) {
        const m = hazardMesh('plant'); group.add(m);
        const bx = base.x + R.x * side * (W + 2.5) + T.x * side * 5, bz = base.z + R.y * side * (W + 2.5) + T.y * side * 5;
        m.position.set(bx, base.y, bz); m.rotation.y = Math.atan2(-R.x * side, -R.y * side);
        const head = m.children[1];
        plants.push({ m, bx, bz, side, head, ph2: side > 0 ? 0 : 1.3 });
      }
      const ext = (t, pl) => Math.max(0, Math.sin((t + ph + pl.ph2) * 2.2)) ** 3 * (W * 0.55 + 2);
      hz.push({
        kind: k, cx: base.x, cz: base.z, rad: W + 10,
        update(t) { plants.forEach(pl => { const e = ext(t, pl); pl.m.children.forEach((c, i) => { if (i > 0) c.position.z = (c.userData.z0 ??= c.position.z) + e; }); }); },
        hit(x, y, z, t) {
          if (Math.abs(y - base.y) > 4) return null;
          for (const pl of plants) { const e = ext(t, pl) + 0.5; const hx = pl.bx - R.x * pl.side * e, hz2 = pl.bz - R.y * pl.side * e; if ((x - hx) ** 2 + (z - hz2) ** 2 < 5.3) return 'spin'; }
          return null;
        },
      });
    }
  }
  return hz;
}

function trafficHazard(group, main, r, count) {
  const cars = [];
  for (let e = 0; e < count; e++) {
    const dir = e % 2 ? -1 : 1, g = new THREE.Group();
    const c = [0xffbe0b, 0x3a86ff, 0xe63946, 0x06d6a0, 0xffffff][e % 5];
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 6), M(c)); body.position.y = 1.6; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1.8), M(0x223344, 0x0a1520)); cab.position.set(0, 3.2, 1.8); g.add(cab);
    for (const sd of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.1), M(0xffffaa, 0xffff66)); l.position.set(sd * 0.8, 1.2, 3.01); g.add(l); }
    for (const [x, z] of [[-1.3, -2], [1.3, -2], [-1.3, 2], [1.3, 2]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10), M(0x111111)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.55, z); g.add(w); }
    group.add(g);
    cars.push({ g, dir, s0: r() * main.L, v: 13 + r() * 5, lane: dir * -main.W * 0.5 });
  }
  const at = (c, t) => roadPoint(main, c.s0 + c.dir * c.v * (t + 20), c.lane);
  return {
    kind: 'traffic', cx: 0, cz: 0, rad: Infinity,
    update(t) { cars.forEach(c => { const p = at(c, t); c.g.position.set(p.x, p.y, p.z); c.g.rotation.y = Math.atan2(p.tx * c.dir, p.tz * c.dir); }); },
    hit(x, y, z, t) { for (const c of cars) { const p = c.g.position; if ((x - p.x) ** 2 + (z - p.z) ** 2 < 10 && Math.abs(y - p.y) < 3) return 'tumble'; } return null; },
  };
}

// ---------------------------------------------------------------------------
// CONSTRUCCIÓN DEL CIRCUITO
// ---------------------------------------------------------------------------
export function buildTrack(def, mirror = false) {
  const theme = THEMES[def.theme];
  const pts = trackPoints(def, mirror);
  let minY = Infinity; pts.forEach(p => minY = Math.min(minY, p.y)); pts.forEach(p => p.y -= minY);
  const r = rng(def.seed * 31 + 7);
  const W = def.w / 2;
  const main = makeRoad(0, pts, true, W);
  const roads = [main];
  const S = main.S, n = main.n, L = main.L;
  const group = new THREE.Group();
  group.add(makeSky(theme));

  // ---- rejilla espacial ----
  const CELL = 12, grid = new Map();
  const ck = (cx, cz) => (cx + 2000) * 5000 + (cz + 2000);
  const gridAdd = (road) => road.S.forEach((s, i) => { const k = ck(Math.floor(s.x / CELL), Math.floor(s.z / CELL)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(road.id * 100000 + i); });
  const near = (x, z, rad) => {
    const out = [], cr = Math.ceil(rad / CELL), cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let a = -cr; a <= cr; a++) for (let b = -cr; b <= cr; b++) { const l = grid.get(ck(cx + a, cz + b)); if (l) for (const e of l) out.push(e); }
    return out;
  };
  gridAdd(main);
  const distToRoads = (x, z, y, skip) => { // distancia mínima a centros de cualquier camino
    let best = Infinity;
    for (const e of near(x, z, 40)) { const ri = (e / 100000) | 0, i = e % 100000; if (skip && skip(ri, i)) continue; const s = roads[ri].S[i]; if (y !== undefined && Math.abs(s.gy - y) > 6) continue; const d = Math.hypot(s.x - x, s.z - z) - roads[ri].W; if (d < best) best = d; }
    return best;
  };

  // ---- reserva de tramos ----
  const used = new Uint8Array(n);
  const isFree = (a, b, allow = 0) => { for (let i = a; i <= b; i++) { const v = used[((i % n) + n) % n]; if (v && v !== allow && !(Array.isArray(allow) && allow.includes(v))) return false; } return true; };
  const reserve = (a, b, v = 1) => { for (let i = a; i <= b; i++) used[((i % n) + n) % n] = v; };
  const startZone = Math.ceil(70 / STEP);
  reserve(-startZone, startZone);
  const curv = S.map((_, i) => curvatureAt(S, n, i, 8));
  const straightAt = (a, b, lim = 0.25) => { for (let i = a; i <= b; i += 2) if (Math.abs(curv[((i % n) + n) % n]) > lim) return false; return true; };
  // cajas de items (4 filas fijas) — se reservan primero
  const boxRows = [];
  for (const f of [0.14, 0.38, 0.62, 0.86]) {
    let i = Math.floor(f * n);
    for (let t = 0; t < 40 && !isFree(i - 8, i + 8); t++) i += 3;
    reserve(i - 8, i + 8, 7); boxRows.push(i);
  }

  const forks = [], dbgFork = [];
  // ---- atajos de terracería ----
  const wantShort = def.short ?? (def.cx >= 0.4 ? 1 : 0);
  if (wantShort) {
    const Ws = 4.5, cands = [];
    for (let ia = startZone + 10; ia < n - startZone - 20; ia += 6) for (let ib = ia + 40; ib < Math.min(n - startZone - 10, ia + n / 2); ib += 4) {
      const A = S[ia], B = S[ib], E = Math.hypot(B.x - A.x, B.z - A.z), arc = (ib - ia) * STEP;
      if (E < 2 * (W + SH) + 12 || E > 120 || arc < 2.6 * E || arc > 7 * E) continue;
      if (Math.abs(A.y - B.y) / E > 0.12) continue;
      if (!isFree(ia - 4, ia + 4) || !isFree(ib - 4, ib + 4)) continue;
      // la línea recta no debe tocar otras partes
      let ok = true; const dx = (B.x - A.x) / E, dz = (B.z - A.z) / E, clear = W + SH + Ws + SH + 2;
      for (let d = 0; d <= E && ok; d += 3) {
        const x = A.x + dx * d, z = A.z + dz * d;
        for (const e of near(x, z, 30)) {
          const ri = (e / 100000) | 0, j = e % 100000, q = roads[ri].S[j];
          const dist = Math.hypot(q.x - x, q.z - z);
          if (ri === 0 && ((Math.abs(j - ia) < 25 && d < clear + 4) || (Math.abs(j - ib) < 25 && d > E - clear - 4))) continue;
          if (dist < roads[ri].W + SH + Ws + SH + 1) { ok = false; break; }
        }
      }
      if (ok) cands.push([ia, ib, arc / E]);
    }
    if (cands.length) {
      cands.sort((a, b) => b[2] - a[2]);
      const [ia, ib] = cands[Math.floor(r() * Math.min(4, cands.length))];
      const A = S[ia], B = S[ib], cp = [];
      for (let k = 0; k <= 4; k++) { const t = k / 4, w = Math.sin(t * Math.PI) * 4 * (r() - 0.5); cp.push(new THREE.Vector3(A.x + (B.x - A.x) * t + (-(B.z - A.z)) / 100 * w, A.y + (B.y - A.y) * t, A.z + (B.z - A.z) * t + (B.x - A.x) / 100 * w)); }
      const road = makeRoad(roads.length, cp, false, Ws, { s0: A.s, s1: B.s, kind: 'short', dirt: true });
      roads.push(road); gridAdd(road); reserve(ia - 5, ia + 5, 2); reserve(ib - 5, ib + 5, 2);
      forks.push({ id: forks.length, road, ri: road.id, s0: A.s, s1: B.s, kind: 'short' });
    }
  }

  // ---- caminos alternos (bifurcaciones) ----
  const altCount = def.alt ?? (def.cx >= 0.7 ? 2 : def.cx >= 0.4 ? 1 : 0);
  const cxm = S.reduce((a, s) => a + s.x, 0) / n, czm = S.reduce((a, s) => a + s.z, 0) / n;
  for (let k = 0, tries = 0; k < altCount && tries < 40; tries++) {
    const len = Math.floor((150 + r() * 110) / STEP);
    const ia = Math.floor(r() * n), ib = ia + len;
    if (ia < startZone + 10 || ib > n - startZone - 10 || !isFree(ia - 6, ib + 6, 7)) continue;
    const mid = S[Math.floor((ia + ib) / 2)];
    const out = Math.sign((mid.x - cxm) * mid.rx + (mid.z - czm) * mid.rz) || 1;
    const D = 2 * (W + SH) + 9;
    let ok = false, road = null;
    for (const side of [out, -out]) {
      const cp = [new THREE.Vector3(S[ia].x, S[ia].y, S[ia].z), new THREE.Vector3(S[ia].x + S[ia].tx * 10, S[ia].y, S[ia].z + S[ia].tz * 10)];
      const step = Math.max(8, Math.floor(18 / STEP));
      for (let j = ia + Math.floor(len * 0.12); j <= ib - Math.floor(len * 0.12); j += step) {
        const u = (j - ia) / len, f = Math.min(1, u / 0.3, (1 - u) / 0.3), ff = f * f * (3 - 2 * f);
        const s = S[j], wob = 1 + 0.3 * Math.abs(Math.sin(u * Math.PI * 2 + k));
        cp.push(new THREE.Vector3(s.x + s.rx * side * D * ff * wob, s.y + (def.hills > 3 ? Math.sin(u * Math.PI) * 4 : 0), s.z + s.rz * side * D * ff * wob));
      }
      cp.push(new THREE.Vector3(S[ib].x - S[ib].tx * 10, S[ib].y, S[ib].z - S[ib].tz * 10), new THREE.Vector3(S[ib].x, S[ib].y, S[ib].z));
      road = makeRoad(roads.length, cp, false, W * 0.85, { s0: S[ia].s, s1: S[ib].s, kind: 'alt' });
      // validar separación del tramo central
      ok = true;
      for (let i = Math.floor(road.n * 0.35); i < road.n * 0.65 && ok; i += 3) {
        const s = road.S[i];
        if (distToRoads(s.x, s.z, s.gy) < road.W + 2 * SH + 3) { ok = false; dbgFork.push('a'); }
      }
      // y que no se acerque a otras partes de la pista lejos de sus extremos
      for (let i = 4; i < road.n - 4 && ok; i += 3) {
        const s = road.S[i];
        for (const e of near(s.x, s.z, 30)) { const ri = (e / 100000) | 0, j = e % 100000; if (ri !== 0) continue; if (j >= ia - 15 && j <= ib + 15) continue; if (Math.hypot(S[j].x - s.x, S[j].z - s.z) < W + road.W + 2 * SH + 4) { ok = false; dbgFork.push('b'); break; } }
      }
      if (ok) break;
    }
    if (!ok) continue;
    roads.push(road); gridAdd(road); for (let i = ia - 8; i <= ib + 8; i++) if (used[((i % n) + n) % n] !== 7) used[((i % n) + n) % n] = 2;
    forks.push({ id: forks.length, road, ri: road.id, s0: S[ia].s, s1: S[ib].s, kind: 'alt' });
    k++;
  }

  // ---- rampas y huecos ----
  const pads = [];
  const ramps = [];
  const rampCount = def.ramps ?? (1 + Math.floor(def.cx * 3.5));
  for (let k = 0, tries = 0; k < rampCount && tries < 200; tries++) {
    const i0 = Math.floor(r() * n);
    const span = RAMP_LEN + GAP_LEN + 26;
    if (!isFree(i0 - 14, i0 + span, [2]) || !straightAt(i0 - 10, i0 + span, 0.3)) continue;
    const land = S[(i0 + RAMP_LEN + GAP_LEN + 2) % n], take = S[i0];
    const gap = r() < (VOID(theme) ? 0.75 : 0.5) && land.y <= take.y + 0.8;
    for (let j = 0; j < RAMP_LEN; j++) S[(i0 + j) % n].ramp = RAMP_H * (j + 1) / RAMP_LEN;
    if (gap) for (let j = RAMP_LEN; j < RAMP_LEN + GAP_LEN; j++) S[(i0 + j) % n].gap = true;
    // turbo antes de la rampa
    pads.push({ r: 0, sl: S[(i0 - 7 + n) % n].s, off: 0, big: true });
    for (let j = i0 - 14; j <= i0 + span; j++) used[((j % n) + n) % n] = 8;
    ramps.push({ i0, gap });
    k++;
  }
  // altura final de cada muestra (con rampas)
  for (const rd of roads) rd.S.forEach(s => { s.gy = s.y + s.ramp; });
  for (const rd of roads) rd.S.forEach((s, i) => { const nx = rd.S[rd.closed ? (i + 1) % rd.n : Math.min(rd.n - 1, i + 1)]; s.slope = s.seg > 0 ? (nx.gy - s.gy) / s.seg : 0; if (s.ramp > 0 && nx.ramp === 0) s.slope = RAMP_H / (RAMP_LEN * STEP); });

  // ---- bordes sin barandal (temas de vacío) ----
  if (VOID(theme)) {
    for (let k = 0, tries = 0; k < 2 + Math.floor(def.cx * 3) && tries < 80; tries++) {
      const i0 = Math.floor(r() * n), len = 20 + Math.floor(r() * 40);
      if (!isFree(i0 - 4, i0 + len + 4, [2]) || !straightAt(i0 - 6, i0 + len + 6, 0.28)) continue;
      const both = r() < 0.4, side = r() < 0.5 ? 'openL' : 'openR';
      for (let j = 0; j <= len; j++) { const s = S[(i0 + j) % n]; if (both) s.openL = s.openR = true; else s[side] = true; }
      reserve(i0 - 4, i0 + len + 4, 3);
      k++;
    }
  }

  // ---- túnel ----
  const tunnels = [];
  if ((def.tunnel ?? (r() < 0.45 + def.cx * 0.3)) && !VOID(theme)) {
    for (let tries = 0; tries < 60; tries++) {
      const i0 = Math.floor(r() * n), len = 25 + Math.floor(r() * 25);
      if (!isFree(i0 - 3, i0 + len + 3, [2])) continue;
      let ok = true; for (let j = 0; j <= len; j++) { const s = S[(i0 + j) % n]; if (s.ramp || s.gap) ok = false; }
      if (!ok) continue;
      for (let j = 0; j <= len; j++) S[(i0 + j) % n].tunnel = true;
      tunnels.push({ i0, len }); reserve(i0 - 3, i0 + len + 3, 4); break;
    }
  }

  // ---- trampas ----
  const hzKinds = HZ_THEME[def.theme] || ['boulder'];
  const plan = [];
  const hzCount = def.hazards ?? (2 + Math.round(def.cx * 3));
  let trafficN = 0;
  for (let k = 0, tries = 0; k < hzCount && tries < 300; tries++) {
    const kind = hzKinds[k % hzKinds.length];
    if (kind === 'traffic') { trafficN += 4 + Math.round(def.cx * 3); k++; continue; }
    const i = Math.floor(r() * n);
    const need = kind === 'crusher' || kind === 'firebar' ? 12 : 9;
    if (!isFree(i - need, i + need, [2])) continue;
    if (['crusher', 'firebar', 'log'].includes(kind) && !straightAt(i - 6, i + 6, 0.35)) continue;
    plan.push({ i, kind }); reserve(i - need, i + need, 5); k++;
  }
  const hazards = buildHazards(group, main, roads, r, plan, theme);
  if (trafficN) hazards.push(trafficHazard(group, main, r, trafficN));

  // ---- turbo pads extra ----
  const padCount = 2 + Math.floor(def.cx * 2);
  for (let k = 0, tries = 0; k < padCount && tries < 100; tries++) {
    const i = Math.floor(r() * n); if (!isFree(i - 4, i + 4)) continue;
    pads.push({ r: 0, sl: S[i].s, off: (r() - 0.5) * W * 1.1 }); reserve(i - 4, i + 4, 6); k++;
  }
  // en los atajos y caminos alternos
  for (const f of forks) {
    if (f.kind === 'short') pads.push({ r: f.ri, sl: Math.min(10, f.road.L * 0.15), off: 0 });
    else pads.push({ r: f.ri, sl: f.road.L * 0.5, off: (r() - 0.5) * f.road.W });
  }

  // ---- muros/bordes en uniones: se quitan donde otro camino entra ----
  const insideOther = (x, z, y, ri0, margin, surfOnly) => {
    for (const e of near(x, z, 30)) {
      const ri = (e / 100000) | 0; if (ri === ri0) continue;
      const q = roads[ri].S[e % 100000]; if (Math.abs(q.gy - y) > 3) continue;
      const lim = surfOnly ? roads[ri].W : roads[ri].W + SH;
      if (Math.hypot(q.x - x, q.z - z) < lim - margin) return true;
    }
    return false;
  };
  for (const rd of roads) rd.S.forEach(s => {
    for (const [side, wk, ck2, sk, ok2] of [[1, 'wallR', 'curbR', 'shR', 'openR'], [-1, 'wallL', 'curbL', 'shL', 'openL']]) {
      const wo = side * (rd.W + SH), co = side * (rd.W + 0.6), so = side * (rd.W + SH * 0.5);
      if (s[ok2]) s[wk] = false;
      if (insideOther(s.x + s.rx * wo, s.z + s.rz * wo, s.gy, rd.id, 0.6, false)) s[wk] = false;
      if (insideOther(s.x + s.rx * co, s.z + s.rz * co, s.gy, rd.id, 0.2, true)) s[ck2] = false;
      if (insideOther(s.x + s.rx * so, s.z + s.rz * so, s.gy, rd.id, -1, true)) s[sk] = false;
    }
  });
  // extremos de caminos abiertos: sin muro en las primeras/últimas muestras que tocan el principal
  for (const rd of roads) if (!rd.closed) { for (const i of [0, 1, rd.n - 2, rd.n - 1]) { rd.S[i].wallL = rd.S[i].wallR = false; } }

  // ---- suelo ----
  let maxR = 0; for (const rd of roads) rd.S.forEach(s => maxR = Math.max(maxR, Math.hypot(s.x, s.z)));
  if (theme.ground !== null) {
    const gsize = maxR * 2 + 400;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(theme.water || theme.lava ? maxR + 60 : gsize, 48), M(theme.ground));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.08; group.add(ground);
    if (theme.water) { const w = new THREE.Mesh(new THREE.CircleGeometry(gsize * 1.5, 32), new THREE.MeshLambertMaterial({ color: theme.water, emissive: 0x05304a })); w.rotation.x = -Math.PI / 2; w.position.y = -0.6; group.add(w); }
    if (theme.lava) { const l = new THREE.Mesh(new THREE.CircleGeometry(gsize * 1.5, 32), new THREE.MeshBasicMaterial({ color: 0xff4d00 })); l.rotation.x = -Math.PI / 2; l.position.y = -0.7; group.add(l); }
  } else if (theme.clouds) {
    const cl = new THREE.Mesh(new THREE.CircleGeometry(2000, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
    cl.rotation.x = -Math.PI / 2; cl.position.y = -40; group.add(cl);
  }

  // ---- mallas de los caminos ----
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture(theme), emissive: theme.glowRoad ? 0x1a0a40 : 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const dirtMat = new THREE.MeshLambertMaterial({ map: dirtTex(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const vcMat = (e = 0, extra = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, emissive: e, side: THREE.DoubleSide, ...extra });
  const curbMat = vcMat(theme.glowRoad ? 0x333333 : 0, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const shMat = vcMat(0, { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
  const wallMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: theme.glowRoad ? 0x0a4a40 : (theme.night ? 0x150a25 : 0) });
  const underMat = new THREE.MeshLambertMaterial({ color: 0x666666, side: THREE.BackSide });
  for (const rd of roads) {
    const gapSkip = i => rd.S[i].gap;
    group.add(new THREE.Mesh(strip(rd, -rd.W, rd.W, 0, 0, { uvLen: rd.W * 4, skip: gapSkip }), rd.dirt ? dirtMat : roadMat));
    if (!rd.dirt) {
      group.add(new THREE.Mesh(strip(rd, rd.W, rd.W + CURB, 0.05, 0.05, { colA: theme.curbA, colB: theme.curbB, checker: true, skip: i => gapSkip(i) || !rd.S[i].curbR }), curbMat));
      group.add(new THREE.Mesh(strip(rd, -rd.W - CURB, -rd.W, 0.05, 0.05, { colA: theme.curbA, colB: theme.curbB, checker: true, skip: i => gapSkip(i) || !rd.S[i].curbL }), curbMat));
    }
    const shC = rd.dirt ? 0x6b4a2a : theme.shoulder;
    group.add(new THREE.Mesh(strip(rd, rd.W + (rd.dirt ? 0 : CURB), rd.W + SH, 0.02, 0.02, { colA: shC, skip: i => gapSkip(i) || !rd.S[i].shR }), shMat));
    group.add(new THREE.Mesh(strip(rd, -rd.W - SH, -rd.W - (rd.dirt ? 0 : CURB), 0.02, 0.02, { colA: shC, skip: i => gapSkip(i) || !rd.S[i].shL }), shMat));
    group.add(new THREE.Mesh(wallGeo(rd, 1, theme.wall), wallMat));
    group.add(new THREE.Mesh(wallGeo(rd, -1, theme.wall), wallMat));
    group.add(new THREE.Mesh(strip(rd, -rd.W - SH, rd.W + SH, -1.2, -1.2, { skip: gapSkip }), underMat));
  }
  // rampas: superficie llamativa + cara frontal
  const rampMat = new THREE.MeshLambertMaterial({ map: rampTex(), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  for (const rp of ramps) {
    const sub = { S: [], n: 0, closed: false, W };
    for (let j = -1; j <= RAMP_LEN; j++) sub.S.push(S[(rp.i0 + j + n) % n]);
    sub.S = sub.S.map((s, j) => j === sub.S.length - 1 ? { ...s, gy: s.y + RAMP_H } : s); sub.n = sub.S.length;
    group.add(new THREE.Mesh(strip(sub, -W, W, 0.04, 0.04, { uvLen: 6 }), rampMat));
    const lip = S[(rp.i0 + RAMP_LEN - 1) % n];
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, RAMP_H + 1.2), M(0x333333));
    face.position.set(lip.x + lip.tx * 1.6, lip.y + (RAMP_H - 1.2) / 2, lip.z + lip.tz * 1.6); face.rotation.y = Math.atan2(lip.tx, lip.tz); group.add(face);
    if (rp.gap && !VOID(theme)) { // grieta / río / lava bajo el hueco
      const a0 = S[(rp.i0 + RAMP_LEN - 1) % n], a1 = S[(rp.i0 + RAMP_LEN + GAP_LEN) % n];
      const cx = (a0.x + a1.x) / 2, cz = (a0.z + a1.z) / 2, len = Math.hypot(a1.x - a0.x, a1.z - a0.z) + 2;
      const col = theme.lava ? 0xff4d00 : theme.water ? 0x1fa3d9 : theme.night ? 0x05030f : 0x120c08;
      const pit = new THREE.Mesh(new THREE.PlaneGeometry((W + SH) * 2 + 6, len), new THREE.MeshBasicMaterial({ color: col, polygonOffset: true, polygonOffsetFactor: -2 }));
      pit.rotation.x = -Math.PI / 2; pit.rotation.z = -Math.atan2(a0.tx, a0.tz) + Math.PI; pit.position.set(cx, Math.min(a0.y, a1.y) + 0.03, cz); group.add(pit);
      rp.pitY = Math.min(a0.y, a1.y);
    }
    if (rp.gap) { // postes con banderas de advertencia a los lados del hueco
      for (const sd of [-1, 1]) for (const j of [RAMP_LEN, RAMP_LEN + GAP_LEN]) {
        const s = S[(rp.i0 + j) % n]; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5), M(0xffffff)); p.position.set(s.x + s.rx * sd * (W + 1), s.y + 2.5, s.z + s.rz * sd * (W + 1)); group.add(p);
        const fl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 1.6), M(0xff006e, 0x550022)); fl.position.set(p.position.x, s.y + 4.5, p.position.z + 0.8); group.add(fl);
      }
    }
  }
  // pilares bajo tramos elevados
  const pil = [];
  for (const rd of roads) for (let i = 0; i < rd.n; i += 10) {
    const s = rd.S[i]; if (s.y < 2.5 || s.gap) continue;
    let blocked = false;
    for (const e of near(s.x, s.z, W + SH + 6)) { const ri = (e / 100000) | 0, j = e % 100000, q = roads[ri].S[j]; if ((ri !== rd.id || Math.min(Math.abs(j - i), rd.n - Math.abs(j - i)) > 20) && q.y < s.y - 2) { blocked = true; break; } }
    if (!blocked) pil.push(s);
  }
  if (pil.length) {
    const pg = new THREE.CylinderGeometry(1.4, 1.8, 1, 8); pg.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(pg, M(theme.wall), pil.length), mm = new THREE.Matrix4();
    pil.forEach((s, k) => { mm.makeScale(1, s.y + (VOID(theme) ? 60 : 0.5), 1); mm.setPosition(s.x, VOID(theme) ? -60 : -0.5, s.z); im.setMatrixAt(k, mm); });
    group.add(im);
  }
  // túneles
  for (const tn of tunnels) {
    const tc = { castillo: 0x4a4458, fabrica: 0x5c6670, ciudad: 0x2a1f4a, nieve: 0x9fd3ff, bosque: 0x2d5a27, selva: 0x2d6a4f, volcan: 0x3b2020, canon: 0x8c3b2a, desierto: 0xb5651d }[def.theme] || theme.wall;
    const frames = [], H = 7.5;
    for (let j = 0; j <= tn.len; j += 3) frames.push(S[(tn.i0 + j) % n]);
    const post = new THREE.BoxGeometry(1.2, H, 1.2), beam = new THREE.BoxGeometry(1, 1, 1);
    const ip = new THREE.InstancedMesh(post, M(tc), frames.length * 2), ib = new THREE.InstancedMesh(beam, M(tc), frames.length), il = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }), frames.length);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    frames.forEach((s, k) => {
      q.setFromAxisAngle(up, Math.atan2(s.tx, s.tz));
      for (const [sd, idx] of [[-1, k * 2], [1, k * 2 + 1]]) { mm.compose(new THREE.Vector3(s.x + s.rx * sd * (W + SH + 0.6), s.gy + H / 2, s.z + s.rz * sd * (W + SH + 0.6)), q, new THREE.Vector3(1, 1, 1)); ip.setMatrixAt(idx, mm); }
      mm.compose(new THREE.Vector3(s.x, s.gy + H, s.z), q, new THREE.Vector3((W + SH) * 2 + 2.4, 1.2, 1.2)); ib.setMatrixAt(k, mm);
      mm.compose(new THREE.Vector3(s.x, s.gy + H - 0.7, s.z), q, new THREE.Vector3(W, 1, 1)); il.setMatrixAt(k, mm);
    });
    group.add(ip, ib, il);
    const sub = { S: S.slice(tn.i0, tn.i0 + tn.len + 1).length === tn.len + 1 ? S.slice(tn.i0, tn.i0 + tn.len + 1) : Array.from({ length: tn.len + 1 }, (_, j) => S[(tn.i0 + j) % n]), closed: false, W };
    sub.n = sub.S.length;
    group.add(new THREE.Mesh(strip(sub, -W - SH - 1, W + SH + 1, H + 0.6, H + 0.6, { colA: tc }), vcMat()));
  }
  // señales de curva
  const chevs = [];
  for (let i = 0; i < n; i += 7) {
    const c = curv[i]; if (Math.abs(c) < 0.55 || S[i].tunnel || S[i].gap) continue;
    const side = c > 0 ? -1 : 1; // lado exterior
    if (!(side > 0 ? S[i].wallR : S[i].wallL)) continue;
    chevs.push({ s: S[(i + 4) % n], side, left: c > 0 });
  }
  if (chevs.length) {
    const mat = new THREE.MeshLambertMaterial({ map: chevronTex(), side: THREE.DoubleSide, emissive: theme.night ? 0x332200 : 0 });
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(4, 2), mat, chevs.length), mm = new THREE.Matrix4(), q = new THREE.Quaternion();
    chevs.forEach((cv, k) => {
      const s = cv.s, o = cv.side * (W + SH + 0.3);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(s.tx, s.tz) + Math.PI);
      mm.compose(new THREE.Vector3(s.x + s.rx * o, s.gy + 2.6, s.z + s.rz * o), q, new THREE.Vector3(cv.left ? -1 : 1, 1, 1));
      im.setMatrixAt(k, mm);
    });
    group.add(im);
  }

  // línea de meta
  const checker = checkerTexture(), s0 = S[0];
  const fin = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 2.4), new THREE.MeshLambertMaterial({ map: checker, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
  fin.rotation.x = -Math.PI / 2; fin.rotation.z = Math.atan2(s0.tx, s0.tz); fin.position.set(s0.x, s0.gy + 0.08, s0.z); group.add(fin);
  for (const sd of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(1, 9, 1), M(theme.curbA)); post.position.set(s0.x + s0.rx * (W + 2) * sd, s0.gy + 4.5, s0.z + s0.rz * (W + 2) * sd); group.add(post); }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 5, 2, 0.6), new THREE.MeshLambertMaterial({ map: checker })); banner.position.set(s0.x, s0.gy + 8.5, s0.z); banner.rotation.y = Math.atan2(s0.tx, s0.tz); group.add(banner);

  // turbo pads (mallas)
  const padTex = padTexture();
  for (const p of pads) {
    const rd = roads[p.r], pt = roadPoint(rd, p.sl, p.off);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.big ? rd.W * 1.4 : 4, 6), new THREE.MeshBasicMaterial({ map: padTex, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
    m.rotation.set(-Math.PI / 2, 0, 0); m.rotateZ(Math.atan2(pt.tx, pt.tz) + Math.PI);
    m.position.set(pt.x, pt.y + 0.1, pt.z); group.add(m);
    p.w = p.big ? rd.W * 0.7 : 2.2;
  }

  // cajas y monedas
  const boxes = [];
  for (const i of boxRows) {
    const s = S[i], cnt = W > 8.5 ? 5 : 4;
    for (let k = 0; k < cnt; k++) { const off = (k / (cnt - 1) - 0.5) * W * 1.5; boxes.push(new THREE.Vector3(s.x + s.rx * off, s.gy + 1.3, s.z + s.rz * off)); }
  }
  for (const f of forks) if (f.kind === 'alt') { const m = Math.floor(f.road.n * 0.6), s = f.road.S[m]; for (const off of [-0.5, 0, 0.5]) boxes.push(new THREE.Vector3(s.x + s.rx * off * f.road.W * 1.4, s.gy + 1.3, s.z + s.rz * off * f.road.W * 1.4)); }
  const coins = [];
  for (const f of [0.26, 0.5, 0.74]) { let i0 = Math.floor(f * n); const off = (r() - 0.5) * W; for (let k = 0; k < 5; k++) { const s = S[(i0 + k * 3) % n]; if (!s.gap) coins.push(new THREE.Vector3(s.x + s.rx * off, s.gy + 1, s.z + s.rz * off)); } }
  for (const f of forks) for (let k = 1; k <= (f.kind === 'short' ? 6 : 4); k++) { const s = f.road.S[Math.floor(f.road.n * (0.2 + 0.6 * k / 7))]; coins.push(new THREE.Vector3(s.x, s.gy + 1, s.z)); }
  // monedas sobre los huecos (premio por saltar)
  for (const rp of ramps) if (rp.gap) for (let j = 1; j < GAP_LEN; j += 3) { const s = S[(rp.i0 + RAMP_LEN + j) % n]; coins.push(new THREE.Vector3(s.x, s.y + 4.5, s.z)); }

  // decoración
  const placements = {}; theme.deco.forEach(t => placements[t] = []);
  for (let i = 0; i < n; i += 4) for (const side of [-1, 1]) {
    if (r() < 0.45) continue;
    const s = S[i];
    const dist = W + SH + 4 + r() * (theme.deco.includes('mesa') ? 50 : 26);
    const x = s.x + s.rx * dist * side, z = s.z + s.rz * dist * side;
    let ok = true;
    for (const e of near(x, z, 30)) { const ri = (e / 100000) | 0, q = roads[ri].S[e % 100000]; if (Math.hypot(q.x - x, q.z - z) < roads[ri].W + SH + 3.5) { ok = false; break; } }
    if (!ok) continue;
    const type = theme.deco[Math.floor(r() * theme.deco.length)];
    if (type === 'mesa' && dist < W + SH + 14) continue;
    placements[type].push({ x, y: type === 'planet' ? s.y + r() * 10 : (VOID(theme) ? s.y - 2 : 0), z, rot: r() * 6.28, scale: 0.8 + r() * 0.6, sy: type === 'building' ? 8 + r() * 30 : 1, ci: Math.floor(r() * 10) });
  }
  buildDecos(group, placements);

  // -------------------------------------------------------------------------
  // CONSULTAS FÍSICAS
  // -------------------------------------------------------------------------
  const proj = (rd, a, x, z) => { const A = rd.S[a], B = rd.S[rd.closed ? (a + 1) % rd.n : Math.min(rd.n - 1, a + 1)]; const dx = B.x - A.x, dz = B.z - A.z, l2 = dx * dx + dz * dz; return l2 > 0 ? Math.max(0, Math.min(1, ((x - A.x) * dx + (z - A.z) * dz) / l2)) : 0; };
  function evalRoad(rd, i, x, y, z) {
    let a = i, t = proj(rd, a, x, z);
    if (t <= 0 && (rd.closed || a > 0)) { a = (a - 1 + rd.n) % rd.n; t = proj(rd, a, x, z); }
    if (!rd.closed && a >= rd.n - 1) { a = rd.n - 2; t = proj(rd, a, x, z); }
    const A = rd.S[a], B = rd.S[rd.closed ? (a + 1) % rd.n : a + 1];
    const px = A.x + (B.x - A.x) * t, pz = A.z + (B.z - A.z) * t, h = (A.ramp > 0 && B.ramp === 0) ? A.gy : A.gy + (B.gy - A.gy) * t;
    const rx = A.rx + (B.rx - A.rx) * t, rz = A.rz + (B.rz - A.rz) * t;
    // en caminos abiertos: cuánto se pasa del inicio o del final
    let over = 0, otx = 0, otz = 0;
    if (!rd.closed) {
      if (a === 0 && t <= 0) { const al = (x - px) * A.tx + (z - pz) * A.tz; if (al < 0) { over = -al; otx = -A.tx; otz = -A.tz; } }
      else if (a === rd.n - 2 && t >= 1) { const al = (x - px) * B.tx + (z - pz) * B.tz; if (al > 0) { over = al; otx = B.tx; otz = B.tz; } }
    }
    return { rd, idx: a, t, d: (x - px) * rx + (z - pz) * rz, h, rx, rz, A, B, sl: A.s + A.seg * t, over, otx, otz };
  }
  function bestWindow(rd, i0, x, y, z, win) {
    let best = i0, bd = Infinity;
    for (let k = -win; k <= win; k++) {
      let i = i0 + k; if (rd.closed) i = (i + rd.n) % rd.n; else if (i < 0 || i >= rd.n) continue;
      const s = rd.S[i], d = (s.x - x) ** 2 + (s.z - z) ** 2 + ((s.gy - y) ** 2) * 4;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  const cand = new Map(), candD = new Map();
  function query(x, y, z, hint) {
    cand.clear(); candD.clear();
    const hr = hint && hint.i >= 0 && roads[hint.r] ? hint.r : -1;
    if (hr >= 0) cand.set(hr, bestWindow(roads[hr], hint.i, x, y, z, 24));
    for (const e of near(x, z, 14)) {
      const ri = (e / 100000) | 0; if (ri === hr) continue;
      const i = e % 100000, s = roads[ri].S[i], d = (s.x - x) ** 2 + (s.z - z) ** 2 + ((s.gy - y) ** 2) * 4;
      if (!candD.has(ri) || d < candD.get(ri)) { candD.set(ri, d); cand.set(ri, i); }
    }
    if (!cand.size) { // lejos de todo: buscar en el principal
      let bi = 0, bd = Infinity; for (let i = 0; i < n; i += 2) { const s = S[i], d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < bd) { bd = d; bi = i; } }
      cand.set(0, bi);
    }
    let best = null, bs = Infinity, inside = false;
    for (const [ri, i] of cand) {
      const c = evalRoad(roads[ri], i, x, y, z);
      if (y < c.h - 4 && cand.size > 1) continue;
      const ad = Math.abs(c.d), ex = Math.max(ad - c.rd.W, c.over > 0.3 ? c.over + 1 : -1);
      if (ad <= c.rd.W + SH - 1.1 && c.over <= 0.3) inside = true;
      const score = (ex <= 0 ? -100 : ex * 10) - (ri === hr ? 0.5 : 0);
      if (score < bs) { bs = score; best = c; }
    }
    if (!best) { const [ri, i] = cand.entries().next().value; best = evalRoad(roads[ri], i, x, y, z); }
    const rd = best.rd, A = best.A, ad = Math.abs(best.d), side = Math.sign(best.d) || 1;
    let push = null, fall = false;
    if (A.gap && ad <= rd.W + SH) fall = true;
    if (!inside) {
      const open = side > 0 ? A.openR : A.openL;
      const lim = rd.W + SH - 1.1;
      if (open) { if (ad > rd.W + SH) fall = true; }
      else {
        const lat = Math.max(0, ad - lim);
        push = { x: -best.rx * lat * side - best.otx * best.over, z: -best.rz * lat * side - best.otz * best.over };
      }
    }
    if (hint) { hint.r = rd.id; hint.i = best.idx; }
    const sMain = rd.main ? best.sl : rd.s0 + (rd.s1 - rd.s0) * (best.sl / rd.L);
    return { r: rd.id, idx: best.idx, s: sMain, sl: best.sl, d: best.d, h: best.h, fall, push, off: ad > rd.W + 0.3 || rd.dirt, dirt: rd.dirt, rx: best.rx, rz: best.rz, tx: A.tx, tz: A.tz, slope: A.slope || 0, W: rd.W, wallD: rd.W + SH, ramp: A.ramp > 0, tunnel: A.tunnel };
  }
  const pointAt = (sv, off = 0) => roadPoint(main, sv, off);
  function startGrid(count) {
    const out = [];
    for (let k = 0; k < count; k++) {
      const row = Math.floor(k / 2), side = k % 2 ? 1 : -1;
      const p = pointAt(L - 6 - row * 5.5 - (k % 2) * 2.2, side * W * 0.45);
      out.push({ x: p.x, y: p.y, z: p.z, heading: Math.atan2(p.tx, p.tz) });
    }
    return out;
  }
  function safePoint(r0, i0) { // punto de rescate: un poco atrás, al centro, sin hueco
    const rd = roads[r0] || main; let i = i0;
    for (let k = 0; k < 40; k++) { const s = rd.S[i]; if (!s.gap && !s.ramp && !(s.openL || s.openR) || k > 30) break; i = rd.closed ? (i - 1 + rd.n) % rd.n : Math.max(0, i - 1); }
    const s = rd.S[i];
    return { x: s.x, y: s.gy, z: s.z, heading: Math.atan2(s.tx, s.tz), r: rd.id, i };
  }
  function updateHazards(t) { for (const h of hazards) h.update(t); }
  function hazardHit(x, y, z, t) {
    for (const h of hazards) { if (h.rad !== Infinity && (x - h.cx) ** 2 + (z - h.cz) ** 2 > (h.rad + 4) ** 2) continue; const e = h.hit(x, y, z, t); if (e) return e; }
    return null;
  }
  const featList = [...forks.map(f => ({ t: f.kind, s: f.s0 })), ...ramps.map(rp => ({ t: rp.gap ? 'gap' : 'ramp', s: S[rp.i0].s })), ...tunnels.map(tn => ({ t: 'tunnel', s: S[tn.i0].s })), ...plan.map(p => ({ t: p.kind, s: S[p.i].s }))];
  const features = { alt: forks.filter(f => f.kind === 'alt').length, short: forks.filter(f => f.kind === 'short').length, ramps: ramps.length, gaps: ramps.filter(r2 => r2.gap).length, tunnels: tunnels.length, dbgFork: dbgFork.join(''), hazards: [...new Set([...plan.map(p => p.kind), ...(trafficN ? ['traffic'] : [])])] };

  return { isArena: false, def, theme, group, S, L, W, n, roads, forks, query, pointAt, roadPoint, startGrid, safePoint, boxes, coins, pads, wallD: W + SH, maxR, hazards, updateHazards, hazardHit, features, featList };
}
