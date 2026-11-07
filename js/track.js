// ===== Construcción de pistas y arenas =====
import * as THREE from '../vendor/three.module.min.js';
import { THEMES, rng } from './data.js';

const SHOULDER = 6;      // franja de pasto/arena fuera del asfalto
const CURB = 1.2;
const WALL_H = 1.3;


// plantillas de forma (coordenadas normalizadas, sentido antihorario)
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
};

// ---------------- utilidades de texturas ----------------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

function roadTexture(theme) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = hex(theme.road); g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 700; i++) { // grano del asfalto
      const v = (r() - 0.5) * 30;
      g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 300})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.fillStyle = theme.glowRoad ? '#00f5d4' : 'rgba(255,255,255,0.75)';
    g.fillRect(w / 2 - 3, 0, 6, h * 0.45);         // línea central discontinua
    g.fillStyle = theme.glowRoad ? '#f15bb5' : 'rgba(255,255,255,0.55)';
    g.fillRect(4, 0, 4, h); g.fillRect(w - 8, 0, 4, h); // bordes
  });
}
function boxTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#ffd166'); grd.addColorStop(0.5, '#ef476f'); grd.addColorStop(1, '#118ab2');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#fff'; g.font = 'bold 84px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', w / 2, h / 2 + 6);
  });
}
function padTexture() {
  return canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#ff9f1c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffee88';
    for (let k = 0; k < 3; k++) {
      const y = 10 + k * 40;
      g.beginPath(); g.moveTo(8, y + 30); g.lineTo(w / 2, y); g.lineTo(w - 8, y + 30); g.lineTo(w - 18, y + 30); g.lineTo(w / 2, y + 12); g.lineTo(18, y + 30); g.fill();
    }
  });
}
function checkerTexture() {
  return canvasTex(64, 16, (g, w, h) => {
    for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); }
  });
}

let sharedBoxTex, sharedPadTex, sharedChecker, sharedWin;
function windowTex() {
  if (sharedWin) return sharedWin;
  sharedWin = canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#14152a'; g.fillRect(0, 0, w, h);
    const r = rng(77);
    for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 10) {
      if (r() < 0.55) { g.fillStyle = ['#ffe066', '#ff7ab6', '#7af5e4', '#fff6c8'][Math.floor(r() * 4)]; g.fillRect(x, y, 6, 6); }
    }
  });
  sharedWin.repeat.set(1, 1);
  return sharedWin;
}
export function getBoxTex() { return sharedBoxTex || (sharedBoxTex = boxTexture()); }

// ---------------- cielo ----------------
function makeSky(theme) {
  const geo = new THREE.SphereGeometry(900, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(theme.skyTop) }, bot: { value: new THREE.Color(theme.skyBot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float t = clamp(vP.y*1.4+0.25,0.0,1.0); gl_FragColor = vec4(mix(bot,top,t),1.0);}',
  });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat));
  if (theme.night) {
    const r = rng(99), pts = [];
    for (let i = 0; i < 900; i++) {
      const u = r() * Math.PI * 2, v = r() * 0.9 + 0.05;
      const y = v, rr = Math.sqrt(1 - y * y);
      pts.push(Math.cos(u) * rr * 850, y * 850 - 60, Math.sin(u) * rr * 850);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false })));
  }
  return g;
}

