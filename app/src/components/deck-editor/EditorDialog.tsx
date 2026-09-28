import type { ComponentProps } from "react";
import DialogSheet from "../ui/DialogSheet";

/** Deck-specific labels; modal interaction belongs to the shared sheet. */
export default function EditorDialog({ count, title = "Add cards", doneLabel, ...props }: Omit<ComponentProps<typeof DialogSheet>, "dismissLabel" | "title"> & { count?: number; title?: string; doneLabel?: string }) {
  return <DialogSheet {...props} title={title} dismissLabel={doneLabel ?? `Done · View deck (${count ?? 0})`} />;
}
