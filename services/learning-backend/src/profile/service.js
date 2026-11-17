import { AppError, isUniqueError, notFound } from '../lib/errors.js';
import { normalizeUsername, publicUser } from '../lib/security.js';

const DAY_MS = 86_400_000;
const MAX_ACTIVITY_DAYS = 730;
const DEFAULT_ACTIVITY_DAYS = 365;

const isoDay = date => date.toISOString().slice(0, 10);
const utcDay = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const addDays = (date, count) => new Date(date.getTime() + count * DAY_MS);

export async function findProfileUser(prisma, rawHandle) {
  const handle = normalizeUsername(rawHandle);
  return prisma.user.findFirst({
    where: { OR: [{ username: handle }, { normalizedNickname: handle }] },
    select: { id: true, username: true, nickname: true, avatarUrl: true, xp: true, createdAt: true }
  });
}

function bucketFor(map, key) {
  if (!map.has(key)) map.set(key, { submissions: 0, solved: 0, accepted: 0 });
  return map.get(key);
}

// Pure aggregation so the heatmap, streaks and breakdowns can be unit-tested
// without a database. Days are UTC calendar days, matching `date` keys.
export function buildActivity({ submissions = [], completions = [], to = new Date(), days = DEFAULT_ACTIVITY_DAYS, allTime = null }) {
  const end = utcDay(to);
  const span = Math.max(1, Math.trunc(days));
  const start = addDays(end, -(span - 1));
  const daysByKey = new Map();
  for (let index = 0; index < span; index += 1) {
    const date = addDays(start, index);
    daysByKey.set(isoDay(date), { date: isoDay(date), weekday: date.getUTCDay(), submissions: 0, accepted: 0, solved: 0 });
  }
  const topics = new Map();
  const difficulties = new Map();
  let submissionsTotal = 0;
  let acceptedTotal = 0;
  for (const submission of submissions) {
    const day = daysByKey.get(isoDay(new Date(submission.createdAt)));
    if (!day) continue;
    day.submissions += 1;
    submissionsTotal += 1;
    if (submission.status === 'ACCEPTED') { day.accepted += 1; acceptedTotal += 1; }
    if (submission.topicSlug) {
      const topic = bucketFor(topics, submission.topicSlug);
      topic.submissions += 1;
      if (submission.status === 'ACCEPTED') topic.accepted += 1;
    }
    if (submission.difficulty) {
      const difficulty = bucketFor(difficulties, submission.difficulty);
      difficulty.submissions += 1;
      if (submission.status === 'ACCEPTED') difficulty.accepted += 1;
    }
  }
  let solvedTotal = 0;
  for (const completion of completions) {
    const day = daysByKey.get(isoDay(new Date(completion.completedAt)));
    if (!day) continue;
    day.solved += 1;
    solvedTotal += 1;
    if (completion.topicSlug) bucketFor(topics, completion.topicSlug).solved += 1;
    if (completion.difficulty) bucketFor(difficulties, completion.difficulty).solved += 1;
  }
  const daysList = [...daysByKey.values()];
  const months = new Map();
  for (const day of daysList) {
    const month = day.date.slice(0, 7);
    const row = months.get(month) || { month, submissions: 0, solved: 0 };
    row.submissions += day.submissions;
    row.solved += day.solved;
    months.set(month, row);
  }
  const sumWindow = rows => rows.reduce((acc, day) => ({ submissions: acc.submissions + day.submissions, solved: acc.solved + day.solved }), { submissions: 0, solved: 0 });
  let maxStreak = 0;
  let run = 0;
  for (const day of daysList) {
    run = day.submissions > 0 || day.solved > 0 ? run + 1 : 0;
    if (run > maxStreak) maxStreak = run;
  }
  let cursor = daysList.length - 1;
  // A streak survives the current day until it has fully passed with no activity.
  if (cursor >= 0 && daysList[cursor].submissions === 0 && daysList[cursor].solved === 0) cursor -= 1;
  let currentStreak = 0;
  for (; cursor >= 0 && (daysList[cursor].submissions > 0 || daysList[cursor].solved > 0); cursor -= 1) currentStreak += 1;
  return {
    from: isoDay(start),
    to: isoDay(end),
    days: daysList,
    months: [...months.values()],
    totals: {
      submissions: submissionsTotal,
      solved: solvedTotal,
      accepted: acceptedTotal,
      activeDays: daysList.filter(day => day.submissions > 0 || day.solved > 0).length,
      maxStreak,
      currentStreak
    },
    windows: { last30: sumWindow(daysList.slice(-30)), previous30: sumWindow(daysList.slice(-60, -30)) },
    topics: [...topics.entries()].map(([topic, row]) => ({ topic, ...row })).sort((a, b) => b.submissions - a.submissions || b.solved - a.solved || a.topic.localeCompare(b.topic)),
    difficulties: ['EASY', 'MEDIUM', 'HARD'].map(difficulty => ({ difficulty, ...(difficulties.get(difficulty) || { submissions: 0, solved: 0, accepted: 0 }) })),
    allTime: allTime || { submissions: submissionsTotal, solved: solvedTotal }
  };
}

