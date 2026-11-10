// The sound of a page turning, synthesised in the browser with the Web Audio
// API, so there are no audio files to load. One turn has three layers: the
// swish of air as the leaf sweeps over, the crinkle of the paper flexing, and
// a soft flap as it settles. Each is varied at random, so no two turns sound
// quite the same.
//
// Browsers only let a page make sound after the reader has tapped, clicked or
// pressed a key. <SoundUnlock> (components/site/sound-toggle.tsx) wakes the
// audio on each of those, and <SoundToggle> lets the reader switch the sound
// off; the choice is remembered in this browser.

const STORAGE_KEY = "aed-page-sound";
/** Overall loudness. Page turns should be heard, not noticed. */
const VOLUME = 0.42;
/** Let the audio hardware sleep after this long without a sound. */
const IDLE_MS = 8000;

/* ------------------------------------------------------------------------ */
/* The on/off switch                                                         */

const listeners = new Set<() => void>();
let enabled: boolean | null = null;

/** Page-turn sounds are on unless the reader has switched them off. */
export function isSoundOn(): boolean {
  if (enabled === null) {
    try {
      enabled = window.localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      enabled = true;
    }
  }
  return enabled;
}

export function setSoundOn(on: boolean): void {
  enabled = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage is blocked (a private window, say): the choice lasts this visit.
  }
  if (!on) sleep();
  listeners.forEach((notify) => notify());
}

/** For useSyncExternalStore. Also follows a change made in another tab. */
export function subscribeSound(notify: () => void): () => void {
  function onStorage(e: StorageEvent) {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    enabled = e.newValue !== "off";
    notify();
  }
  listeners.add(notify);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

/* ------------------------------------------------------------------------ */
/* The audio engine                                                          */

interface Engine {
  ctx: AudioContext;
  out: AudioNode;
  noise: AudioBuffer;
}

let engine: Engine | null = null;
let wokeAt = Number.NEGATIVE_INFINITY;
let idleTimer: number | undefined;

function getEngine(): Engine | null {
  if (engine) return engine;
  const Ctor =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    const ctx = new Ctor({ latencyHint: "interactive" });
    // A gentle limiter, so a riffle through many pages never clips.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 8;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    limiter.connect(ctx.destination);
    engine = { ctx, out: limiter, noise: pinkNoise(ctx, 2.5) };
  } catch {
    return null;
  }
  return engine;
}

/**
 * Starts the audio if it's asleep. Browsers only allow that during a tap,
 * click or key press, so call it from one.
 */
export function wakeSound(): void {
  if (!isSoundOn()) return;
  const e = getEngine();
  if (!e || e.ctx.state === "running") return;
  wokeAt = performance.now();
  e.ctx.resume().catch(() => {});
  sleepWhenIdle(e);
}

function sleep(): void {
  window.clearTimeout(idleTimer);
  if (engine?.ctx.state === "running") engine.ctx.suspend().catch(() => {});
}

function sleepWhenIdle(e: Engine): void {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (e.ctx.state === "running") e.ctx.suspend().catch(() => {});
  }, IDLE_MS);
}

export interface PageTurnOptions {
  /** How many leaves turn. More than one riffles through them. */
  leaves?: number;
  /** 1 turns forward (the leaf travels right to left); -1 turns back. */
  direction?: 1 | -1;
  /** Seconds one leaf takes to turn. */
  seconds?: number;
  /** Seconds between one leaf and the next in a riffle. */
  stagger?: number;
}

/** Plays the sound of one page turning, or of riffling through several. */
export function playPageTurn({ leaves = 1, direction = 1, seconds = 0.66, stagger = 0.055 }: PageTurnOptions = {}): void {
  if (!isSoundOn()) return;
  const e = getEngine();
  if (!e) return;
  if (e.ctx.state !== "running") {
    wakeSound();
    // Not woken just now: the audio is blocked. Sounds queued now would all
    // burst out later, whenever it next starts, so skip this one.
    if (performance.now() - wokeAt > 1500) return;
  }
  const count = Math.max(1, Math.min(12, Math.round(leaves)));
  for (let n = 0; n < count; n++) {
    const last = n === count - 1;
    leaf(e, {
      start: n * stagger,
      seconds,
      direction,
      // The page you end up on is heard clearly; the ones before it flutter.
      level: last ? 1 : 0.15 + 0.5 / Math.sqrt(count - 1),
    });
  }
  sleepWhenIdle(e);
}

