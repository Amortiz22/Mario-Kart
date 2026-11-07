// ===== Modelos low-poly de vehículos, pilotos e items =====
import * as THREE from '../vendor/three.module.min.js';

const L = (c, e = 0) => new THREE.MeshLambertMaterial({ color: c, emissive: e, flatShading: true });
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
const sph = (r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; };
const cyl = (a, b, h, m, x = 0, y = 0, z = 0, seg = 10) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(a, b, h, seg), m); o.position.set(x, y, z); return o; };

const BLACK = L(0x1b1b1b), GREY = L(0x8a8f98), WHITE = L(0xffffff), CHROME = L(0xd0d6de, 0x222222);

function wheel(r, w, x, y, z) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 12), BLACK); t.rotation.z = Math.PI / 2; g.add(t);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, w + 0.04, 8), GREY); hub.rotation.z = Math.PI / 2; g.add(hub);
  g.position.set(x, y, z);
  return g;
}

// ---------- piloto ----------
export function makeDriver(d) {
  const g = new THREE.Group();
  const c = L(d.color), skin = L(d.color);
  const body = sph(0.55, L(d.color === 0xf8f9fa ? 0x222222 : 0xffffff), 0, 0.55, 0, 1, 1.1, 0.9); g.add(body);
  const head = new THREE.Group(); head.position.set(0, 1.45, 0.05); g.add(head);
  const eyeW = WHITE, eyeB = BLACK;
  const eyes = (y = 0.12, z = 0.48, s = 0.15, sp = 0.2) => { for (const sd of [-1, 1]) { head.add(sph(s, eyeW, sd * sp, y, z)); head.add(sph(s * 0.55, eyeB, sd * sp, y, z + s * 0.6)); } };
  switch (d.species) {
    case 'axolotl':
      head.add(sph(0.6, skin, 0, 0, 0, 1.25, 0.9, 1)); eyes(0.1, 0.5, 0.14, 0.32);
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const f = box(0.5, 0.12, 0.12, L(0xff3d7f), sd * 0.85, 0.25 - k * 0.2, -0.1); f.rotation.z = sd * (0.5 - k * 0.3); head.add(f); }
      break;
    case 'dog': case 'fox':
      head.add(sph(0.55, skin)); head.add(sph(0.3, L(d.species === 'fox' ? 0xffffff : 0xe0b080), 0, -0.12, 0.45, 1, 0.8, 1.2)); head.add(sph(0.1, BLACK, 0, -0.02, 0.8)); eyes(0.15, 0.42);
      for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), skin); e.position.set(sd * 0.32, 0.6, 0); head.add(e); }
      break;
    case 'cat':
      head.add(sph(0.55, skin)); eyes(0.12, 0.45, 0.16, 0.22);
      for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 4), skin); e.position.set(sd * 0.32, 0.55, 0); head.add(e); }
      head.add(sph(0.06, L(0xff8fab), 0, -0.05, 0.55));
      break;
    case 'penguin':
      head.add(sph(0.55, skin)); head.add(sph(0.42, WHITE, 0, -0.05, 0.22, 1, 0.9, 0.8)); eyes(0.15, 0.5, 0.12, 0.18);
      { const b = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 5), L(0xffb703)); b.rotation.x = Math.PI / 2; b.position.set(0, -0.08, 0.68); head.add(b); }
      break;
    case 'bird':
      head.add(sph(0.52, skin)); eyes(0.15, 0.4, 0.13, 0.25);
      { const b = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.9, 6), L(0xff9f1c)); b.rotation.x = Math.PI / 2; b.position.set(0, -0.05, 0.85); head.add(b); }
      break;
    case 'robot':
      head.add(box(0.95, 0.8, 0.85, skin)); head.add(box(0.7, 0.18, 0.05, L(0x00f5d4, 0x00f5d4), 0, 0.08, 0.45));
      head.add(cyl(0.04, 0.04, 0.5, GREY, 0, 0.6, 0)); head.add(sph(0.1, L(0xff006e, 0xff006e), 0, 0.88, 0));
      break;
    case 'bull':
      head.add(sph(0.58, skin)); head.add(sph(0.32, L(0xd4a373), 0, -0.2, 0.45, 1.2, 0.8, 0.8)); eyes(0.18, 0.42);
      for (const sd of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 5), WHITE); h.position.set(sd * 0.6, 0.35, 0); h.rotation.z = -sd * 1.0; head.add(h); }
      break;
    case 'frog':
      head.add(sph(0.55, skin, 0, 0, 0, 1.2, 0.85, 1)); for (const sd of [-1, 1]) { head.add(sph(0.2, skin, sd * 0.3, 0.42, 0.2)); head.add(sph(0.12, WHITE, sd * 0.3, 0.5, 0.33)); head.add(sph(0.07, BLACK, sd * 0.3, 0.52, 0.42)); }
      break;
    case 'bear':
      head.add(sph(0.6, skin)); head.add(sph(0.28, L(0xc49a6c), 0, -0.12, 0.48)); head.add(sph(0.1, BLACK, 0, -0.02, 0.72)); eyes(0.17, 0.48, 0.11);
      for (const sd of [-1, 1]) head.add(sph(0.2, skin, sd * 0.45, 0.48, 0));
      break;
    case 'skull':
      head.add(sph(0.58, WHITE)); for (const sd of [-1, 1]) { head.add(sph(0.16, BLACK, sd * 0.22, 0.08, 0.45)); head.add(sph(0.07, L(0xff006e, 0xaa0044), sd * 0.22, 0.08, 0.55)); }
      for (let k = 0; k < 5; k++) head.add(sph(0.08, L([0xff006e, 0xffbe0b, 0x3a86ff, 0x8ac926, 0xff5d8f][k]), -0.32 + k * 0.16, 0.52, 0.12));
      break;
    case 'cloud':
      head.add(sph(0.5, skin)); head.add(sph(0.35, skin, 0.4, 0.1, 0)); head.add(sph(0.35, skin, -0.4, 0.1, 0)); head.add(sph(0.3, skin, 0, 0.42, 0)); eyes(0.05, 0.42, 0.11);
      break;
    default: head.add(sph(0.55, c)); eyes();
  }
  // casco o gorra según especie
  if (!['robot', 'skull', 'cloud', 'axolotl'].includes(d.species)) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), L(0xffffff));
    cap.position.y = 0.12; head.add(cap);
    cap.material = L(d.capColor || 0xffffff);
  }
  g.userData.head = head;
  return g;
}

