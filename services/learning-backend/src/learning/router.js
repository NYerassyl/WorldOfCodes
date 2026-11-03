import { Router } from 'express';
import { asyncRoute,notFound } from '../lib/errors.js';
export function createLearningRouter(prisma,requireAuth){
  const router=Router();
  router.get('/learning/courses',asyncRoute(async(_req,res)=>{
    const courses=await prisma.course.findMany({where:{isPublished:true},select:{id:true,title:true,language:true,description:true,
      topics:{orderBy:{position:'asc'},select:{id:true,title:true,position:true,
        lessons:{orderBy:{position:'asc'},select:{id:true,title:true,position:true}}}}}});
    res.json({courses});
  }));
  router.get('/learning/lessons/:id',asyncRoute(async(req,res)=>{
    const lesson=await prisma.lesson.findUnique({where:{id:req.params.id},select:{id:true,title:true,position:true,theoryMd:true,
      topic:{select:{id:true,title:true,course:{select:{language:true,isPublished:true}}}},
      problems:{where:{isPublished:true},select:{id:true,title:true,difficulty:true,functionName:true,starterCode:true,rewardXp:true,rewardCoins:true}}}});
    if(!lesson||!lesson.topic.course.isPublished)throw notFound();
    res.json({lesson});
  }));
  router.post('/learning/lessons/:id/start',requireAuth,asyncRoute(async(req,res)=>{
    const lesson=await prisma.lesson.findUnique({where:{id:req.params.id},select:{id:true,topic:{select:{course:{select:{isPublished:true}}}}}});
    if(!lesson||!lesson.topic.course.isPublished)throw notFound();
    const p=await prisma.lessonProgress.upsert({where:{userId_lessonId:{userId:req.auth.userId,lessonId:lesson.id}},
      create:{userId:req.auth.userId,lessonId:lesson.id},update:{}});
    res.json({lessonId:lesson.id,state:p.completedAt?'COMPLETED':'IN_PROGRESS',startedAt:p.startedAt,completedAt:p.completedAt});
  }));
  router.get('/learning/progress',requireAuth,asyncRoute(async(req,res)=>{
    const [lessons,completions]=await Promise.all([
      prisma.lessonProgress.findMany({where:{userId:req.auth.userId},select:{lessonId:true,startedAt:true,completedAt:true}}),
      prisma.problemCompletion.findMany({where:{userId:req.auth.userId},select:{problemId:true,completedAt:true}})]);
    res.json({lessons:lessons.map(p=>({...p,state:p.completedAt?'COMPLETED':'IN_PROGRESS'})),completedProblems:completions});
  }));
  return router;
}