export async function getProfile(prisma, { handle, viewerId = null }) {
  const user = await findProfileUser(prisma, handle);
  if (!user) throw notFound();
  const [completedLessons, solvedProblems, submissions, followers, following, viewerFollows, rating] = await Promise.all([
    prisma.lessonProgress.count({ where: { userId: user.id, completedAt: { not: null } } }),
    prisma.problemCompletion.count({ where: { userId: user.id } }),
    prisma.submission.count({ where: { userId: user.id } }),
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    viewerId && viewerId !== user.id ? prisma.follow.count({ where: { followerId: viewerId, followingId: user.id } }) : 0,
    prisma.rating.findUnique({ where: { userId: user.id } })
  ]);
  return {
    ...publicUser(user),
    joinedAt: user.createdAt.toISOString(),
    completedLessons,
    solvedProblems,
    submissions,
    followers,
    following,
    isFollowing: viewerFollows > 0,
    isMe: viewerId === user.id,
    rating: rating ? { points: rating.points, wins: rating.wins, losses: rating.losses, draws: rating.draws } : null
  };
}

export async function followUser(prisma, { followerId, handle }) {
  const target = await findProfileUser(prisma, handle);
  if (!target) throw notFound();
  if (target.id === followerId) throw new AppError(400, 'SELF_FOLLOW', 'You cannot follow yourself');
  try {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId: target.id } },
      create: { followerId, followingId: target.id },
      update: {}
    });
  } catch (error) {
    if (!isUniqueError(error)) throw error;
  }
  return { following: true, followersCount: await prisma.follow.count({ where: { followingId: target.id } }) };
}

export async function unfollowUser(prisma, { followerId, handle }) {
  const target = await findProfileUser(prisma, handle);
  if (!target) throw notFound();
  if (target.id === followerId) throw new AppError(400, 'SELF_FOLLOW', 'You cannot unfollow yourself');
  await prisma.follow.deleteMany({ where: { followerId, followingId: target.id } });
  return { following: false, followersCount: await prisma.follow.count({ where: { followingId: target.id } }) };
}

async function listConnections(prisma, { handle, relation, limit, offset }) {
  const user = await findProfileUser(prisma, handle);
  if (!user) throw notFound();
  const take = Math.min(50, Math.max(1, Math.trunc(Number(limit) || 20)));
  const skip = Math.max(0, Math.trunc(Number(offset) || 0));
  const where = relation === 'followers' ? { followingId: user.id } : { followerId: user.id };
  const userSelect = { select: { id: true, username: true, nickname: true, avatarUrl: true, xp: true } };
  const [rows, total] = await Promise.all([
    prisma.follow.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { followerId: 'asc' }],
      skip,
      take,
      select: { createdAt: true, follower: userSelect, following: userSelect }
    }),
    prisma.follow.count({ where })
  ]);
  const items = rows.map(row => ({ ...publicUser(relation === 'followers' ? row.follower : row.following), followedAt: row.createdAt.toISOString() }));
  return { total, items, hasMore: skip + items.length < total };
}

export const listFollowers = (prisma, options) => listConnections(prisma, { ...options, relation: 'followers' });
export const listFollowing = (prisma, options) => listConnections(prisma, { ...options, relation: 'following' });

export async function getActivity(prisma, { handle, days = DEFAULT_ACTIVITY_DAYS, now = new Date() }) {
  const user = await findProfileUser(prisma, handle);
  if (!user) throw notFound();
  const requested = Math.trunc(Number(days));
  const span = Number.isFinite(requested) ? Math.min(MAX_ACTIVITY_DAYS, Math.max(7, requested)) : DEFAULT_ACTIVITY_DAYS;
  const end = utcDay(now);
  const start = addDays(end, -(span - 1));
  const [submissions, completions, allTimeSubmissions, allTimeSolved] = await Promise.all([
    prisma.submission.findMany({
      where: { userId: user.id, createdAt: { gte: start } },
      select: { createdAt: true, status: true, problem: { select: { topicSlug: true, difficulty: true } } }
    }),
    prisma.problemCompletion.findMany({
      where: { userId: user.id, completedAt: { gte: start } },
      select: { completedAt: true, problem: { select: { topicSlug: true, difficulty: true } } }
    }),
    prisma.submission.count({ where: { userId: user.id } }),
    prisma.problemCompletion.count({ where: { userId: user.id } })
  ]);
  return buildActivity({
    submissions: submissions.map(row => ({ createdAt: row.createdAt, status: row.status, topicSlug: row.problem?.topicSlug ?? null, difficulty: row.problem?.difficulty ?? null })),
    completions: completions.map(row => ({ completedAt: row.completedAt, topicSlug: row.problem?.topicSlug ?? null, difficulty: row.problem?.difficulty ?? null })),
    to: end,
    days: span,
    allTime: { submissions: allTimeSubmissions, solved: allTimeSolved }
  });
}
