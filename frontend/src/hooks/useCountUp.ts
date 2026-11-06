import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value to `target` (ease-out, ~700ms).
 * Jumps straight to the value for people who prefer reduced motion.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(target);
  const from = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;
    from.current = target;
    if (reduce || start === target) {
      setValue(target);
      return;
    }
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
