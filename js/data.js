// ===== KARTAZO · datos del juego =====
// Todo es original: pilotos, vehículos, pistas e items.

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Temas visuales ----------
export const THEMES = {
  prado:    { ground: 0x5fbf4a, road: 0x50555f, shoulder: 0x7fd860, curbA: 0xe63946, curbB: 0xffffff, wall: 0xf4f1de, skyTop: 0x3f9bff, skyBot: 0xd6f0ff, fog: 0xcfe8ff, sun: 0xffffff, deco: ['tree', 'bush', 'flower', 'tree'] },
  playa:    { ground: 0xf2d58a, road: 0x6a6f78, shoulder: 0xf7e2a8, curbA: 0x00b4d8, curbB: 0xffffff, wall: 0xffffff, skyTop: 0x29a3ff, skyBot: 0xbfefff, fog: 0xbfefff, sun: 0xfff3d6, water: 0x1fa3d9, deco: ['palm', 'rock', 'umbrella', 'palm'] },
  desierto: { ground: 0xe3a857, road: 0x6b5d52, shoulder: 0xd89848, curbA: 0xf77f00, curbB: 0xfff1d0, wall: 0xb5651d, skyTop: 0x5cb8ff, skyBot: 0xffe3b0, fog: 0xffd9a0, sun: 0xfff0c8, deco: ['cactus', 'rock', 'mesa', 'cactus'] },
  nieve:    { ground: 0xeef6ff, road: 0x6b7380, shoulder: 0xdbe9f7, curbA: 0x3a86ff, curbB: 0xffffff, wall: 0xa9d6ff, skyTop: 0x8fb8de, skyBot: 0xf1f7ff, fog: 0xe6f0fa, sun: 0xffffff, deco: ['pinesnow', 'snowman', 'ice', 'pinesnow'] },
  bosque:   { ground: 0x2f7d32, road: 0x4b4b4b, shoulder: 0x3e9a40, curbA: 0xffbe0b, curbB: 0x222222, wall: 0x6d4c41, skyTop: 0x4c8fd6, skyBot: 0xc8e6c9, fog: 0xa5c9a5, sun: 0xfff6e0, deco: ['pine', 'tree', 'mushroom', 'pine'] },
  volcan:   { ground: 0x3a2626, road: 0x2b2b2e, shoulder: 0x5a2d1e, curbA: 0xff4d00, curbB: 0xffd000, wall: 0x4a3030, skyTop: 0x2a0a0a, skyBot: 0xb33a1a, fog: 0x7a2a14, sun: 0xffb08a, lava: true, deco: ['lavarock', 'crystalred', 'lavarock'] },
  ciudad:   { ground: 0x262a38, road: 0x30333d, shoulder: 0x3a3f50, curbA: 0xff006e, curbB: 0x3a86ff, wall: 0x8338ec, skyTop: 0x05051a, skyBot: 0x2b1b52, fog: 0x1b1238, sun: 0xb0a0ff, night: true, deco: ['building', 'lamp', 'building'] },
  castillo: { ground: 0x5d5a66, road: 0x7a7480, shoulder: 0x6d6876, curbA: 0x9d4edd, curbB: 0xe0aaff, wall: 0x8a8494, skyTop: 0x1d0f33, skyBot: 0x7b4a8c, fog: 0x4a3360, sun: 0xffc9a8, night: true, deco: ['tower', 'torch', 'tower'] },
  espacio:  { ground: null, road: 0x2d1b69, shoulder: 0x3c2690, curbA: 0x00f5d4, curbB: 0xf15bb5, wall: 0x00f5d4, skyTop: 0x000004, skyBot: 0x10052e, fog: 0x0a0322, sun: 0xd0c0ff, night: true, glowRoad: true, deco: ['planet', 'crystal', 'planet'] },
  selva:    { ground: 0x1f7a34, road: 0x5b4a3c, shoulder: 0x2e9445, curbA: 0xffd60a, curbB: 0x2d6a4f, wall: 0x7f5539, skyTop: 0x48a9e6, skyBot: 0xd8f3dc, fog: 0x95d5b2, sun: 0xffffe0, deco: ['palm', 'bigleaf', 'tree', 'bigleaf'] },
  cielo:    { ground: null, road: 0xf8f9fa, shoulder: 0xe9ecef, curbA: 0xffb703, curbB: 0xffffff, wall: 0xffd166, skyTop: 0x5fb4ff, skyBot: 0xffffff, fog: 0xe8f4ff, sun: 0xffffff, clouds: true, deco: ['cloud', 'cloud', 'balloon'] },
  fabrica:  { ground: 0x5d6168, road: 0x3d4047, shoulder: 0x4f5359, curbA: 0xffc300, curbB: 0x111111, wall: 0x9aa0a6, skyTop: 0x6c7a89, skyBot: 0xc9ced6, fog: 0xa0a8b0, sun: 0xffeedd, deco: ['gear', 'crate', 'pipe', 'crate'] },
  canon:    { ground: 0xb5523b, road: 0x5e4a42, shoulder: 0xc2683f, curbA: 0xffffff, curbB: 0xd62828, wall: 0x8c3b2a, skyTop: 0x3d8fe0, skyBot: 0xffd6a5, fog: 0xf0b48a, sun: 0xffe8cc, deco: ['mesa', 'rock', 'cactus', 'mesa'] },
  dulce:    { ground: 0xffb3d9, road: 0x8b5e3c, shoulder: 0xffc8e4, curbA: 0xff5d8f, curbB: 0xffffff, wall: 0xfff0f6, skyTop: 0xa0c4ff, skyBot: 0xffe5f1, fog: 0xffe0ef, sun: 0xffffff, deco: ['lollipop', 'candy', 'cupcake', 'lollipop'] },
};

