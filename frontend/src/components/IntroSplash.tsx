import { useEffect, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { playIntro, playLand, soundEnabled, unlockAudio } from "../lib/sound";
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
 * Brand intro, once per browser session, over the app (which keeps loading underneath, so data is
 * never delayed). Any click, tap or key skips it. Decorative: screen readers go straight to the app.
 */
export function IntroSplash() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"play" | "exit" | "done">(() => (alreadySeen() ? "done" : "play"));
  // Browsers block sound until the visitor interacts; if that happens we offer a small "Tap for sound".
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    if (phase !== "play" || !soundEnabled()) return;
    let cancelled = false;
    void unlockAudio().then((running) => {
      if (cancelled) return;
      if (running) playIntro();
      else setNeedsTap(true);
    });
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
      {needsTap && phase === "play" && (
        <button
          type="button"
          className="intro-sound"
          data-testid="intro-sound"
          // Enables sound without skipping the intro (the backdrop's tap would skip it).
          onPointerDown={(e) => {
            e.stopPropagation();
            void unlockAudio().then((ok) => ok && playLand());
            setNeedsTap(false);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
          </svg>
          Tap for sound
        </button>
      )}
      <p className="intro-skip">Tap or press any key to skip</p>
    </div>
  );
}
