import { Router } from 'express';
import { asyncRoute, ensureKeys, isUniqueError, requireString, badRequest, AppError } from '../lib/errors.js';
import { createSessionToken, hashSessionToken, hashPassword, verifyPassword, normalizeEmail, normalizeNickname, normalizeUsername, privateUser } from '../lib/security.js';
import { resolveAuthSession } from './session.js';
import { editOwnProfile } from './service.js';
import { followUser, unfollowUser, getProfile, getActivity, listFollowers, listFollowing } from '../profile/service.js';
import { createChatRouter } from '../chat/router.js';
const SESSION_DAYS = 30;
const BEARER = /^Bearer ([A-Za-z0-9_-]{32,128})$/;

function uniqueConflict(error) {
  if (!isUniqueError(error)) return null;
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target : String(target ?? '').split(',');
  if (fields.includes('username')) return ['USERNAME_TAKEN', 'Username is already taken'];
  if (fields.includes('email')) return ['EMAIL_TAKEN', 'Email is already registered'];
  if (fields.includes('normalizedNickname')) return ['NICKNAME_TAKEN', 'Display name is already taken'];
  return ['CONFLICT', 'Value is already in use'];
}

export function makeRequireAuth(prisma) {
  return asyncRoute(async (req, _res, next) => {
    const token = BEARER.exec(req.get('authorization') || '')?.[1];
    if (!token) throw new AppError(401,'UNAUTHORIZED','Bearer token required');
    const auth = await resolveAuthSession(prisma, token, {includeUser:true});
    if (!auth) throw new AppError(401,'UNAUTHORIZED','Invalid or expired session');
    req.auth = auth; next();
  });
}
export function makeOptionalAuth(prisma) {
  return asyncRoute(async (req, _res, next) => {
    const token = BEARER.exec(req.get('authorization') || '')?.[1];
    if (token) {
      const auth = await resolveAuthSession(prisma, token, {includeUser:true});
      if (auth) req.auth = auth;
    }
    next();
  });
}
async function startSession(prisma, userId) {
  const token = createSessionToken();
  await prisma.authSession.create({data:{userId,tokenHash:hashSessionToken(token),expiresAt:new Date(Date.now()+SESSION_DAYS*86_400_000)}});
  return token;
}
export function createAuthRouter(prisma) {
  const router=Router(); const auth=makeRequireAuth(prisma); const maybeAuth=makeOptionalAuth(prisma);
  router.use(createChatRouter(prisma, auth));
  router.post('/auth/register',asyncRoute(async (req,res)=>{
    ensureKeys(req.body,['email','password','nickname','username']);
    const email=normalizeEmail(req.body.email), nickname=requireString(req.body.nickname,'nickname',24), normalizedNickname=normalizeNickname(nickname);
    const username=normalizeUsername(req.body.username);
    const passwordHash=await hashPassword(req.body.password), token=createSessionToken();
    let user;
    try {
      user=await prisma.user.create({data:{email,passwordHash,nickname,normalizedNickname,username,sessions:{create:{tokenHash:hashSessionToken(token),expiresAt:new Date(Date.now()+SESSION_DAYS*86_400_000)}}}});
    } catch (error) {
      const conflict=uniqueConflict(error);
      if (conflict) throw new AppError(409,conflict[0],conflict[1]);
      throw error;
    }
    res.status(201).json({token,user:privateUser(user)});
  }));
  router.post('/auth/login',asyncRoute(async (req,res)=>{
    ensureKeys(req.body,['email','password']);
    const user=await prisma.user.findUnique({where:{email:normalizeEmail(req.body.email)}});
    const fallback='scrypt$16384$8$1$00000000000000000000000000000000$'+'00'.repeat(64);
    const valid=await verifyPassword(req.body.password,user?.passwordHash||fallback);
    if(!user||!valid) throw new AppError(401,'INVALID_CREDENTIALS','Invalid email or password');
    const token=await startSession(prisma,user.id); res.json({token,user:privateUser(user)});
  }));
  router.post('/auth/logout',auth,asyncRoute(async (req,res)=>{await prisma.authSession.update({where:{id:req.auth.sessionId},data:{revokedAt:new Date()}});res.status(204).end();}));
  router.get('/users/me',auth,asyncRoute(async(req,res)=>{const completedLessons=await prisma.lessonProgress.count({where:{userId:req.auth.userId,completedAt:{not:null}}});res.json({...privateUser(req.auth.user),completedLessons});}));
  router.patch('/users/me',auth,asyncRoute(async(req,res)=>{ensureKeys(req.body,['nickname','avatarUrl','username']);if(!Object.keys(req.body).length)throw badRequest('Provide nickname, username or avatarUrl');res.json(await editOwnProfile(prisma,{userId:req.auth.userId,current:req.auth.user,changes:req.body}));}));
  router.get('/users/:handle',maybeAuth,asyncRoute(async(req,res)=>{
    res.json(await getProfile(prisma,{handle:req.params.handle,viewerId:req.auth?.userId??null}));
  }));
  router.get('/users/:handle/activity',asyncRoute(async(req,res)=>{
    res.json(await getActivity(prisma,{handle:req.params.handle,days:req.query.days}));
  }));
  router.get('/users/:handle/followers',asyncRoute(async(req,res)=>{
    res.json(await listFollowers(prisma,{handle:req.params.handle,limit:req.query.limit,offset:req.query.offset}));
  }));
  router.get('/users/:handle/following',asyncRoute(async(req,res)=>{
    res.json(await listFollowing(prisma,{handle:req.params.handle,limit:req.query.limit,offset:req.query.offset}));
  }));
  router.post('/users/:handle/follow',auth,asyncRoute(async(req,res)=>{
    res.json(await followUser(prisma,{followerId:req.auth.userId,handle:req.params.handle}));
  }));
  router.delete('/users/:handle/follow',auth,asyncRoute(async(req,res)=>{
    res.json(await unfollowUser(prisma,{followerId:req.auth.userId,handle:req.params.handle}));
  }));
  return router;
}
