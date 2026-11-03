import { randomBytes, randomUUID } from 'node:crypto';
import { AppError } from '../lib/errors.js';
import { calculateElo } from './rating.js';
import { getJudgableProblem } from '../problems/service.js';
import { judgePython } from '../problems/dockerJudge.js';

const publicMatchSelect = {
  id: true, type: true, status: true, problemId: true, winnerId: true,
  startedAt: true, completedAt: true,
  players: { select: { userId: true, seat: true, submittedAt: true, verdict: true, ratingDelta: true,
    user: { select: { nickname: true, avatarUrl: true } } }, orderBy: { seat: 'asc' } }
};

function assertCode(code) {
  if (typeof code !== 'string' || code.length < 1 || code.length > 20_000) {
    throw new AppError(400, 'INVALID_INPUT', 'code must contain 1–20000 characters');
  }
}

async function pickProblem(prisma) {
  const choices = await prisma.problem.findMany({
    where: { isPublished: true, language: 'python', OR: [{ lessonId: null }, { lesson: { topic: { course: { isPublished: true } } } }] },
    select: { id: true }, orderBy: { id: 'asc' }, take: 100
  });
  if (!choices.length) throw new AppError(503, 'NO_BATTLE_PROBLEMS', 'No published Python problems are available');
  return choices[Math.floor(Math.random() * choices.length)].id;
}

async function ensureRating(tx, userId) {
  return tx.rating.upsert({ where: { userId }, create: { userId }, update: {} });
}

export async function createMatch(prisma, { userIds, type = 'RANKED', problemId }) {
  if (type !== 'RANKED') throw new AppError(400, 'INVALID_MATCH_TYPE', 'Use a friendly invite to create a FRIENDLY battle');
  if (!Array.isArray(userIds) || userIds.length !== 2 || !userIds[0] || !userIds[1] || userIds[0] === userIds[1]) {
    throw new AppError(400, 'INVALID_PLAYERS', 'A battle requires two different players');
  }
  const selectedProblemId = problemId || await pickProblem(prisma);
  const problem = await getJudgableProblem(prisma, selectedProblemId);
  if (problem.language !== 'python' || !problem.testCases.length) {
    throw new AppError(503, 'BATTLE_PROBLEM_UNAVAILABLE', 'Selected problem cannot be judged');
  }
  return prisma.$transaction(async tx => {
    if (type === 'RANKED') await Promise.all(userIds.map(id => ensureRating(tx, id)));
    const match = await tx.match.create({ data: {
      type: 'RANKED', status: 'ACTIVE', problemId: selectedProblemId, startedAt: new Date(),
      players: { create: userIds.map((userId, seat) => ({ userId, seat })) }
    }, select: publicMatchSelect });
    return match;
  }, { isolationLevel: 'Serializable' });
}

export async function createFriendlyInvite(prisma, userId) {
  const problemId = await pickProblem(prisma);
  const inviteCode = randomBytes(6).toString('base64url').toUpperCase();
  const match = await prisma.$transaction(async tx => {
    const created = await tx.match.create({ data: { type: 'FRIENDLY', status: 'PENDING', problemId, startedAt: null,
      players: { create: [{ userId, seat: 0 }] } }, select: { id: true } });
    await tx.friendBattle.create({ data: { matchId: created.id, inviteCode, createdById: userId,
      expiresAt: new Date(Date.now() + 30 * 60_000) } });
    return created;
  });
  return { matchId: match.id, inviteCode, expiresInSeconds: 1800 };
}

