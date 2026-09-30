import { containsBlockedLanguage } from "@gatcg/shared";
import { badRequest } from "./errors";

export { containsBlockedLanguage, validUserFacingName } from "@gatcg/shared";

export function assertAllowedText(value: unknown, field: string): void {
  if (typeof value === "string" && containsBlockedLanguage(value)) {
    throw badRequest(`${field} contains blocked language. Please reword it and try again.`, "blocked_language");
  }
}

/** Display text only; catalog names and report evidence use their own shape validation. */
export function normalizeDisplayText(value: unknown, field: string, maxLength: number, required = false): string {
  if (typeof value !== "string") {
    if (!required && value === undefined) return "";
    throw badRequest(`${field} is required`);
  }
  const text = value.trim();
  if ((required && !text) || text.length > maxLength || /[\u0000-\u001f\u007f]/.test(text)) throw badRequest(`${field} must be ${required ? `1–${maxLength}` : `at most ${maxLength}`} characters`);
  assertAllowedText(text, field);
  return text;
}
