/** Consistent, readable indicator for dropdown and disclosure controls. */
export default function DisclosureChevron({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`inline-block size-5 shrink-0 align-middle ${className}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
