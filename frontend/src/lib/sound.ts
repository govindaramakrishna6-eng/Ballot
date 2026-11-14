// Small synthesised sound set (Web Audio API): no audio files, nothing to download, CSP-safe.
// Browsers only allow sound after the visitor has interacted with the page, so every function
// fails silently until `unlockAudio()` succeeds (it is called on the first click/tap/key).

const KEY = "ballot:sound";
const CHANGE = "ballot:sound-change";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function onSoundChange(cb: () => void): () => void {
  window.addEventListener(CHANGE, cb);
  return () => window.removeEventListener(CHANGE, cb);
}

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  return ctx;
}

/** Tries to start audio; resolves true when sound can actually play now. */
export async function unlockAudio(): Promise<boolean> {
  const c = context();
  if (!c) return false;
  if (c.state !== "running") {
    // When autoplay is blocked, Chrome leaves resume() pending until a gesture instead of rejecting,
    // so don't wait on it forever: give it 200ms, then report what we have.
    const timeout = new Promise((r) => setTimeout(r, 200));
    await Promise.race([c.resume().catch(() => {}), timeout]);
  }
  return c.state === "running";
}

export function audioRunning(): boolean {
  return ctx?.state === "running";
}

/** Unlock on the first gesture anywhere, so later sounds (vote recorded) can play. */
export function installAudioUnlock(): void {
  const go = () => void unlockAudio();
  window.addEventListener("pointerdown", go, { once: true, capture: true });
  window.addEventListener("keydown", go, { once: true, capture: true });
}

// ---- primitives -------------------------------------------------------------

function noise(at: number, dur: number, opts: { type: BiquadFilterType; freq: number; q?: number; gain: number; attack?: number }) {
  const c = ctx!;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = opts.type;
  filter.frequency.value = opts.freq;
  filter.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  const a = opts.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(opts.gain, at + a);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(master!);
  src.start(at);
  src.stop(at + dur + 0.02);
}

function tone(at: number, freq: number, dur: number, opts: { gain: number; type?: OscillatorType; glideTo?: number }) {
  const c = ctx!;
  const osc = c.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, at);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, at + dur * 0.8);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(opts.gain, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(master!);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

// ---- the sounds ---------------------------------------------------------------

/** Paper sliding — the ballot appears. */
const slide = (t: number) => noise(t, 0.26, { type: "bandpass", freq: 2600, q: 0.7, gain: 0.09, attack: 0.08 });
/** A pen tick on paper. */
const tick = (t: number) => noise(t, 0.06, { type: "highpass", freq: 3800, gain: 0.12, attack: 0.004 });
/** The ballot dropping into the box: a soft wooden thunk. */
function thunk(t: number) {
  tone(t, 150, 0.24, { gain: 0.5, glideTo: 58 });
  noise(t, 0.09, { type: "lowpass", freq: 420, gain: 0.25, attack: 0.003 });
}
/** Sealed / recorded: a gentle two-note chime (E6 → B6). */
function chime(t: number) {
  tone(t, 1318.5, 0.9, { gain: 0.11 });
  tone(t + 0.09, 1975.5, 1.0, { gain: 0.08 });
  tone(t, 659.25, 0.6, { gain: 0.04, type: "triangle" });
}

/** The intro, timed to the logo animation (ballot appears → ticked → drops in → seal). */
export function playIntro(): void {
  if (!soundEnabled() || !audioRunning()) return;
  const t = ctx!.currentTime + 0.02;
  slide(t + 0.42);
  tick(t + 0.72);
  tick(t + 0.8);
  thunk(t + 1.42);
  chime(t + 1.5);
}

/** For an intro already under way (sound enabled late): just the drop + seal, now. */
export function playLand(): void {
  if (!soundEnabled() || !audioRunning()) return;
  const t = ctx!.currentTime + 0.02;
  thunk(t);
  chime(t + 0.08);
}

/** A vote or poll was recorded on-chain. */
export function playRecorded(): void {
  if (!soundEnabled() || !audioRunning()) return;
  const t = ctx!.currentTime + 0.02;
  thunk(t);
  chime(t + 0.1);
}
