export default function DeckTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return <ul className="mt-4 flex flex-wrap gap-2" aria-label="Deck tags">
    {tags.map((tag) => <li key={tag} className="rounded-full border border-ctp-blue/40 bg-ctp-blue/10 px-2.5 py-1 text-xs text-ctp-blue">{tag}</li>)}
  </ul>;
}
