import { PrismaClient } from '@prisma/client';
import { syllabus, algorithms, copyExercises } from './seedData.js';
import { advancedLessons, advancedProblems } from './learningPack.js';
const prisma = new PrismaClient();
function reward(d) { return d==='EASY' ? {rewardXp:20,rewardCoins:5} : d==='MEDIUM' ? {rewardXp:35,rewardCoins:9} : {rewardXp:60,rewardCoins:15}; }
async function addProblem(p,lessonId,topicSlug) {
  const data={lessonId,title:p.title,statement:p.statement,language:p.language||'python',topicSlug,practiceLevel:p.practiceLevel||null,editorial:p.explanation?p.explanation+"\n\n"+p.complexity:null,difficulty:p.difficulty,functionName:p.functionName,starterCode:p.starterCode,...(p.practiceLevel?{rewardXp:[20,30,40,55,75][p.practiceLevel-1],rewardCoins:[5,7,10,14,20][p.practiceLevel-1]}:reward(p.difficulty)),isPublished:true};
  await prisma.problem.upsert({where:{id:p.id},create:{id:p.id,...data},update:data});
  for(let i=0;i<p.cases.length;i++){
    const [args,expected]=p.cases[i],id=p.id+'-t'+(i+1);
    const item={problemId:p.id,position:i+1,argsJson:JSON.stringify(args),expectedJson:JSON.stringify(expected),isSample:i<(p.sampleCount||1)};
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
  await prisma.course.upsert({where:{id:'sql-practice'},create:{id:'sql-practice',title:'SQL: relational query workshop',language:'sql',description:'Joins, aggregation and consecutive-day window queries with isolated PostgreSQL practice',isPublished:true},update:{}});
  let pythonPosition=syllabus.length;
  for(const lesson of advancedLessons){
    const sql=lesson.example.language==='sql';
    const topicId=sql?'sql-lab':'py-'+lesson.id, lessonId=topicId+'-lesson';
    const courseId=sql?'sql-practice':'python-foundations',position=sql?1:++pythonPosition;
    await prisma.topic.upsert({where:{id:topicId},create:{id:topicId,courseId,title:lesson.title,position},update:{title:lesson.title,position}});
    const data={title:lesson.title,theoryMd:lesson.theory,prerequisiteId:lesson.prerequisiteLessonId,exampleJson:JSON.stringify(lesson.example)};
    await prisma.lesson.upsert({where:{id:lessonId},create:{id:lessonId,topicId,position:1,...data},update:data});
    for(const problem of lesson.problems)await addProblem(problem,lessonId,lesson.id);
  }
  for(const e of copyExercises)await prisma.copyExercise.upsert({where:{id:e.id},create:{...e,language:'python',rewardXp:5,rewardCoins:1,isPublished:true},update:{title:e.title,description:e.description,templateCode:e.templateCode}});
  console.log(`Seed: 2 courses, ${syllabus.length+advancedLessons.length} lessons, ${syllabus.flatMap(s=>s.problems).length+algorithms.length+advancedProblems.length} problems, 3 copy exercises. New pack: 15 problems, 3 per practice level.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await prisma.$disconnect();});
