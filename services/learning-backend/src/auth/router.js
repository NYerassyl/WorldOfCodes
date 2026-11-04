import { Router } from 'express';
import { asyncRoute, ensureKeys, notFound, requireString, badRequest, AppError } from '../lib/errors.js';
import { createSessionToken, hashSessionToken, hashPassword, verifyPassword, normalizeEmail, normalizeNickname, publicUser, privateUser } from '../lib/security.js';
import { editOwnProfile } from './service.js';
const SESSION_DAYS = 30;

export function makeRequireAuth(prisma) {
  return asyncRoute(async (req, _res, next) => {
    const header = req.get('authorization') || '';
    const token = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(header)?.[1];
    if (!token) throw new AppError(401,'UNAUTHORIZED','Bearer token required');
    const session = await prisma.authSession.findUnique({where:{tokenHash:hashSessionToken(token)},include:{user:true}});
    if (!session || session.revokedAt || session.expiresAt <= new Date()) throw new AppError(401,'UNAUTHORIZED','Invalid or expired session');
    req.auth = {userId:session.userId, sessionId:session.id, user:session.user}; next();
  });
}
async function startSession(prisma, userId) {
  const token = createSessionToken();
  await prisma.authSession.create({data:{userId,tokenHash:hashSessionToken(token),expiresAt:new Date(Date.now()+SESSION_DAYS*86_400_000)}});
  return token;
}
export function createAuthRouter(prisma) {
  const router=Router(); const auth=makeRequireAuth(prisma);
  router.post('/auth/register',asyncRoute(async (req,res)=>{
    ensureKeys(req.body,['email','password','nickname']);
    const email=normalizeEmail(req.body.email), nickname=requireString(req.body.nickname,'nickname',24), normalizedNickname=normalizeNickname(nickname);
    const passwordHash=await hashPassword(req.body.password), token=createSessionToken();
    const user=await prisma.user.create({data:{email,passwordHash,nickname,normalizedNickname,sessions:{create:{tokenHash:hashSessionToken(token),expiresAt:new Date(Date.now()+SESSION_DAYS*86_400_000)}}}});
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
  router.patch('/users/me',auth,asyncRoute(async(req,res)=>{ensureKeys(req.body,['nickname','avatarUrl']);if(!Object.keys(req.body).length)throw badRequest('Provide nickname or avatarUrl');res.json(await editOwnProfile(prisma,{userId:req.auth.userId,current:req.auth.user,changes:req.body}));}));
  router.get('/users/:nickname',asyncRoute(async(req,res)=>{
    const user=await prisma.user.findUnique({where:{normalizedNickname:normalizeNickname(req.params.nickname)},select:{id:true,nickname:true,avatarUrl:true,xp:true}});
    if(!user)throw notFound();
    const completedLessons=await prisma.lessonProgress.count({where:{userId:user.id,completedAt:{not:null}}});
    res.json({...publicUser(user),completedLessons});
  }));
  return router;
}
