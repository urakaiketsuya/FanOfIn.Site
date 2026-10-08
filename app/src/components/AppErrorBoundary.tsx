import { Component, type ReactNode } from "react";
import Button from "./ui/Button";

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
        <h1 className="text-2xl font-semibold">Refresh for the latest version</h1>
        <p className="mt-3 text-sm text-ctp-subtext1">The site may have been updated since you opened this page. Reload to get the latest version.</p>
        <p className="mt-2 text-sm text-ctp-subtext1">If it still won’t load, return home and try again.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>Reload page</Button>
          <a href="/" className="inline-flex min-h-control min-w-control items-center rounded-lg border border-ctp-surface1 px-4 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Return home</a>
        </div>
      </div>
    </main>;
  }
}