// ---------------- decoraciones instanciadas ----------------
const M = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e || 0x000000, flatShading: true });
const mat4 = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(sx, sy, sz));
  return m;
};
function decoParts(type) {
  const cyl = (a, b, h, s = 7) => new THREE.CylinderGeometry(a, b, h, s);
  const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
  switch (type) {
    case 'tree': return [[cyl(0.4, 0.55, 2.4), M(0x8d5524), mat4(0, 1.2, 0)], [ico(2.2), M(0x3a9d23), mat4(0, 3.8, 0)]];
    case 'bush': return [[ico(1.3), M(0x2d8a2d), mat4(0, 0.8, 0, 1.3, 0.8, 1.1)]];
    case 'flower': return [[cyl(0.08, 0.08, 1), M(0x2d8a2d), mat4(0, 0.5, 0)], [ico(0.45), M(0xffffff), mat4(0, 1.1, 0), [0xff5d8f, 0xffd60a, 0xffffff, 0x9d4edd, 0xff7b00]]];
    case 'palm': return [[cyl(0.3, 0.45, 7), M(0xa0703a), mat4(0, 3.5, 0, 1, 1, 1, 0.12)], [new THREE.ConeGeometry(3.2, 1.6, 7), M(0x2fa84f), mat4(0.4, 7.2, 0)]];
    case 'rock': return [[new THREE.DodecahedronGeometry(1.6), M(0x8d8d8d), mat4(0, 0.8, 0, 1.2, 0.8, 1)]];
    case 'umbrella': return [[cyl(0.08, 0.08, 3), M(0xffffff), mat4(0, 1.5, 0)], [new THREE.ConeGeometry(2, 0.8, 8), M(0xffffff), mat4(0, 3.1, 0), [0xff595e, 0x1982c4, 0xffca3a, 0x8ac926]]];
    case 'cactus': return [[cyl(0.5, 0.6, 4.5), M(0x2e8b57), mat4(0, 2.25, 0)], [cyl(0.3, 0.3, 1.8), M(0x2e8b57), mat4(0.9, 2.8, 0)], [cyl(0.3, 0.3, 1.5), M(0x2e8b57), mat4(-0.9, 2.2, 0)]];
    case 'mesa': return [[cyl(7, 9, 14, 7), M(0xb5523b), mat4(0, 7, 0)], [cyl(7.2, 7, 1.5, 7), M(0xd77a4f), mat4(0, 14, 0)]];
    case 'pinesnow': return [[cyl(0.3, 0.4, 1.6), M(0x6d4c41), mat4(0, 0.8, 0)], [new THREE.ConeGeometry(2, 4.5, 7), M(0x1b5e20), mat4(0, 3.5, 0)], [new THREE.ConeGeometry(1.1, 1.8, 7), M(0xffffff), mat4(0, 5.2, 0)]];
    case 'snowman': return [[ico(1.2, 1), M(0xffffff), mat4(0, 1.1, 0)], [ico(0.8, 1), M(0xffffff), mat4(0, 2.7, 0)], [new THREE.ConeGeometry(0.15, 0.6, 5), M(0xff7b00), mat4(0, 2.75, 0.85, 1, 1, 1, Math.PI / 2)]];
    case 'ice': return [[new THREE.OctahedronGeometry(1.6), M(0xbde0fe, 0x223355), mat4(0, 1.6, 0, 1, 1.6, 1)]];
    case 'pine': return [[cyl(0.3, 0.4, 1.6), M(0x6d4c41), mat4(0, 0.8, 0)], [new THREE.ConeGeometry(2.2, 3.5, 7), M(0x1e6b30), mat4(0, 2.8, 0)], [new THREE.ConeGeometry(1.6, 3, 7), M(0x237a37), mat4(0, 4.6, 0)]];
    case 'mushroom': return [[cyl(0.5, 0.6, 1.8), M(0xfff1e6), mat4(0, 0.9, 0)], [new THREE.SphereGeometry(1.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0xffffff), mat4(0, 1.7, 0), [0xd62828, 0x8338ec, 0xf77f00]]];
    case 'lavarock': return [[new THREE.DodecahedronGeometry(2), M(0x2b1d1d), mat4(0, 1, 0, 1.3, 1, 1)], [ico(0.7), M(0xff5400, 0xff3300), mat4(0.6, 2.2, 0)]];
    case 'crystalred': return [[new THREE.OctahedronGeometry(1.4), M(0xff2e2e, 0x881010), mat4(0, 2, 0, 0.8, 2, 0.8)]];
    case 'building': {
      const tex = windowTex();
      const mat = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.9 });
      return [[new THREE.BoxGeometry(8, 1, 8), mat, mat4(0, 0.5, 0), [0xffffff, 0xc8d0ff, 0xffd6f0, 0xd0fff4]]];
    }
    case 'lamp': return [[cyl(0.12, 0.15, 5), M(0x555555), mat4(0, 2.5, 0)], [ico(0.5), M(0xfff3b0, 0xffe066), mat4(0, 5.2, 0)]];
    case 'tower': return [[cyl(2.5, 2.8, 12, 8), M(0x7d7887), mat4(0, 6, 0)], [new THREE.ConeGeometry(3.2, 5, 8), M(0x5a189a), mat4(0, 14.5, 0)]];
    case 'torch': return [[cyl(0.15, 0.2, 3), M(0x4a3b2a), mat4(0, 1.5, 0)], [ico(0.5), M(0xff9e00, 0xff6d00), mat4(0, 3.2, 0)]];
    case 'planet': return [[ico(5, 2), M(0xffffff, 0x111133), mat4(0, 18, 0), [0xf15bb5, 0x00bbf9, 0xfee440, 0x9b5de5, 0x00f5d4]]];
    case 'crystal': return [[new THREE.OctahedronGeometry(1.5), M(0x00f5d4, 0x008877), mat4(0, 2, 0, 0.7, 2.2, 0.7)]];
    case 'bigleaf': return [[new THREE.ConeGeometry(2.5, 2.2, 6), M(0x1b9e4b), mat4(0, 1.1, 0)], [ico(1), M(0xff5d8f), mat4(0, 2.4, 0)]];
    case 'cloud': return [[ico(3, 1), M(0xffffff), mat4(0, -6, 0)], [ico(2.3, 1), M(0xffffff), mat4(2.8, -6.5, 0.5)], [ico(2.1, 1), M(0xffffff), mat4(-2.6, -6.4, -0.4)]];
    case 'balloon': return [[ico(1.5, 1), M(0xffffff), mat4(0, 6, 0, 1, 1.2, 1), [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93]], [cyl(0.03, 0.03, 4), M(0x333333), mat4(0, 3.5, 0)]];
    case 'gear': return [[cyl(3, 3, 0.8, 10), M(0x8d99ae), mat4(0, 3.2, 0, 1, 1, 1, Math.PI / 2)], [cyl(1, 1, 1, 8), M(0xffc300), mat4(0, 3.2, 0, 1, 1, 1, Math.PI / 2)]];
    case 'crate': return [[new THREE.BoxGeometry(2.4, 2.4, 2.4), M(0xa0522d), mat4(0, 1.2, 0)]];
    case 'pipe': return [[cyl(0.9, 0.9, 8, 10), M(0x6c757d), mat4(0, 1, 0, 1, 1, 1, 0, Math.PI / 2)]];
    case 'lollipop': return [[cyl(0.15, 0.15, 4), M(0xffffff), mat4(0, 2, 0)], [cyl(1.6, 1.6, 0.4, 14), M(0xffffff), mat4(0, 4.6, 0, 1, 1, 1, Math.PI / 2), [0xff5d8f, 0x9b5de5, 0x00bbf9, 0xfee440]]];
    case 'candy': return [[ico(1.3, 1), M(0xffffff), mat4(0, 1.3, 0), [0xff006e, 0xffbe0b, 0x3a86ff, 0x8ac926]]];
    case 'cupcake': return [[cyl(1.4, 1.0, 1.6, 10), M(0xffc8dd), mat4(0, 0.8, 0)], [ico(1.5, 1), M(0xfff0f6), mat4(0, 2, 0, 1, 0.7, 1)], [ico(0.4), M(0xd62828), mat4(0, 3, 0)]];
  }
  return [[ico(1), M(0x888888), mat4(0, 1, 0)]];
}

