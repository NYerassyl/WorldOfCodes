import { Router } from 'express';
import { asyncRoute, notFound, AppError, ensureKeys, requireString, badRequest } from '../lib/errors.js';
import { ensurePrerequisite } from './prerequisites.js';
import { judgeLearning } from '../problems/learningJudge.js';

const visibility = { topic: { select: { course: { select: { isPublished: true } } } } };
const published = lesson => lesson && lesson.topic.course.isPublished;

export function createLearningRouter(prisma, requireAuth, { runExample = judgeLearning } = {}) {
  const router = Router();
  router.get('/learning/courses', asyncRoute(async (_req,res) => {
    const courses = await prisma.course.findMany({ where:{isPublished:true}, select:{id:true,title:true,language:true,description:true,
      topics:{orderBy:{position:'asc'},select:{id:true,title:true,position:true,
        lessons:{orderBy:{position:'asc'},select:{id:true,title:true,position:true}}}}}});
    res.json({courses});
  }));
  router.get('/learning/lessons/:id', asyncRoute(async (req,res) => {
    const lesson=await prisma.lesson.findUnique({where:{id:req.params.id},select:{id:true,title:true,position:true,theoryMd:true,exampleJson:true,prerequisiteId:true,
      prerequisite:{select:{id:true,title:true}},
      topic:{select:{id:true,title:true,course:{select:{language:true,isPublished:true}}}},
      problems:{where:{isPublished:true},select:{id:true,title:true,difficulty:true,practiceLevel:true,language:true,functionName:true,starterCode:true,rewardXp:true,rewardCoins:true}}}});
    if(!published(lesson))throw notFound();
    const {exampleJson,...safe}=lesson;
    res.json({lesson:{...safe,example:exampleJson?JSON.parse(exampleJson):null}});
  }));
  router.post('/learning/lessons/:id/start',requireAuth,asyncRoute(async(req,res)=>{
    const lesson=await prisma.lesson.findUnique({where:{id:req.params.id},select:{id:true,prerequisiteId:true,...visibility}});
    if(!published(lesson))throw notFound();
    await ensurePrerequisite(prisma,req.auth.userId,lesson);
    const progress=await prisma.lessonProgress.upsert({where:{userId_lessonId:{userId:req.auth.userId,lessonId:lesson.id}},
      create:{userId:req.auth.userId,lessonId:lesson.id},update:{}});
    res.json({lessonId:lesson.id,state:progress.completedAt?'COMPLETED':'IN_PROGRESS',startedAt:progress.startedAt,completedAt:progress.completedAt});
  }));
  router.post('/learning/lessons/:id/run-example',requireAuth,asyncRoute(async(req,res)=>{
    ensureKeys(req.body,['code','args']);
    const sourceCode=requireString(req.body.code,'code',20000);
    const lesson=await prisma.lesson.findUnique({where:{id:req.params.id},select:{id:true,exampleJson:true,prerequisiteId:true,...visibility}});
    if(!published(lesson))throw notFound();
    await ensurePrerequisite(prisma,req.auth.userId,lesson);
    if(!lesson.exampleJson)throw new AppError(404,'EXAMPLE_NOT_FOUND','This lesson has no runnable example.');
    const example=JSON.parse(lesson.exampleJson);
    const args=req.body.args??example.args??[];
    if(!Array.isArray(args)||args.length>10||JSON.stringify(args).length>8000)throw badRequest('Example arguments must be a JSON array of up to 8000 characters.');
    const result=await runExample({kind:'example',language:example.language,sourceCode,functionName:example.functionName||'experiment',args,fixture:example.fixture});
    if(!['EXECUTED','RUNTIME_ERROR','TIME_LIMIT'].includes(result?.status))throw new AppError(503,'JUDGE_UNAVAILABLE','The example worker did not return a valid result.');
    // Deliberately no Submission, Completion or RewardLedger writes here.
    res.json(result);
  }));
  router.get('/learning/progress',requireAuth,asyncRoute(async(req,res)=>{
    const [lessons,completions]=await Promise.all([
      prisma.lessonProgress.findMany({where:{userId:req.auth.userId},select:{lessonId:true,startedAt:true,completedAt:true}}),
      prisma.problemCompletion.findMany({where:{userId:req.auth.userId},select:{problemId:true,completedAt:true}})]);
    res.json({lessons:lessons.map(progress=>({...progress,state:progress.completedAt?'COMPLETED':'IN_PROGRESS'})),completedProblems:completions});
  }));
  return router;
}
