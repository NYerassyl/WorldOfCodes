import { AppError, isUniqueError, notFound } from '../lib/errors.js';
import { judgeLearning } from './learningJudge.js';
import { ensurePrerequisite } from '../learning/prerequisites.js';

export const publicProblemSelect = {
  id:true, lessonId:true, title:true, statement:true, language:true, topicSlug:true, difficulty:true, practiceLevel:true,
  functionName:true, starterCode:true, rewardXp:true, rewardCoins:true,
  testCases:{where:{isSample:true},orderBy:{position:'asc'},select:{argsJson:true,expectedJson:true}}
};
export async function getPublicProblemBank(prisma,{topic,difficulty,includeSql=false}={}) {
  return prisma.problem.findMany({
    where:{isPublished:true,...(!includeSql?{language:'python'}:{}),OR:[{lessonId:null},{lesson:{topic:{course:{isPublished:true}}}}],
      ...(topic?{topicSlug:topic}:{}),...(difficulty?{difficulty}:{})},
    orderBy:[{difficulty:'asc'},{id:'asc'}],select:publicProblemSelect
  });
}
/** Server-only: includes hidden cases. Never expose on client/Socket.IO. */
export async function getJudgableProblem(prisma,problemId) {
  const p=await prisma.problem.findFirst({
    where:{id:problemId,isPublished:true,OR:[{lessonId:null},{lesson:{topic:{course:{isPublished:true}}}}]},
    select:{id:true,language:true,topicSlug:true,difficulty:true,functionName:true,
      testCases:{orderBy:{position:'asc'},select:{argsJson:true,expectedJson:true}}}
  });
  if(!p)throw notFound();return p;
}
export async function submitProblem(prisma,{userId,problemId,sourceCode,judge=judgeLearning}) {
  const problem=await prisma.problem.findFirst({where:{id:problemId,isPublished:true},
    include:{testCases:{orderBy:{position:'asc'}},lesson:{include:{topic:{include:{course:true}}}}}});
  if(!problem || (problem.lesson && !problem.lesson.topic.course.isPublished))throw notFound();
  if(!['python','sql'].includes(problem.language))throw new AppError(503,'JUDGE_UNAVAILABLE','No judge for language');
  await ensurePrerequisite(prisma,userId,problem.lesson);
  const verdict=await judge({language:problem.language,sourceCode,functionName:problem.functionName,cases:problem.testCases});
  if(!['ACCEPTED','WRONG_ANSWER','RUNTIME_ERROR','TIME_LIMIT'].includes(verdict?.status))
    throw new AppError(503,'JUDGE_UNAVAILABLE','Judge did not return a trustworthy verdict');
  const record=async(tx,rewarding)=>{
    const submission=await tx.submission.create({data:{userId,problemId,sourceCode,status:verdict.status,
      passedCases:verdict.passedCases,totalCases:verdict.totalCases}});
    if(rewarding) {
      await tx.problemCompletion.create({data:{userId,problemId}});
      await tx.rewardLedger.create({data:{userId,kind:'PROBLEM',sourceId:problemId,xp:problem.rewardXp,coins:problem.rewardCoins}});
      await tx.user.update({where:{id:userId},data:{xp:{increment:problem.rewardXp},coins:{increment:problem.rewardCoins}}});
      if(problem.lessonId){
        const total=await tx.problem.count({where:{lessonId:problem.lessonId,isPublished:true}});
        const completed=await tx.problemCompletion.count({where:{userId,problem:{lessonId:problem.lessonId,isPublished:true}}});
        if(total<1)throw new AppError(503,'LESSON_MISCONFIGURED','Lesson has no published problems');
        await tx.lessonProgress.upsert({where:{userId_lessonId:{userId,lessonId:problem.lessonId}},
          create:{userId,lessonId:problem.lessonId,completedAt:completed===total?new Date():null},
          update:completed===total?{completedAt:new Date()}:{}});
      }
    }
    return {submissionId:submission.id,status:verdict.status,passedCases:verdict.passedCases,
      totalCases:verdict.totalCases,rewarded:rewarding,earnedXp:rewarding?problem.rewardXp:0,
      earnedCoins:rewarding?problem.rewardCoins:0,
      ...(verdict.status==='ACCEPTED'&&problem.editorial?{explanation:problem.editorial}:{})};
  };
  if(verdict.status!=='ACCEPTED')return prisma.$transaction(tx=>record(tx,false));
  for(let retry=0;retry<3;retry++){
    try{return await prisma.$transaction(tx=>record(tx,true),{isolationLevel:'Serializable'});}
    catch(e){
      if(e?.code==='P2034'&&retry<2)continue;
      if(!isUniqueError(e))throw e;
      const completion=await prisma.problemCompletion.findUnique({where:{userId_problemId:{userId,problemId}}});
      if(!completion)throw e;
      return prisma.$transaction(tx=>record(tx,false));
    }
  }
}
