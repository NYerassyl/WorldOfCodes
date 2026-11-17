import { Router } from 'express';
import { asyncRoute, ensureKeys } from '../lib/errors.js';
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from './service.js';

export function createNotificationRouter(prisma, auth) {
  const router = Router();
  router.get('/notifications', auth, asyncRoute(async (req, res) => {
    res.json(await listNotifications(prisma, {
      userId: req.auth.userId,
      limit: req.query.limit,
      cursor: req.query.cursor,
    }));
  }));
  router.get('/notifications/unread-count', auth, asyncRoute(async (req, res) => {
    res.json(await unreadNotificationCount(prisma, { userId: req.auth.userId }));
  }));
  router.post('/notifications/read', auth, asyncRoute(async (req, res) => {
    ensureKeys(req.body, ['ids', 'all']);
    res.json(await markNotificationsRead(prisma, { userId: req.auth.userId, body: req.body }));
  }));
  return router;
}
