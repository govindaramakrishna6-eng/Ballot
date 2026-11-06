import { Component, type ReactNode } from "react";

/** Last line of defence: a render bug shows a recoverable message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="notice notice-error" data-testid="crash">
        <p className="font-semibold">This page hit an unexpected problem.</p>
        <p className="mt-1 text-sm">Nothing was sent to the blockchain. Reload to try again.</p>
        <button type="button" className="btn btn-secondary mt-3" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
