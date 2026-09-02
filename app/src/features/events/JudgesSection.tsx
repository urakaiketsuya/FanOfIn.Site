import type { OmnidexJudge } from "@gatcg/shared";
import PlayerLink from "../players/PlayerLink";
import Section from "../../components/ui/Section";

export default function JudgesSection({ judges }: { judges: OmnidexJudge[] }) {
  if (judges.length === 0) return null;

  return (
    <Section heading="compact" title="Judges">
      <ul className="mt-2 space-y-1 text-sm">
        {judges.map((judge) => (
          <li key={judge.id} className="flex items-center gap-2">
            <PlayerLink id={judge.id} username={judge.username} className="text-ctp-text hover:text-ctp-blue" />
            <span className="text-xs text-ctp-subtext0">
              Level {judge.judgeLevel} · {judge.country}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
