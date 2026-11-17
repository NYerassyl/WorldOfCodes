import { Router } from 'express';
import { asyncRoute, ensureKeys } from '../lib/errors.js';
import { getThread, listConversations, markThreadRead, sendMessage } from './service.js';

export function createChatRouter(prisma, auth) {
  const router = Router();
  router.get('/chat/conversations', auth, asyncRoute(async (req, res) => {
    res.json(await listConversations(prisma, { userId: req.auth.userId }));
  }));
  router.get('/chat/:peerId/messages', auth, asyncRoute(async (req, res) => {
    res.json(await getThread(prisma, { userId: req.auth.userId, peerId: req.params.peerId }));
  }));
  router.post('/chat/:peerId/messages', auth, asyncRoute(async (req, res) => {
    ensureKeys(req.body, ['body']);
    res.status(201).json(await sendMessage(prisma, { userId: req.auth.userId, peerId: req.params.peerId, body: req.body.body }));
  }));
  router.post('/chat/:peerId/read', auth, asyncRoute(async (req, res) => {
    res.json(await markThreadRead(prisma, { userId: req.auth.userId, peerId: req.params.peerId }));
  }));
  return router;
}
