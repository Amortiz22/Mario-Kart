// ===== Kartazo Rally · menús, flujo de juego y salas =====
import * as THREE from '../vendor/three.module.min.js';
import { CUPS, TRACKS, ARENAS, DRIVERS, VEHICLES, COLORS, MODES, ITEMS, THEMES, GP_POINTS, BOT_NAMES } from './data.js';
import { trackOutline } from './track.js';
import { makeVehicle } from './models.js';
import { Game } from './game.js';
import { Net, randomCode } from './net.js';
import { setupTouch, isTouchDevice, setAutoAccel } from './input.js';
import { initAudio, setSound, sfx } from './audio.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const hexc = n => '#' + n.toString(16).padStart(6, '0');

// ---------- perfil ----------
const LS = 'kartazo_profile_v1';
const profile = Object.assign({
  name: 'Piloto' + Math.floor(Math.random() * 900 + 100), driver: 'ajolota', vehicle: 'kart', color: COLORS[0],
  sfx: true, music: true, auto: true, forceTouch: false, quality: 1,
}, JSON.parse(localStorage.getItem(LS) || '{}'));
const saveProfile = () => localStorage.setItem(LS, JSON.stringify(profile));
const records = JSON.parse(localStorage.getItem('kartazo_tt') || '{}');
const saveRecords = () => localStorage.setItem('kartazo_tt', JSON.stringify(records));

// ---------- render ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouchDevice(), powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
function applyQuality() { renderer.setPixelRatio(Math.min(devicePixelRatio, isTouchDevice() ? 1.5 : 2) * profile.quality * (isTouchDevice() ? 0.8 : 1)); renderer.setSize(innerWidth, innerHeight, false); }
applyQuality();
addEventListener('resize', () => { applyQuality(); game && game.resize(); });
if (isTouchDevice() || profile.forceTouch) document.body.classList.add('touch');
setupTouch($('#hud'));
setAutoAccel(profile.auto); setSound(profile.sfx, profile.music);
addEventListener('pointerdown', () => initAudio(), { once: false, passive: true });

// ---------- navegación ----------
let current = 'scrTitle';
function show(id) {
  $$('.screen').forEach(s => s.classList.remove('show'));
  $('#' + id).classList.add('show'); current = id;
  garageActive = id === 'scrGarage';
}
const overlay = (id, on) => $('#' + id).classList.toggle('show', on);
const loading = (on, text = 'Cargando…') => { $('#loadingText').textContent = text; overlay('loading', on); };

const state = { mode: 'vs', cc: 150, bots: 7, laps: 3, mirror: false, cup: 0, gp: null, flow: 'solo' };

$$('[data-go]').forEach(b => b.addEventListener('click', () => {
  sfx.click();
  const g = b.dataset.go;
  if (g === 'title') show('scrTitle');
  if (g === 'solo') { state.flow = 'solo'; show('scrMode'); }
  if (g === 'mode') show('scrMode');
  if (g === 'online') { show('scrOnline'); }
  if (g === 'garage') openGarage(() => show('scrTitle'));
  if (g === 'help') show('scrHelp');
  if (g === 'options') show('scrOptions');
}));

// ---------- modos ----------
$('#modeGrid').innerHTML = Object.entries(MODES).map(([id, m]) => `<div class="card" data-m="${id}"><div class="ic">${m.icon}</div><b>${m.name}</b><small>${m.desc}</small></div>`).join('');
$$('#modeGrid .card').forEach(c => c.addEventListener('click', () => { sfx.click(); state.mode = c.dataset.m; openSetup(); }));

