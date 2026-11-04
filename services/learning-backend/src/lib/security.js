import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { badRequest } from './errors.js';
const scrypt = promisify(scryptCb);
export function normalizeEmail(email) {
  if (typeof email !== 'string' || email.length > 254) throw badRequest('Invalid email');
  const v = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw badRequest('Invalid email');
  return v;
}
export function normalizeNickname(nickname) {
  if (typeof nickname !== 'string' || !/^[a-zA-Z0-9_]{3,24}$/.test(nickname)) throw badRequest('Nickname must be 3-24 Latin letters, digits, or underscores');
  return nickname.toLowerCase();
}
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw badRequest('Password must be 8-128 characters');
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, Buffer.from(salt,'hex'), 64, { N:16384, r:8, p:1 });
  return `scrypt$16384$8$1$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || parts[1] !== '16384' || parts[2] !== '8' || parts[3] !== '1' || !/^[0-9a-f]{32}$/.test(parts[4]) || !/^[0-9a-f]{128}$/.test(parts[5])) return false;
  const key = await scrypt(password, Buffer.from(parts[4],'hex'), 64, { N:16384, r:8, p:1 });
  return timingSafeEqual(key, Buffer.from(parts[5],'hex'));
}
export const createSessionToken = () => randomBytes(32).toString('base64url');
export const hashSessionToken = token => createHash('sha256').update(token).digest('hex');
export const levelFromXp = xp => Math.floor(Math.max(0,xp)/100)+1;
export const publicUser = user => ({id:user.id, nickname:user.nickname, avatarUrl:user.avatarUrl, xp:user.xp, level:levelFromXp(user.xp)});
export const privateUser = user => ({...publicUser(user), email:user.email, coins:user.coins, nicknameChanges:user.nicknameChanges, nextNicknameChange:user.nicknameChanges === 0 ? 'FREE' : 'PAYMENT_REQUIRED'});
export const codeMatchesExactly = (input,sample) => typeof input === 'string' && input === sample;
