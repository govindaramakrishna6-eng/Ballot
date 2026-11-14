import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { useReducedMotion } from "../hooks/useReducedMotion";

const DONE_KEY = "ballot:tour-done";
export const START_TOUR_EVENT = "ballot:start-tour";

type Step = { selector: string; title: string; body: string };

/** The tour, in the order a new user actually uses the product. Selectors are tried in order. */
const STEPS: Step[] = [
  {
    selector: ".header-wallet",
    title: "Connect your wallet",
    body: "Start here. MetaMask or any browser wallet works — no sign-up or password. Your wallet is your identity.",
  },
  {
    selector: ".hero-ctas .btn-primary",
    title: "Create a poll",
    body: "Ask a question with 2–10 options and pick a deadline. It goes on the blockchain, so nobody can edit it later.",
  },
  {
    selector: '[data-testid="featured-cta"], [data-testid="open-poll-card"] .btn-primary',
    title: "Vote",
    body: "Open any poll and cast your vote. Each wallet gets exactly one vote, enforced by the contract itself.",
  },
  {
    selector: 'nav[aria-label="Main"] a[href="/results"]',
    title: "Watch the results",
    body: "Results update live as votes land — and every count can be checked on Etherscan.",
  },
  {
    selector: '[data-testid="block-ribbon"]',
    title: "The live blockchain",
    body: "These boxes are real blocks. Green ones carry Ballot votes. Hover a block to see what's inside.",
  },
];

function doneAlready(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return true;
  }
}
function markDone() {
  try {
    localStorage.setItem(DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** The first visible element for a step, if it's on the page. */
function find(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * First-visit guide: an animated pointer moves to each part of the page and "taps" it, with a soft
 * spotlight and a small card (Back / Next / Skip). Shown once per browser, after the intro; can be
 * replayed from the footer. Escape skips. Steps whose element isn't on the page are skipped.
 */
export function OnboardingTour() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tapping, setTapping] = useState(false);
  const nextBtn = useRef<HTMLButtonElement>(null);

  const finish = useCallback(() => {
    markDone();
    setIndex(null);
    setRect(null);
  }, []);

  /** Go to step `from`, skipping steps whose element isn't on the page (direction dir); past the end = done. */
  const go = useCallback(
    (from: number, dir: 1 | -1 = 1) => {
      let i = from;
      while (i >= 0 && i < STEPS.length && !find(STEPS[i].selector)) i += dir;
      if (i >= STEPS.length) finish();
      else if (i >= 0) setIndex(i);
    },
    [finish],
  );

  // Auto-start on the homepage for first-time visitors, once the intro is gone and the page has settled.
  useEffect(() => {
    if (pathname !== "/" || index !== null || doneAlready()) return;
    let settledFor = 0;
    const id = setInterval(() => {
      const introGone = !document.querySelector('[data-testid="intro"]');
      settledFor = introGone ? settledFor + 1 : 0;
      if (settledFor >= 3) {
        clearInterval(id);
        go(0);
      }
    }, 300);
    return () => clearInterval(id);
  }, [pathname, index, go]);

  // Replay from the footer ("Take the tour").
  useEffect(() => {
    const start = () => {
      navigate("/");
      setTimeout(() => go(0), 400);
    };
    window.addEventListener(START_TOUR_EVENT, start);
    return () => window.removeEventListener(START_TOUR_EVENT, start);
  }, [navigate, go]);

  const measure = useCallback(() => {
    if (index === null) return;
    const el = find(STEPS[index].selector);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [index]);

  // On each step: scroll its element into view, then measure it and "tap" it with the pointer.
  useLayoutEffect(() => {
    if (index === null) return;
    const el = find(STEPS[index].selector);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    const settle = setTimeout(() => {
      measure();
      setTapping(true);
    }, reduce ? 50 : 450);
    const untap = setTimeout(() => setTapping(false), reduce ? 60 : 1150);
    return () => {
      clearTimeout(settle);
      clearTimeout(untap);
    };
  }, [index, reduce, measure]);

  // Focus "Next" once the card for a step is actually on screen (keyboard users can just press Enter).
  const focusedFor = useRef<number | null>(null);
  useEffect(() => {
    if (index !== null && rect && focusedFor.current !== index) {
      focusedFor.current = index;
      nextBtn.current?.focus({ preventScroll: true });
    }
    if (index === null) focusedFor.current = null;
  }, [index, rect]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("keydown", onKey);
    };
  }, [index, measure, finish]);

  if (index === null || index >= STEPS.length || !rect) return null;
  const step = STEPS[index];
  const pad = 8;
  // Card below the target when there's room, otherwise above; kept inside the viewport.
  const cardW = Math.min(340, window.innerWidth - 32);
  const below = rect.bottom + 220 < window.innerHeight;
  const cardLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - cardW / 2, window.innerWidth - cardW - 16));
  const cardStyle = below ? { top: rect.bottom + pad + 14, left: cardLeft, width: cardW } : { bottom: window.innerHeight - rect.top + pad + 14, left: cardLeft, width: cardW };
  const px = rect.left + Math.min(rect.width * 0.62, rect.width - 6);
  const py = rect.top + Math.min(rect.height * 0.65, rect.height - 4);

  return createPortal(
    <div className="tour" data-testid="tour">
      <div className="tour-spot" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      <div className={`tour-pointer ${tapping ? "tour-tap" : ""}`} style={{ transform: `translate(${px}px, ${py}px)` }} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30">
          <path d="M5 3l14 7.5-6.2 1.6L10 18.5z" />
        </svg>
        <span className="tour-ripple" />
      </div>
      <div className="tour-card" role="dialog" aria-labelledby="tour-title" aria-describedby="tour-body" style={cardStyle}>
        <p className="tour-step mono">
          Step {index + 1} of {STEPS.length}
        </p>
        <h2 id="tour-title" className="tour-title">
          {step.title}
        </h2>
        <p id="tour-body" className="tour-body">
          {step.body}
        </p>
        <div className="tour-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={i === index ? "on" : ""} />
          ))}
        </div>
        <div className="tour-actions">
          <button type="button" className="btn btn-ghost" onClick={finish} data-testid="tour-skip">
            Skip tour
          </button>
          <span className="flex gap-2">
            {index > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => go(index - 1, -1)}>
                Back
              </button>
            )}
            <button ref={nextBtn} type="button" className="btn btn-primary" onClick={() => go(index + 1)} data-testid="tour-next">
              {index === STEPS.length - 1 ? "Got it" : "Next"}
            </button>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
