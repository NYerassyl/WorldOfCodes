import { AppError, badRequest, requireString } from '../lib/errors.js';
import { normalizeNickname, privateUser } from '../lib/security.js';

function validateAvatar(value) {
  if (value === null) return null;
  if (typeof value === 'string' && value.length <= 22000 && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+=*$/.test(value)) return value;
  const s = requireString(value, 'avatarUrl', 512);
  try {
    const url = new URL(s);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error('insecure');
  } catch { throw badRequest('avatarUrl must be a public HTTPS URL or null'); }
  return s;
}

export async function editOwnProfile(prisma, { userId, current, changes: input }) {
  if (Object.keys(input).length === 0) throw badRequest('Provide nickname or avatarUrl');
  const changes = {};
  const cutoff = new Date(Date.now() - 14 * 86400000);
  if ('displayName' in input) {
    const name = requireString(input.displayName,'Display name',40);
    if (name !== (current.displayName ?? current.nickname)) {
      if (current.renamedAt && current.renamedAt > cutoff) throw new AppError(409,'RENAME_COOLDOWN','You can change your display name once every 14 days.');
      changes.displayName = name;
      changes.renamedAt = new Date();
    }
  }
  if ('bio' in input) {
    if (typeof input.bio !== 'string' || input.bio.length > 300) throw badRequest('Bio must be at most 300 characters');
    changes.bio = input.bio.trim();
  }
  if (Object.hasOwn(input,'avatarUrl')) changes.avatarUrl = validateAvatar(input.avatarUrl);
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
  const result = await prisma.user.updateMany({
    where: { id: userId, ...(changes.renamedAt ? { OR:[{renamedAt:null},{renamedAt:{lte:cutoff}}] } : {}), ...(changes.nickname ? { nicknameChanges: 0 } : {}) }, data: changes
  });
  if (!result.count) throw new AppError(409,'PROFILE_CHANGED','Profile was changed concurrently; refresh');
  return privateUser(await prisma.user.findUniqueOrThrow({where:{id:userId}}));
}
