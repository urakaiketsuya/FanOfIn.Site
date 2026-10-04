import { databaseBatch } from "./database";
import type { Env } from "./auth";

export const REQUIRED_SCHEMA_VERSION = "0032";

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
    await databaseBatch(env.ACCOUNT_DB, "schema.readiness", [
      env.ACCOUNT_DB.prepare(`SELECT users.is_system, user_decks.is_seed, user_decks.seed_discoverable, users.profile_discoverable, users.deck_checklist_dismissed, users.display_name_reviewed, users.community_role,
      user_decks.revision, user_decks.moderation_status, user_decks.primer_markdown, user_decks.tags_json, user_decks.published_title, user_decks.maybeboard_json
      FROM users CROSS JOIN user_decks LIMIT 0`),
      env.ACCOUNT_DB.prepare("SELECT id FROM deck_reports LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, card_uuid, owned_quantity, proxy_quantity FROM collection_entries LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, card_uuid, edition_uuid, owned_quantity, proxy_quantity FROM collection_printing_entries LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, card_uuid, card_name FROM shared_card_watches LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, card_uuid, might_own, loans_json, assignments_json, revision FROM collection_card_tracking LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, provider, provider_subject FROM auth_identities LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, normalized_email, email_verified FROM password_credentials LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT credential_id, purpose, expires_at FROM password_auth_tokens LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT normalized_email, reason FROM email_suppressions LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT owner_user_id, definition_hash, visibility FROM user_combos LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, combo_id FROM combo_bookmarks LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, deck_hash, decklist_json FROM tournament_deck_favorites LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, id, saved_deck_id, provenance_kind FROM match_log_records LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, deck_fingerprint, deck_identity, revision FROM analysis_profiles LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT target_kind, target_id, locked FROM deck_comment_threads LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT id, parent_id, status FROM deck_comments LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, kind, card_uuid, edition_uuid, quantity FROM binder_items LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT id, status, current_revision, sender_received, recipient_received FROM trades LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, card_uuid, edition_uuid, binder_item_id, quantity FROM trade_card_reservations LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, card_uuid FROM trade_capacity_conflicts LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, request_id, request_hash FROM collection_update_receipts LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT id, user_id, name_key, revision, mutation_token FROM deck_folders LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT folder_id, deck_id FROM deck_folder_members LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT id, status, review_token FROM card_tag_proposals LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT card_uuid, edition_uuid, tag, action FROM card_tag_overrides LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, request_id, expected_revision, result_json FROM deck_save_receipts LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT user_id, payload, revision FROM profile_showcases LIMIT 0"),
      env.ACCOUNT_DB.prepare("SELECT id, printings_json FROM deck_versions LIMIT 0"),
    ]);
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
