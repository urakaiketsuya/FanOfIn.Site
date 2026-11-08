import assert from 'node:assert/strict';
import { resolveProfileAddress, usernameAddress } from '../../src/profile-address';
import type { Env } from '../../src/auth';
export async function profileAddressChecks(env: Env) {
  await env.ACCOUNT_DB.prepare("INSERT INTO users(id,google_subject,email,display_name,profile_slug,created_at,updated_at) VALUES('profile-owner','profile-owner','owner@test','Player Name','old-address','now','now')").run();
  const address = await usernameAddress(env, 'Player Name', 'profile-owner');
  assert.equal(address, 'player-name');
  await env.ACCOUNT_DB.prepare('UPDATE users SET profile_slug=? WHERE id=?').bind(address, 'profile-owner').run();
  assert.equal(await resolveProfileAddress(env, 'old-address'), 'player-name');
  assert.notEqual(await usernameAddress(env, 'Player Name', 'different-owner'), 'player-name');
  await env.ACCOUNT_DB.prepare("UPDATE users SET profile_slug='new-name' WHERE id='profile-owner'").run();
  await assert.rejects(env.ACCOUNT_DB.prepare("UPDATE users SET profile_slug='player-name' WHERE id='a'").run(), /profile_address_taken/);
  assert.equal(await resolveProfileAddress(env, 'PLAYER-NAME'), 'new-name');
  assert.equal(await resolveProfileAddress(env, 'old-address'), 'new-name');
  console.log('Username addresses: aliases, renames, uniqueness, and reservation checks passed.');
}