// ---------- miniaturas ----------
function drawThumb(cv, def, isArena, mirror) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, th = THEMES[def.theme];
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, hexc(th.skyTop)); grd.addColorStop(1, hexc(th.ground ?? th.skyBot));
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  if (isArena) {
    g.fillStyle = hexc(th.road); g.fillRect(W * 0.2, H * 0.12, W * 0.6, H * 0.76);
    g.fillStyle = hexc(th.curbA); g.fillRect(W * 0.45, H * 0.4, W * 0.1, H * 0.2);
    g.font = '28px sans-serif'; g.textAlign = 'center'; g.fillText('🎈', W / 2, H * 0.32);
    return;
  }
  const pts = trackOutline(def, mirror, 90);
  let mx = 0; pts.forEach(p => mx = Math.max(mx, Math.abs(p[0]), Math.abs(p[1])));
  const sc = (Math.min(W, H) / 2 - 8) / mx;
  g.lineJoin = 'round';
  for (const [lw, col] of [[9, '#000a'], [5, hexc(th.road)], [1.5, hexc(th.curbB)]]) {
    g.lineWidth = lw; g.strokeStyle = col; g.beginPath();
    pts.forEach((p, i) => { const x = W / 2 + p[0] * sc * (W / H), y = H / 2 - p[1] * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.closePath(); g.stroke();
  }
  const p0 = pts[0]; g.fillStyle = '#fff'; g.fillRect(W / 2 + p0[0] * sc * (W / H) - 3, H / 2 - p0[1] * sc - 3, 6, 6);
}
const thumbCache = new Map();
function thumb(def, isArena, mirror) {
  const key = (isArena ? 'a' : 't') + def.name + mirror;
  if (!thumbCache.has(key)) { const c = document.createElement('canvas'); c.width = 160; c.height = 100; drawThumb(c, def, isArena, mirror); thumbCache.set(key, c); }
  const src = thumbCache.get(key), c = document.createElement('canvas'); c.width = 160; c.height = 100; c.getContext('2d').drawImage(src, 0, 0); return c;
}
function trackCard(def, isArena, idx, extra = '') {
  const d = document.createElement('div'); d.className = 'trk'; d.dataset.idx = idx;
  d.appendChild(thumb(def, isArena, state.mirror));
  const rec = !isArena && records[idx + (state.mirror ? 'm' : '')];
  d.insertAdjacentHTML('beforeend', `<b>${def.name}</b><small>${isArena ? 'Arena' : CUPS[def.cup].icon + ' ' + CUPS[def.cup].name}${rec ? ' · ⏱' + fmtTime(rec) : ''}</small>${extra}`);
  return d;
}
const fmtTime = t => t == null ? '—' : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

// ---------- configuración un jugador ----------
$('#botSel').innerHTML = Array.from({ length: 12 }, (_, i) => `<option ${i === 7 ? 'selected' : ''}>${i}</option>`).join('');
$('#ccSel').onchange = e => state.cc = +e.target.value;
$('#botSel').onchange = e => state.bots = +e.target.value;
$('#lapSel').onchange = e => state.laps = +e.target.value;
$('#mirrorChk').onchange = e => { state.mirror = e.target.checked; renderSetupGrid(); };
let setupCup = 0;
function openSetup() {
  const m = MODES[state.mode];
  $('#setupTitle').textContent = `${m.icon} ${m.name}`;
  $('#botSel').parentElement.style.display = m.solo ? 'none' : '';
  $('#lapSel').parentElement.style.display = m.battle ? 'none' : '';
  $('#mirrorChk').parentElement.style.display = m.battle ? 'none' : '';
  $('#randomBtn').textContent = state.mode === 'gp' ? '🎲 Sortear copa' : m.battle ? '🎲 Sortear arena' : '🎲 Sortear pista';
  const tabs = $('#cupTabs');
  if (m.battle) tabs.innerHTML = '';
  else if (state.mode === 'gp') tabs.innerHTML = '<small class="muted">Elige una copa (4 pistas):</small>';
  else tabs.innerHTML = [`<button data-c="-1" class="${setupCup === -1 ? 'sel' : ''}">Todas</button>`, ...CUPS.map((c, i) => `<button data-c="${i}" class="${setupCup === i ? 'sel' : ''}">${c.icon} ${c.name}</button>`)].join('');
  $$('#cupTabs button').forEach(b => b.onclick = () => { setupCup = +b.dataset.c; openSetup(); });
  renderSetupGrid();
  show('scrSetup');
}
function renderSetupGrid() {
  const grid = $('#trackGrid'); grid.innerHTML = '';
  const m = MODES[state.mode];
  if (m.battle) ARENAS.forEach((a, i) => { const c = trackCard(a, true, i); c.onclick = () => startSolo({ arena: i }); grid.appendChild(c); });
  else if (state.mode === 'gp') CUPS.forEach((cup, i) => {
    const c = trackCard(cup.tracks[0], false, i * 4); c.querySelector('b').textContent = `${cup.icon} ${cup.name}`; c.querySelector('small').textContent = cup.tracks.map(t => t.name).join(' · ');
    c.onclick = () => startSolo({ cup: i }); grid.appendChild(c);
  });
  else TRACKS.filter(t => setupCup === -1 || t.cup === setupCup).forEach(t => { const c = trackCard(t, false, t.idx); c.onclick = () => startSolo({ track: t.idx }); grid.appendChild(c); });
}
$('#randomBtn').onclick = () => {
  const m = MODES[state.mode];
  const cards = $$('#trackGrid .trk');
  const pick = Math.floor(Math.random() * cards.length);
  spinCards(cards, pick, () => {
    const idx = +cards[pick].dataset.idx;
    if (m.battle) startSolo({ arena: idx }); else if (state.mode === 'gp') startSolo({ cup: idx / 4 }); else startSolo({ track: idx });
  });
};
function spinCards(cards, pick, done) {
  let i = 0, delay = 50; const total = cards.length * 2 + pick + Math.floor(Math.random() * 3);
  const target = total - ((total - pick) % cards.length + cards.length) % cards.length;
  const tick = () => {
    cards.forEach(c => c.classList.remove('hl'));
    const c = cards[i % cards.length]; c.classList.add('hl'); c.scrollIntoView({ block: 'nearest' }); sfx.click();
    if (i >= target) { sfx.box(); setTimeout(done, 900); return; }
    i++; delay *= i > target - 8 ? 1.25 : 1.03; setTimeout(tick, delay);
  };
  tick();
}

// ---------- garaje ----------
let garageActive = false, garageDone = null;
const gRenderer = new THREE.WebGLRenderer({ canvas: $('#garageCanvas'), antialias: true, alpha: true });
gRenderer.outputColorSpace = THREE.SRGBColorSpace;
const gScene = new THREE.Scene(), gCam = new THREE.PerspectiveCamera(40, 360 / 260, 0.1, 100);
gCam.position.set(0, 3.2, 7.5); gCam.lookAt(0, 0.9, 0);
gScene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.3)); { const d = new THREE.DirectionalLight(0xffffff, 1.3); d.position.set(3, 6, 4); gScene.add(d); }
const floor = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.2, 32), new THREE.MeshLambertMaterial({ color: 0x3b2a7a })); floor.position.y = -0.1; gScene.add(floor);
let gModel = null;
function rebuildGarageModel() {
  if (gModel) gScene.remove(gModel);
  const v = VEHICLES.find(x => x.id === profile.vehicle), d = DRIVERS.find(x => x.id === profile.driver);
  gModel = makeVehicle(v, d, profile.color); gScene.add(gModel);
  const dr = d.weight, st = [['Velocidad', v.vel + (dr - 2) * 0.5], ['Aceleración', v.acel - (dr - 2) * 0.5], ['Manejo', v.man - (dr - 2) * 0.3], ['Peso', v.peso + (dr - 2)], ['Todoterreno', v.todo]];
  $('#statsBox').innerHTML = `<p><b>${d.name}</b> · ${d.desc}<br><b>${v.name}</b> (${v.cls})${v.inside ? ' · derrape interior' : ''}${v.hover ? ' · flota' : ''}</p>` + st.map(([n, x]) => `<div><span>${n}</span><i><b style="width:${Math.max(8, Math.min(100, x * 20))}%"></b></i></div>`).join('');
}
function openGarage(done) {
  garageDone = done;
  $('#nameInput').value = profile.name;
  $('#driverGrid').innerHTML = DRIVERS.map(d => `<div class="chip ${d.id === profile.driver ? 'sel' : ''}" data-id="${d.id}"><span style="color:${hexc(d.color === 0x111111 || d.color === 0x222831 ? 0xcccccc : d.color)}">●</span> ${d.name}<small>${['', 'Ligero', 'Medio', 'Pesado'][d.weight]}</small></div>`).join('');
  $('#vehicleGrid').innerHTML = VEHICLES.map(v => `<div class="chip ${v.id === profile.vehicle ? 'sel' : ''}" data-id="${v.id}">${v.name}<small>${v.cls}</small></div>`).join('');
  $('#colorGrid').innerHTML = COLORS.map(c => `<button class="swatch ${c === profile.color ? 'sel' : ''}" data-c="${c}" style="background:${hexc(c)}"></button>`).join('');
  $$('#driverGrid .chip').forEach(c => c.onclick = () => { profile.driver = c.dataset.id; $$('#driverGrid .chip').forEach(x => x.classList.toggle('sel', x === c)); rebuildGarageModel(); sfx.click(); });
  $$('#vehicleGrid .chip').forEach(c => c.onclick = () => { profile.vehicle = c.dataset.id; $$('#vehicleGrid .chip').forEach(x => x.classList.toggle('sel', x === c)); rebuildGarageModel(); sfx.click(); });
  $$('#colorGrid .swatch').forEach(c => c.onclick = () => { profile.color = +c.dataset.c; $$('#colorGrid .swatch').forEach(x => x.classList.toggle('sel', x === c)); rebuildGarageModel(); sfx.click(); });
  rebuildGarageModel();
  show('scrGarage');
}
function closeGarage() {
  profile.name = ($('#nameInput').value.trim() || profile.name).slice(0, 12);
  saveProfile();
  if (net.online) sendPick();
  garageDone && garageDone();
}
$('#garageOk').onclick = closeGarage; $('#garageBack').onclick = closeGarage;

