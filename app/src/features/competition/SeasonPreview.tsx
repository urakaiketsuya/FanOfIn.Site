import CardArtTile from "../../components/CardArtTile";
import { useChampionCardImages } from "../players/useChampionCardImages";
import type { SeasonRecordedReport } from '@gatcg/shared';
import { useCompetition } from './data';
import { monthLabel, percentage } from './format';
/** Lives inside a season navigation link, so it contains no nested card-detail links. */
export default function SeasonPreview({ seasonId }: { seasonId: number }) {
  const { data } = useCompetition<SeasonRecordedReport>('seasons');
  const report = data?.rows.find(r => r.seasonId === seasonId && r.format === 'standard');
  const last = (report?.months.length ?? 1) - 1, top = report?.builds.filter(b => b.href && b.counts[last] > 0).sort((a,b) => b.counts[last] - a.counts[last])[0];
  const cards = useChampionCardImages(top?.champion ? [top.champion] : []);
  if (!report) return null;
  return <div className="mt-3 text-sm"><p className="text-xs text-ctp-subtext1">{monthLabel(report.months[last].month)} · Standard · {report.months[last].decks} recorded decks</p>{top && <div className="mt-2 flex items-center gap-3"><div className="w-14 shrink-0"><CardArtTile card={cards.get(top.champion ?? "")} name={top.champion ?? top.name} /></div><p className="min-w-0 break-words"><strong>{percentage(top.values[last])}</strong> · {top.name}</p></div>}</div>;
}
