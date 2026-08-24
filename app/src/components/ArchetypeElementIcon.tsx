import ElementIcon from "./ElementIcon";
import { archetypeElement } from "../lib/archetypeElement";

export default function ArchetypeElementIcon({ name, size = 18 }: { name: string; size?: number }) {
  const element = archetypeElement(name);
  return element ? <ElementIcon element={element} size={size} /> : null;
}
