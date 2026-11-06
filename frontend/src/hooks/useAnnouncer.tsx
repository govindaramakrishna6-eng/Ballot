import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const AnnounceContext = createContext<(message: string) => void>(() => {});

/** One polite aria-live region for the whole app so screen readers hear tx status changes. */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  // Clearing first makes repeated identical messages ("Vote not sent.") announce again.
  const announce = useCallback((m: string) => {
    setMessage("");
    requestAnimationFrame(() => setMessage(m));
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div aria-live="polite" role="status" className="sr-only" data-testid="announcer">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce() {
  return useContext(AnnounceContext);
}
