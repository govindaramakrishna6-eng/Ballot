import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NavLink, Outlet } from "react-router";
import { ErrorBoundary } from "./ErrorBoundary";
import { NetworkBanner } from "./NetworkBanner";
import { NoWalletHint } from "./NoWalletHint";

const nav = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? "nav-link-active" : ""}`;

export function Layout() {
  return (
    <div className="min-h-dvh">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="wrap flex flex-wrap items-center justify-between gap-3 py-3">
          <NavLink to="/" className="brand" end>
            Ballot
          </NavLink>
          <nav aria-label="Main" className="flex items-center gap-1">
            <NavLink to="/" className={nav} end>
              Polls
            </NavLink>
            <NavLink to="/create" className={nav}>
              Create
            </NavLink>
            <NavLink to="/me" className={nav}>
              My votes
            </NavLink>
          </nav>
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
        </div>
      </header>
      <div className="wrap">
        <NetworkBanner />
        <NoWalletHint />
      </div>
      <main id="main" className="wrap py-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
