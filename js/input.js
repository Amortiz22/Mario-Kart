// ===== Controles: teclado, táctil y gamepad =====
const keys = new Set();
let itemPressed = false, touchActive = false;
const touch = { steer: 0, drift: false, brake: false, item: false };

addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  keys.add(e.code);
  if (['KeyX', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyL'].includes(e.code) && !e.repeat) itemPressed = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

export function isTouchDevice() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; }

export function setupTouch(root) {
  const pad = root.querySelector('#steerPad'), knob = root.querySelector('#steerKnob');
  let id = null, x0 = 0;
  const range = 70;
  pad.addEventListener('pointerdown', e => { id = e.pointerId; x0 = e.clientX; pad.setPointerCapture(id); touchActive = true; knob.style.transform = 'translateX(0px)'; });
  pad.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    const dx = Math.max(-range, Math.min(range, e.clientX - x0));
    touch.steer = dx / range; knob.style.transform = `translateX(${dx}px)`;
  });
  const end = e => { if (e.pointerId !== id) return; id = null; touch.steer = 0; knob.style.transform = 'translateX(0px)'; };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  const hold = (sel, prop) => {
    const el = root.querySelector(sel);
    el.addEventListener('pointerdown', e => { e.preventDefault(); touch[prop] = true; touchActive = true; if (prop === 'item') itemPressed = true; el.classList.add('on'); });
    const up = () => { touch[prop] = false; el.classList.remove('on'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up);
  };
  hold('#btnDrift', 'drift'); hold('#btnBrake', 'brake'); hold('#btnItem', 'item');
}

let autoAccel = true;
export function setAutoAccel(v) { autoAccel = v; }

export function readInput() {
  let steer = 0, throttle = 0, drift = false;
  const k = c => keys.has(c);
  if (k('ArrowLeft') || k('KeyA')) steer -= 1;
  if (k('ArrowRight') || k('KeyD')) steer += 1;
  if (k('ArrowUp') || k('KeyW')) throttle += 1;
  if (k('ArrowDown') || k('KeyS')) throttle -= 1;
  if (k('Space') || k('KeyC') || k('KeyK')) drift = true;
  // gamepad
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gps) {
    if (!gp) continue;
    const ax = gp.axes[0] || 0; if (Math.abs(ax) > 0.15) steer += ax;
    if (gp.buttons[0]?.pressed || gp.buttons[7]?.value > 0.2) throttle += gp.buttons[7]?.value || 1;
    if (gp.buttons[1]?.pressed || gp.buttons[6]?.value > 0.2) throttle -= 1;
    if (gp.buttons[5]?.pressed || gp.buttons[4]?.pressed) drift = true;
    if (gp.buttons[2]?.pressed || gp.buttons[3]?.pressed) { if (!gp._it) itemPressed = true; gp._it = true; } else gp._it = false;
    if (gp.buttons[14]?.pressed) steer -= 1; if (gp.buttons[15]?.pressed) steer += 1;
  }
  if (touchActive) {
    steer += touch.steer;
    if (touch.brake) throttle = -1; else if (autoAccel) throttle = Math.max(throttle, 1);
    if (touch.drift) drift = true;
  }
  const item = itemPressed; itemPressed = false;
  return { steer: Math.max(-1, Math.min(1, steer)), throttle: Math.max(-1, Math.min(1, throttle)), drift, item };
}