// ---------- opciones ----------
$('#optSfx').checked = profile.sfx; $('#optMusic').checked = profile.music; $('#optAuto').checked = profile.auto; $('#optTouch').checked = profile.forceTouch; $('#optQ').value = profile.quality;
$('#optSfx').onchange = e => { profile.sfx = e.target.checked; setSound(profile.sfx, profile.music); saveProfile(); };
$('#optMusic').onchange = e => { profile.music = e.target.checked; setSound(profile.sfx, profile.music); saveProfile(); };
$('#optAuto').onchange = e => { profile.auto = e.target.checked; setAutoAccel(profile.auto); saveProfile(); };
$('#optTouch').onchange = e => { profile.forceTouch = e.target.checked; document.body.classList.toggle('touch', isTouchDevice() || profile.forceTouch); saveProfile(); };
$('#optQ').onchange = e => { profile.quality = +e.target.value; applyQuality(); saveProfile(); };
$('#resetRecords').onclick = () => { for (const k in records) delete records[k]; saveRecords(); alert('Récords borrados'); };
$('#itemHelp').innerHTML = Object.values(ITEMS).map(i => `<div>${i.icon} ${i.name}</div>`).join('');
$('#modeHelp').innerHTML = Object.values(MODES).map(m => `<p>${m.icon} <b>${m.name}:</b> ${m.desc}</p>`).join('');

