import { useCardCatalog } from "../cards/useCardCatalog";
import type { BroadcastTimelineMatch } from "@gatcg/shared";
import CardMentions from "./CardMentions";

export default function SideboardNotes({ match, gameNumber }: { match: BroadcastTimelineMatch; gameNumber: number }) {
  const notes = match.sideboardNotes?.filter(note => note.beforeGame === gameNumber) ?? [];
  const text = notes.map(note => note.text).join("\n").toLowerCase();
  const cards = useCardCatalog().filter(card => text.includes(card.name.toLowerCase()));
  if (!notes.length) return null;
  return <section className="mb-5 border-l-2 border-ctp-teal pl-4">
    <h2 className="text-sm font-semibold text-ctp-teal">Before game {gameNumber}</h2>
    {notes.map((note, index) => {
      const mentioned = (cards ?? []).filter(card => note.text.toLowerCase().includes(card.name.toLowerCase()));
      return <div key={index} className="mt-3">
        <p className="text-sm leading-relaxed text-ctp-subtext1"><span className={`font-semibold ${note.actor === "both" ? "text-ctp-subtext0" : note.actor === "p1" ? "text-ctp-blue" : "text-ctp-mauve"}`}>{note.actor === "both" ? "Both players" : match.players.find(player => player.id === note.actor)?.name}: </span>{note.text}</p>
        {mentioned.length > 0 && <p className="mt-3 text-xs text-ctp-subtext0">Cards discussed</p>}
        <CardMentions names={mentioned.map(card => card.name)} cardsByName={new Map(mentioned.map(card => [card.name, card]))} />
      </div>;
    })}
  </section>;
}
