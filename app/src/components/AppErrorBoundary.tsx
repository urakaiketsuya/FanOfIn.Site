import { Component, type ReactNode } from "react";

/** Keep a render failure recoverable even when routing or data providers fail. */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="min-h-screen bg-ctp-base px-6 py-16 text-ctp-text">
      <div role="alert" className="mx-auto max-w-xl rounded-xl border border-ctp-surface1 bg-ctp-mantle p-6">
        <h1 className="text-2xl font-semibold">This page couldn’t open</h1>
        <p className="mt-3 text-sm text-ctp-subtext1">Try reloading the page. If the problem continues, return home and open another page.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base">Reload page</button>
          <a href="/" className="inline-flex min-h-11 items-center rounded-lg border border-ctp-surface1 px-4 text-sm text-ctp-blue">Return home</a>
        </div>
      </div>
    </main>;
  }
}
