// ===== Construcción de pistas y arenas =====
import * as THREE from '../vendor/three.module.min.js';
import { THEMES, rng } from './data.js';



// ---------------- utilidades de texturas ----------------
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export function roadTexture(theme) {
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
export function padTexture() {
  return canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#ff9f1c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffee88';
    for (let k = 0; k < 3; k++) {
      const y = 10 + k * 40;
      g.beginPath(); g.moveTo(8, y + 30); g.lineTo(w / 2, y); g.lineTo(w - 8, y + 30); g.lineTo(w - 18, y + 30); g.lineTo(w / 2, y + 12); g.lineTo(18, y + 30); g.fill();
    }
  });
}
export function checkerTexture() {
  return canvasTex(64, 16, (g, w, h) => {
    for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); }
  });
}

let sharedBoxTex, sharedPadTex, sharedChecker, sharedWin;
export function windowTex() {
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
export function makeSky(theme) {
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
export const M = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e || 0x000000, flatShading: true });
export const mat4 = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(sx, sy, sz));
  return m;
};
export function decoParts(type) {
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

export function buildDecos(group, placements) {
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
    return { h: 0, off: false, fall: false, slope: 0, W: 99, push: hit ? { x: px, z: pz } : null, idx: 0, s: 0, d: 0 };
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

