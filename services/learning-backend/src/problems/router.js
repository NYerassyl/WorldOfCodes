import { Router } from 'express';
import { asyncRoute,badRequest,ensureKeys,notFound,requireString } from '../lib/errors.js';
import { getPublicProblemBank,publicProblemSelect,submitProblem } from './service.js';
export function createProblemsRouter(prisma,requireAuth,{judge}={}){
  const router=Router();
  router.get('/problems',asyncRoute(async(req,res)=>{
    const {topic,difficulty}=req.query;
    if(topic!==undefined&&(typeof topic!=='string'||!/^[a-z0-9-]{1,40}$/.test(topic)))throw badRequest('Invalid topic');
    if(difficulty!==undefined&&!['EASY','MEDIUM','HARD'].includes(difficulty))throw badRequest('Invalid difficulty');
    const problems=await getPublicProblemBank(prisma,{topic,difficulty});
    res.json({problems:problems.map(p=>({...p,examples:p.testCases.map(c=>({args:JSON.parse(c.argsJson),expected:JSON.parse(c.expectedJson)})),testCases:undefined}))});
  }));
  router.get('/problems/my-submissions',requireAuth,asyncRoute(async(req,res)=>{
    const submissions=await prisma.submission.findMany({where:{userId:req.auth.userId},orderBy:{createdAt:'desc'},
      take:50,select:{id:true,problemId:true,status:true,passedCases:true,totalCases:true,createdAt:true}});
    res.json({submissions});
  }));
  router.get('/problems/:id',asyncRoute(async(req,res)=>{
    const p=await prisma.problem.findFirst({where:{id:req.params.id,isPublished:true,OR:[{lessonId:null},{lesson:{topic:{course:{isPublished:true}}}}]},select:publicProblemSelect});
    if(!p)throw notFound();
    const {testCases,...safe}=p;
    res.json({problem:{...safe,examples:testCases.map(c=>({args:JSON.parse(c.argsJson),expected:JSON.parse(c.expectedJson)}))}});
  }));
  router.post('/problems/:id/submit',requireAuth,asyncRoute(async(req,res)=>{
    ensureKeys(req.body,['code']);
    const sourceCode=requireString(req.body.code,'code',20000);
    res.json(await submitProblem(prisma,{userId:req.auth.userId,problemId:req.params.id,sourceCode,...(judge?{judge}:{})}));
  }));
  return router;
}
