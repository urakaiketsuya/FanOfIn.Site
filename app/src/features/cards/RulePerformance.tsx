import { useState } from "react";
import { packageRulePerformance, type Card, type PackagePerformanceIndex, type SavedPackageRule } from "@gatcg/shared";
import PackagePerformanceEvidence from "./PackagePerformanceEvidence";
import { LABELS, control } from "./winRatePresentation";

export default function RulePerformance({ rule, index, cardsByName, initialCohort }: { initialCohort?: string; rule: SavedPackageRule; index: PackagePerformanceIndex; cardsByName: ReadonlyMap<string, Card> }) {
  const findings = packageRulePerformance(rule, index);
  const [selected, setSelected] = useState(initialCohort ?? "");
  const finding = findings.find((f) => f.cohort === selected) ?? findings[0];
  return <section aria-label="Rule performance" className="space-y-3">
    <h3 className="font-semibold">Win-rate evidence for this exact rule</h3>
    {!finding ? <p>No performance evidence for this rule.</p> : <>
      <label className="block">Performance cohort
        <select className={`${control} mt-1 w-full max-w-full`} value={finding.cohort} onChange={(event) => setSelected(event.target.value)}>
          {findings.map((f) => <option key={f.cohort} value={f.cohort}>{f.champion} · {f.season} · {f.format} · {LABELS[f.status]}</option>)}
        </select>
      </label>
      <PackagePerformanceEvidence finding={finding} cardsByName={cardsByName} />
    </>}
  </section>;
}