// ---------- 32 pistas en 8 copas ----------
// size: radio base · cx: complejidad (0..1) · hills: altura de colinas · w: ancho · eight: figura de ocho con puente
const T = (name, theme, seed, size, cx, hills, w = 16, extra = {}) => ({ name, theme, seed, size, cx, hills, w, ...extra });

export const CUPS = [
  { name: 'Copa Semilla', icon: '🌱', tracks: [
    T('Circuito Pradera', 'prado', 11, 120, 0.25, 2, 18),
    T('Playa Coral', 'playa', 23, 135, 0.4, 1, 17),
    T('Dunas Doradas', 'desierto', 37, 140, 0.45, 4, 17),
    T('Valle Nevado', 'nieve', 41, 130, 0.5, 6, 16),
  ]},
  { name: 'Copa Nopal', icon: '🌵', tracks: [
    T('Cañón Rojo', 'canon', 53, 150, 0.55, 8, 16),
    T('Bosque Bruma', 'bosque', 67, 135, 0.6, 5, 15),
    T('Fábrica de Engranes', 'fabrica', 71, 125, 0.65, 3, 15, { eight: true }),
    T('Pueblo Dulce', 'dulce', 83, 130, 0.5, 3, 17),
  ]},
  { name: 'Copa Llama', icon: '🔥', tracks: [
    T('Cráter Volcán', 'volcan', 97, 140, 0.6, 9, 15),
    T('Selva Esmeralda', 'selva', 101, 150, 0.55, 5, 16),
    T('Avenida Neón', 'ciudad', 113, 145, 0.7, 2, 17),
    T('Castillo Sombra', 'castillo', 127, 130, 0.75, 4, 15),
  ]},
  { name: 'Copa Cometa', icon: '☄️', tracks: [
    T('Islas del Cielo', 'cielo', 131, 155, 0.6, 10, 15),
    T('Autopista Estelar', 'espacio', 149, 170, 0.7, 12, 14),
    T('Laguna Tropical', 'playa', 151, 150, 0.6, 2, 16, { eight: true }),
    T('Glaciar Azul', 'nieve', 163, 145, 0.7, 7, 15),
  ]},
  { name: 'Copa Hoja', icon: '🍃', tracks: [
    T('Granja Girasol', 'prado', 173, 140, 0.55, 4, 17, { eight: true }),
    T('Oasis Perdido', 'desierto', 181, 160, 0.6, 3, 16),
    T('Pinar Encantado', 'bosque', 191, 150, 0.7, 7, 15),
    T('Ruinas de la Selva', 'selva', 199, 145, 0.75, 6, 15),
  ]},
  { name: 'Copa Rayo', icon: '⚡', tracks: [
    T('Puerto Medianoche', 'ciudad', 211, 160, 0.65, 3, 16, { eight: true }),
    T('Mesas del Atardecer', 'canon', 223, 165, 0.7, 10, 15),
    T('Fundidora', 'fabrica', 227, 140, 0.8, 5, 14),
    T('Río de Lava', 'volcan', 233, 155, 0.75, 8, 14),
  ]},
  { name: 'Copa Corona', icon: '👑', tracks: [
    T('Montaña de Caramelo', 'dulce', 241, 150, 0.7, 11, 15),
    T('Torres del Rey', 'castillo', 251, 155, 0.8, 6, 14, { eight: true }),
    T('Cumbre Helada', 'nieve', 257, 160, 0.8, 12, 14),
    T('Nubes de Algodón', 'cielo', 263, 165, 0.75, 9, 14),
  ]},
  { name: 'Copa Galaxia', icon: '🌌', tracks: [
    T('Bahía Tormenta', 'playa', 271, 170, 0.8, 5, 15),
    T('Metrópolis', 'ciudad', 277, 175, 0.85, 6, 15),
    T('Corazón del Volcán', 'volcan', 281, 165, 0.85, 11, 14, { eight: true }),
    T('Anillo Galáctico', 'espacio', 293, 190, 0.85, 14, 14),
  ]},
];
const SHAPE_CYCLE = ['blob', 'U', 'clover', 'L', 'zig', 'tri', 'stadium', 'heart', 'T', 'bean'];
let shapeN = 0;
export const TRACKS = CUPS.flatMap((c, ci) => c.tracks.map((t, ti) => {
  if (!t.eight && !t.shape) t.shape = SHAPE_CYCLE[(shapeN++ * 3) % SHAPE_CYCLE.length];
  return Object.assign(t, { cup: ci, idx: ci * 4 + ti });
}));

