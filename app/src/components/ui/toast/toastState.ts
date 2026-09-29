export type ToastTone = "success" | "info" | "warning" | "error";
export type ToastAction = { label: string; onClick: () => void | Promise<void> } | { label: string; to: string };
export interface ToastInput { message: string; tone?: ToastTone; action?: ToastAction; key?: string; duration?: number | null }
export interface Toast extends ToastInput { id: string; owner: string; tone: ToastTone; duration: number | null }
export function makeToast(input: ToastInput, id: string, owner: string): Toast {
  return { ...input, id, owner, tone: input.tone ?? "success", duration: input.action || input.tone === "error" ? null : input.duration === undefined ? 6000 : input.duration };
}
/** One visible toast and at most four waiting. Repeated operations replace their own feedback. */
export function enqueueToast(queue: Toast[], toast: Toast): Toast[] {
  const duplicate = queue.findIndex(item => toast.key ? item.owner === toast.owner && item.key === toast.key : item.owner === toast.owner && item.message === toast.message);
  if (duplicate >= 0) return queue.map((item, i) => i === duplicate ? toast : item);
  if (queue.length < 5) return [...queue, toast];
  return [queue[0], ...queue.slice(2), toast];
}
