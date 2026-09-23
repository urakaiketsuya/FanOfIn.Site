import type { Env } from "./auth";

export const REQUIRED_SCHEMA_VERSION = "0017";

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
    await env.ACCOUNT_DB.prepare(`SELECT users.profile_discoverable, users.deck_checklist_dismissed, users.display_name_reviewed,
      user_decks.moderation_status, user_decks.primer_markdown, user_decks.tags_json, user_decks.published_title, user_decks.maybeboard_json
      FROM users CROSS JOIN user_decks LIMIT 0`).all();
    await env.ACCOUNT_DB.prepare("SELECT id FROM deck_reports LIMIT 0").all();
    await env.ACCOUNT_DB.prepare("SELECT user_id, card_uuid, owned_quantity, proxy_quantity FROM collection_entries LIMIT 0").all();
    await env.ACCOUNT_DB.prepare("SELECT user_id, card_uuid, card_name FROM shared_card_watches LIMIT 0").all();
    await env.ACCOUNT_DB.prepare("SELECT user_id, provider, provider_subject FROM auth_identities LIMIT 0").all();
    await env.ACCOUNT_DB.prepare("SELECT user_id, normalized_email, email_verified FROM password_credentials LIMIT 0").all();
    await env.ACCOUNT_DB.prepare("SELECT credential_id, purpose, expires_at FROM password_auth_tokens LIMIT 0").all();
    await env.ACCOUNT_DB.prepare("SELECT normalized_email, reason FROM email_suppressions LIMIT 0").all();
    await env.ACCOUNT_DB.prepare("SELECT owner_user_id, definition_hash, visibility FROM user_combos LIMIT 0").all();
    await env.ACCOUNT_DB.prepare("SELECT user_id, combo_id FROM combo_bookmarks LIMIT 0").all();
    await env.ACCOUNT_DB.prepare("SELECT user_id, deck_hash, decklist_json FROM tournament_deck_favorites LIMIT 0").all();
    await env.ACCOUNT_DB.prepare("SELECT user_id, id, saved_deck_id, provenance_kind FROM match_log_records LIMIT 0").all();
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
