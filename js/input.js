// ===== Controles: teclado, táctil (3 modos) y gamepad =====
const keys = new Set();
let itemPressed = false, touchActive = false;
const touch = { steer: 0, drift: false, brake: false, item: false, left: false, right: false };
const cfg = { mode: 'botones', autoAccel: true, autoDrift: true, tiltInvert: false, tiltSens: 22 };
let tilt = { raw: 0, zero: 0, ok: false };

addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  keys.add(e.code);
  if (['KeyX', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyL'].includes(e.code) && !e.repeat) itemPressed = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

export function isTouchDevice() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; }

export function setTouchConfig(c) {
  Object.assign(cfg, c);
  document.body.dataset.touchmode = cfg.mode;
  if (cfg.mode === 'inclinacion') enableTilt();
}
export function calibrateTilt() { tilt.zero = tilt.raw; }

function onOrient(e) {
  const ang = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
  // en horizontal, girar el teléfono como volante cambia "beta"
  let v = ang === 90 ? e.beta : ang === -90 || ang === 270 ? -e.beta : e.gamma;
  if (v == null) return;
  tilt.raw = v; tilt.ok = true;
}
let tiltOn = false;
export async function enableTilt() {
  if (tiltOn) return true;
  try {
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return false;
    }
    addEventListener('deviceorientation', onOrient); tiltOn = true; return true;
  } catch (e) { return false; }
}

export function setupTouch(root) {
  const zone = root.querySelector('#steerZone'), base = root.querySelector('#joyBase'), knob = root.querySelector('#joyKnob');
  const bl = root.querySelector('#btnLeft'), br = root.querySelector('#btnRight');
  // --- joystick flotante: aparece donde tocas ---
  let id = null, x0 = 0, y0 = 0; const range = 55;
  zone.addEventListener('pointerdown', e => {
    if (cfg.mode !== 'joystick') return;
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY; zone.setPointerCapture(id); touchActive = true;
    const r = zone.getBoundingClientRect();
    base.style.left = (x0 - r.left) + 'px'; base.style.top = (y0 - r.top) + 'px'; base.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)';
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    const dx = Math.max(-range, Math.min(range, e.clientX - x0));
    const v = dx / range; touch.steer = Math.sign(v) * Math.min(1, Math.max(0, (Math.abs(v) - 0.08) / 0.92)) ** 1.3;
    knob.style.transform = `translate(calc(-50% + ${dx}px),-50%)`;
  });
  const end = e => { if (e.pointerId !== id) return; id = null; touch.steer = 0; base.classList.remove('on'); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  // --- botones grandes izquierda / derecha ---
  const hold = (el, prop, cb) => {
    el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); touch[prop] = true; touchActive = true; el.classList.add('on'); cb && cb(); });
    const up = () => { touch[prop] = false; el.classList.remove('on'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  };
  hold(bl, 'left'); hold(br, 'right');
  hold(root.querySelector('#btnDrift'), 'drift'); hold(root.querySelector('#btnBrake'), 'brake');
  hold(root.querySelector('#btnItem'), 'item', () => { itemPressed = true; });
}

export function setAutoAccel(v) { cfg.autoAccel = v; }

export function readInput() {
  let steer = 0, throttle = 0, drift = false;
  const k = c => keys.has(c);
  if (k('ArrowLeft') || k('KeyA')) steer -= 1;
  if (k('ArrowRight') || k('KeyD')) steer += 1;
  if (k('ArrowUp') || k('KeyW')) throttle += 1;
  if (k('ArrowDown') || k('KeyS')) throttle -= 1;
  if (k('Space') || k('KeyC') || k('KeyK')) drift = true;
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gps) {
    if (!gp) continue;
    const ax = gp.axes[0] || 0; if (Math.abs(ax) > 0.15) steer += Math.sign(ax) * (Math.abs(ax) - 0.15) / 0.85;
    if (gp.buttons[0]?.pressed || gp.buttons[7]?.value > 0.2) throttle += gp.buttons[7]?.value || 1;
    if (gp.buttons[1]?.pressed || gp.buttons[6]?.value > 0.2) throttle -= 1;
    if (gp.buttons[5]?.pressed || gp.buttons[4]?.pressed) drift = true;
    if (gp.buttons[2]?.pressed || gp.buttons[3]?.pressed) { if (!gp._it) itemPressed = true; gp._it = true; } else gp._it = false;
    if (gp.buttons[14]?.pressed) steer -= 1; if (gp.buttons[15]?.pressed) steer += 1;
  }
  let autoDrift = false;
  if (touchActive) {
    if (cfg.mode === 'joystick') steer += touch.steer;
    else if (cfg.mode === 'inclinacion' && tilt.ok) { const v = (tilt.raw - tilt.zero) / cfg.tiltSens * (cfg.tiltInvert ? -1 : 1); steer += Math.sign(v) * Math.min(1, Math.max(0, (Math.abs(v) - 0.06) / 0.94)); }
    else steer += (touch.right ? 1 : 0) - (touch.left ? 1 : 0);
    if (touch.brake) throttle = -1; else if (cfg.autoAccel) throttle = Math.max(throttle, 1);
    if (touch.drift) drift = true;
    autoDrift = cfg.autoDrift;
  }
  const item = itemPressed; itemPressed = false;
  return { steer: Math.max(-1, Math.min(1, steer)), throttle: Math.max(-1, Math.min(1, throttle)), drift, item, autoDrift };
}