function buildDecos(group, placements) {
  // placements: {type: [{x,y,z,rot,scale,sy}]}
  const tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (const type in placements) {
    const list = placements[type]; if (!list.length) continue;
    const parts = decoParts(type);
    for (const [geo, mat, off, colors] of parts) {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((p, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
        tmp.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.scale, p.scale * (p.sy || 1), p.scale));
        tmp.multiply(off);
        im.setMatrixAt(i, tmp);
        if (colors) { col.setHex(colors[(p.ci ?? i) % colors.length]); im.setColorAt(i, col); }
      });
      im.instanceMatrix.needsUpdate = true;
      group.add(im);
    }
  }
}

// ---------------- geometría de franjas ----------------
// Crea una franja a lo largo de la pista entre los desplazamientos laterales a y b
function stripGeo(S, a, b, yA, yB, opts = {}) {
  const n = S.length, pos = [], uv = [], col = [], idx = [];
  const c1 = new THREE.Color(opts.colA ?? 0xffffff), c2 = new THREE.Color(opts.colB ?? opts.colA ?? 0xffffff);
  for (let i = 0; i <= n; i++) {
    const s = S[i % n], sv = i === n ? S[n - 1].s + S[n - 1].seg : s.s;
    const ax = s.x + s.rx * a, az = s.z + s.rz * a, bx = s.x + s.rx * b, bz = s.z + s.rz * b;
    if (opts.checker) {
      // vértices duplicados para colores alternos
      const c = (Math.floor(sv / 3) % 2) ? c1 : c2;
      pos.push(ax, s.y + yA, az, bx, s.y + yB, bz);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    } else {
      pos.push(ax, s.y + yA, az, bx, s.y + yB, bz);
      col.push(c1.r, c1.g, c1.b, c1.r, c1.g, c1.b);
    }
    uv.push(0, sv / (opts.uvLen || 10), 1, sv / (opts.uvLen || 10));
  }
  for (let i = 0; i < n; i++) {
    const k = i * 2;
    if (opts.flip) idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); else idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// franja con colores alternos por segmento (bordillos)
function curbGeo(S, a, b, ca, cb) {
  const n = S.length, pos = [], col = [];
  const A = new THREE.Color(ca), B = new THREE.Color(cb);
  for (let i = 0; i < n; i++) {
    const s0 = S[i], s1 = S[(i + 1) % n];
    const c = (Math.floor(s0.s / 2.5) % 2) ? A : B;
    const p = (s, o) => [s.x + s.rx * o, s.y + 0.06, s.z + s.rz * o];
    const v = [p(s0, a), p(s0, b), p(s1, a), p(s1, b)];
    const tri = a < b ? [0, 1, 2, 1, 3, 2] : [0, 2, 1, 1, 2, 3];
    for (const t of tri) { pos.push(...v[t]); col.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// ================= PISTA DE CARRERA =================
export function trackPoints(def, mirror = false) {
  const r = rng(def.seed);
  const pts = [];
  if (def.eight) {
    const N = 22;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const wob = 1 + 0.08 * Math.sin(3 * t + def.seed);
      pts.push(new THREE.Vector3(Math.sin(t) * def.size * 1.35 * wob, 6 + 6 * Math.cos(t) + def.hills * 0.3 * Math.sin(2 * t), Math.sin(2 * t) * def.size * 0.62 * wob));
    }
  } else if (def.shape && SHAPES[def.shape]) {
    // polígono plantilla con esquinas biseladas
    const poly = SHAPES[def.shape].map(([x, z]) => [x + (r() - 0.5) * 0.08, z + (r() - 0.5) * 0.08]);
    const rot = r() * Math.PI * 2, flip = r() < 0.5 ? -1 : 1, ch = 0.2;
    const hp = [r() * 6.28, r() * 6.28];
    const m = poly.length;
    for (let i = 0; i < m; i++) {
      const p = poly[i], a = poly[(i - 1 + m) % m], b = poly[(i + 1) % m];
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const ca = Math.min(ch, la * 0.4), cb = Math.min(ch, lb * 0.4);
      const cand = [[p[0] + (a[0] - p[0]) / la * ca, p[1] + (a[1] - p[1]) / la * ca], [p[0] + (b[0] - p[0]) / lb * cb, p[1] + (b[1] - p[1]) / lb * cb]];
      // puntos intermedios en tramos largos
      for (const [qx, qz] of cand) pts.push([qx, qz]);
      const nb = Math.floor((lb - 2 * cb) / 0.55);
      for (let k = 1; k <= nb; k++) { const t = cb / lb + (1 - 2 * cb / lb) * k / (nb + 1); pts.push([p[0] + (b[0] - p[0]) * t, p[1] + (b[1] - p[1]) * t]); }
    }
    for (let i = 0; i < pts.length; i++) {
      const [x0, z0] = pts[i];
      const x = (x0 * Math.cos(rot) - z0 * Math.sin(rot)) * flip, z = x0 * Math.sin(rot) + z0 * Math.cos(rot);
      const th = Math.atan2(z, x);
      const y = def.hills * (0.5 + 0.3 * Math.sin(th * 2 + hp[0]) + 0.2 * Math.sin(th * 3 + hp[1]));
      pts[i] = new THREE.Vector3(x * def.size, y, z * def.size);
    }
  } else {
    const N = 9 + Math.floor(def.cx * 9);
    const harm = [];
    let budget = 0.18 + def.cx * 0.32;
    for (let k = 2; k <= 5; k++) { const a = r() * budget * 0.6; budget -= a; harm.push([k, a, r() * 6.28]); }
    const sx = 1 + (r() - 0.5) * 0.5, sz = 1 + (r() - 0.5) * 0.3;
    const hp = [r() * 6.28, r() * 6.28];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2 + (r() - 0.5) * 0.15;
      let rad = 1; for (const [k, a, ph] of harm) rad += a * Math.sin(k * th + ph);
      const y = def.hills * (0.5 + 0.3 * Math.sin(th * 2 + hp[0]) + 0.2 * Math.sin(th * 3 + hp[1]));
      pts.push(new THREE.Vector3(Math.cos(th) * def.size * rad * sx, y, Math.sin(th) * def.size * rad * sz));
    }
  }
  if (mirror) pts.forEach(p => p.x = -p.x);
  return { pts, r };
}

export function buildTrack(def, mirror = false) {
  const theme = THEMES[def.theme];
  const { pts, r } = trackPoints(def, mirror);
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const L0 = curve.getLength();
  const n = Math.floor(L0 / 1.6);
  const sp = curve.getSpacedPoints(n); sp.pop();
  let minY = Infinity; sp.forEach(p => minY = Math.min(minY, p.y));
  const S = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const p = sp[i], nx = sp[(i + 1) % n], pv = sp[(i - 1 + n) % n];
    let tx = nx.x - pv.x, tz = nx.z - pv.z; const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl;
    const seg = Math.hypot(nx.x - p.x, nx.y - p.y, nx.z - p.z);
    S.push({ x: p.x, y: p.y - minY, z: p.z, tx, tz, rx: -tz, rz: tx, s: acc, seg, slope: (nx.y - pv.y) / (2 * seg) });
    acc += seg;
  }
  const L = acc;
  const W = def.w / 2;

  // rejilla espacial para búsquedas globales
  const CELL = 14, grid = new Map();
  const key = (x, z) => (Math.floor(x / CELL) + 1000) * 4000 + (Math.floor(z / CELL) + 1000);
  S.forEach((s, i) => { const k = key(s.x, s.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  const near = (x, z, rad) => {
    const out = []; const cr = Math.ceil(rad / CELL);
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let a = -cr; a <= cr; a++) for (let b = -cr; b <= cr; b++) {
      const l = grid.get((cx + a + 1000) * 4000 + (cz + b + 1000)); if (l) out.push(...l);
    }
    return out;
  };

  const group = new THREE.Group();
  group.add(makeSky(theme));

  // ----- suelo -----
  let maxR = 0; S.forEach(s => maxR = Math.max(maxR, Math.hypot(s.x, s.z)));
  if (theme.ground !== null) {
    const gsize = maxR * 2 + 400;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(theme.water ? maxR + 60 : gsize, 48), M(theme.ground));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.08;
    group.add(ground);
    if (theme.water) {
      const water = new THREE.Mesh(new THREE.CircleGeometry(gsize * 1.5, 32), new THREE.MeshLambertMaterial({ color: theme.water, emissive: 0x05304a }));
      water.rotation.x = -Math.PI / 2; water.position.y = -0.6; group.add(water);
    }
    if (theme.lava) {
      const lava = new THREE.Mesh(new THREE.CircleGeometry(gsize * 1.5, 32), new THREE.MeshBasicMaterial({ color: 0xff4d00 }));
      lava.rotation.x = -Math.PI / 2; lava.position.y = -0.7; group.add(lava);
      ground.geometry = new THREE.CircleGeometry(maxR + 50, 40);
    }
  } else if (theme.clouds) {
    const cl = new THREE.Mesh(new THREE.CircleGeometry(2000, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
    cl.rotation.x = -Math.PI / 2; cl.position.y = -40; group.add(cl);
  }

  // ----- asfalto, bordillos, hombros, muros -----
  const roadTex = roadTexture(theme);
  roadTex.repeat.set(1, 1);
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex, emissive: theme.glowRoad ? 0x1a0a40 : 0x000000 });
  const vc = (c, e) => new THREE.MeshLambertMaterial({ vertexColors: true, color: c ?? 0xffffff, emissive: e || 0, side: THREE.DoubleSide });
  const road = new THREE.Mesh(stripGeo(S, -W, W, 0, 0, { uvLen: W * 4 }), roadMat);
  group.add(road);
  group.add(new THREE.Mesh(curbGeo(S, W, W + CURB, theme.curbA, theme.curbB), vc(null, theme.glowRoad ? 0x333333 : 0)));
  group.add(new THREE.Mesh(curbGeo(S, -W - CURB, -W, theme.curbA, theme.curbB), vc(null, theme.glowRoad ? 0x333333 : 0)));
  group.add(new THREE.Mesh(stripGeo(S, W + CURB, W + SHOULDER, 0.02, 0.02, { colA: theme.shoulder }), vc()));
  group.add(new THREE.Mesh(stripGeo(S, -W - SHOULDER, -W - CURB, 0.02, 0.02, { colA: theme.shoulder }), vc()));
  // muros laterales
  const wallMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: theme.glowRoad ? 0x0a4a40 : (theme.night ? 0x150a25 : 0) });
  const wallGeo = (o) => {
    const pos = [], col = [], idx = []; const c1 = new THREE.Color(theme.wall), c2 = new THREE.Color(theme.wall).multiplyScalar(0.8);
    for (let i = 0; i <= n; i++) {
      const s = S[i % n], c = (Math.floor(i / 4) % 2) ? c1 : c2;
      const x = s.x + s.rx * o, z = s.z + s.rz * o;
      pos.push(x, s.y - 1.2, z, x, s.y + WALL_H, z); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    for (let i = 0; i < n; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  group.add(new THREE.Mesh(wallGeo(W + SHOULDER), wallMat));
  group.add(new THREE.Mesh(wallGeo(-W - SHOULDER), wallMat));
  // grosor inferior de la losa (para puentes)
  const under = new THREE.Mesh(stripGeo(S, -W - SHOULDER, W + SHOULDER, -1.2, -1.2, { colA: 0x555555, flip: true }), new THREE.MeshLambertMaterial({ vertexColors: true, color: 0x777777, side: THREE.BackSide }));
  group.add(under);

  // pilares bajo tramos elevados
  const pil = [];
  for (let i = 0; i < n; i += 10) {
    const s = S[i]; if (s.y < 2.5) continue;
    let blocked = false;
    for (const j of near(s.x, s.z, W + SHOULDER + 6)) {
      const dd = Math.min(Math.abs(j - i), n - Math.abs(j - i));
      if (dd > 20 && S[j].y < s.y - 2) { blocked = true; break; }
    }
    if (!blocked) pil.push(s);
  }
  if (pil.length) {
    const pg = new THREE.CylinderGeometry(1.4, 1.8, 1, 8); pg.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(pg, M(theme.wall), pil.length);
    const mm = new THREE.Matrix4();
    pil.forEach((s, k) => { mm.makeScale(1, s.y + (theme.ground === null ? 60 : 0.5), 1); mm.setPosition(s.x, theme.ground === null ? -60 : -0.5, s.z); im.setMatrixAt(k, mm); });
    group.add(im);
  }

  // línea de meta y arco
  sharedChecker = sharedChecker || checkerTexture();
  const s0 = S[0];
  const fin = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 2.4), new THREE.MeshLambertMaterial({ map: sharedChecker }));
  fin.rotation.x = -Math.PI / 2; fin.rotation.z = Math.atan2(s0.tx, s0.tz);
  fin.position.set(s0.x, s0.y + 0.08, s0.z); group.add(fin);
  const archMat = M(theme.curbA);
  for (const sd of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1, 9, 1), archMat);
    post.position.set(s0.x + s0.rx * (W + 2) * sd, s0.y + 4.5, s0.z + s0.rz * (W + 2) * sd); group.add(post);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 5, 2, 0.6), new THREE.MeshLambertMaterial({ map: sharedChecker }));
  banner.position.set(s0.x, s0.y + 8.5, s0.z); banner.rotation.y = Math.atan2(s0.tx, s0.tz); group.add(banner);

  // ----- turbo pads -----
  sharedPadTex = sharedPadTex || padTexture();
  const pads = [];
  const padCount = 3 + Math.floor(def.cx * 3);
  for (let k = 0; k < padCount; k++) {
    const i = Math.floor(((k + 0.5) / padCount + 0.05) * n) % n;
    const off = (r() - 0.5) * W * 1.0;
    const s = S[i];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 6), new THREE.MeshBasicMaterial({ map: sharedPadTex }));
    m.rotation.set(-Math.PI / 2, 0, 0); m.rotateZ(Math.atan2(s.tx, s.tz) + Math.PI);
    m.position.set(s.x + s.rx * off, s.y + 0.1, s.z + s.rz * off);
    group.add(m);
    pads.push({ i, s: s.s, off });
  }

  // ----- cajas de items y monedas -----
  const boxes = [];
  [0.12, 0.38, 0.62, 0.86].forEach(f => {
    const i = Math.floor(f * n), s = S[i];
    const cnt = W > 8.5 ? 5 : 4;
    for (let k = 0; k < cnt; k++) {
      const off = (k / (cnt - 1) - 0.5) * W * 1.5;
      boxes.push(new THREE.Vector3(s.x + s.rx * off, s.y + 1.3, s.z + s.rz * off));
    }
  });
  const coins = [];
  [0.25, 0.5, 0.75, 0.95].forEach(f => {
    const i0 = Math.floor(f * n); const off = (r() - 0.5) * W;
    for (let k = 0; k < 5; k++) { const s = S[(i0 + k * 3) % n]; coins.push(new THREE.Vector3(s.x + s.rx * off, s.y + 1, s.z + s.rz * off)); }
  });

  // ----- decoración -----
  const placements = {}; theme.deco.forEach(t => placements[t] = []);
  for (let i = 0; i < n; i += 4) {
    for (const side of [-1, 1]) {
      if (r() < 0.45) continue;
      const s = S[i];
      const dist = W + SHOULDER + 4 + r() * (theme.deco.includes('mesa') ? 50 : 26);
      const x = s.x + s.rx * dist * side, z = s.z + s.rz * dist * side;
      let ok = true;
      for (const j of near(x, z, W + SHOULDER + 6)) {
        const q = S[j]; if (Math.hypot(q.x - x, q.z - z) < W + SHOULDER + 3.5) { ok = false; break; }
      }
      if (!ok) continue;
      const type = theme.deco[Math.floor(r() * theme.deco.length)];
      if (type === 'mesa' && dist < W + SHOULDER + 14) continue;
      const big = type === 'building';
      const groundY = theme.ground === null ? s.y - 2 : 0;
      placements[type].push({ x, y: type === 'planet' ? s.y + r() * 10 : groundY, z, rot: r() * 6.28, scale: 0.8 + r() * 0.6, sy: big ? 8 + r() * 30 : 1, ci: Math.floor(r() * 10) });
    }
  }
  // carteles con lámparas en pistas de noche
  buildDecos(group, placements);

  // ----- consultas físicas -----
  function project(i, x, y, z) {
    const a = S[i], b = S[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z;
    let t = ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz);
    t = Math.max(0, Math.min(1, t));
    return t;
  }
  function query(x, y, z, hint) {
    let best = -1, bd = Infinity;
    if (hint == null || hint < 0) {
      let cand = near(x, z, 30); if (!cand.length) cand = S.map((_, i) => i);
      for (const i of cand) { const s = S[i]; const d = (s.x - x) ** 2 + (s.z - z) ** 2 + ((s.y - y) ** 2) * 4; if (d < bd) { bd = d; best = i; } }
    } else {
      for (let k = -24; k <= 24; k++) {
        const i = (hint + k + n) % n, s = S[i];
        const d = (s.x - x) ** 2 + (s.z - z) ** 2 + ((s.y - y) ** 2) * 4;
        if (d < bd) { bd = d; best = i; }
      }
    }
    // escoger segmento
    const prev = (best - 1 + n) % n;
    const tA = project(best, x, y, z);
    let i = best, t = tA;
    if (tA <= 0) { i = prev; t = project(prev, x, y, z); }
    const a = S[i], b = S[(i + 1) % n];
    const px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t, py = a.y + (b.y - a.y) * t;
    const rx = a.rx + (b.rx - a.rx) * t, rz = a.rz + (b.rz - a.rz) * t;
    const d = (x - px) * rx + (z - pz) * rz;
    return { idx: i, s: a.s + a.seg * t, d, h: py, off: Math.abs(d) > W + 0.3, wallD: W + SHOULDER, rx, rz, tx: a.tx, tz: a.tz, slope: a.slope };
  }
  function pointAt(sv, off = 0) {
    sv = ((sv % L) + L) % L;
    // búsqueda binaria
    let lo = 0, hi = n - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (S[m].s <= sv) lo = m; else hi = m - 1; }
    const a = S[lo], b = S[(lo + 1) % n], t = (sv - a.s) / a.seg;
    return { x: a.x + (b.x - a.x) * t + a.rx * off, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t + a.rz * off, tx: a.tx, tz: a.tz, idx: lo };
  }
  function startGrid(count) {
    const out = [];
    for (let k = 0; k < count; k++) {
      const row = Math.floor(k / 2), side = k % 2 ? 1 : -1;
      const p = pointAt(L - 6 - row * 5.5 - (k % 2) * 2.2, side * W * 0.45);
      out.push({ x: p.x, y: p.y, z: p.z, heading: Math.atan2(p.tx, p.tz) });
    }
    return out;
  }

  return { isArena: false, def, theme, group, S, L, W, n, query, pointAt, startGrid, boxes, coins, pads, wallD: W + SHOULDER, maxR };
}

