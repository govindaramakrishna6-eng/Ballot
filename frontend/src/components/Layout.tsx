import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useLayoutEffect, useRef } from "react";
import { NavLink, Outlet } from "react-router";
import { ErrorBoundary } from "./ErrorBoundary";
import { Footer } from "./Footer";
import { NetworkBanner } from "./NetworkBanner";
import { NoWalletHint } from "./NoWalletHint";
import { Toaster } from "./Toaster";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/polls", label: "Polls" },
  { to: "/results", label: "Results" },
  { to: "/create", label: "Create" },
  { to: "/me", label: "My votes" },
];

const nav = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? "nav-link-active" : ""}`;

/**
 * Publishes the real height of everything above the page content (header + any banner + main's
 * top padding) as --chrome, so the homepage hero can centre itself in the viewport exactly —
 * measured, not guessed, so it stays right when the header wraps or a banner appears.
 */
function useChromeHeight(
  main: React.RefObject<HTMLElement | null>,
  header: React.RefObject<HTMLElement | null>,
  banners: React.RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const update = () => {
      if (!main.current) return;
      const top = main.current.getBoundingClientRect().top + window.scrollY;
      const pad = parseFloat(getComputedStyle(main.current).paddingTop);
      document.documentElement.style.setProperty("--chrome", `${top + pad}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    for (const el of [header.current, banners.current]) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [main, header, banners]);
}

export function Layout() {
  const header = useRef<HTMLElement>(null);
  const banners = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  useChromeHeight(main, header, banners);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header" ref={header}>
        <div className="wrap header-grid">
          <NavLink to="/" className="brand" end>
            Ballot
          </NavLink>
          <nav aria-label="Main" className="main-nav">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={nav}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-wallet">
            <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
          </div>
        </div>
      </header>
      <div className="wrap" ref={banners}>
        <NetworkBanner />
        <NoWalletHint />
      </div>
      <main id="main" className="wrap w-full flex-1 py-6" ref={main}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