// ---------- vehículos ----------
export function makeVehicle(v, driver, color) {
  const root = new THREE.Group();     // posición/rumbo
  const body = new THREE.Group();     // inclinación/derrape/saltos
  root.add(body);
  const paint = L(color), dark = L(new THREE.Color(color).multiplyScalar(0.55).getHex());
  const wheels = [];
  const W = (r, w, x, y, z) => { const wh = wheel(r, w, x, y, z); body.add(wh); wheels.push(wh); return wh; };
  let seatY = 0.6, seatZ = -0.3;
  switch (v.model) {
    case 'kart':
      body.add(box(1.6, 0.25, 2.6, paint, 0, 0.35, 0)); body.add(box(1.2, 0.35, 0.8, paint, 0, 0.55, 1.0));
      body.add(box(1.9, 0.2, 0.4, dark, 0, 0.4, 1.45)); body.add(box(1.8, 0.4, 0.3, dark, 0, 0.75, -1.25));
      body.add(cyl(0.12, 0.15, 0.4, CHROME, 0.4, 0.6, -1.45)); body.add(cyl(0.12, 0.15, 0.4, CHROME, -0.4, 0.6, -1.45));
      [[-0.95, 0.35, 0.9], [0.95, 0.35, 0.9]].forEach(p => W(0.35, 0.35, ...p)); [[-0.95, 0.42, -0.9], [0.95, 0.42, -0.9]].forEach(p => W(0.42, 0.45, ...p));
      break;
    case 'racer':
      body.add(box(1.3, 0.3, 3.2, paint, 0, 0.35, 0.1)); body.add(box(0.7, 0.25, 1.2, paint, 0, 0.5, 1.4));
      body.add(box(2.0, 0.08, 0.6, dark, 0, 0.3, 1.9)); body.add(box(2.0, 0.08, 0.5, dark, 0, 1.15, -1.5));
      body.add(box(0.1, 0.6, 0.3, dark, 0.8, 0.85, -1.5)); body.add(box(0.1, 0.6, 0.3, dark, -0.8, 0.85, -1.5));
      [[-0.95, 0.32, 1.1], [0.95, 0.32, 1.1]].forEach(p => W(0.32, 0.3, ...p)); [[-0.98, 0.42, -1.0], [0.98, 0.42, -1.0]].forEach(p => W(0.42, 0.5, ...p));
      seatZ = -0.4;
      break;
    case 'duck':
      body.add(sph(1.1, paint, 0, 0.6, 0, 0.9, 0.5, 1.3)); body.add(sph(0.5, paint, 0, 1.2, 1.2));
      { const b = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 6), L(0xff7b00)); b.rotation.x = Math.PI / 2; b.position.set(0, 1.15, 1.75); body.add(b); }
      body.add(sph(0.08, BLACK, 0.2, 1.35, 1.6)); body.add(sph(0.08, BLACK, -0.2, 1.35, 1.6));
      [[-0.85, 0.3, 0.8], [0.85, 0.3, 0.8], [-0.85, 0.3, -0.8], [0.85, 0.3, -0.8]].forEach(p => W(0.3, 0.3, ...p));
      seatY = 0.7; seatZ = -0.35;
      break;
    case 'moto': case 'scooter': case 'chopper': {
      const isS = v.model === 'scooter', isC = v.model === 'chopper';
      body.add(box(0.5, 0.5, isC ? 2.6 : 2.2, paint, 0, 0.7, 0));
      if (isS) { body.add(box(0.8, 0.12, 1.4, paint, 0, 0.45, -0.1)); body.add(box(0.6, 1.0, 0.25, paint, 0, 0.95, 0.85)); }
      else body.add(box(0.6, 0.45, 0.9, dark, 0, 1.0, 0.5));
      if (!isS) body.add(box(0.7, 0.5, 0.15, L(0x88ccff, 0x113355), 0, 1.35, 0.9));
      { const _o = cyl(0.05, 0.05, 1.0, CHROME, 0, 1.3, isC ? 1.5 : 1.0); _o.rotation.z = Math.PI / 2; body.add(_o); }
      W(isS ? 0.35 : 0.5, 0.3, 0, isS ? 0.35 : 0.5, isC ? 1.6 : 1.1); W(isS ? 0.35 : 0.55, 0.35, 0, isS ? 0.35 : 0.55, -1.0);
      if (isC) { const _o = cyl(0.1, 0.12, 1.2, CHROME, 0.35, 0.45, -0.6); _o.rotation.x = Math.PI / 2; body.add(_o); }
      seatY = 0.75; seatZ = -0.3;
      break;
    }
    case 'quad':
      body.add(box(1.2, 0.5, 2.2, paint, 0, 0.75, 0)); body.add(box(1.8, 0.15, 0.9, dark, 0, 1.05, 0.9)); body.add(box(1.8, 0.15, 0.9, dark, 0, 1.05, -0.9));
      { const _o = cyl(0.05, 0.05, 1.2, CHROME, 0, 1.4, 0.75); _o.rotation.z = Math.PI / 2; body.add(_o); }
      [[-0.95, 0.5, 0.9], [0.95, 0.5, 0.9], [-0.95, 0.5, -0.9], [0.95, 0.5, -0.9]].forEach(p => W(0.5, 0.5, ...p));
      seatY = 0.95;
      break;
    case 'tank':
      body.add(box(1.7, 0.6, 2.6, paint, 0, 0.75, 0)); body.add(box(1.1, 0.4, 1.0, dark, 0, 1.2, 0.6));
      for (const sd of [-1, 1]) { body.add(box(0.5, 0.7, 2.9, BLACK, sd * 1.0, 0.4, 0)); for (let k = 0; k < 4; k++) W(0.28, 0.55, sd * 1.0, 0.35, -1.05 + k * 0.7); }
      { const _o = cyl(0.1, 0.1, 1.2, dark, 0, 1.25, 1.4); _o.rotation.x = Math.PI / 2; body.add(_o); }
      seatY = 1.0; seatZ = -0.5;
      break;
    case 'sport':
      body.add(box(1.8, 0.45, 3.4, paint, 0, 0.55, 0)); body.add(box(1.5, 0.45, 1.4, L(0x223344, 0x0a1520), 0, 0.98, -0.3));
      body.add(box(1.7, 0.1, 0.5, dark, 0, 1.1, -1.55)); body.add(box(0.3, 0.12, 0.05, L(0xffffaa, 0xffff66), 0.6, 0.6, 1.71)); body.add(box(0.3, 0.12, 0.05, L(0xffffaa, 0xffff66), -0.6, 0.6, 1.71));
      body.add(box(0.3, 0.12, 0.05, L(0xff2222, 0xaa0000), 0.6, 0.65, -1.71)); body.add(box(0.3, 0.12, 0.05, L(0xff2222, 0xaa0000), -0.6, 0.65, -1.71));
      [[-0.95, 0.38, 1.1], [0.95, 0.38, 1.1], [-0.95, 0.38, -1.1], [0.95, 0.38, -1.1]].forEach(p => W(0.38, 0.35, ...p));
      seatY = 0.75; seatZ = -0.3;
      break;
    case 'monster':
      body.add(box(1.6, 0.6, 2.6, paint, 0, 1.45, 0)); body.add(box(1.4, 0.5, 1.2, L(0x223344, 0x0a1520), 0, 1.95, -0.2));
      body.add(box(1.2, 0.2, 2.2, GREY, 0, 1.0, 0));
      [[-1.05, 0.75, 1.0], [1.05, 0.75, 1.0], [-1.05, 0.75, -1.0], [1.05, 0.75, -1.0]].forEach(p => W(0.75, 0.65, ...p));
      seatY = 1.6; seatZ = -0.2;
      break;
    case 'buggy':
      body.add(box(1.4, 0.3, 2.6, paint, 0, 0.6, 0));
      for (const sd of [-1, 1]) { body.add(box(0.08, 1.1, 0.08, CHROME, sd * 0.65, 1.2, -0.2)); body.add(box(0.08, 0.08, 1.4, CHROME, sd * 0.65, 1.75, 0.2)); }
      body.add(box(1.4, 0.08, 0.08, CHROME, 0, 1.75, -0.5)); body.add(box(1.4, 0.08, 0.08, CHROME, 0, 1.75, 0.9));
      { const _o = cyl(0.35, 0.35, 0.3, BLACK, 0, 0.9, -1.4); _o.rotation.x = Math.PI / 2; body.add(_o); }
      [[-0.95, 0.48, 1.0], [0.95, 0.48, 1.0], [-1.0, 0.55, -0.95], [1.0, 0.55, -0.95]].forEach(p => W(p[1], 0.45, ...p));
      seatY = 0.7;
      break;
    case 'hover':
      body.add(cyl(1.5, 1.7, 0.35, paint, 0, 0.6, 0, 16)); body.add(cyl(1.75, 1.75, 0.1, L(0x00f5d4, 0x00c4aa), 0, 0.42, 0, 16));
      body.add(sph(0.8, L(0xaaffff, 0x226666), 0, 1.1, -0.2, 1, 0.5, 1));
      for (let k = 0; k < 6; k++) { const t = k / 6 * Math.PI * 2; body.add(sph(0.12, L(0xff006e, 0xff006e), Math.cos(t) * 1.4, 0.7, Math.sin(t) * 1.4)); }
      seatY = 0.75; seatZ = -0.1;
      break;
  }
  const drv = makeDriver(driver);
  const lean = ['moto', 'scooter', 'chopper'].includes(v.model);
  drv.scale.setScalar(0.85); drv.position.set(0, seatY, seatZ); body.add(drv);
  // sombra circular
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.05; sh.scale.set(lean ? 0.6 : 1, 1.3, 1); root.add(sh);
  // chispas de derrape
  const sparks = new THREE.Group();
  for (const sd of [-1, 1]) { const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: 0x66ccff })); sp.position.set(sd * 0.9, 0.3, -1.4); sparks.add(sp); }
  sparks.visible = false; body.add(sparks);
  // fuego de turbo
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0xff8c00, transparent: true, opacity: 0.85 }));
  flame.rotation.x = -Math.PI / 2; flame.position.set(0, 0.6, -2.0); flame.visible = false; body.add(flame);
  // globos de batalla
  const balloons = new THREE.Group(); balloons.position.set(0, 2.2, -1.0); body.add(balloons);
  // aura de estrella
  const aura = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), new THREE.MeshBasicMaterial({ color: 0xffee55, transparent: true, opacity: 0.25, depthWrite: false }));
  aura.visible = false; aura.position.y = 0.9; body.add(aura);
  root.userData = { body, wheels, sparks, flame, balloons, aura, driver: drv, lean, shadow: sh };
  return root;
}

