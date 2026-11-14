import { useEffect, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { playIntro, soundEnabled, unlockAudio } from "../lib/sound";
import { LogoMark } from "./LogoMark";

const SEEN_KEY = "ballot:intro-seen";
const PLAY_MS = 2300; // ballot appears → ticked → drops into the block → seal → wordmark
const REDUCED_MS = 700; // reduced motion: a still logo, briefly
const EXIT_MS = 450;

/** Has this browser session already seen the intro? (storage can throw in private modes — then just skip it) */
function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * How far the logo animation already is, on the browser's own animation clock. Waits for the animation to
 * really start first: on a busy page load the first frame can be hundreds of ms after React mounts it,
 * and scheduling the sound before that would put the "thunk" ahead of the ballot.
 */
async function introElapsedMs(): Promise<number> {
  const anim = document.getAnimations().find((a) => (a as CSSAnimation).animationName === "lm-cube-in");
  if (!anim) return 0;
  await anim.ready.catch(() => {});
  const now = document.timeline.currentTime;
  if (typeof now !== "number" || typeof anim.startTime !== "number") return 0;
  return Math.max(0, now - anim.startTime);
}

/**
 * Brand intro, once per browser session, over the app (which keeps loading underneath, so data is
 * never delayed). Any click, tap or key skips it. Decorative: screen readers go straight to the app.
 */
export function IntroSplash() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"play" | "exit" | "done">(() => (alreadySeen() ? "done" : "play"));

  useEffect(() => {
    if (phase !== "play" || !soundEnabled()) return;
    let cancelled = false;
    // Browsers block sound until the visitor has interacted with the page, so on most first visits this
    // stays silent (owner's choice: no click-to-enter gate). When sound is allowed, every cue is placed on
    // the animation's own clock, so the drop sound lands exactly as the ballot hits the box.
    void (async () => {
      const running = await unlockAudio();
      if (!running || cancelled) return;
      const elapsed = await introElapsedMs();
      if (!cancelled) playIntro(elapsed);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the intro starts
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    const exit = setTimeout(() => setPhase("exit"), reduce ? REDUCED_MS : PLAY_MS);
    const skip = () => setPhase("exit");
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      clearTimeout(exit);
      window.removeEventListener("keydown", skip);
    };
  }, [phase, reduce]);

  useEffect(() => {
    if (phase !== "exit") return;
    const t = setTimeout(() => setPhase("done"), reduce ? 150 : EXIT_MS);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  if (phase === "done") return null;
  return (
    <div
      className={`intro ${phase === "exit" ? "intro-exit" : ""} ${reduce ? "intro-still" : ""}`}
      aria-hidden="true"
      data-testid="intro"
      onPointerDown={() => setPhase("exit")}
    >
      <div className="intro-stage">
        <LogoMark size={148} animated={!reduce} />
        <p className="intro-word">Ballot</p>
        <p className="intro-tag">Verifiable, tamper‑proof voting</p>
      </div>
      <p className="intro-skip">Tap or press any key to skip</p>
    </div>
  );
}
