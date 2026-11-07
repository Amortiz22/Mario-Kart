// ===== Audio sintetizado (sin archivos) =====
let ctx = null, master = null, engine = null, engGain = null, musicOn = true, sfxOn = true, musicTimer = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}
export function setSound(sfx, music) { sfxOn = sfx; musicOn = music; if (!music) stopMusic(); }

function tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0) {
  if (!ctx || !sfxOn) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2) {
  if (!ctx || !sfxOn) return;
  const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(master); s.start();
}
export const sfx = {
  beep: () => tone(440, 0.25, 'square', 0.18),
  go: () => tone(880, 0.6, 'square', 0.2),
  box: () => { tone(660, 0.08, 'triangle', 0.15); tone(990, 0.12, 'triangle', 0.15, 0, 0.07); },
  item: () => tone(520, 0.15, 'sawtooth', 0.1, 300),
  boost: () => tone(200, 0.5, 'sawtooth', 0.12, 600),
  hit: () => { noise(0.3, 0.25); tone(300, 0.4, 'square', 0.12, -250); },
  boom: () => { noise(0.7, 0.4); tone(120, 0.6, 'sine', 0.3, -80); },
  coin: () => { tone(1320, 0.07, 'square', 0.1); tone(1760, 0.12, 'square', 0.1, 0, 0.06); },
  lap: () => [523, 659, 784].forEach((f, i) => tone(f, 0.15, 'triangle', 0.15, 0, i * 0.1)),
  finish: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.16, 0, i * 0.13)),
  zap: () => tone(1500, 0.6, 'sawtooth', 0.12, -1400),
  pop: () => { tone(900, 0.1, 'square', 0.15, -600); noise(0.1, 0.15); },
  mini: (lvl) => tone(300 + lvl * 200, 0.2, 'triangle', 0.12, 200),
  click: () => tone(700, 0.05, 'square', 0.08),
};

export function engineUpdate(speed, on) {
  if (!ctx || !sfxOn) return;
  if (!engine && on) {
    engine = ctx.createOscillator(); engine.type = 'sawtooth';
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    engGain = ctx.createGain(); engGain.gain.value = 0;
    engine.connect(f); f.connect(engGain); engGain.connect(master); engine.start();
  }
  if (!engine) return;
  engine.frequency.setTargetAtTime(55 + Math.abs(speed) * 4.2, ctx.currentTime, 0.05);
  engGain.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.1);
}

// música chiptune sencilla por tema
const SCALES = { maj: [0, 2, 4, 7, 9, 12, 14, 16], min: [0, 3, 5, 7, 10, 12, 15, 17] };
export function startMusic(seed = 1, minor = false, tempo = 140) {
  stopMusic(); if (!ctx || !musicOn) return;
  let s = seed * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const sc = minor ? SCALES.min : SCALES.maj, root = 196 * Math.pow(2, Math.floor(r() * 5) / 12);
  const mel = Array.from({ length: 16 }, () => r() < 0.75 ? sc[Math.floor(r() * sc.length)] : null);
  const bass = [0, 0, 5, 5, 3, 3, 4, 4].map(i => sc[i % sc.length]);
  let step = 0; const dt = 60 / tempo / 2;
  const v = 0.045;
  musicTimer = setInterval(() => {
    if (!musicOn) return;
    const m = mel[step % 16]; if (m !== null) tone(root * 2 * Math.pow(2, m / 12), dt * 0.9, 'square', v);
    if (step % 2 === 0) tone(root / 2 * Math.pow(2, bass[(step >> 2) % 8] / 12), dt * 1.8, 'triangle', v * 1.6);
    if (step % 4 === 2) noise(0.05, 0.05);
    step++;
  }, dt * 1000);
}
export function stopMusic() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; }