// ---------- partida ----------
let game = null, paused = false, lastCfg = null;
function hudReset() {
  ['#pos', '#lap', '#time', '#coins', '#item', '#ranking'].forEach(s => $(s).innerHTML = '');
  $('#ink').style.opacity = 0;
}
function launch(cfg) {
  // cfg: {mode, cc, laps, mirror, track?, arena?, players, seed, online}
  lastCfg = cfg;
  loading(true, 'Construyendo pista…');
  setTimeout(() => {
    if (game) { game.dispose(); game = null; }
    hudReset();
    const isBattle = MODES[cfg.mode].battle;
    game = new Game(renderer, {
      mode: cfg.mode, cc: cfg.cc, laps: cfg.laps, mirror: cfg.mirror, seed: cfg.seed,
      track: isBattle ? null : TRACKS[cfg.track], arena: isBattle ? ARENAS[cfg.arena] : null,
      players: cfg.players.map(p => ({ ...p, local: p.bot ? (!net.online || net.isHost) : (p.id === net.myId || !net.online) })),
      net: net.online ? net.gameChannel() : null, hud: $('#hud'),
      onEnd: res => onGameEnd(res, cfg),
    });
    paused = false;
    loading(false); show('scrResults'); overlay('scrResults', false); show('hud');
  }, 30);
}

function buildPlayers(humans, botsTotal) {
  const used = new Set(humans.map(h => h.driver));
  const players = humans.map((h, i) => ({ slot: i, id: h.id, name: h.name, driver: h.driver, vehicle: h.vehicle, color: h.color, bot: false }));
  const freeD = DRIVERS.filter(d => !used.has(d.id));
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  for (let i = players.length; i < Math.max(botsTotal, humans.length); i++) {
    const d = freeD.length ? freeD.splice(Math.floor(Math.random() * freeD.length), 1)[0] : DRIVERS[i % DRIVERS.length];
    const v = VEHICLES[Math.floor(Math.random() * VEHICLES.length)];
    players.push({ slot: i, id: 'bot' + i, name: d.name, driver: d.id, vehicle: v.id, color: COLORS[(i * 5 + 3) % COLORS.length], bot: true });
  }
  return players;
}

function startSolo(sel) {
  initAudio();
  const me = { id: 'H', name: profile.name, driver: profile.driver, vehicle: profile.vehicle, color: profile.color };
  const total = state.mode === 'tt' ? 1 : state.bots + 1;
  const players = buildPlayers([me], total);
  if (state.mode === 'gp') {
    state.gp = { cup: sel.cup, round: 0, totals: {}, players };
    return launch({ mode: 'gp', cc: state.cc, laps: state.laps, mirror: state.mirror, track: sel.cup * 4, players, seed: Date.now() % 1e6 });
  }
  state.gp = null;
  launch({ mode: state.mode, cc: state.cc, laps: state.laps, mirror: state.mirror, track: sel.track, arena: sel.arena, players, seed: Date.now() % 1e6 });
}

