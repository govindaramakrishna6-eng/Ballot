import { useEffect, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

const HEX = "0123456789abcdef";

/**
 * Shows a hash "decoding" into place: characters cycle through hex digits and lock in left to right
 * (~700ms). The final text is always the real value; screen readers get it immediately via aria-label.
 */
export function HashText({
  value,
  full = value,
  className = "",
  testId,
}: {
  value: string;
  /** Complete value for the tooltip and screen readers when `value` is a shortened form. */
  full?: string;
  className?: string;
  testId?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const start = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const locked = Math.floor(((now - start) / duration) * value.length);
      setShown(
        value
          .split("")
          .map((ch, i) => (i < locked || i < 2 || !/[0-9a-f]/i.test(ch) ? ch : HEX[Math.floor(Math.random() * 16)]))
          .join(""),
      );
      if (locked < value.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);

  return (
    <span className={`mono ${className}`} aria-label={full} title={full} data-testid={testId}>
      <span aria-hidden="true">{reduce ? value : shown}</span>
    </span>
  );
}
