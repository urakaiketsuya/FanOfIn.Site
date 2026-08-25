import { useArchetypeTaxonomyValidationData } from "./data";
import ArchetypeValidationPanel from "./ArchetypeValidationPanel";

export default function ArchetypeValidationView() {
  const data = useArchetypeTaxonomyValidationData();
  return <ArchetypeValidationPanel data={data} />;
}