function onGameEnd(res, cfg) {
  const m = MODES[cfg.mode];
  const myIdx = cfg.players.find(p => p.id === net.myId || (!net.online && !p.bot))?.slot;
  let title = 'Resultados';
  let rows = '';
  const color = s => hexc(cfg.players.find(p => p.slot === s)?.color ?? 0xffffff);
  if (cfg.mode === 'gp' && state.gp) {
    const gp = state.gp;
    res.forEach(r => { gp.totals[r.slot] = (gp.totals[r.slot] || 0) + (GP_POINTS[r.place - 1] || 0); });
    title = `${CUPS[gp.cup].icon} ${CUPS[gp.cup].name} · Carrera ${gp.round + 1}/4`;
    const order = [...cfg.players].sort((a, b) => (gp.totals[b.slot] || 0) - (gp.totals[a.slot] || 0));
    rows = `<tr><th>#</th><th>Piloto</th><th>Carrera</th><th>Puntos</th></tr>` + order.map((p, i) => {
      const r = res.find(x => x.slot === p.slot);
      return `<tr class="${p.slot === myIdx ? 'me' : ''}"><td>${i + 1}</td><td><i style="background:${color(p.slot)}"></i>${p.name}</td><td>${r ? r.place + 'º (+' + (GP_POINTS[r.place - 1] || 0) + ')' : ''}</td><td><b>${gp.totals[p.slot] || 0}</b></td></tr>`;
    }).join('');
    if (gp.round === 3) title = `🏆 ${CUPS[gp.cup].name} terminada · Campeón: ${order[0].name}`;
  } else {
    if (m.battle) rows = `<tr><th>#</th><th>Piloto</th><th>${cfg.mode === 'globos' ? 'Globos · Puntos' : cfg.mode === 'monedas' ? 'Monedas' : 'Impactos'}</th></tr>` + res.map(r => `<tr class="${r.slot === myIdx ? 'me' : ''}"><td>${r.place}</td><td><i style="background:${color(r.slot)}"></i>${r.name}</td><td>${cfg.mode === 'globos' ? '🎈' + r.balloons + ' · ⭐' + r.score : cfg.mode === 'monedas' ? '🪙' + r.coins : '💥' + r.score}</td></tr>`).join('');
    else rows = `<tr><th>#</th><th>Piloto</th><th>Tiempo</th></tr>` + res.map(r => `<tr class="${r.slot === myIdx ? 'me' : ''}"><td>${r.place}</td><td><i style="background:${color(r.slot)}"></i>${r.name}</td><td>${r.out ? '💀 eliminado' : fmtTime(r.time)}</td></tr>`).join('');
    if (cfg.mode === 'tt') {
      const t = res[0].time, key = cfg.track + (cfg.mirror ? 'm' : '');
      const best = records[key];
      if (t && (!best || t < best)) { records[key] = t; saveRecords(); title = '⏱ ¡Nuevo récord!'; } else title = `⏱ Récord: ${fmtTime(best)}`;
    }
  }
  $('#resTitle').textContent = title; $('#resTable').innerHTML = rows;
  const btns = $('#resBtns'); btns.innerHTML = '';
  const B = (txt, cls, fn) => { const b = document.createElement('button'); b.textContent = txt; if (cls) b.className = cls; b.onclick = () => { sfx.click(); fn(); }; btns.appendChild(b); };
  if (!net.online) {
    if (cfg.mode === 'gp' && state.gp && state.gp.round < 3) B('▶ Siguiente carrera', 'big', () => { state.gp.round++; launch({ ...cfg, track: state.gp.cup * 4 + state.gp.round, seed: Date.now() % 1e6 }); });
    else B('↻ Revancha', 'big', () => { if (cfg.mode === 'gp') startSolo({ cup: state.gp.cup }); else launch({ ...cfg, seed: Date.now() % 1e6 }); });
    B('🗺 Otra pista', 'big alt', () => { endGame(); openSetup(); });
    B('✖ Menú', '', () => { endGame(); show('scrTitle'); });
  } else if (net.isHost) {
    if (cfg.mode === 'gp' && state.gp && state.gp.round < 3) B('▶ Siguiente carrera', 'big', () => { state.gp.round++; hostStartGame({ track: state.gp.cup * 4 + state.gp.round }); });
    B('↩ Volver a la sala', 'big alt', () => { net.send({ t: 'tolobby' }); toLobby(); });
  } else btns.innerHTML = '<p class="muted">Esperando al anfitrión…</p>';
  overlay('scrResults', true);
}
function endGame() { if (game) { game.dispose(); game = null; } overlay('scrResults', false); overlay('scrPause', false); renderer.clear(); }

// pausa
$('#pauseBtn').onclick = () => { if (!game) return; overlay('scrPause', true); if (!net.online) paused = true; $('#restartBtn').style.display = net.online ? 'none' : ''; };
addEventListener('keydown', e => { if (e.code === 'Escape' && game && current === 'hud') { const on = !$('#scrPause').classList.contains('show'); overlay('scrPause', on); if (!net.online) paused = on; } });
$('#resumeBtn').onclick = () => { overlay('scrPause', false); paused = false; game && (game.accum = 0); };
$('#restartBtn').onclick = () => { overlay('scrPause', false); if (lastCfg) { if (lastCfg.mode === 'gp' && state.gp) state.gp.totals = {}, state.gp.round = 0, lastCfg.track = state.gp.cup * 4; launch({ ...lastCfg, seed: Date.now() % 1e6 }); } };
$('#quitBtn').onclick = () => { endGame(); if (net.online) { leaveRoom(); } show('scrTitle'); };

