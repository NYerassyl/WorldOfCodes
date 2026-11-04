import { Router } from 'express';
import { asyncRoute, ensureKeys } from '../lib/errors.js';
import { createFriendlyInvite, getActiveMatchForUser, getLeaderboard, getMatchForUser, getMyRating, joinFriendlyInvite, submitBattleSolution } from './service.js';
import { MatchmakingQueue } from './matchmaking.js';

export function createBattleRouter(prisma, auth, { queue = new MatchmakingQueue(prisma), judge, notifier } = {}) {
  const router = Router();
  const publish = event => notifier?.publish(event);

  router.get('/battle/leaderboard', asyncRoute(async (req, res) =>
    res.json({ items: await getLeaderboard(prisma, req.query.limit) })));
  router.get('/battle/rating/me', auth, asyncRoute(async (req, res) =>
    res.json(await getMyRating(prisma, req.auth.userId))));

  // Recovery endpoint: the database is authoritative for active matches;
  // the process-local queue reports only this server instance's live ticket.
  router.get('/battle/state', auth, asyncRoute(async (req, res) => {
    const userId = req.auth.userId;
    const [match, queueState] = await Promise.all([
      getActiveMatchForUser(prisma, userId),
      Promise.resolve(queue.getStatus(userId))
    ]);
    res.json({ match, queue: queueState });
  }));

  router.post('/battle/ranked/queue', auth, asyncRoute(async (req, res) => {
    ensureKeys(req.body || {}, []);
    const result = await queue.join(req.auth.userId);
    if (result.status === 'MATCHED') publish({ type: 'battle:matched', match: result.match });
    res.status(result.status === 'MATCHED' ? 201 : 202).json(result);
  }));
  router.delete('/battle/ranked/queue', auth, asyncRoute(async (req, res) =>
    res.json(queue.leave(req.auth.userId))));

  router.post('/battle/friendly', auth, asyncRoute(async (req, res) => {
    ensureKeys(req.body || {}, []);
    const invite = await createFriendlyInvite(prisma, req.auth.userId);
    publish({ type: 'battle:invite-created', userId: req.auth.userId, matchId: invite.matchId });
    res.status(201).json(invite);
  }));
  router.post('/battle/friendly/:inviteCode/join', auth, asyncRoute(async (req, res) => {
    const match = await joinFriendlyInvite(prisma, req.auth.userId, req.params.inviteCode);
    publish({ type: 'battle:matched', match });
    res.json(match);
  }));
  router.get('/battle/matches/:matchId', auth, asyncRoute(async (req, res) =>
    res.json(await getMatchForUser(prisma, req.params.matchId, req.auth.userId))));

  router.post('/battle/matches/:matchId/submit', auth, asyncRoute(async (req, res) => {
    ensureKeys(req.body, ['code']);
    const result = await submitBattleSolution(prisma, {
      matchId: req.params.matchId, userId: req.auth.userId, sourceCode: req.body.code, judge
    });
    publish({
      type: 'match:updated', matchId: req.params.matchId,
      matchCompleted: Boolean(result.matchCompleted), winnerId: result.winnerId || null, verdict: result.status
    });
    if (result.matchCompleted) publish({ type: 'battle:completed', matchId: req.params.matchId, winnerId: result.winnerId || null });
    res.json(result);
  }));
  return router;
}
