import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActivity, followUser, unfollowUser, getProfile } from '../src/profile/service.js';

const at = iso => new Date(iso);

function followFixture() {
  const users = {
    u1: { id: 'u1', username: 'hero', normalizedNickname: 'hero', nickname: 'Hero', avatarUrl: null, xp: 0 },
    u2: { id: 'u2', username: 'rival', normalizedNickname: 'rival', nickname: 'Rival', avatarUrl: null, xp: 0 }
  };
  const follows = new Set();
  const key = (followerId, followingId) => `${followerId}>${followingId}`;
  return {
    follows,
    prisma: {
      user: {
        findFirst: async ({ where }) => {
          const handle = where.OR[0].username;
          return Object.values(users).find(user => user.username === handle) || null;
        }
      },
      follow: {
        upsert: async ({ where }) => {
          const { followerId, followingId } = where.followerId_followingId;
          follows.add(key(followerId, followingId));
          return {};
        },
        deleteMany: async ({ where }) => ({ count: follows.delete(key(where.followerId, where.followingId)) ? 1 : 0 }),
        count: async ({ where }) => [...follows].filter(item => item.endsWith(`>${where.followingId}`)).length
      }
    }
  };
}

test('activity buckets submissions and solves per UTC day and counts streaks', () => {
  const activity = buildActivity({
    to: at('2026-11-17T12:00:00Z'),
    days: 60,
    submissions: [
      { createdAt: '2026-11-17T09:00:00Z', status: 'ACCEPTED', topicSlug: 'arrays', difficulty: 'EASY' },
      { createdAt: '2026-11-17T10:00:00Z', status: 'WRONG_ANSWER', topicSlug: 'arrays', difficulty: 'EASY' },
      { createdAt: '2026-11-16T22:30:00Z', status: 'ACCEPTED', topicSlug: 'loops', difficulty: 'MEDIUM' },
      { createdAt: '2026-10-08T08:00:00Z', status: 'ACCEPTED', topicSlug: 'loops', difficulty: 'HARD' },
      { createdAt: '2025-01-01T08:00:00Z', status: 'ACCEPTED', topicSlug: 'loops', difficulty: 'HARD' }
    ],
    completions: [
      { completedAt: '2026-11-17T09:05:00Z', topicSlug: 'arrays', difficulty: 'EASY' },
      { completedAt: '2026-11-16T22:31:00Z', topicSlug: 'loops', difficulty: 'MEDIUM' }
    ],
    allTime: { submissions: 42, solved: 7 }
  });
  assert.equal(activity.from, '2026-09-19');
  assert.equal(activity.to, '2026-11-17');
  assert.equal(activity.days.length, 60);
  const today = activity.days.at(-1);
  assert.deepEqual({ date: today.date, submissions: today.submissions, accepted: today.accepted, solved: today.solved }, { date: '2026-11-17', submissions: 2, accepted: 1, solved: 1 });
  assert.deepEqual(activity.totals, { submissions: 4, solved: 2, accepted: 3, activeDays: 3, maxStreak: 2, currentStreak: 2 });
  assert.deepEqual(activity.windows.last30, { submissions: 3, solved: 2 });
  assert.deepEqual(activity.windows.previous30, { submissions: 1, solved: 0 });
  assert.deepEqual(activity.months.find(month => month.month === '2026-11'), { month: '2026-11', submissions: 3, solved: 2 });
  assert.deepEqual(activity.topics[0], { topic: 'arrays', submissions: 2, solved: 1, accepted: 1 });
  assert.deepEqual(activity.difficulties.map(row => [row.difficulty, row.submissions, row.solved]), [['EASY', 2, 1], ['MEDIUM', 1, 1], ['HARD', 1, 0]]);
  assert.deepEqual(activity.allTime, { submissions: 42, solved: 7 });
});

test('a streak survives the current day until it ends with no activity', () => {
  const yesterdayOnly = buildActivity({
    to: at('2026-11-17T00:30:00Z'), days: 7,
    submissions: [{ createdAt: '2026-11-16T23:59:00Z', status: 'ACCEPTED' }]
  });
  assert.equal(yesterdayOnly.totals.currentStreak, 1);
  const stale = buildActivity({
    to: at('2026-11-17T00:30:00Z'), days: 7,
    submissions: [{ createdAt: '2026-11-14T12:00:00Z', status: 'ACCEPTED' }]
  });
  assert.equal(stale.totals.currentStreak, 0);
  assert.equal(stale.totals.maxStreak, 1);
});

test('follow and unfollow are idempotent and self-following is rejected', async () => {
  const { prisma, follows } = followFixture();
  assert.deepEqual(await followUser(prisma, { followerId: 'u2', handle: 'Hero' }), { following: true, followersCount: 1 });
  assert.deepEqual(await followUser(prisma, { followerId: 'u2', handle: 'hero' }), { following: true, followersCount: 1 });
  assert.equal(follows.size, 1);
  assert.deepEqual(await unfollowUser(prisma, { followerId: 'u2', handle: 'hero' }), { following: false, followersCount: 0 });
  assert.deepEqual(await unfollowUser(prisma, { followerId: 'u2', handle: 'hero' }), { following: false, followersCount: 0 });
  await assert.rejects(followUser(prisma, { followerId: 'u1', handle: 'hero' }), error => error.status === 400 && error.code === 'SELF_FOLLOW');
  await assert.rejects(followUser(prisma, { followerId: 'u2', handle: 'missing' }), error => error.status === 404);
});

test('public profile exposes counters and viewer-specific follow state', async () => {
  const prisma = {
    user: {
      findFirst: async () => ({ id: 'u1', username: 'hero', nickname: 'Hero', avatarUrl: null, xp: 250, createdAt: new Date('2026-01-02T03:04:05Z') })
    },
    lessonProgress: { count: async () => 4 },
    problemCompletion: { count: async () => 9 },
    submission: { count: async () => 21 },
    follow: { count: async ({ where }) => (where.followingId && where.followerId ? 1 : where.followingId ? 2 : 3) },
    rating: { findUnique: async () => ({ points: 1120, wins: 3, losses: 1, draws: 0 }) }
  };
  const profile = await getProfile(prisma, { handle: 'HERO', viewerId: 'u9' });
  assert.deepEqual(profile, {
    id: 'u1', username: 'hero', nickname: 'Hero', avatarUrl: null, xp: 250, level: 3,
    joinedAt: '2026-01-02T03:04:05.000Z',
    completedLessons: 4, solvedProblems: 9, submissions: 21,
    followers: 2, following: 3, isFollowing: true, isMe: false,
    rating: { points: 1120, wins: 3, losses: 1, draws: 0 }
  });
  const own = await getProfile(prisma, { handle: 'hero', viewerId: 'u1' });
  assert.equal(own.isMe, true);
  assert.equal(own.isFollowing, false);
});