export async function joinFriendlyInvite(prisma, userId, inviteCode) {
  if (typeof inviteCode !== 'string' || !inviteCode.trim()) {
    throw new AppError(400, 'INVALID_INVITE', 'A valid invite code is required');
  }
  try {
    return await prisma.$transaction(async tx => {
      // Re-read invitation state inside the transaction to avoid stale preflight data.
      const invite = await tx.friendBattle.findUnique({
        where: { inviteCode: inviteCode.trim().toUpperCase() },
        include: { match: { include: { players: true } } }
      });
      if (!invite || invite.expiresAt <= new Date()) {
        throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite is invalid or expired');
      }
      if (invite.createdById === userId) {
        throw new AppError(409, 'CANNOT_JOIN_OWN_INVITE', 'You cannot join your own invite');
      }
      if (invite.match.type !== 'FRIENDLY' || invite.match.status !== 'PENDING') {
        throw new AppError(409, 'INVITE_ALREADY_USED', 'This invite is no longer available');
      }
      if (invite.match.players.length !== 1 ||
          invite.match.players[0].userId !== invite.createdById ||
          invite.match.players[0].seat !== 0) {
        throw new AppError(409, 'MATCH_FULL', 'This battle already has two players');
      }

      await tx.matchPlayer.create({ data: { matchId: invite.matchId, userId, seat: 1 } });
      const activated = await tx.match.updateMany({
        where: { id: invite.matchId, type: 'FRIENDLY', status: 'PENDING' },
        data: { status: 'ACTIVE', startedAt: new Date() }
      });
      if (activated.count !== 1) {
        throw new AppError(409, 'INVITE_ALREADY_USED', 'This invite is no longer available');
      }
      await tx.friendBattle.delete({ where: { id: invite.id } });
      return tx.match.findUnique({ where: { id: invite.matchId }, select: publicMatchSelect });
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (['P2002', 'P2034', 'P2025'].includes(error?.code)) {
      throw new AppError(409, 'INVITE_ALREADY_USED', 'This invite has already been used');
    }
    throw error;
  }
}

export async function getMatchForUser(prisma, matchId, userId) {
  const match = await prisma.match.findFirst({ where: { id: matchId, players: { some: { userId } } }, select: publicMatchSelect });
  if (!match) throw new AppError(404, 'BATTLE_NOT_FOUND', 'Battle not found');
  return match;
}

async function settleRankedMatch(tx, matchId, winnerId) {
  const match = await tx.match.findUnique({ where: { id: matchId }, include: { players: true } });
  if (!match || match.status !== 'ACTIVE' || match.type !== 'RANKED' || match.players.length !== 2) return false;
  const winner = match.players.find(p => p.userId === winnerId);
  const loser = match.players.find(p => p.userId !== winnerId);
  if (!winner || !loser) return false;
  const [winnerRating, loserRating] = await Promise.all([ensureRating(tx, winner.userId), ensureRating(tx, loser.userId)]);
  const { deltaA, deltaB } = calculateElo(winnerRating.points, loserRating.points, 1);
  const claimed = await tx.match.updateMany({ where: { id: matchId, type: 'RANKED', status: 'ACTIVE' }, data: { status: 'COMPLETED', winnerId, completedAt: new Date() } });
  if (claimed.count !== 1) return false;
  await tx.rating.update({ where: { userId: winner.userId }, data: { points: { increment: deltaA }, wins: { increment: 1 } } });
  await tx.rating.update({ where: { userId: loser.userId }, data: { points: { increment: deltaB }, losses: { increment: 1 } } });
  await tx.matchPlayer.update({ where: { matchId_userId: { matchId, userId: winner.userId } }, data: { ratingBefore: winnerRating.points, ratingDelta: deltaA } });
  await tx.matchPlayer.update({ where: { matchId_userId: { matchId, userId: loser.userId } }, data: { ratingBefore: loserRating.points, ratingDelta: deltaB } });
  return true;
}

export async function submitBattleSolution(prisma, { matchId, userId, sourceCode, judge = judgePython }) {
  assertCode(sourceCode);
  const match = await prisma.match.findFirst({ where: { id: matchId, status: 'ACTIVE', players: { some: { userId } } }, include: { players: true } });
  if (!match) throw new AppError(404, 'ACTIVE_MATCH_NOT_FOUND', 'Active battle not found');
  if (match.players.length !== 2) throw new AppError(409, 'MATCH_NOT_READY', 'Battle is waiting for the second player');
    const player = match.players.find(p => p.userId === userId);
  if (player.submittedAt) throw new AppError(409, 'ALREADY_SOLVED', 'You have already submitted an accepted solution');
  const problem = await getJudgableProblem(prisma, match.problemId);
  if (problem.language !== 'python') throw new AppError(503, 'JUDGE_UNAVAILABLE', 'No judge for this language');
  // Judge failures propagate. They never become a win or a stored ACCEPTED verdict.
  const verdict = await judge({ sourceCode, functionName: problem.functionName, cases: problem.testCases });
  if (!['ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT'].includes(verdict?.status)) {
    throw new AppError(503, 'JUDGE_UNAVAILABLE', 'Judge returned an untrusted verdict');
  }
  if (verdict.status !== 'ACCEPTED') return { ...verdict, matchCompleted: false, winnerId: null };
  const claimed = await prisma.$transaction(async tx => {
    // The match may complete while the external judge is running.
    const current = await tx.match.findUnique({ where: { id: matchId }, include: { players: true } });
    if (!current || current.status !== 'ACTIVE' || current.type !== match.type ||
        current.players.length !== 2 || !current.players.some(p => p.userId === userId)) return false;
    const update = await tx.matchPlayer.updateMany({
      where: { matchId, userId, submittedAt: null },
      data: { submittedAt: new Date(), verdict: 'ACCEPTED' }
    });
    if (update.count !== 1) return false;
    if (current.type === 'RANKED') return settleRankedMatch(tx, matchId, userId);
    if (current.type === 'FRIENDLY') {
      const ended = await tx.match.updateMany({
        where: { id: matchId, type: 'FRIENDLY', status: 'ACTIVE' },
        data: { status: 'COMPLETED', winnerId: userId, completedAt: new Date() }
      });
      return ended.count === 1;
    }
    return false;
  }, { isolationLevel: 'Serializable' });
  const latest = await prisma.match.findUnique({ where: { id: matchId }, select: { status: true, winnerId: true } });
  return { ...verdict, matchCompleted: latest?.status === 'COMPLETED', winnerId: latest?.winnerId || null, settled: claimed };
}

export async function getLeaderboard(prisma, take = 20) {
  return prisma.rating.findMany({ take: Math.min(Math.max(Number(take) || 20, 1), 100), orderBy: [{ points: 'desc' }, { updatedAt: 'asc' }],
    select: { points: true, wins: true, losses: true, draws: true, user: { select: { id: true, nickname: true, avatarUrl: true } } } });
}

export async function getMyRating(prisma, userId) {
  return prisma.rating.upsert({ where: { userId }, create: { userId }, update: {}, select: { points: true, wins: true, losses: true, draws: true } });
}

export function newQueueTicket(userId) { return { userId, ticketId: randomUUID(), joinedAt: Date.now() }; }
