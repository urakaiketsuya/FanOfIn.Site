import type { ComponentProps } from "react";
import DeckImageExport from "./DeckImageExport";
import DeckProxyExport from "./DeckProxyExport";

export default function DeckExportActions(props: ComponentProps<typeof DeckImageExport>) {
  return <><DeckImageExport {...props} /><DeckProxyExport {...props} /></>;
}
