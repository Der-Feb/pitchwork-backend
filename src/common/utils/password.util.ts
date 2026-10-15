import * as argon2 from 'argon2';

// OWASP-recommended argon2id minimum (19 MiB, 2 iterations, 1 lane).
// Raise memoryCost later if your server can afford it; needsRehash() upgrades old hashes at login.
const OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, OPTIONS);

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false; // malformed hash must never throw into the login flow
  }
}

export const needsRehash = (hash: string): boolean => argon2.needsRehash(hash, OPTIONS);

let dummyHash: Promise<string> | undefined;

/**
 * Call when the account doesn't exist (or has no password) so the response takes as long as a
 * real check. Otherwise response time reveals which emails are registered.
 */
export async function burnPasswordCheck(plain: string): Promise<void> {
  dummyHash ??= hashPassword('timing-equalizer');
  await verifyPassword(await dummyHash, plain);
}