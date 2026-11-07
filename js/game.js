// ===== Núcleo de partida: carreras y batallas =====
import * as THREE from '../vendor/three.module.min.js';
import { VEHICLES, DRIVERS, CC, ITEMS, rollItem, rng } from './data.js';
import { buildTrack, buildArena, getBoxTex } from './track.js';
import { makeVehicle, makeItemMesh, setBalloons } from './models.js';
import { readInput } from './input.js';
import { sfx, engineUpdate, startMusic, stopMusic } from './audio.js';

const DT = 1 / 60;
const tmpV = new THREE.Vector3();
const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const BATTLE_TIME = { globos: 150, monedas: 120, bombazo: 120 };
const ELIM_EVERY = 25;

export class Game {
  constructor(renderer, opts) {
    this.r = renderer; this.o = opts; this.net = opts.net;
    this.mode = opts.mode; this.battle = ['globos', 'monedas', 'bombazo'].includes(opts.mode);
    this.cc = CC[opts.cc || 150];
    this.laps = opts.laps || 3;
    this.scene = new THREE.Scene();
    this.world = this.battle ? buildArena(opts.arena) : buildTrack(opts.track, opts.mirror);
    const th = this.world.theme;
    this.scene.add(this.world.group);
    this.scene.fog = new THREE.Fog(th.fog, 120, 650);
    const hemi = new THREE.HemisphereLight(th.night ? 0x8888cc : 0xffffff, th.night ? 0x221133 : 0x556644, th.night ? 0.9 : 1.1);
    const sun = new THREE.DirectionalLight(th.sun, th.night ? 0.7 : 1.5); sun.position.set(80, 160, 60);
    this.scene.add(hemi, sun);
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.3, 2000);
    this.time = -3.6; // cuenta regresiva
    this.raceTime = 0; this.ended = false; this.objects = new Map(); this.objSeq = 0;
    this.effects = []; this.hudEl = opts.hud; this.accum = 0; this.sendT = 0; this.lastCount = 4;
    this.rand = rng((opts.seed || 1) * 7 + 3);
    this.finishOrder = []; this.elimT = ELIM_EVERY; this.endTimer = null;
    this.inkT = 0; this.zapFlash = 0; this.msgT = 0;
    this.buildBoxes();
    this.buildKarts(opts.players);
    this.me = this.karts.find(k => k.human && k.local) || this.karts[0];
    this.setupMinimap();
    startMusic((opts.track || opts.arena).seed, th.night || th.lava, this.battle ? 150 : 140);
    this.camPos = new THREE.Vector3().copy(this.me.pos).add(new THREE.Vector3(0, 5, -10));
  }

  // ---------- construcción ----------
  buildBoxes() {
    const tex = getBoxTex();
    const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: 0.92, emissive: 0x332211 });
    this.boxes = (this.mode === 'tt' ? [] : this.world.boxes).map(p => {
      const m = new THREE.Mesh(geo, mat); m.position.copy(p); this.scene.add(m);
      return { pos: p, mesh: m, cd: 0 };
    });
    this.coinMeshes = [];
    if (!this.battle && this.mode !== 'tt') {
      this.coinMeshes = this.world.coins.map(p => { const m = makeItemMesh('coin'); m.position.copy(p); this.scene.add(m); return { pos: p, mesh: m, cd: 0 }; });
    }
    this.arenaCoins = new Map(); // monedas en arena
  }

  buildKarts(players) {
    const grid = this.world.startGrid(players.length);
    this.karts = players.map((p, i) => {
      const v = VEHICLES.find(x => x.id === p.vehicle) || VEHICLES[0];
      const d = DRIVERS.find(x => x.id === p.driver) || DRIVERS[0];
      const model = makeVehicle(v, d, p.color);
      this.scene.add(model);
      const g = grid[i];
      const k = {
        slot: p.slot, name: p.name, v, d, color: p.color, bot: !!p.bot, human: !p.bot, local: !!p.local, model,
        pos: new THREE.Vector3(g.x, g.y, g.z), vel: new THREE.Vector3(), heading: g.heading, speed: 0, vy: 0, grounded: true,
        idx: -1, lap: 0, s: 0, progress: 0, drift: 0, charge: 0, boost: 0, star: 0, mini: 0, spin: 0, tumble: 0, invuln: 0,
        item: null, itemCount: 0, roulette: 0, coins: this.battle ? 0 : 0, balloons: this.mode === 'globos' ? 3 : 0, score: 0,
        finished: false, finishTime: 0, place: i + 1, eliminated: false, startPressed: null, visYaw: 0, wheelRot: 0,
        weight: v.peso + d.weight, lastHitBy: null,
        ai: p.bot ? { lane: (this.rand() - 0.5) * 0.8, laneT: 0, skill: 0.94 + this.rand() * 0.06, itemT: 0, driftT: 0, stuck: 0, rev: 0, target: null, wander: 0 } : null,
        net: null,
      };
      if (this.mode === 'tt' && k.human) { k.item = 'nitro3'; k.itemCount = 3; }
      if (this.mode === 'globos') setBalloons(model, 3, p.color);
      if (!this.battle) { const q = this.world.query(k.pos.x, k.pos.y, k.pos.z, null); k.idx = q.idx; k.s = q.s; k.progress = q.s - this.world.L; }
      return k;
    });
    this.bySlot = new Map(this.karts.map(k => [k.slot, k]));
  }

  setupMinimap() {
    const c = this.hudEl.querySelector('#minimap'); this.mm = c; const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const pts = this.battle ? null : this.world.S;
    const ext = this.battle ? this.world.H * 1.1 : this.world.maxR * 1.05;
    this.mmTf = (x, z) => [W / 2 + (x / ext) * W / 2 * 0.95, H / 2 - (z / ext) * H / 2 * 0.95];
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H; const b = bg.getContext('2d');
    if (pts) {
      b.lineWidth = 7; b.strokeStyle = 'rgba(0,0,0,0.5)'; b.lineJoin = 'round'; b.beginPath();
      pts.forEach((s, i) => { const [x, y] = this.mmTf(s.x, s.z); i ? b.lineTo(x, y) : b.moveTo(x, y); }); b.closePath(); b.stroke();
      b.lineWidth = 4; b.strokeStyle = 'rgba(255,255,255,0.9)'; b.stroke();
      const [fx, fy] = this.mmTf(pts[0].x, pts[0].z); b.fillStyle = '#ff0'; b.fillRect(fx - 3, fy - 3, 6, 6);
    } else {
      const [x0, y0] = this.mmTf(-this.world.H, this.world.H), [x1, y1] = this.mmTf(this.world.H, -this.world.H);
      b.fillStyle = 'rgba(255,255,255,0.25)'; b.fillRect(x0, y0, x1 - x0, y1 - y0);
      b.fillStyle = 'rgba(0,0,0,0.5)';
      for (const o of this.world.obs) { const [a, c2] = this.mmTf(o.x - o.hx, o.z + o.hz), [d, e] = this.mmTf(o.x + o.hx, o.z - o.hz); b.fillRect(a, c2, d - a, e - c2); }
    }
    this.mmBg = bg; this.mmG = g;
  }

  // ---------- red ----------
  send(msg) { this.net && this.net.send(msg); }
  handle(msg) {
    switch (msg.t) {
      case 'st': for (const a of msg.a) { const k = this.bySlot.get(a.k); if (k && !k.local) { k.net = a; k.netT = performance.now(); } } break;
      case 'spawn': this.spawnObject(msg.o, false); break;
      case 'rm': this.removeObject(msg.id); break;
      case 'box': if (this.boxes[msg.i]) this.boxes[msg.i].cd = 2.5; break;
      case 'coin': if (this.coinMeshes[msg.i]) this.coinMeshes[msg.i].cd = 10; break;
      case 'acoin': this.addArenaCoin(msg.id, msg.x, msg.z); break;
      case 'acoinrm': this.removeArenaCoin(msg.id); break;
      case 'hit': this.onHitEvent(msg); break;
      case 'hitreq': { const v = this.bySlot.get(msg.v); if (v && v.local) this.applyHit(v, msg.kind, msg.by); } break;
      case 'zap': this.onZap(msg.by); break;
      case 'ink': this.onInk(msg.by); break;
      case 'fin': { const k = this.bySlot.get(msg.k); if (k && !k.finished) this.markFinished(k, msg.time); } break;
      case 'elim': { const k = this.bySlot.get(msg.k); if (k) this.eliminate(k); } break;
      case 'results': if (!this.ended) this.finish(msg.res); break;
      case 'left': { const k = this.bySlot.get(msg.k); if (k) { k.disconnected = true; this.eliminate(k); } } break;
    }
  }

  // ---------- bucle ----------
  update(dtReal) {
    this.accum += Math.min(dtReal, 0.1);
    while (this.accum >= DT) { this.step(DT); this.accum -= DT; }
    this.render(dtReal);
  }

  step(dt) {
    const prevT = this.time;
    this.time += dt;
    if (this.time < 0) {
      const c = Math.ceil(-this.time);
      if (c !== this.lastCount && c <= 3) { this.lastCount = c; sfx.beep(); this.flash(String(c)); }
    } else if (prevT < 0) { sfx.go(); this.flash('¡YA!'); }
    const racing = this.time >= 0 && !this.ended;
    if (racing) this.raceTime += dt;

    for (const k of this.karts) {
      if (k.eliminated) continue;
      if (k.local) {
        let inp = { steer: 0, throttle: 0, drift: false, item: false };
        if (k.finished && !this.battle) inp = this.aiInput(k, dt, true);
        else if (k.bot) inp = racing ? this.aiInput(k, dt) : { steer: 0, throttle: 0, drift: false, item: false };
        else {
          inp = readInput();
          if (!racing) {
            if (inp.throttle > 0 && k.startPressed === null) k.startPressed = this.time;
            if (inp.throttle <= 0 && this.time < -0.2) k.startPressed = null;
            inp = { steer: 0, throttle: 0, drift: false, item: false };
          }
        }
        if (racing && prevT < 0 && k.human) { // arrancón
          const sp = k.startPressed;
          if (sp !== null && sp > -1.6 && sp < -0.5) { k.boost = 1.2; sfx.boost(); this.msg('¡Arrancón!'); }
          else if (sp !== null && sp <= -2.2) { k.spin = 0.9; this.msg('Te ahogaste...'); }
        }
        if (k.bot && racing && prevT < 0 && this.rand() < 0.5) k.boost = 0.8;
        this.physics(k, inp, dt, racing);
        if (racing) this.itemLogic(k, inp, dt);
      } else this.remoteUpdate(k, dt);
    }
    if (racing) {
      this.collideKarts();
      this.updateObjects(dt);
      this.checkPickups();
      this.updateRules(dt);
    }
    this.updateBoxes(dt);
    // envío de estado ~20 Hz
    this.sendT -= dt;
    if (this.sendT <= 0 && this.net && this.net.online) {
      this.sendT = 0.05;
      const a = this.karts.filter(k => k.local && !k.eliminated).map(k => ({
        k: k.slot, x: +k.pos.x.toFixed(2), y: +k.pos.y.toFixed(2), z: +k.pos.z.toFixed(2), h: +k.heading.toFixed(3), sp: +k.speed.toFixed(1),
        vx: +k.vel.x.toFixed(1), vz: +k.vel.z.toFixed(1), vy: +k.visYaw.toFixed(2),
        f: (k.spin > 0 ? 1 : 0) | (k.tumble > 0 ? 2 : 0) | (k.star > 0 ? 4 : 0) | (k.mini > 0 ? 8 : 0) | (k.boost > 0 ? 16 : 0) | (k.drift ? 32 : 0) | (this.chargeLvl(k) << 6),
        l: k.lap, s: Math.round(k.s), b: k.balloons, c: k.coins,
      }));
      if (a.length) this.send({ t: 'st', a });
    }
  }

  chargeLvl(k) { return k.drift ? (k.charge > 3.4 ? 3 : k.charge > 2.0 ? 2 : k.charge > 0.9 ? 1 : 0) : 0; }

  // ---------- física ----------
  physics(k, inp, dt, racing) {
    const v = k.v, w = this.world;
    let max = 30 * this.cc.speed * (0.88 + v.vel * 0.045);
    if (k.bot && k.ai) max *= this.cc.ai * k.ai.skill * this.rubber(k);
    const accel = (12 + v.acel * 3.6) * (this.cc.speed * 0.5 + 0.5);
    const turn = 1.55 + v.man * 0.2 + (4 - k.weight) * 0.03;
    max *= 1 + k.coins * 0.008;
    if (k.mini > 0) max *= 0.8;
    if (k.star > 0) max *= 1.18;
    if (k.boost > 0) max *= 1.35;
    const q0 = w.query(k.pos.x, k.pos.y, k.pos.z, k.idx);
    if (q0.off && k.boost <= 0 && k.star <= 0 && k.grounded && !v.hover) max *= 0.42 + v.todo * 0.09;
    if (v.hover && q0.off) max *= 0.82;

    let steer = inp.steer, thr = inp.throttle;
    const stunned = k.spin > 0 || k.tumble > 0;
    if (stunned) { steer = 0; thr = 0; }
    // aceleración
    if (k.boost > 0) k.speed += 60 * dt;
    else if (thr > 0) k.speed += accel * thr * dt * (k.speed < max * 0.6 ? 1.2 : 0.75);
    else if (thr < 0) k.speed += (k.speed > 0 ? -40 : -12) * dt;
    else k.speed -= Math.sign(k.speed) * Math.min(Math.abs(k.speed), 7 * dt);
    if (stunned) k.speed *= Math.exp(-(k.tumble > 0 ? 3.5 : 1.8) * dt);
    if (k.speed > max) k.speed = Math.max(max, k.speed - 30 * dt);
    if (k.speed < -11) k.speed = -11;

    // derrape
    if (!stunned && k.grounded && inp.drift && !k.drift && Math.abs(steer) > 0.3 && k.speed > 12) {
      k.drift = Math.sign(steer); k.charge = 0; k.vy = 5.5; k.grounded = false;
    }
    if (k.drift && (!inp.drift || k.speed < 8 || stunned)) {
      const lvl = this.chargeLvl(k);
      if (!stunned && lvl > 0) { k.boost = Math.max(k.boost, [0, 0.6, 1.1, 1.8][lvl]); if (k.human) sfx.mini(lvl); }
      k.drift = 0; k.charge = 0;
    }
    let yawRate;
    const spdF = clamp(Math.abs(k.speed) / 9, 0, 1) * (1 - clamp((k.speed - 32) / 60, 0, 0.25));
    if (k.drift) {
      const es = k.drift * (0.55 + 0.45 * steer * k.drift);
      yawRate = es * turn * (v.inside ? 1.35 : 1.2);
      k.charge += dt * (0.9 + 0.6 * Math.abs(steer));
    } else yawRate = steer * turn * spdF * Math.sign(k.speed || 1);
    if (!k.grounded && !k.drift) yawRate *= 0.6;
    k.heading -= yawRate * dt;
    if (k.spin > 0) k.visYaw += dt * 14; else if (k.tumble > 0) k.visYaw += dt * 9; else {
      const targetYaw = k.drift ? -k.drift * (v.inside ? 0.18 : 0.42) : -steer * 0.06;
      k.visYaw += (wrapA(targetYaw - k.visYaw)) * Math.min(1, dt * 8);
    }
    // velocidad
    const fx = Math.sin(k.heading), fz = Math.cos(k.heading);
    const grip = k.drift ? 3.5 : (k.grounded ? 9 : 2);
    const blend = 1 - Math.exp(-grip * dt);
    k.vel.x += (fx * k.speed - k.vel.x) * blend;
    k.vel.z += (fz * k.speed - k.vel.z) * blend;
    k.pos.x += k.vel.x * dt; k.pos.z += k.vel.z * dt;

    // superficie y muros
    const q = w.query(k.pos.x, k.pos.y, k.pos.z, k.idx);
    if (!w.isArena) {
      const lim = q.wallD - 1.1;
      if (Math.abs(q.d) > lim) {
        const sd = Math.sign(q.d), pen = Math.abs(q.d) - lim;
        k.pos.x -= q.rx * pen * sd; k.pos.z -= q.rz * pen * sd;
        const lat = k.vel.x * q.rx + k.vel.z * q.rz;
        if (lat * sd > 0) {
          k.vel.x -= q.rx * lat * 1.4; k.vel.z -= q.rz * lat * 1.4;
          if (Math.abs(lat) > 8) { k.speed *= 0.8; if (k.human) sfx.click(); }
          // alinear un poco con la pista
          const th = Math.atan2(q.tx, q.tz), dif = wrapA(th - k.heading);
          if (Math.abs(dif) < Math.PI / 2) k.heading += dif * 0.08;
        }
      }
      // progreso y vueltas
      const prevS = k.s; k.idx = q.idx; k.s = q.s;
      const L = w.L;
      if (prevS > L * 0.75 && k.s < L * 0.25) this.crossLine(k, 1);
      else if (prevS < L * 0.25 && k.s > L * 0.75) this.crossLine(k, -1);
      k.progress = (k.lap - 1) * L + k.s;
      // turbo pads
      for (const p of w.pads) {
        const ds = k.s - p.s;
        if (ds > -3 && ds < 3 && Math.abs(q.d - p.off) < 2.4 && k.boost < 0.5) { k.boost = 1.0; if (k.human) sfx.boost(); }
      }
    } else if (q.push) {
      k.pos.x += q.push.x; k.pos.z += q.push.z;
      const pl = Math.hypot(q.push.x, q.push.z) || 1, nx = q.push.x / pl, nz = q.push.z / pl;
      const vn = k.vel.x * nx + k.vel.z * nz;
      if (vn < 0) { k.vel.x -= nx * vn * 1.5; k.vel.z -= nz * vn * 1.5; if (vn < -8) { k.speed *= 0.6; if (k.human) sfx.click(); } }
      if (k.ai) k.ai.bump = 0.3;
    }
    // altura
    const gh = q.h + (v.hover ? 0.35 : 0);
    k.vy -= 38 * dt; k.pos.y += k.vy * dt;
    if (k.pos.y <= gh) { k.pos.y = gh; if (k.vy < -14 && k.human) sfx.click(); k.vy = 0; k.grounded = true; }
    else if (k.grounded && k.pos.y - gh < 0.7 && k.vy <= 0) { k.pos.y = gh; k.vy = 0; }
    else k.grounded = false;
    k.slope = q.slope || 0;

    // timers
    k.boost = Math.max(0, k.boost - dt); k.star = Math.max(0, k.star - dt); k.mini = Math.max(0, k.mini - dt);
    k.spin = Math.max(0, k.spin - dt); k.tumble = Math.max(0, k.tumble - dt); k.invuln = Math.max(0, k.invuln - dt);
    if (k === this.me) engineUpdate(k.speed, true);
  }

  rubber(k) {
    if (this.battle) return 1;
    const humans = this.karts.filter(x => x.human && !x.eliminated);
    if (!humans.length) return 1;
    const best = Math.max(...humans.map(h => h.progress));
    const gap = best - k.progress;
    if (gap > 200) return 1.1; if (gap > 80) return 1.04; if (gap < -150) return 0.9; if (gap < -60) return 0.96;
    return 1;
  }

  crossLine(k, dir) {
    k.lap += dir;
    if (dir > 0 && k.local && !k.finished) {
      if (k.lap > this.laps) {
        this.markFinished(k, this.raceTime);
        this.send({ t: 'fin', k: k.slot, time: this.raceTime });
      } else if (k === this.me && k.lap > 1) { sfx.lap(); this.flash(k.lap === this.laps ? '¡ÚLTIMA VUELTA!' : `Vuelta ${k.lap}/${this.laps}`, 1.3); }
    }
  }

  markFinished(k, time) {
    k.finished = true; k.finishTime = time;
    this.finishOrder.push(k.slot);
    if (k === this.me) { sfx.finish(); this.flash(`¡META! ${this.finishOrder.length}º`, 3); }
  }

  // ---------- remotos ----------
  remoteUpdate(k, dt) {
    const n = k.net; if (!n) return;
    const age = Math.min(0.25, (performance.now() - k.netT) / 1000);
    const tx = n.x + n.vx * age, tz = n.z + n.vz * age;
    const a = 1 - Math.exp(-14 * dt);
    if (Math.hypot(tx - k.pos.x, tz - k.pos.z) > 25) { k.pos.set(tx, n.y, tz); }
    k.pos.x += (tx - k.pos.x) * a; k.pos.z += (tz - k.pos.z) * a; k.pos.y += (n.y - k.pos.y) * a;
    k.heading += wrapA(n.h - k.heading) * a;
    k.visYaw = n.vy; k.speed = n.sp; k.vel.set(n.vx, 0, n.vz);
    k.spin = n.f & 1 ? 0.1 : 0; k.tumble = n.f & 2 ? 0.1 : 0; k.star = n.f & 4 ? 0.1 : 0; k.mini = n.f & 8 ? 0.1 : 0; k.boost = n.f & 16 ? 0.1 : 0;
    k.drift = n.f & 32 ? 1 : 0; k.remoteLvl = (n.f >> 6) & 3;
    if (!this.battle) { k.lap = n.l; k.s = n.s; k.progress = (k.lap - 1) * this.world.L + k.s; k.idx = this.world.query(k.pos.x, k.pos.y, k.pos.z, k.idx).idx; }
    if (k.balloons !== n.b && this.mode === 'globos') { k.balloons = n.b; setBalloons(k.model, n.b, k.color); if (n.b <= 0) this.eliminate(k); }
    k.coins = n.c;
  }

  collideKarts() {
    const ks = this.karts.filter(k => !k.eliminated);
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i], b = ks[j]; if (!a.local && !b.local) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, dy = Math.abs(b.pos.y - a.pos.y);
      const ra = a.mini > 0 ? 0.8 : 1.3, rb = b.mini > 0 ? 0.8 : 1.3;
      const d = Math.hypot(dx, dz); if (d > ra + rb || dy > 2.5 || d < 1e-3) continue;
      const nx = dx / d, nz = dz / d, pen = ra + rb - d;
      // estrella atropella
      if (a.star > 0 && b.star <= 0) { this.requestHit(b, 'spin', a.slot); continue; }
      if (b.star > 0 && a.star <= 0) { this.requestHit(a, 'spin', b.slot); continue; }
      const wa = a.weight * (a.mini > 0 ? 0.3 : 1), wb = b.weight * (b.mini > 0 ? 0.3 : 1);
      const fa = wb / (wa + wb), fb = wa / (wa + wb);
      if (a.local) { a.pos.x -= nx * pen * fa; a.pos.z -= nz * pen * fa; a.vel.x -= nx * 9 * fa; a.vel.z -= nz * 9 * fa; }
      if (b.local) { b.pos.x += nx * pen * fb; b.pos.z += nz * pen * fb; b.vel.x += nx * 9 * fb; b.vel.z += nz * 9 * fb; }
      if (a.mini > 0 && b.mini <= 0) this.requestHit(a, 'spin', b.slot);
      if (b.mini > 0 && a.mini <= 0) this.requestHit(b, 'spin', a.slot);
    }
  }

  // ---------- impactos ----------
  requestHit(victim, kind, by) {
    if (victim.local) this.applyHit(victim, kind, by);
    else this.send({ t: 'hitreq', v: victim.slot, kind, by });
  }
  applyHit(k, kind, by) {
    if (!k.local || k.eliminated) return false;
    if (k.star > 0 || k.invuln > 0) return false;
    if (kind === 'tumble') { k.tumble = 1.4; k.vy = 9; k.grounded = false; } else k.spin = 1.0;
    k.drift = 0; k.charge = 0; k.boost = 0; k.invuln = 2.0;
    if (k.human) sfx.hit();
    const ev = { t: 'hit', v: k.slot, by: by ?? -1, kind };
    if (this.mode === 'globos') { k.balloons = Math.max(0, k.balloons - 1); setBalloons(k.model, k.balloons, k.color); sfx.pop(); if (k.balloons <= 0) this.eliminate(k); }
    if (this.mode === 'monedas' || !this.battle) {
      const lost = Math.min(k.coins, this.battle ? 3 : 2); k.coins -= lost;
      if (this.battle && lost > 0) {
        for (let i = 0; i < lost; i++) {
          const id = `d${k.slot}_${this.objSeq++}`, a = Math.random() * 6.28;
          const x = k.pos.x + Math.cos(a) * 5, z = k.pos.z + Math.sin(a) * 5;
          if (this.world.free(x, z, 1.5)) { this.addArenaCoin(id, x, z); this.send({ t: 'acoin', id, x, z }); }
        }
      }
    }
    this.onHitEvent(ev, true);
    this.send(ev);
    return true;
  }
  onHitEvent(ev, local) {
    const by = this.bySlot.get(ev.by), v = this.bySlot.get(ev.v);
    if (by && by !== v && (this.mode === 'globos' || this.mode === 'bombazo')) by.score++;
    if (by === this.me && by !== v) this.msg(`¡Le diste a ${v ? v.name : '?'}!`);
  }
  eliminate(k) {
    if (k.eliminated) return;
    k.eliminated = true;
    k.model.visible = false;
    if (k === this.me) this.flash(this.mode === 'elim' ? '¡ELIMINADO!' : '¡Sin globos!', 2.5);
    else this.msg(`${k.name} quedó fuera`);
  }

  onZap(by) {
    this.zapFlash = 0.4; sfx.zap();
    for (const k of this.karts) if (k.local && k.slot !== by && k.star <= 0 && !k.eliminated) { k.mini = 6; k.spin = 0.6; k.item = k.item === 'estrella' ? k.item : null; k.itemCount = 0; }
  }
  onInk(by) {
    const src = this.bySlot.get(by);
    for (const k of this.karts) if (k.local && k.slot !== by && (!src || k.place < src.place)) {
      if (k === this.me) this.inkT = 4; else if (k.ai) k.ai.inked = 3;
    }
  }

  // ---------- items ----------
  itemLogic(k, inp, dt) {
    if (k.roulette > 0) {
      k.roulette -= dt;
      if (k.roulette <= 0) {
        const alive = this.karts.filter(x => !x.eliminated).length;
        const frac = this.battle ? 0.5 : (alive > 1 ? (k.place - 1) / (alive - 1) : 0);
        k.item = rollItem(frac, Math.random, this.mode);
        k.itemCount = k.item.endsWith('3') ? 3 : 1;
        if (k.ai) k.ai.itemT = 0.8 + Math.random() * 3;
      }
      return;
    }
    if (inp.item && k.item && k.spin <= 0 && k.tumble <= 0) this.useItem(k);
  }

  useItem(k) {
    const it = k.item; if (!it) return;
    const fx = Math.sin(k.heading), fz = Math.cos(k.heading);
    const base = it.replace('3', '');
    const id = () => `${k.slot}_${this.objSeq++}`;
    const sp = (o) => { this.spawnObject(o, true); this.send({ t: 'spawn', o }); };
    switch (base) {
      case 'cascara': case 'falsa':
        sp({ id: id(), type: base, x: k.pos.x - fx * 3, y: k.pos.y, z: k.pos.z - fz * 3, owner: k.slot, vx: 0, vz: 0, idx: k.idx }); break;
      case 'disco':
        sp({ id: id(), type: 'disco', x: k.pos.x + fx * 3, y: k.pos.y, z: k.pos.z + fz * 3, owner: k.slot, vx: fx * 58, vz: fz * 58, idx: k.idx }); break;
      case 'rojo': {
        const tgt = this.pickTarget(k);
        sp({ id: id(), type: 'rojo', x: k.pos.x + fx * 3, y: k.pos.y, z: k.pos.z + fz * 3, owner: k.slot, vx: fx * 50, vz: fz * 50, idx: k.idx, target: tgt ? tgt.slot : -1 }); break;
      }
      case 'bomba':
        sp({ id: id(), type: 'bomba', x: k.pos.x + fx * 3, y: k.pos.y + 1.5, z: k.pos.z + fz * 3, owner: k.slot, vx: fx * (k.speed + 18), vz: fz * (k.speed + 18), vy: 9, idx: k.idx }); break;
      case 'lider': {
        const lead = this.karts.filter(x => !x.eliminated && x !== k && !x.finished).sort((a, b) => a.place - b.place)[0];
        if (lead) sp({ id: id(), type: 'lider', x: k.pos.x, y: k.pos.y + 4, z: k.pos.z, owner: k.slot, vx: fx * 70, vz: fz * 70, idx: k.idx, target: lead.slot, s: k.s });
        break;
      }
      case 'nitro': k.boost = 1.3; if (k.human) sfx.boost(); break;
      case 'estrella': k.star = 7; k.spin = 0; k.tumble = 0; if (k.human) sfx.boost(); break;
      case 'rayo': this.onZap(k.slot); this.send({ t: 'zap', by: k.slot }); break;
      case 'tinta': this.onInk(k.slot); this.send({ t: 'ink', by: k.slot }); sfx.item(); break;
      case 'monedas': k.coins = Math.min(this.battle ? 999 : 10, k.coins + (this.battle ? 3 : 3)); sfx.coin(); break;
    }
    if (k.human && !['nitro', 'estrella'].includes(base)) sfx.item();
    k.itemCount--; if (k.itemCount <= 0) { k.item = null; k.itemCount = 0; }
  }

  pickTarget(k) {
    const fx = Math.sin(k.heading), fz = Math.cos(k.heading);
    if (!this.battle) {
      const ahead = this.karts.filter(x => !x.eliminated && x !== k && x.place === k.place - 1)[0];
      if (ahead) return ahead;
    }
    let best = null, bd = 1e9;
    for (const x of this.karts) {
      if (x === k || x.eliminated) continue;
      const dx = x.pos.x - k.pos.x, dz = x.pos.z - k.pos.z, d = Math.hypot(dx, dz);
      const dot = (dx * fx + dz * fz) / (d || 1);
      const score = d * (dot > 0.3 ? 1 : 3);
      if (score < bd) { bd = score; best = x; }
    }
    return best;
  }

  spawnObject(o, local) {
    if (this.objects.has(o.id)) return;
    const mesh = makeItemMesh(o.type); mesh.position.set(o.x, o.y, o.z); this.scene.add(mesh);
    const obj = { ...o, pos: new THREE.Vector3(o.x, o.y, o.z), vel: new THREE.Vector3(o.vx || 0, o.vy || 0, o.vz || 0), mesh, life: o.type === 'disco' ? 7 : o.type === 'rojo' ? 9 : o.type === 'lider' ? 25 : o.type === 'bomba' ? 4 : 60, age: 0, fuse: -1, bounces: 0 };
    if (o.type === 'cascara' || o.type === 'falsa') { const q = this.world.query(o.x, o.y, o.z, o.idx ?? null); obj.pos.y = q.h; }
    this.objects.set(o.id, obj);
  }
  removeObject(id) { const o = this.objects.get(id); if (!o) return; this.scene.remove(o.mesh); this.objects.delete(id); }

  explode(x, y, z, r, owner) {
    sfx.boom();
    const m = makeItemMesh('explosion'); m.position.set(x, y + 1, z); this.scene.add(m);
    this.effects.push({ mesh: m, t: 0, dur: 0.6, r });
    for (const k of this.karts) {
      if (!k.local || k.eliminated) continue;
      if (Math.hypot(k.pos.x - x, k.pos.z - z) < r && Math.abs(k.pos.y - y) < r) this.applyHit(k, 'tumble', owner);
    }
  }

  updateObjects(dt) {
    const w = this.world;
    for (const o of [...this.objects.values()]) {
      o.age += dt; o.life -= dt;
      if (o.life <= 0) {
        if (o.type === 'bomba') this.explode(o.pos.x, o.pos.y, o.pos.z, 9, o.owner);
        this.removeObject(o.id); continue;
      }
      const t = o.type;
      if (t === 'disco' || t === 'rojo') {
        if (t === 'rojo' && o.age > 0.25) {
          const tg = this.bySlot.get(o.target);
          let ax, az;
          if (tg && !tg.eliminated) {
            const d = Math.hypot(tg.pos.x - o.pos.x, tg.pos.z - o.pos.z);
            if (!w.isArena && d > 28) { const q = w.query(o.pos.x, o.pos.y, o.pos.z, o.idx); const p = w.pointAt(q.s + 14, 0); ax = p.x; az = p.z; }
            else { ax = tg.pos.x; az = tg.pos.z; }
            const cur = Math.atan2(o.vel.x, o.vel.z), want = Math.atan2(ax - o.pos.x, az - o.pos.z);
            const nh = cur + clamp(wrapA(want - cur), -5 * dt, 5 * dt), spd = 52;
            o.vel.x = Math.sin(nh) * spd; o.vel.z = Math.cos(nh) * spd;
          }
        }
        o.pos.x += o.vel.x * dt; o.pos.z += o.vel.z * dt;
        const q = w.query(o.pos.x, o.pos.y, o.pos.z, o.idx);
        if (!w.isArena) {
          o.idx = q.idx; o.pos.y = q.h;
          const lim = q.wallD - 0.8;
          if (Math.abs(q.d) > lim) {
            const sd = Math.sign(q.d); o.pos.x -= q.rx * (Math.abs(q.d) - lim) * sd; o.pos.z -= q.rz * (Math.abs(q.d) - lim) * sd;
            const lat = o.vel.x * q.rx + o.vel.z * q.rz; o.vel.x -= 2 * lat * q.rx; o.vel.z -= 2 * lat * q.rz; o.bounces++;
          }
        } else if (q.push) {
          o.pos.x += q.push.x; o.pos.z += q.push.z;
          const pl = Math.hypot(q.push.x, q.push.z) || 1, nx = q.push.x / pl, nz = q.push.z / pl, vn = o.vel.x * nx + o.vel.z * nz;
          if (vn < 0) { o.vel.x -= 2 * vn * nx; o.vel.z -= 2 * vn * nz; } o.bounces++;
        }
        if (o.bounces > 6) { this.removeObject(o.id); continue; }
        o.mesh.rotation.y += dt * 10;
      } else if (t === 'bomba') {
        if (o.fuse < 0) {
          o.vel.y -= 30 * dt; o.pos.addScaledVector(o.vel, dt);
          const q = w.query(o.pos.x, o.pos.y, o.pos.z, o.idx); if (!w.isArena) o.idx = q.idx;
          if (q.push) { o.pos.x += q.push.x; o.pos.z += q.push.z; }
          if (!w.isArena && Math.abs(q.d) > q.wallD - 1) { const sd = Math.sign(q.d); o.pos.x -= q.rx * (Math.abs(q.d) - q.wallD + 1) * sd; o.pos.z -= q.rz * (Math.abs(q.d) - q.wallD + 1) * sd; }
          if (o.pos.y <= q.h) { o.pos.y = q.h; o.fuse = 1.2; o.life = 1.2; o.vel.set(0, 0, 0); }
        }
        o.mesh.scale.setScalar(o.fuse > 0 && Math.floor(o.life * 8) % 2 ? 1.2 : 1);
      } else if (t === 'lider') {
        const tg = this.bySlot.get(o.target);
        if (!tg || tg.eliminated) { this.removeObject(o.id); continue; }
        const d = Math.hypot(tg.pos.x - o.pos.x, tg.pos.z - o.pos.z);
        let ax, az, ay;
        if (!w.isArena && d > 30) { const q = w.query(o.pos.x, o.pos.y - 4, o.pos.z, o.idx); o.idx = q.idx; const p = w.pointAt(q.s + 20, 0); ax = p.x; az = p.z; ay = p.y + 5; }
        else { ax = tg.pos.x; az = tg.pos.z; ay = tg.pos.y + (d < 10 ? 0 : 5); }
        tmpV.set(ax - o.pos.x, ay - o.pos.y, az - o.pos.z).normalize().multiplyScalar(d < 30 ? 45 : 85);
        o.vel.lerp(tmpV, 1 - Math.exp(-6 * dt)); o.pos.addScaledVector(o.vel, dt);
        o.mesh.lookAt(o.pos.x + o.vel.x, o.pos.y + o.vel.y, o.pos.z + o.vel.z);
        if (d < 3 && Math.abs(tg.pos.y - o.pos.y) < 3) { this.explode(tg.pos.x, tg.pos.y, tg.pos.z, 7, o.owner); this.removeObject(o.id); continue; }
      } else {
        o.mesh.rotation.y += dt * (t === 'falsa' ? 1.5 : 0.5);
      }
      o.mesh.position.copy(o.pos);
      // colisiones con karts locales
      for (const k of this.karts) {
        if (!k.local || k.eliminated) continue;
        if (o.owner === k.slot && o.age < 0.6) continue;
        if (t === 'bomba' || t === 'lider') continue;
        const dx = k.pos.x - o.pos.x, dz = k.pos.z - o.pos.z;
        if (dx * dx + dz * dz < 3.2 && Math.abs(k.pos.y - o.pos.y) < 2.2) {
          this.applyHit(k, 'spin', o.owner);
          this.removeObject(o.id); this.send({ t: 'rm', id: o.id }); break;
        }
      }
    }
    // discos contra cáscaras
    const list = [...this.objects.values()];
    for (const a of list) if (a.type === 'disco' || a.type === 'rojo') for (const b of list) {
      if (a === b || !this.objects.has(b.id) || !this.objects.has(a.id)) continue;
      if (['cascara', 'falsa', 'disco', 'rojo'].includes(b.type) && a.pos.distanceToSquared(b.pos) < 2.5) { this.removeObject(a.id); this.removeObject(b.id); }
    }
    for (const e of [...this.effects]) {
      e.t += dt; const f = e.t / e.dur; e.mesh.scale.setScalar(e.r * (0.3 + f * 0.9)); e.mesh.material.opacity = 0.75 * (1 - f);
      if (f >= 1) { this.scene.remove(e.mesh); this.effects.splice(this.effects.indexOf(e), 1); }
    }
  }

  updateBoxes(dt) {
    for (const b of this.boxes) {
      b.cd = Math.max(0, b.cd - dt);
      b.mesh.visible = b.cd <= 0;
      b.mesh.rotation.y += dt * 1.5; b.mesh.rotation.x += dt * 0.7;
      b.mesh.position.y = b.pos.y + Math.sin(this.time * 3 + b.pos.x) * 0.25;
    }
    for (const c of this.coinMeshes) { c.cd = Math.max(0, c.cd - dt); c.mesh.visible = c.cd <= 0; c.mesh.rotation.y += dt * 3; }
    for (const c of this.arenaCoins.values()) c.mesh.rotation.y += dt * 3;
  }

  checkPickups() {
    for (const k of this.karts) {
      if (!k.local || k.eliminated) continue;
      this.boxes.forEach((b, i) => {
        if (b.cd > 0) return;
        if (k.pos.distanceToSquared(b.pos) < 6.5) {
          b.cd = 2.5; this.send({ t: 'box', i });
          if (!k.item && k.roulette <= 0) { k.roulette = 1.1; if (k.human) sfx.box(); }
        }
      });
      this.coinMeshes.forEach((c, i) => {
        if (c.cd > 0) return;
        if (k.pos.distanceToSquared(c.pos) < 4.5) { c.cd = 10; this.send({ t: 'coin', i }); k.coins = Math.min(10, k.coins + 1); if (k.human) sfx.coin(); }
      });
      for (const [id, c] of this.arenaCoins) {
        if (k.pos.distanceToSquared(c.pos) < 5) { this.removeArenaCoin(id); this.send({ t: 'acoinrm', id }); k.coins++; if (k.human) sfx.coin(); }
      }
    }
  }
  addArenaCoin(id, x, z) { if (this.arenaCoins.has(id)) return; const m = makeItemMesh('coin'); m.position.set(x, 1, z); this.scene.add(m); this.arenaCoins.set(id, { pos: m.position, mesh: m }); }
  removeArenaCoin(id) { const c = this.arenaCoins.get(id); if (!c) return; this.scene.remove(c.mesh); this.arenaCoins.delete(id); }

  // ---------- reglas por modo ----------
  updateRules(dt) {
    const host = !this.net || this.net.isHost;
    // posiciones
    let order;
    if (this.battle) {
      const key = k => this.mode === 'globos' ? (k.eliminated ? 0 : 1000) + k.balloons * 100 + k.score : this.mode === 'monedas' ? k.coins : k.score;
      order = [...this.karts].sort((a, b) => key(b) - key(a));
    } else {
      order = [...this.karts].sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        if (a.finished) return this.finishOrder.indexOf(a.slot) - this.finishOrder.indexOf(b.slot);
        if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
        return b.progress - a.progress;
      });
    }
    order.forEach((k, i) => k.place = i + 1);
    this.order = order;

    // monedas que aparecen en arena (host)
    if (this.mode === 'monedas' && host) {
      this.coinSpawnT = (this.coinSpawnT || 0) - dt;
      if (this.coinSpawnT <= 0 && this.arenaCoins.size < 24) {
        this.coinSpawnT = 1.0;
        const p = this.world.randomFree(Math.random), id = `c${this.objSeq++}`;
        this.addArenaCoin(id, p.x, p.z); this.send({ t: 'acoin', id, x: p.x, z: p.z });
      }
    }
    if (!host || this.ended) return;
    // eliminación
    if (this.mode === 'elim') {
      this.elimT -= dt;
      if (this.elimT <= 0) {
        this.elimT = ELIM_EVERY;
        const alive = order.filter(k => !k.eliminated && !k.finished);
        if (alive.length > 1) { const last = alive[alive.length - 1]; this.eliminate(last); this.send({ t: 'elim', k: last.slot }); }
      }
      if (order.filter(k => !k.eliminated).length <= 1) return this.hostFinish();
    }
    if (this.battle) {
      const limit = BATTLE_TIME[this.mode];
      const alive = this.karts.filter(k => !k.eliminated);
      if (this.raceTime >= limit || (this.mode === 'globos' && alive.length <= 1)) return this.hostFinish();
    } else {
      const humans = this.karts.filter(k => k.human && !k.disconnected && !k.eliminated);
      const allHumansDone = humans.every(k => k.finished);
      const anyDone = this.finishOrder.length > 0;
      if (anyDone && this.endTimer === null) this.endTimer = this.raceTime;
      const waitMax = this.net && this.net.online ? 30 : 0;
      if ((allHumansDone && humans.length) || (anyDone && this.raceTime - this.endTimer > waitMax && waitMax > 0) || this.karts.every(k => k.finished || k.eliminated)) {
        if (this.doneHold === undefined) this.doneHold = this.raceTime;
        if (this.raceTime - this.doneHold > 2.5) this.hostFinish();
      }
    }
  }

  hostFinish() {
    if (this.ended) return;
    const res = this.order.map((k, i) => ({ slot: k.slot, name: k.name, place: i + 1, time: k.finished ? k.finishTime : null, score: k.score, coins: k.coins, balloons: k.balloons, out: k.eliminated, bot: k.bot }));
    this.send({ t: 'results', res });
    this.finish(res);
  }
  finish(res) {
    this.ended = true; engineUpdate(0, false); stopMusic();
    setTimeout(() => this.o.onEnd && this.o.onEnd(res), 600);
  }

  // ---------- IA ----------
  aiInput(k, dt, cruise = false) {
    const ai = k.ai || (k.ai = { lane: 0, laneT: 0, skill: 0.9, itemT: 0, driftT: 0, stuck: 0, rev: 0 });
    const w = this.world;
    let tx, tz, steer = 0, throttle = 1, drift = false, item = false;
    if (Math.abs(k.speed) < 2.5 && this.raceTime > 2) ai.stuck += dt; else ai.stuck = Math.max(0, ai.stuck - dt);
    if (ai.stuck > 1.2) { ai.rev = 0.9; ai.stuck = 0; }
    if (!w.isArena) {
      ai.laneT -= dt;
      if (ai.laneT <= 0) { ai.laneT = 2 + Math.random() * 3; ai.lane = (Math.random() - 0.5) * 0.9; }
      const look = 9 + Math.max(0, k.speed) * 0.45;
      const p = w.pointAt(k.s + look, ai.lane * w.W);
      tx = p.x; tz = p.z;
      // curvatura para derrapar
      const p2 = w.pointAt(k.s + look + 20, 0);
      const a1 = Math.atan2(p.tx, p.tz), a2 = Math.atan2(p2.tx, p2.tz), curv = wrapA(a2 - a1);
      if (!cruise && Math.abs(curv) > 0.5 && k.speed > 18 && ai.driftT <= 0 && !k.drift) ai.driftT = 0.9 + Math.random() * 1.6;
      if (ai.driftT > 0) { ai.driftT -= dt; drift = true; }
      if (ai.inked > 0) { ai.inked -= dt; steer += Math.sin(this.time * 7) * 0.4; }
    } else {
      // batalla: perseguir rival o caja / moneda
      ai.retarget = (ai.retarget || 0) - dt;
      if (ai.retarget <= 0 || !ai.goal) {
        ai.retarget = 1.5 + Math.random();
        let best = null, bd = 1e9;
        const wantBox = !k.item && k.roulette <= 0;
        if (wantBox) for (const b of this.boxes) if (b.cd <= 0) { const d = b.pos.distanceTo(k.pos); if (d < bd) { bd = d; best = { x: b.pos.x, z: b.pos.z }; } }
        if (this.mode === 'monedas') for (const c of this.arenaCoins.values()) { const d = c.pos.distanceTo(k.pos) * 0.7; if (d < bd) { bd = d; best = { x: c.pos.x, z: c.pos.z }; } }
        if (!best || !wantBox) for (const x of this.karts) if (x !== k && !x.eliminated) { const d = x.pos.distanceTo(k.pos) * (k.item ? 0.5 : 1.5); if (d < bd) { bd = d; best = { slot: x.slot }; } }
        ai.goal = best || this.world.randomFree(Math.random);
      }
      if (ai.goal.slot !== undefined) { const t = this.bySlot.get(ai.goal.slot); if (t && !t.eliminated) { tx = t.pos.x; tz = t.pos.z; } else { ai.goal = null; tx = 0; tz = 0; } }
      else { tx = ai.goal.x; tz = ai.goal.z; if (Math.hypot(tx - k.pos.x, tz - k.pos.z) < 3) ai.retarget = 0; }
      // evitar obstáculos
      const fx = Math.sin(k.heading), fz = Math.cos(k.heading);
      const px = k.pos.x + fx * 7, pz = k.pos.z + fz * 7;
      if (!w.free(px, pz, 1.5)) {
        const lx = k.pos.x + Math.sin(k.heading + 0.8) * 7, lz = k.pos.z + Math.cos(k.heading + 0.8) * 7;
        ai.avoid = w.free(lx, lz, 1.5) ? 1 : -1;
        tx = k.pos.x + Math.sin(k.heading + ai.avoid * 1.2) * 10; tz = k.pos.z + Math.cos(k.heading + ai.avoid * 1.2) * 10;
      }
    }
    const want = Math.atan2(tx - k.pos.x, tz - k.pos.z);
    const diff = wrapA(want - k.heading);
    steer += clamp(-diff * 2.4, -1, 1);
    if (w.isArena && Math.abs(diff) > 1.8 && k.speed < 10) throttle = 0.6;
    if (ai.rev > 0) { ai.rev -= dt; throttle = -1; steer = -steer; }
    if (k.drift) steer = clamp(steer, -1, 1);
    // items
    if (k.item && !cruise) {
      ai.itemT -= dt;
      if (ai.itemT <= 0) {
        const base = k.item.replace('3', '');
        const behind = this.karts.some(x => x !== k && !x.eliminated && x.place === k.place + 1 && k.pos.distanceTo(x.pos) < 30);
        const fx = Math.sin(k.heading), fz = Math.cos(k.heading);
        const aheadClose = this.karts.some(x => { if (x === k || x.eliminated) return false; const dx = x.pos.x - k.pos.x, dz = x.pos.z - k.pos.z, d = Math.hypot(dx, dz); return d < 45 && (dx * fx + dz * fz) / d > 0.85; });
        if (['cascara', 'falsa'].includes(base)) { if (behind || Math.random() < 0.02 || w.isArena) item = true; }
        else if (base === 'disco' || base === 'bomba') { if (aheadClose || Math.random() < 0.01) item = true; }
        else item = true;
        if (item) ai.itemT = 0.5 + Math.random() * 1.5;
      }
    }
    return { steer: clamp(steer, -1, 1), throttle, drift, item };
  }

  // ---------- render ----------
  render(dt) {
    for (const k of this.karts) {
      const m = k.model, u = m.userData;
      if (k.eliminated) { m.visible = false; continue; }
      m.position.copy(k.pos);
      m.rotation.y = k.heading;
      u.body.rotation.y = k.visYaw;
      const lean = u.lean ? clamp(-(k.drift ? k.drift * 0.45 : 0) - (k.local ? 0 : 0), -0.6, 0.6) : 0;
      u.body.rotation.z = k.tumble > 0 ? Math.sin(k.tumble * 9) * 1.2 : lean;
      u.body.rotation.x = -Math.atan(k.slope || 0);
      if (k.vehicleHover || k.v.hover) u.body.position.y = Math.sin(this.time * 4 + k.slot) * 0.12;
      const sc = k.mini > 0 ? 0.55 : 1; m.scale.setScalar(sc);
      k.wheelRot += k.speed * dt * 1.8; for (const wh of u.wheels) wh.rotation.x = k.wheelRot;
      const lvl = k.local ? this.chargeLvl(k) : (k.remoteLvl || 0);
      u.sparks.visible = !!k.drift && lvl > 0 && (Math.floor(this.time * 30) % 2 === 0);
      if (lvl) u.sparks.children.forEach(s => s.material.color.setHex([0, 0x4cc9f0, 0xff9e00, 0xd16eff][lvl]));
      u.flame.visible = k.boost > 0; if (k.boost > 0) u.flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
      u.aura.visible = k.star > 0; if (k.star > 0) u.aura.material.color.setHSL((this.time * 2) % 1, 1, 0.6);
      m.visible = !(k.invuln > 0 && k.local && k.spin <= 0 && k.tumble <= 0 && Math.floor(this.time * 12) % 2);
      // no tapar la cámara con karts que pasan muy cerca
      if (k !== this.me && this.camPos && this.camPos.distanceToSquared(k.pos) < 16) m.visible = false;
    }
    // cámara
    const k = this.me;
    const fx = Math.sin(k.heading), fz = Math.cos(k.heading);
    const dist = 7.5 + Math.min(3, Math.max(0, k.speed) * 0.06), hgt = 3.2;
    const want = tmpV.set(k.pos.x - fx * dist, k.pos.y + hgt, k.pos.z - fz * dist);
    if (this.battle) { const q = this.world.query(want.x, want.y, want.z); if (q.push) { want.x += q.push.x; want.z += q.push.z; } }
    const a = 1 - Math.exp(-(this.time < 0 ? 3 : 9) * dt);
    if (this.time < -2.5) { // vuelo introductorio
      const t = (this.time + 3.6) / 1.1;
      this.camPos.set(k.pos.x + Math.sin(t * 2) * 25, k.pos.y + 10 - t * 6, k.pos.z + Math.cos(t * 2) * 25);
    } else this.camPos.lerp(want, a);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(k.pos.x + fx * 4, k.pos.y + 1.4, k.pos.z + fz * 4);
    const fov = 70 + (k.boost > 0 ? 10 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.1) { this.camera.fov += (fov - this.camera.fov) * 0.1; this.camera.updateProjectionMatrix(); }
    this.r.render(this.scene, this.camera);
    this.drawHud(dt);
  }

  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }

  flash(text, dur = 0.9) { const el = this.hudEl.querySelector('#bigMsg'); el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(this._fl); this._fl = setTimeout(() => el.classList.remove('show'), dur * 1000); }
  msg(text) { const el = this.hudEl.querySelector('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(this._ms); this._ms = setTimeout(() => el.classList.remove('show'), 1600); }

  drawHud(dt) {
    const h = this.hudEl, k = this.me;
    this.hudT = (this.hudT || 0) - dt;
    // tinta
    this.inkT = Math.max(0, this.inkT - dt); h.querySelector('#ink').style.opacity = Math.min(1, this.inkT / 1.5) * 0.92;
    this.zapFlash = Math.max(0, this.zapFlash - dt); h.querySelector('#zap').style.opacity = this.zapFlash * 2;
    if (this.hudT > 0) { this.drawMinimap(); return; }
    this.hudT = 0.08;
    const fmt = t => { const m = Math.floor(t / 60), s = (t % 60); return `${m}:${s.toFixed(2).padStart(5, '0')}`; };
    const pos = h.querySelector('#pos'), lap = h.querySelector('#lap'), tm = h.querySelector('#time'), coins = h.querySelector('#coins'), itemEl = h.querySelector('#item');
    if (this.battle) {
      const left = Math.max(0, BATTLE_TIME[this.mode] - this.raceTime);
      tm.textContent = '⏱ ' + fmt(left).slice(0, -3);
      pos.innerHTML = `${k.place}<small>º</small>`;
      lap.textContent = this.mode === 'globos' ? '🎈'.repeat(k.balloons) + `  ⭐${k.score}` : this.mode === 'monedas' ? `🪙 ${k.coins}` : `💥 ${k.score}`;
      coins.textContent = '';
    } else {
      tm.textContent = fmt(Math.max(0, this.raceTime));
      pos.innerHTML = this.mode === 'tt' ? '' : `${k.place}<small>º</small>`;
      lap.textContent = `Vuelta ${clamp(k.lap, 1, this.laps)}/${this.laps}` + (this.mode === 'elim' ? `  💀 ${Math.ceil(this.elimT)}s` : '');
      coins.textContent = `🪙 ${k.coins}`;
    }
    if (k.roulette > 0) { const keys = Object.keys(ITEMS); itemEl.textContent = ITEMS[keys[Math.floor(this.time * 15) % keys.length]].icon.slice(0, 2); itemEl.classList.add('roll'); }
    else { itemEl.classList.remove('roll'); itemEl.textContent = k.item ? (k.itemCount > 1 ? ITEMS[k.item.replace('3', '')].icon.repeat(k.itemCount) : ITEMS[k.item.replace('3', '')].icon) : ''; }
    // tabla lateral
    if (this.order) {
      const list = h.querySelector('#ranking');
      list.innerHTML = this.order.slice(0, 12).map(x => `<div class="${x === k ? 'me' : ''} ${x.eliminated ? 'out' : ''}"><b>${x.place}</b> <i style="background:#${x.color.toString(16).padStart(6, '0')}"></i>${x.name}${this.battle ? ` <span>${this.mode === 'globos' ? '🎈' + x.balloons : this.mode === 'monedas' ? '🪙' + x.coins : '💥' + x.score}</span>` : ''}</div>`).join('');
    }
    this.drawMinimap();
  }
  drawMinimap() {
    const g = this.mmG, c = this.mm; g.clearRect(0, 0, c.width, c.height); g.drawImage(this.mmBg, 0, 0);
    for (const o of this.objects.values()) { const [x, y] = this.mmTf(o.pos.x, o.pos.z); g.fillStyle = o.type === 'rojo' ? '#f33' : o.type === 'lider' ? '#39f' : '#fd0'; g.fillRect(x - 1.5, y - 1.5, 3, 3); }
    for (const k of this.karts) {
      if (k.eliminated) continue;
      const [x, y] = this.mmTf(k.pos.x, k.pos.z);
      g.fillStyle = '#' + k.color.toString(16).padStart(6, '0'); g.strokeStyle = k === this.me ? '#fff' : '#000'; g.lineWidth = k === this.me ? 2.5 : 1;
      g.beginPath(); g.arc(x, y, k === this.me ? 5 : 3.5, 0, 6.3); g.fill(); g.stroke();
    }
  }

  dispose() {
    stopMusic(); engineUpdate(0, false);
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (m.map && m.map !== getBoxTex()) m.map.dispose(); m.dispose(); }); } });
  }
}
