import { containsBlockedLanguage } from "@gatcg/shared";
import { badRequest } from "./errors";

export { containsBlockedLanguage, validUserFacingName } from "@gatcg/shared";

export function assertAllowedText(value: unknown, field: string): void {
  if (typeof value === "string" && containsBlockedLanguage(value)) {
    throw badRequest(`${field} contains blocked language. Please reword it and try again.`, "blocked_language");
  }
}
