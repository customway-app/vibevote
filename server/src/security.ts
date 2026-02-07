import crypto from 'node:crypto';
import { env } from './env.js';

export function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// "1 vote per song per user" is implemented by a UNIQUE constraint on (songId, voterHash).
export function computeVoterHash(ip: string, userAgent: string) {
  return sha256(`${env.VOTER_HASH_SALT}|${ip}|${userAgent}`);
}

export function requireAdmin(req: { header(name: string): string | undefined }) {
  const key = req.header('x-admin-key');
  return Boolean(key && key === env.ADMIN_API_KEY);
}