/* ------------------------------------------------------------------------ */
/* Synthesis                                                                 */

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Pink noise (softer than white): the raw material for air and paper. */
function pinkNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = b0 + b1 + b2 + white * 0.1848;
    peak = Math.max(peak, Math.abs(data[i]));
  }
  for (let i = 0; i < length; i++) data[i] /= peak;
  return buffer;
}

/**
 * Tiny clicks scattered through the turn: paper fibres flexing. Most come as
 * the leaf bends away from the stack, and a few as it lands.
 */
function crinkle(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.ceil(seconds * rate);
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  const grains = Math.round(rand(16, 24) * (seconds / 0.66));
  for (let g = 0; g < grains; g++) {
    const r = Math.random();
    const at = r < 0.5 ? rand(0, 0.3) : r < 0.75 ? rand(0.3, 0.75) : rand(0.75, 0.95);
    const start = Math.floor(at * length);
    const amp = rand(0.25, 1) * (at < 0.3 ? 1 : 0.6);
    const tau = rand(0.0004, 0.0022) * rate;
    const span = Math.min(length - start, Math.ceil(tau * 6));
    for (let i = 0; i < span; i++) data[start + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / tau);
  }
  return buffer;
}

/** A gain that follows a smooth bump: silent, rising to `peak`, silent again. */
function bump(ctx: BaseAudioContext, at: number, seconds: number, peak: number, crest = 0.42): GainNode {
  const gain = ctx.createGain();
  const steps = 64;
  const curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const x = i / (steps - 1);
    // Skewed so it peaks at `crest` of the way through.
    const phase = x < crest ? (x / crest) * 0.5 : 0.5 + ((x - crest) / (1 - crest)) * 0.5;
    curve[i] = peak * Math.sin(Math.PI * phase) ** 2;
  }
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.setValueCurveAtTime(curve, at, seconds);
  return gain;
}

function leaf(
  e: Engine,
  { start, seconds, direction, level }: { start: number; seconds: number; direction: 1 | -1; level: number },
): void {
  const { ctx, noise } = e;
  const t0 = ctx.currentTime + 0.01 + start;
  const d = seconds * rand(0.9, 1.08);
  const end = t0 + d + 0.25;

  // Everything pans with the leaf as it crosses the book.
  const bus = ctx.createGain();
  bus.gain.value = level * VOLUME;
  if (typeof ctx.createStereoPanner === "function") {
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(0.4 * direction, t0);
    pan.pan.linearRampToValueAtTime(-0.4 * direction, t0 + d);
    bus.connect(pan).connect(e.out);
  } else {
    bus.connect(e.out);
  }

  // 1. Swish: air pushed aside by the leaf, brightest when it moves fastest.
  const air = ctx.createBufferSource();
  air.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = rand(0.6, 1);
  const low = rand(600, 900);
  band.frequency.setValueAtTime(low, t0);
  band.frequency.exponentialRampToValueAtTime(low * rand(3, 4), t0 + d * 0.45);
  band.frequency.exponentialRampToValueAtTime(low * 1.6, t0 + d);
  air.connect(band).connect(bump(ctx, t0, d * 0.95, 0.9)).connect(bus);
  air.start(t0, rand(0, Math.max(0, noise.duration - d - 0.3)));
  air.stop(end);

  // 2. Crinkle: the paper itself.
  const paper = ctx.createBufferSource();
  paper.buffer = crinkle(ctx, d);
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = rand(1600, 2400);
  const soft = ctx.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 9000;
  const grit = ctx.createGain();
  grit.gain.value = 0.3;
  paper.connect(high).connect(soft).connect(grit).connect(bus);
  paper.start(t0);
  paper.stop(end);

  // 3. Flap: the leaf settling onto the page beneath it.
  const flap = ctx.createBufferSource();
  flap.buffer = noise;
  const muffle = ctx.createBiquadFilter();
  muffle.type = "lowpass";
  muffle.frequency.value = rand(650, 950);
  muffle.Q.value = 0.6;
  const thud = ctx.createGain();
  const tf = t0 + d * rand(0.8, 0.88);
  thud.gain.setValueAtTime(0.0001, ctx.currentTime);
  thud.gain.setValueAtTime(0.0001, tf);
  thud.gain.exponentialRampToValueAtTime(1, tf + 0.012);
  thud.gain.exponentialRampToValueAtTime(0.0001, tf + 0.12);
  flap.connect(muffle).connect(thud).connect(bus);
  flap.start(tf, rand(0, 1.5));
  flap.stop(tf + 0.15);
}
