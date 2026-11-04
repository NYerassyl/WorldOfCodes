import { Router } from 'express';
import { asyncRoute, ensureKeys } from '../lib/errors.js';
import { createFriendlyInvite, getLeaderboard, getMatchForUser, getMyRating, joinFriendlyInvite, submitBattleSolution } from './service.js';
import { MatchmakingQueue } from './matchmaking.js';

export function createBattleRouter(prisma, auth, { queue = new MatchmakingQueue(prisma), judge } = {}) {
  const router = Router();
  router.get('/battle/leaderboard', asyncRoute(async (req, res) => res.json({ items: await getLeaderboard(prisma, req.query.limit) })));
  router.get('/battle/rating/me', auth, asyncRoute(async (req, res) => res.json(await getMyRating(prisma, req.auth.userId))));
  router.post('/battle/ranked/queue', auth, asyncRoute(async (req, res) => {
    ensureKeys(req.body || {}, []);
    const result = await queue.join(req.auth.userId);
    res.status(result.status === 'MATCHED' ? 201 : 202).json(result);
  }));
  router.delete('/battle/ranked/queue', auth, asyncRoute(async (req, res) => res.json(queue.leave(req.auth.userId))));
  router.post('/battle/friendly', auth, asyncRoute(async (req, res) => {
    ensureKeys(req.body || {}, []);
    res.status(201).json(await createFriendlyInvite(prisma, req.auth.userId));
  }));
  router.post('/battle/friendly/:inviteCode/join', auth, asyncRoute(async (req, res) => {
    res.json(await joinFriendlyInvite(prisma, req.auth.userId, req.params.inviteCode));
  }));
  router.get('/battle/matches/:matchId', auth, asyncRoute(async (req, res) => {
    res.json(await getMatchForUser(prisma, req.params.matchId, req.auth.userId));
  }));
  router.post('/battle/matches/:matchId/submit', auth, asyncRoute(async (req, res) => {
    ensureKeys(req.body, ['code']);
    res.json(await submitBattleSolution(prisma, { matchId: req.params.matchId, userId: req.auth.userId, sourceCode: req.body.code, judge }));
  }));
  return router;
}
