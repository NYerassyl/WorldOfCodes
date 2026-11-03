import { PrismaClient } from '@prisma/client';
import { syllabus, algorithms, copyExercises } from './seedData.js';
const prisma = new PrismaClient();
function reward(d) { return d==='EASY' ? {rewardXp:20,rewardCoins:5} : d==='MEDIUM' ? {rewardXp:35,rewardCoins:9} : {rewardXp:60,rewardCoins:15}; }
async function addProblem(p,lessonId,topicSlug) {
  const data={lessonId,title:p.title,statement:p.statement,language:'python',topicSlug,difficulty:p.difficulty,functionName:p.functionName,...reward(p.difficulty),isPublished:true};
  await prisma.problem.upsert({where:{id:p.id},create:{id:p.id,...data},update:data});
  for(let i=0;i<p.cases.length;i++){
    const [args,expected]=p.cases[i],id=p.id+'-t'+(i+1);
    const item={problemId:p.id,position:i+1,argsJson:JSON.stringify(args),expectedJson:JSON.stringify(expected),isSample:i===0};
    await prisma.testCase.upsert({where:{id},create:{id,...item},update:item});
  }
}
async function main(){
  await prisma.course.upsert({where:{id:'python-foundations'},create:{id:'python-foundations',title:'Python негіздері',language:'python',description:'6 topics: theory and progressive practice',isPublished:true},update:{}});
  for(let i=0;i<syllabus.length;i++){
    const s=syllabus[i],topicId='py-'+s.id,lessonId=topicId+'-lesson';
    await prisma.topic.upsert({where:{id:topicId},create:{id:topicId,courseId:'python-foundations',title:s.title,position:i+1},update:{title:s.title,position:i+1}});
    await prisma.lesson.upsert({where:{id:lessonId},create:{id:lessonId,topicId,title:s.title,position:1,theoryMd:s.theory},update:{title:s.title,theoryMd:s.theory}});
    for(const p of s.problems)await addProblem(p,lessonId,s.id);
  }
  for(const p of algorithms)await addProblem(p,null,p.topicSlug);
  for(const e of copyExercises)await prisma.copyExercise.upsert({where:{id:e.id},create:{...e,language:'python',rewardXp:5,rewardCoins:1,isPublished:true},update:{title:e.title,description:e.description,templateCode:e.templateCode}});
  console.log('Seed: one Python course, six lessons, sixteen problems, three copy exercises');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await prisma.$disconnect();});