// ---------- 6 arenas de batalla ----------
export const ARENAS = [
  { name: 'Plaza del Pueblo', theme: 'prado', seed: 5, size: 70, layout: 'plaza' },
  { name: 'Bloque de Hielo', theme: 'nieve', seed: 7, size: 65, layout: 'grid' },
  { name: 'Templo del Sol', theme: 'desierto', seed: 9, size: 75, layout: 'ring' },
  { name: 'Azotea Neón', theme: 'ciudad', seed: 13, size: 65, layout: 'cross' },
  { name: 'Patio del Castillo', theme: 'castillo', seed: 17, size: 70, layout: 'pillars' },
  { name: 'Isla Caldera', theme: 'volcan', seed: 19, size: 72, layout: 'ring' },
];

// ---------- Pilotos (afectan peso) ----------
export const DRIVERS = [
  { id: 'ajolota', name: 'Ajolota', species: 'axolotl', color: 0xff8fb1, weight: 1, desc: 'Ligera y ágil' },
  { id: 'coyo', name: 'Coyo', species: 'dog', color: 0xc68642, weight: 2, desc: 'Equilibrado' },
  { id: 'pancho', name: 'Pancho', species: 'penguin', color: 0x222831, weight: 2, desc: 'Equilibrado' },
  { id: 'tuqui', name: 'Tuqui', species: 'bird', color: 0x111111, weight: 1, desc: 'Ligero y rápido de arranque' },
  { id: 'rocco', name: 'Rocco', species: 'robot', color: 0x9aa5b1, weight: 3, desc: 'Pesado y veloz' },
  { id: 'luna', name: 'Luna', species: 'cat', color: 0x7b5cd6, weight: 1, desc: 'Ligera y ágil' },
  { id: 'toro', name: 'Toro', species: 'bull', color: 0x6b3e26, weight: 3, desc: 'Pesado y veloz' },
  { id: 'kiki', name: 'Kiki', species: 'frog', color: 0x52b788, weight: 1, desc: 'Ligera y ágil' },
  { id: 'zorra', name: 'Zorra Roja', species: 'fox', color: 0xe76f2a, weight: 2, desc: 'Equilibrada' },
  { id: 'osote', name: 'Osote', species: 'bear', color: 0x5e3b22, weight: 3, desc: 'Pesado y veloz' },
  { id: 'catrina', name: 'Catrina', species: 'skull', color: 0xf8f9fa, weight: 2, desc: 'Equilibrada' },
  { id: 'nube', name: 'Nubecita', species: 'cloud', color: 0xdff3ff, weight: 1, desc: 'Ligera y ágil' },
];

