import { createHmac, randomBytes } from 'crypto';

/**
 * Generate a cryptographically random application token using Node's CSPRNG.
 * Returns the raw token (to be sent to the user) and its HMAC-SHA-256 digest
 * (to be stored in the database).
 *
 * The raw token is NEVER stored. Only the deterministic HMAC digest is persisted,
 * allowing O(1) lookup via findUnique without iterating through records.
 *
 * @param secret - TOKEN_HASH_SECRET from environment. Must not be the JWT secret.
 */
export function generateApplicationToken(secret: string): {
    token: string;
    hash: string;
} {
    const token = randomBytes(32).toString('base64url');
    const hash = computeTokenHash(secret, token);
    return { token, hash };
}

/**
 * Generate a 6-character alphanumeric OTP using Node's CSPRNG.
 * 3 random bytes → 6 uppercase hex characters [0-9A-F].
 *
 * The raw OTP is NEVER stored. Only its HMAC-SHA-256 digest is persisted,
 * allowing O(1) lookup via findUnique — the same pattern as generateApplicationToken.
 *
 * At 36^6 ≈ 2.18 B combinations with a 5-minute TTL and 3-request rate limit,
 * brute-force is not a viable attack.
 *
 * @param secret - TOKEN_HASH_SECRET from environment. Must not be the JWT secret.
 */
export function generateOtp(secret: string): { otp: string; hash: string } {
    const otp = randomBytes(3).toString('hex').toUpperCase(); // exactly 6 hex chars
    const hash = computeTokenHash(secret, otp);
    return { otp, hash };
}

/**
 * Compute the HMAC-SHA-256 digest of a raw token using the dedicated secret.
 * Use this during validation to derive the lookup key from a submitted token.
 *
 * @param secret - TOKEN_HASH_SECRET from environment.
 * @param rawToken - The plain token received from the user (OTP or long token).
 */
export function computeTokenHash(secret: string, rawToken: string): string {
    return createHmac('sha256', secret).update(rawToken).digest('hex');
}