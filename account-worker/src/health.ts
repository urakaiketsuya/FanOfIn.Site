import type { Env } from "./auth";

export const REQUIRED_SCHEMA_VERSION = "0006";

export interface ServiceHealth {
  success: boolean;
  service: "fanofin-accounts";
  schema: {
    ready: boolean;
    requiredVersion: string;
  };
}

/**
 * Exercise the newest tables and columns required by the deployed Worker. The
 * queries return no user data, but D1 still validates their schema references.
 */
export async function serviceHealth(env: Env): Promise<ServiceHealth> {
  try {
    await env.ACCOUNT_DB.prepare(`SELECT users.profile_discoverable, user_decks.moderation_status
      FROM users CROSS JOIN user_decks LIMIT 0`).all();
    await env.ACCOUNT_DB.prepare("SELECT id FROM deck_reports LIMIT 0").all();
    return {
      success: true,
      service: "fanofin-accounts",
      schema: { ready: true, requiredVersion: REQUIRED_SCHEMA_VERSION },
    };
  } catch {
    return {
      success: false,
      service: "fanofin-accounts",
      schema: { ready: false, requiredVersion: REQUIRED_SCHEMA_VERSION },
    };
  }
}
