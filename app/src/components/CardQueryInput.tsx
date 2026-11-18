import { useId, type ComponentProps } from "react";
import { TextInput } from "./ui/FormControl";
import { cardQueryError } from "../features/cards/filters";

/** Live card searches keep selection separate from query editing. */
export default function CardQueryInput({ tagsAvailable = false, ...props }: ComponentProps<"input"> & { value: string; tagsAvailable?: boolean }) {
  const id = useId();
  const error = cardQueryError(props.value, tagsAvailable);
  return <>
    <TextInput {...props} aria-invalid={!!error} aria-describedby={[props["aria-describedby"], error ? id : undefined].filter(Boolean).join(" ") || undefined} />
    {error && <span id={id} role="alert" className="block basis-full text-sm text-ctp-red">{error}</span>}
  </>;
}
