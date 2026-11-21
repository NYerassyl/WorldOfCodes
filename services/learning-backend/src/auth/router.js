import { socialRouter } from './social.js';
import { createChatRouter } from '../chat/router.js';
import { createNotificationRouter } from '../notifications/router.js';
import { Router } from 'express';
import { asyncRoute, ensureKeys, notFound, badRequest, AppError } from '../lib/errors.js';
import { normalizeNickname, publicUser, privateUser } from '../lib/security.js';
import { resolveAuthSession } from './session.js';
import { editOwnProfile } from './service.js';
import { proxyFastApiAuth } from './fastapi-proxy.js';

export function makeRequireAuth(prisma) {
  return asyncRoute(async (req, _res, next) => {
    const header = req.get('authorization') || '';
    const token = /^Bearer ([^\s]{1,8192})$/i.exec(header)?.[1];
    if (!token) throw new AppError(401,'UNAUTHORIZED','Bearer token required');
    const auth = await resolveAuthSession(prisma, token, {includeUser:true});
    if (!auth) throw new AppError(401,'UNAUTHORIZED','Invalid or expired session');
    req.auth = auth; next();
  });
}
export function createAuthRouter(prisma, { fastapiOrigin = process.env.FASTAPI_INTERNAL_URL, authTimeoutMs = 8000 } = {}) {
  const router=Router(); const auth=makeRequireAuth(prisma);
  router.use(socialRouter(prisma,auth));
  router.use(createChatRouter(prisma,auth));
  router.use(createNotificationRouter(prisma,auth));
  // FastAPI is the only JWT issuer; never fall back to Express opaque sessions.
  router.post('/auth/register',asyncRoute((req,res)=>
    proxyFastApiAuth(req,res,{fastapiOrigin,authTimeoutMs,route:'register'})));
  router.post('/auth/login',asyncRoute((req,res)=>
    proxyFastApiAuth(req,res,{fastapiOrigin,authTimeoutMs,route:'login'})));
  router.post('/auth/logout',asyncRoute((req,res)=>
    proxyFastApiAuth(req,res,{fastapiOrigin,authTimeoutMs,route:'logout'})));
  router.get('/users/me',auth,asyncRoute(async(req,res)=>{const completedLessons=await prisma.lessonProgress.count({where:{userId:req.auth.userId,completedAt:{not:null}}});res.json({...privateUser(req.auth.user),completedLessons});}));
  router.patch('/users/me',auth,asyncRoute(async(req,res)=>{ensureKeys(req.body,['nickname','avatarUrl','displayName','bio']);if(!Object.keys(req.body).length)throw badRequest('Provide nickname or avatarUrl');res.json(await editOwnProfile(prisma,{userId:req.auth.userId,current:req.auth.user,changes:req.body}));}));
  router.get('/users/:nickname',asyncRoute(async(req,res)=>{
    const user=await prisma.user.findUnique({where:{normalizedNickname:normalizeNickname(req.params.nickname)},select:{id:true,nickname:true,avatarUrl:true,xp:true,displayName:true,bio:true}});
    if(!user)throw notFound();
    const completedLessons=await prisma.lessonProgress.count({where:{userId:user.id,completedAt:{not:null}}});
    res.json({...publicUser(user),completedLessons});
  }));
  return router;
}