// ---------- bucle principal ----------
let last = performance.now(), gAngle = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (game && !paused && current === 'hud') game.update(dt);
  else if (game && current === 'hud') game.render(0);
  if (garageActive && gModel) { gAngle += dt * 0.8; gModel.rotation.y = gAngle; gModel.userData.wheels.forEach(w => w.rotation.x += dt * 4); gRenderer.render(gScene, gCam); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// =====================================================================
// =========================== ONLINE ==================================
// =====================================================================
const net = new Net();
const lobby = { players: [], settings: { mode: 'vs', cc: 150, bots: 8, laps: 3, cup: 0, mirror: false } };
let votes = new Map(), voteTimer = null, voteDeadline = 0;

$('#lMode').innerHTML = Object.entries(MODES).filter(([id]) => id !== 'tt').map(([id, m]) => `<option value="${id}">${m.icon} ${m.name}</option>`).join('');
$('#lBots').innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${i === 7 ? 'selected' : ''}>${i + 1} pilotos</option>`).join('');
$('#lCup').innerHTML = CUPS.map((c, i) => `<option value="${i}">${c.icon} ${c.name}</option>`).join('');
const me = () => ({ id: net.myId, name: profile.name, driver: profile.driver, vehicle: profile.vehicle, color: profile.color });

function setOnlineErr(t) { $('#onlineErr').textContent = t || ''; }
$('#createRoom').onclick = async () => {
  initAudio(); setOnlineErr(); loading(true, 'Creando sala…');
  try {
    let code, ok = false;
    for (let i = 0; i < 3 && !ok; i++) { code = randomCode(); try { await net.hostRoom(code); ok = true; } catch (e) { net.leave(); if (i === 2) throw e; } }
    lobby.players = [me()];
    wireNet(); toLobby(); broadcastLobby();
  } catch (e) { setOnlineErr(e.message); }
  loading(false);
};
$('#joinRoom').onclick = async () => {
  initAudio(); setOnlineErr();
  const code = $('#codeInput').value.trim().toUpperCase(); if (code.length < 4) return setOnlineErr('Escribe el código de la sala');
  loading(true, 'Conectando…');
  try { await net.joinRoom(code); wireNet(); net.send({ t: 'hello', ...me() }); toLobby(); }
  catch (e) { net.leave(); setOnlineErr(e.message); }
  loading(false);
};
function leaveRoom() { net.leave(); clearInterval(voteTimer); state.gp = null; }
$('#lobbyLeave').onclick = () => { leaveRoom(); show('scrTitle'); };
$('#lobbyGarage').onclick = () => openGarage(() => show('scrLobby'));
$('#shareBtn').onclick = async () => {
  const url = location.origin + location.pathname + '?sala=' + net.code;
  const text = `¡Únete a mi sala de Kartazo Rally! Código: ${net.code}`;
  try { if (navigator.share) await navigator.share({ title: 'Kartazo Rally', text, url }); else { await navigator.clipboard.writeText(url); alert('Enlace copiado: ' + url); } } catch (e) {}
};
function sendPick() { if (net.isHost) { const p = lobby.players.find(x => x.id === 'H'); Object.assign(p, me()); broadcastLobby(); } else net.send({ t: 'pick', ...me() }); }

function wireNet() {
  net.onMsg = (m, from) => onNet(m, from);
  net.onJoin = () => {};
  net.onLeave = id => {
    lobby.players = lobby.players.filter(p => p.id !== id); votes.delete(id); broadcastLobby();
    if (game && lastCfg) { const p = lastCfg.players.find(x => x.id === id); if (p) { const msg = { t: 'left', k: p.slot, g: 1 }; net.send(msg); game.handle(msg); } }
  };
  net.onClose = () => { if (current !== 'scrTitle') { endGame(); alert('Se perdió la conexión con el anfitrión.'); leaveRoom(); show('scrTitle'); } };
}

function broadcastLobby() { if (!net.isHost) return; net.send({ t: 'lobby', players: lobby.players, settings: lobby.settings }); renderLobby(); }
function toLobby() { endGame(); clearInterval(voteTimer); show('scrLobby'); renderLobby(); }
function renderLobby() {
  $('#roomCode').textContent = net.code || '';
  $('#playerList').innerHTML = lobby.players.map(p => {
    const d = DRIVERS.find(x => x.id === p.driver), v = VEHICLES.find(x => x.id === p.vehicle);
    return `<div><i style="background:${hexc(p.color)}"></i><b>${p.name}</b>${p.id === 'H' ? ' 👑' : ''}${p.id === net.myId ? ' (tú)' : ''}<small>${d?.name} · ${v?.name}</small></div>`;
  }).join('') + `<p class="muted">${lobby.players.length}/12 jugadores · comparte el código <b>${net.code}</b></p>`;
  const s = lobby.settings, h = net.isHost;
  $('#lMode').value = s.mode; $('#lCC').value = s.cc; $('#lBots').value = s.bots; $('#lLaps').value = s.laps; $('#lCup').value = s.cup; $('#lMirror').checked = s.mirror;
  ['#lMode', '#lCC', '#lBots', '#lLaps', '#lCup', '#lMirror'].forEach(x => $(x).disabled = !h);
  $('#lCupWrap').style.display = s.mode === 'gp' ? '' : 'none';
  $('#lLaps').parentElement.style.display = MODES[s.mode].battle ? 'none' : '';
  $('#lMirror').parentElement.style.display = MODES[s.mode].battle ? 'none' : '';
  $('#lStart').style.display = h ? '' : 'none'; $('#lWait').style.display = h ? 'none' : '';
  $('#lStart').textContent = s.mode === 'gp' ? '▶ Empezar Gran Premio' : '▶ Votar ' + (MODES[s.mode].battle ? 'arena' : 'pista') + ' y empezar';
  $('#hostOnly').style.display = h ? 'none' : '';
}
[['#lMode', 'mode', String], ['#lCC', 'cc', Number], ['#lBots', 'bots', Number], ['#lLaps', 'laps', Number], ['#lCup', 'cup', Number]].forEach(([sel, key, cast]) => $(sel).onchange = e => { lobby.settings[key] = cast(e.target.value); broadcastLobby(); });
$('#lMirror').onchange = e => { lobby.settings.mirror = e.target.checked; broadcastLobby(); };
$('#lStart').onclick = () => {
  if (!net.isHost) return; sfx.click();
  const s = lobby.settings;
  if (s.mode === 'gp') { state.gp = { cup: s.cup, round: 0, totals: {} }; state.gpPlayers = null; return hostStartGame({ track: s.cup * 4 }); }
  state.gp = null; startVote();
};

// ---------- votación ----------
function voteCandidates(mode) { return MODES[mode].battle ? ARENAS.map((a, i) => ({ def: a, idx: i, arena: true })) : TRACKS.map(t => ({ def: t, idx: t.idx, arena: false })); }
function startVote() {
  votes = new Map(); voteDeadline = Date.now() + 25000;
  net.send({ t: 'votestart', mode: lobby.settings.mode, deadline: 25 });
  openVote(lobby.settings.mode, 25);
  clearInterval(voteTimer);
  voteTimer = setInterval(() => { if (Date.now() > voteDeadline || votes.size >= lobby.players.length) { clearInterval(voteTimer); closeVote(); } }, 300);
}
let voteMode = 'vs';
function openVote(mode, secs) {
  voteMode = mode; state.mirror = lobby.settings.mirror;
  const grid = $('#voteGrid'); grid.innerHTML = '';
  voteCandidates(mode).forEach(c => { const card = trackCard(c.def, c.arena, c.idx, '<div class="vb"></div>'); card.onclick = () => castVote(c.idx); grid.appendChild(card); });
  show('scrVote'); renderVotes([]);
  const end = Date.now() + secs * 1000;
  const tick = () => { if (current !== 'scrVote') return; $('#voteTimer').textContent = Math.max(0, Math.ceil((end - Date.now()) / 1000)) + 's'; setTimeout(tick, 250); };
  tick();
}
$('#voteRandom').onclick = () => castVote(-1);
function castVote(idx) {
  sfx.click();
  $$('#voteGrid .trk').forEach(c => c.classList.toggle('sel', +c.dataset.idx === idx));
  if (net.isHost) { votes.set('H', idx); broadcastVotes(); } else net.send({ t: 'vote', choice: idx });
}
function broadcastVotes() { const list = [...votes].map(([id, choice]) => ({ id, choice })); net.send({ t: 'votes', list }); renderVotes(list); }
function renderVotes(list) {
  $$('#voteGrid .vb').forEach(v => v.innerHTML = '');
  list.forEach(v => { const p = lobby.players.find(x => x.id === v.id); const card = $(`#voteGrid .trk[data-idx="${v.choice}"] .vb`); if (card && p) card.insertAdjacentHTML('beforeend', `<i style="background:${hexc(p.color)}"></i>`); });
  $('#voteList').innerHTML = lobby.players.map(p => { const v = list.find(x => x.id === p.id); return `<span><i style="background:${hexc(p.color)}"></i> ${p.name}: ${v ? (v.choice === -1 ? '🎲 Al azar' : '✔') : '…'}</span>`; }).join('');
}
function closeVote() {
  const cands = voteCandidates(voteMode);
  let list = lobby.players.map(p => ({ id: p.id, choice: votes.has(p.id) ? votes.get(p.id) : -1 }));
  list = list.map(v => ({ ...v, choice: v.choice === -1 ? cands[Math.floor(Math.random() * cands.length)].idx : v.choice }));
  const win = Math.floor(Math.random() * list.length);
  const msg = { t: 'roulette', list, win, mode: voteMode };
  net.send(msg); showRoulette(msg, () => hostStartGame(MODES[voteMode].battle ? { arena: list[win].choice } : { track: list[win].choice }));
}
function showRoulette(msg, done) {
  const box = $('#rouletteBox'); box.innerHTML = ''; $('#rouletteName').textContent = '';
  const cands = voteCandidates(msg.mode);
  const cards = msg.list.map(v => {
    const c = cands.find(x => x.idx === v.choice), p = lobby.players.find(x => x.id === v.id);
    const card = trackCard(c.def, c.arena, c.idx, `<div class="vb"><i style="background:${hexc(p ? p.color : 0xffffff)}"></i></div>`);
    box.appendChild(card); return card;
  });
  show('scrRoulette');
  spinCards(cards, msg.win, () => { $('#rouletteName').textContent = '🏁 ' + cands.find(x => x.idx === msg.list[msg.win].choice).def.name; done && setTimeout(done, 600); });
}