export function setBalloons(model, count, color) {
  const g = model.userData.balloons;
  while (g.children.length) g.remove(g.children[0]);
  for (let k = 0; k < count; k++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), L(color, 0x222222));
    b.scale.y = 1.2; b.position.set((k - (count - 1) / 2) * 0.8, 0.8 + (k % 2) * 0.25, 0); g.add(b);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), BLACK); s.position.set(b.position.x * 0.5, 0.2, 0); g.add(s);
  }
}

// ---------- items en el mundo ----------
export function makeItemMesh(type) {
  switch (type) {
    case 'cascara': {
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.0, 5), L(0xffd60a)); p.position.y = 0.35; p.rotation.z = (k - 1) * 0.9; p.rotation.y = k * 2.1; g.add(p); }
      g.add(sph(0.3, L(0xffe066), 0, 0.3, 0)); return g;
    }
    case 'disco': case 'rojo': {
      const c = type === 'disco' ? 0x2dc653 : 0xe63946;
      const g = new THREE.Group(); g.add(cyl(0.7, 0.7, 0.35, L(c, new THREE.Color(c).multiplyScalar(0.3).getHex()), 0, 0.45, 0, 14)); g.add(cyl(0.45, 0.45, 0.4, WHITE, 0, 0.47, 0, 12)); return g;
    }
    case 'falsa': { const g = new THREE.Group(); const b = box(1.5, 1.5, 1.5, L(0xef476f, 0x441122)); b.position.y = 1.1; b.rotation.set(0.6, 0.6, 0); g.add(b); return g; }
    case 'bomba': { const g = new THREE.Group(); g.add(sph(0.8, L(0x222244), 0, 0.8, 0)); g.add(cyl(0.08, 0.08, 0.4, L(0xaa8855), 0, 1.65, 0)); g.add(sph(0.15, L(0xffaa00, 0xff6600), 0, 1.9, 0)); return g; }
    case 'lider': {
      const g = new THREE.Group(); const m = cyl(0.4, 0.4, 2.2, L(0x3a86ff, 0x112266), 0, 0, 0, 10); m.rotation.x = Math.PI / 2; g.add(m);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 10), L(0xffffff)); tip.rotation.x = Math.PI / 2; tip.position.z = 1.5; g.add(tip);
      for (let k = 0; k < 4; k++) { const f = box(0.08, 0.7, 0.6, L(0xffbe0b), 0, 0, -0.9); f.rotation.z = k * Math.PI / 2; f.position.set(Math.sin(k * Math.PI / 2) * 0.4, Math.cos(k * Math.PI / 2) * 0.4, -0.9); g.add(f); }
      return g;
    }
    case 'explosion': return new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: 0xff9e00, transparent: true, opacity: 0.7 }));
    case 'coin': { const c = cyl(0.6, 0.6, 0.15, L(0xffd000, 0x664400), 0, 0, 0, 16); c.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.add(c); return g; }
  }
  return sph(0.5, L(0xffffff));
}
