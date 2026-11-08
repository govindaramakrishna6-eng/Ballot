import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";

/** True when the person has asked their system for less motion; every JS animation checks this. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}