// ---------- inicio de partida online ----------
function hostStartGame(sel) {
  const s = lobby.settings;
  let players;
  if (s.mode === 'gp' && state.gp && state.gp.round > 0 && state.gpPlayers) players = state.gpPlayers;
  else players = buildPlayers(lobby.players, Math.max(s.bots, lobby.players.length));
  if (s.mode === 'gp') state.gpPlayers = players;
  const cfg = { mode: s.mode, cc: s.cc, laps: s.laps, mirror: s.mirror, track: sel.track, arena: sel.arena, players, seed: Date.now() % 1e6, gp: state.gp ? { cup: state.gp.cup, round: state.gp.round } : null };
  net.send({ t: 'start', cfg });
  launch(cfg);
}

function onNet(m, from) {
  if (m.g) { if (game) game.handle(m); return; }
  if (net.isHost) {
    switch (m.t) {
      case 'hello': if (!lobby.players.find(p => p.id === from)) { if (game) { net.sendTo(from, { t: 'busy' }); } lobby.players.push({ id: from, name: String(m.name).slice(0, 12), driver: m.driver, vehicle: m.vehicle, color: m.color }); broadcastLobby(); } break;
      case 'pick': { const p = lobby.players.find(x => x.id === from); if (p) { Object.assign(p, { name: String(m.name).slice(0, 12), driver: m.driver, vehicle: m.vehicle, color: m.color }); broadcastLobby(); } break; }
      case 'vote': votes.set(from, m.choice); broadcastVotes(); break;
    }
    return;
  }
  switch (m.t) {
    case 'lobby': lobby.players = m.players; lobby.settings = m.settings; if (current === 'scrLobby') renderLobby(); else if (!game && current !== 'scrVote' && current !== 'scrRoulette' && current !== 'scrGarage') toLobby(); break;
    case 'votestart': lobby.settings.mode = m.mode; openVote(m.mode, m.deadline); break;
    case 'votes': renderVotes(m.list); break;
    case 'roulette': showRoulette(m); break;
    case 'start':
      if (m.cfg.mode === 'gp') { if (!state.gp || m.cfg.gp.round === 0) state.gp = { cup: m.cfg.gp.cup, round: 0, totals: {} }; state.gp.round = m.cfg.gp.round; } else state.gp = null;
      launch(m.cfg); break;
    case 'tolobby': toLobby(); break;
    case 'busy': $('#lWait').textContent = 'Hay una carrera en curso; entrarás en la siguiente.'; break;
  }
}

// enlace de invitación ?sala=CODIGO
const qs = new URLSearchParams(location.search).get('sala');
if (qs) { $('#codeInput').value = qs.toUpperCase(); show('scrOnline'); }

// ---------- PWA ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
let deferredPrompt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; const h = $('#installHint'); h.innerHTML = '<button id="installBtn">📲 Instalar como app</button>'; $('#installBtn').onclick = () => { deferredPrompt.prompt(); }; });
window.__kartazo = { get game() { return game; }, state, launch, startSolo, profile };