// ================= ARENA DE BATALLA =================
export function buildArena(def) {
  const theme = THEMES[def.theme];
  const r = rng(def.seed);
  const H = def.size; // medio lado
  const obs = []; // {x,z,hx,hz,h}
  const add = (x, z, hx, hz, h = 3) => obs.push({ x, z, hx, hz, h });
  switch (def.layout) {
    case 'plaza': add(0, 0, 7, 7, 2); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => add(a * H * 0.55, b * H * 0.55, 5, 5)); break;
    case 'grid': for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) add(a * H * 0.5, b * H * 0.5, 4.5, 4.5); break;
    case 'ring': add(0, 0, 10, 10, 4); for (let k = 0; k < 8; k++) { const t = k / 8 * Math.PI * 2; add(Math.cos(t) * H * 0.62, Math.sin(t) * H * 0.62, 2.5, 2.5, 5); } break;
    case 'cross': add(0, H * 0.35, 2, H * 0.2); add(0, -H * 0.35, 2, H * 0.2); add(H * 0.35, 0, H * 0.2, 2); add(-H * 0.35, 0, H * 0.2, 2); add(0, 0, 4, 4, 2); break;
    case 'pillars': for (let k = 0; k < 14; k++) { const x = (r() - 0.5) * H * 1.5, z = (r() - 0.5) * H * 1.5; if (Math.hypot(x, z) > 12) add(x, z, 2 + r() * 2, 2 + r() * 2, 5); } add(0, 0, 5, 5, 3); break;
  }
  const group = new THREE.Group();
  group.add(makeSky(theme));
  const floorTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = hex(theme.road); g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3;
    for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32, h); g.moveTo(0, k * 32); g.lineTo(w, k * 32); g.stroke(); }
  });
  floorTex.repeat.set(H / 16, H / 16);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2), new THREE.MeshLambertMaterial({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2; group.add(floor);
  if (theme.ground !== null) {
    const g = new THREE.Mesh(new THREE.CircleGeometry(H * 6, 32), M(theme.ground)); g.rotation.x = -Math.PI / 2; g.position.y = -0.1; group.add(g);
  }
  if (theme.lava) { const l = new THREE.Mesh(new THREE.CircleGeometry(H * 8, 32), new THREE.MeshBasicMaterial({ color: 0xff4d00 })); l.rotation.x = -Math.PI / 2; l.position.y = -0.3; group.add(l); }
  const wm = M(theme.wall, theme.night ? 0x221133 : 0);
  for (const [x, z, sx, sz] of [[0, H, H * 2 + 2, 1], [0, -H, H * 2 + 2, 1], [H, 0, 1, H * 2], [-H, 0, 1, H * 2]]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx, 2.5, sz), wm); w.position.set(x, 1.25, z); group.add(w);
  }
  const om = M(theme.curbA, theme.night ? 0x220022 : 0), om2 = M(theme.curbB);
  for (const o of obs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(o.hx * 2, o.h, o.hz * 2), om); m.position.set(o.x, o.h / 2, o.z); group.add(m);
    const t = new THREE.Mesh(new THREE.BoxGeometry(o.hx * 2 + 0.3, 0.4, o.hz * 2 + 0.3), om2); t.position.set(o.x, o.h, o.z); group.add(t);
  }
  // decos alrededor
  const placements = {}; theme.deco.forEach(t => placements[t] = []);
  for (let k = 0; k < 70; k++) {
    const t = r() * Math.PI * 2, d = H * 1.25 + r() * H * 1.5;
    const type = theme.deco[Math.floor(r() * theme.deco.length)];
    placements[type].push({ x: Math.cos(t) * d, y: 0, z: Math.sin(t) * d, rot: r() * 6, scale: 0.9 + r() * 0.6, sy: type === 'building' ? 10 + r() * 30 : 1, ci: k });
  }
  buildDecos(group, placements);

  const free = (x, z, m) => Math.abs(x) < H - m && Math.abs(z) < H - m && !obs.some(o => Math.abs(x - o.x) < o.hx + m && Math.abs(z - o.z) < o.hz + m);
  const boxes = [];
  for (let k = 0; k < 400 && boxes.length < 16; k++) {
    const x = (r() - 0.5) * H * 1.7, z = (r() - 0.5) * H * 1.7;
    if (free(x, z, 3) && boxes.every(b => Math.hypot(b.x - x, b.z - z) > 12)) boxes.push(new THREE.Vector3(x, 1.3, z));
  }
  function query(x, y, z) {
    let px = 0, pz = 0, hit = false; const R = 1.2;
    if (x > H - R) { px = H - R - x; hit = true; } if (x < -H + R) { px = -H + R - x; hit = true; }
    if (z > H - R) { pz = H - R - z; hit = true; } if (z < -H + R) { pz = -H + R - z; hit = true; }
    for (const o of obs) {
      const cx = Math.max(o.x - o.hx, Math.min(x, o.x + o.hx)), cz = Math.max(o.z - o.hz, Math.min(z, o.z + o.hz));
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
      if (d < R) {
        hit = true;
        if (d > 1e-4) { px += dx / d * (R - d); pz += dz / d * (R - d); }
        else { // dentro: empujar por el eje más cercano
          const ex = o.hx - Math.abs(x - o.x), ez = o.hz - Math.abs(z - o.z);
          if (ex < ez) px += Math.sign(x - o.x || 1) * (ex + R); else pz += Math.sign(z - o.z || 1) * (ez + R);
        }
      }
    }
    return { h: 0, off: false, push: hit ? { x: px, z: pz } : null, idx: 0, s: 0, d: 0 };
  }
  function startGrid(count) {
    const out = [];
    for (let k = 0; k < count; k++) {
      let t = (k / count) * Math.PI * 2 + 0.3, d = H * 0.8, x, z;
      for (let tries = 0; tries < 20; tries++) { x = Math.cos(t) * d; z = Math.sin(t) * d; if (free(x, z, 2.5)) break; d -= 3; }
      out.push({ x, y: 0, z, heading: Math.atan2(-x, -z) });
    }
    return out;
  }
  function randomFree(rand) {
    for (let k = 0; k < 50; k++) { const x = (rand() - 0.5) * H * 1.8, z = (rand() - 0.5) * H * 1.8; if (free(x, z, 2)) return { x, z }; }
    return { x: 0, z: H * 0.5 };
  }
  return { isArena: true, def, theme, group, H, obs, query, startGrid, boxes, coins: [], pads: [], randomFree, free, maxR: H };
}

// contorno ligero para miniaturas
export function trackOutline(def, mirror = false, n = 120) {
  const { pts } = trackPoints(def, mirror);
  const c = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return c.getSpacedPoints(n).map(p => [p.x, p.z, p.y]);
}
