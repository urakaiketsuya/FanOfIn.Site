import { Link } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return <PageLayout>
    <p className="text-sm text-ctp-subtext0">404 · Page not found</p>
    <h1 className="mt-3 text-3xl font-semibold">Let’s get you back to your deck.</h1>
    <p className="mt-3 text-ctp-subtext1">This link may be outdated or the address may be incomplete.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link to="/decks" className="inline-flex min-h-11 items-center rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base">Browse decks</Link>
      <Link to="/" className="inline-flex min-h-11 items-center rounded-lg border border-ctp-surface1 px-4 text-sm text-ctp-blue">Return home</Link>
    </div>
  </PageLayout>;
}
