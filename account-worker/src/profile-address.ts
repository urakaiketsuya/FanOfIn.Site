import type { Env } from './auth';
export function usernameBase(name: string): string {
  return name.toLowerCase().slice(0, 32).replace(/ /g, '-').replace(/[^a-z0-9_-]/g, '').replace(/^[-_]+|[-_]+$/g, '') || 'player';
}
export async function usernameAddress(env: Env, name: string, userId: string): Promise<string> {
  const base = usernameBase(name);
  const reserved = await env.ACCOUNT_DB.prepare('SELECT user_id FROM profile_aliases WHERE slug = ?').bind(base).first<{ user_id: string }>();
  return reserved && reserved.user_id !== userId ? `${base}-${userId.replace(/[^a-zA-Z0-9]/g, '')}` : base;
}
export async function resolveProfileAddress(env: Env, slug: string): Promise<string> {
  const row = await env.ACCOUNT_DB.prepare('SELECT users.profile_slug FROM profile_aliases JOIN users ON users.id = profile_aliases.user_id WHERE profile_aliases.slug = ?').bind(slug.toLowerCase()).first<{ profile_slug: string }>();
  return row?.profile_slug ?? slug.toLowerCase();
}

/** The database remains authoritative when two accounts choose the same address. */
export async function writeUsernameAddress(env: Env, name: string, userId: string, write: (address: string) => Promise<unknown>): Promise<string> {
  let address = await usernameAddress(env, name, userId);
  try { await write(address); }
  catch (error) {
    if (!(error instanceof Error) || !/profile_address_taken|UNIQUE constraint failed: (users.profile_slug|profile_aliases.slug)/.test(error.message)) throw error;
    address = `${usernameBase(name)}-${userId.replace(/[^a-zA-Z0-9]/g, '')}`;
    await write(address);
  }
  return address;
}