// ---------- Vehículos ----------
// stats 1..5: vel = velocidad, acel = aceleración, man = manejo, peso, todo = todoterreno
export const VEHICLES = [
  { id: 'kart',     cls: 'Kart', name: 'Kart Clásico',  model: 'kart',    vel: 3, acel: 3, man: 3, peso: 3, todo: 3, color: 0xe63946 },
  { id: 'bolido',   cls: 'Kart', name: 'Bólido',        model: 'racer',   vel: 5, acel: 2, man: 2, peso: 3, todo: 1, color: 0xffbe0b },
  { id: 'patito',   cls: 'Kart', name: 'Patito Turbo',  model: 'duck',    vel: 2, acel: 5, man: 4, peso: 1, todo: 3, color: 0xffd60a },
  { id: 'moto',     cls: 'Moto', name: 'Moto Sport',    model: 'moto',    vel: 4, acel: 3, man: 5, peso: 2, todo: 2, color: 0x3a86ff, inside: true },
  { id: 'scooter',  cls: 'Moto', name: 'Scooter',       model: 'scooter', vel: 2, acel: 5, man: 5, peso: 1, todo: 3, color: 0x06d6a0, inside: true },
  { id: 'chopper',  cls: 'Moto', name: 'Chopper',       model: 'chopper', vel: 5, acel: 2, man: 3, peso: 4, todo: 2, color: 0x222222, inside: true },
  { id: 'quad',     cls: 'Cuatrimoto', name: 'Cuatrimoto', model: 'quad', vel: 3, acel: 4, man: 3, peso: 3, todo: 5, color: 0x8338ec },
  { id: 'oruga',    cls: 'Cuatrimoto', name: 'Oruga',   model: 'tank',    vel: 3, acel: 2, man: 2, peso: 5, todo: 5, color: 0x588157 },
  { id: 'deportivo',cls: 'Auto', name: 'Deportivo',     model: 'sport',   vel: 5, acel: 3, man: 3, peso: 4, todo: 1, color: 0xd62828 },
  { id: 'monster',  cls: 'Auto', name: 'Mini Monster',  model: 'monster', vel: 3, acel: 3, man: 2, peso: 5, todo: 5, color: 0x2a9d8f },
  { id: 'buggy',    cls: 'Auto', name: 'Buggy Arena',   model: 'buggy',   vel: 4, acel: 4, man: 3, peso: 2, todo: 4, color: 0xf4a261 },
  { id: 'platillo', cls: 'Especial', name: 'Platillo',  model: 'hover',   vel: 4, acel: 4, man: 4, peso: 2, todo: 4, color: 0x00f5d4, hover: true },
];

export const COLORS = [0xe63946, 0x3a86ff, 0x06d6a0, 0xffbe0b, 0x8338ec, 0xff006e, 0xf77f00, 0x2a9d8f, 0x222222, 0xf8f9fa, 0x00b4d8, 0x9d4edd];

// ---------- Clases de motor ----------
export const CC = {
  50:  { label: '50cc',  speed: 0.74, ai: 0.82 },
  100: { label: '100cc', speed: 0.87, ai: 0.92 },
  150: { label: '150cc', speed: 1.0,  ai: 0.98 },
  200: { label: '200cc', speed: 1.22, ai: 1.0 },
};

