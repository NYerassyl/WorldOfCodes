import { AppError, badRequest, isUniqueError, requireString } from '../lib/errors.js';
import { normalizeNickname, normalizeUsername, privateUser } from '../lib/security.js';

function validateAvatar(value) {
  if (value === null) return null;
  const s = requireString(value, 'avatarUrl', 512);
  try {
    const url = new URL(s);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error('insecure');
  } catch { throw badRequest('avatarUrl must be a public HTTPS URL or null'); }
  return s;
}

export async function editOwnProfile(prisma, { userId, current, changes: input }) {
  if (Object.keys(input).length === 0) throw badRequest('Provide nickname, username or avatarUrl');
  const changes = {};
  if (Object.hasOwn(input,'avatarUrl')) changes.avatarUrl = validateAvatar(input.avatarUrl);
  if (Object.hasOwn(input,'username')) {
    const username = normalizeUsername(input.username);
    if (username !== current.username) {
      const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
      if (taken && taken.id !== userId) throw new AppError(409,'USERNAME_TAKEN','Username is already taken');
      changes.username = username;
    }
  }
  if (Object.hasOwn(input,'nickname')) {
    const nickname = requireString(input.nickname,'nickname',24);
    const normalizedNickname = normalizeNickname(nickname);
    if (normalizedNickname !== current.normalizedNickname) {
      if (current.nicknameChanges > 0) throw new AppError(402,'NICKNAME_CHANGE_PAYMENT_REQUIRED','Additional nickname changes require payment; payment is not available this week');
      changes.nickname = nickname;
      changes.normalizedNickname = normalizedNickname;
      changes.nicknameChanges = { increment: 1 };
    }
  }
  if (Object.keys(changes).length === 0) return privateUser(current);
  let result;
  try {
    result = await prisma.user.updateMany({
      where: { id: userId, ...(changes.nickname ? { nicknameChanges: 0 } : {}) }, data: changes
    });
  } catch (error) {
    if (isUniqueError(error)) throw new AppError(409,'USERNAME_TAKEN','Username is already taken');
    throw error;
  }
  if (!result.count) throw new AppError(409,'PROFILE_CHANGED','Profile was changed concurrently; refresh');
  return privateUser(await prisma.user.findUniqueOrThrow({where:{id:userId}}));
}
