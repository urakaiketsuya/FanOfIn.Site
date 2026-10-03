import Button from "./ui/Button";

export default function PriceSortStatus({ state }: { state: { loading: boolean; error: string | null; retry: () => void } }) {
  if (state.loading) return <p role="status" className="mt-2 text-sm text-ctp-subtext1">Updating prices. Card order updates when prices load.</p>;
  if (state.error) return <div className="mt-2"><p role="alert" className="text-sm text-ctp-subtext1">Prices could not refresh. Sorting uses saved prices where available.</p><Button className="mt-2" onClick={state.retry}>Retry prices</Button></div>;
  return null;
}