// ---------- Items ----------
export const ITEMS = {
  cascara:  { name: 'Cáscara', icon: '🍌' },
  disco:    { name: 'Disco Verde', icon: '🟢' },
  disco3:   { name: 'Triple Disco', icon: '🟢🟢🟢' },
  rojo:     { name: 'Disco Rastreador', icon: '🔴' },
  rojo3:    { name: 'Triple Rastreador', icon: '🔴🔴🔴' },
  nitro:    { name: 'Nitro', icon: '🚀' },
  nitro3:   { name: 'Triple Nitro', icon: '🚀🚀🚀' },
  estrella: { name: 'Supercarga', icon: '⭐' },
  rayo:     { name: 'Rayo Encogedor', icon: '⚡' },
  bomba:    { name: 'Bomba', icon: '💣' },
  falsa:    { name: 'Caja Falsa', icon: '🎁' },
  tinta:    { name: 'Calamar de Tinta', icon: '🦑' },
  lider:    { name: 'Misil del Líder', icon: '🎯' },
  monedas:  { name: 'Bolsa de Monedas', icon: '🪙' },
};

// Probabilidades por posición relativa (0 = primero, 1 = último)
export function rollItem(frac, r, mode) {
  if (mode === 'bombazo') return 'bomba';
  if (mode === 'globos' || mode === 'monedas') {
    const pool = ['cascara', 'disco', 'disco3', 'rojo', 'nitro', 'bomba', 'falsa', 'estrella', 'rojo3', 'cascara', 'disco'];
    if (mode === 'monedas') pool.push('monedas', 'monedas');
    return pool[Math.floor(r() * pool.length)];
  }
  const tiers = [
    // [item, peso arriba, peso medio, peso abajo]
    ['cascara', 30, 10, 2], ['disco', 25, 15, 4], ['falsa', 12, 5, 0], ['monedas', 15, 8, 2],
    ['rojo', 3, 18, 12], ['disco3', 2, 10, 6], ['nitro', 3, 16, 18], ['bomba', 1, 8, 8],
    ['tinta', 0, 6, 4], ['rojo3', 0, 4, 12], ['nitro3', 0, 3, 16], ['estrella', 0, 1, 12],
    ['rayo', 0, 0, 5], ['lider', 0, 1, 6],
  ];
  const w = tiers.map(([, a, b, c]) => frac < 0.5 ? a + (b - a) * frac * 2 : b + (c - b) * (frac - 0.5) * 2);
  const tot = w.reduce((s, x) => s + x, 0);
  let x = r() * tot;
  for (let i = 0; i < tiers.length; i++) { x -= w[i]; if (x <= 0) return tiers[i][0]; }
  return 'cascara';
}

export const MODES = {
  gp:       { name: 'Gran Premio', icon: '🏆', desc: 'Copa de 4 pistas, gana quien sume más puntos', race: true },
  vs:       { name: 'Carrera VS', icon: '🏁', desc: 'Elige pista o sortéala', race: true },
  tt:       { name: 'Contrarreloj', icon: '⏱️', desc: 'Solo tú, 3 nitros y el reloj', race: true, solo: true },
  elim:     { name: 'Eliminación', icon: '💀', desc: 'Cada 25 s cae el último lugar', race: true },
  globos:   { name: 'Guerra de Globos', icon: '🎈', desc: 'Revienta globos rivales, no pierdas los tuyos', battle: true },
  monedas:  { name: 'Robo de Monedas', icon: '🪙', desc: 'Junta y roba monedas en 2 minutos', battle: true },
  bombazo:  { name: 'Bombazo', icon: '💣', desc: 'Solo bombas. Cada impacto suma punto', battle: true },
};

export const GP_POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const BOT_NAMES = ['Chispa', 'Turbo', 'Mango', 'Pixel', 'Rayita', 'Tornado', 'Canela', 'Bólido', 'Mapache', 'Cohete', 'Burbuja', 'Trueno'];
