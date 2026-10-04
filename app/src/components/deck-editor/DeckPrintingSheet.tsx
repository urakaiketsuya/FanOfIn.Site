import { useSavedCollection } from "../../features/collection/useSavedCollection";
import { useState } from "react";
import { validPrintingAllocations, type Card, type CardPrintingAllocation, type OmnidexDecklistCardLine } from "@gatcg/shared";
import DialogSheet from "../ui/DialogSheet";
import Button from "../ui/Button";
import PrintingChoices from "../PrintingChoices";
export default function DeckPrintingSheet({ card, line, onApply, onDismiss }: { card: Card; line: OmnidexDecklistCardLine; onApply: (value: CardPrintingAllocation[]) => void; onDismiss: () => void }) {
  const { collection, collectionLoaded, collectionError, retryCollection } = useSavedCollection();
  const [value, setValue] = useState(line.printings ?? []);
  const notRecorded = value.reduce((sum, allocation) => sum + Math.max(0, allocation.quantity - (collection.find(entry => entry.cardUuid === card.uuid && entry.editionUuid === allocation.editionUuid)?.ownedQuantity ?? 0)), 0);
  return <DialogSheet title={`Printings · ${line.card}`} onDismiss={onDismiss} dirty={JSON.stringify(value) !== JSON.stringify(line.printings ?? [])} footer={<div className="space-y-2"><p className="text-xs text-ctp-subtext1">Choices change this deck draft. They do not add or reserve owned copies.</p><Button variant="primary" className="w-full" disabled={!validPrintingAllocations(value, line.quantity)} onClick={() => { onApply(value); onDismiss(); }}>Apply printings</Button></div>}>
    {!collectionLoaded && <p role="status" className="mb-3 text-sm text-ctp-subtext1">{collectionError ?? "Loading recorded ownership…"}{collectionError && <Button onClick={retryCollection}>Retry ownership</Button>}</p>}
    {collectionLoaded && notRecorded > 0 && <p className="mb-3 text-sm text-ctp-subtext1">{notRecorded} selected {notRecorded === 1 ? "copy is" : "copies are"} not recorded under these printings. Unspecified inventory may still contain them. You can choose them anyway.</p>}
    <PrintingChoices entries={collectionLoaded ? collection : undefined} card={card} quantity={line.quantity} value={value} onChange={setValue} />
  </DialogSheet>;
}
