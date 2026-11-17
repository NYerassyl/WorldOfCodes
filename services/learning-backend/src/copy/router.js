import { Router } from 'express';
import { asyncRoute,notFound,ensureKeys,requireString } from '../lib/errors.js';
import { submitCopy } from './service.js';
export function createCopyRouter(prisma,requireAuth){
  const router=Router();
  router.get('/copy-exercises',asyncRoute(async(_req,res)=>{
    const exercises=await prisma.copyExercise.findMany({where:{isPublished:true},
      select:{id:true,title:true,description:true,language:true,rewardXp:true,rewardCoins:true}});
    res.json({exercises});
  }));
  router.get('/copy-exercises/progress',requireAuth,asyncRoute(async(req,res)=>{
    const [completed,attempts]=await Promise.all([
      prisma.copyCompletion.findMany({where:{userId:req.auth.userId},select:{exerciseId:true,completedAt:true}}),
      prisma.copyAttempt.findMany({where:{userId:req.auth.userId},orderBy:{createdAt:'desc'},take:50,
        select:{exerciseId:true,isExact:true,createdAt:true}})]);
    res.json({completed,recentAttempts:attempts});
  }));
  router.get('/copy-exercises/:id',asyncRoute(async(req,res)=>{
    const exercise=await prisma.copyExercise.findFirst({where:{id:req.params.id,isPublished:true},
      select:{id:true,title:true,description:true,language:true,templateCode:true,rewardXp:true,rewardCoins:true}});
    if(!exercise)throw notFound();res.json({exercise});
  }));
  router.post('/copy-exercises/:id/submit',requireAuth,asyncRoute(async(req,res)=>{
    ensureKeys(req.body,['code']);const code=requireString(req.body.code,'code',20000);
    const exercise=await prisma.copyExercise.findFirst({where:{id:req.params.id,isPublished:true}});
    if(!exercise)throw notFound();
    res.json(await submitCopy(prisma,{userId:req.auth.userId,exercise,code}));
  }));
  return router;
}
