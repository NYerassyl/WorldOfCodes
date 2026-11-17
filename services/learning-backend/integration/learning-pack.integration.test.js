import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../../server/app.js';
import { advancedLessons, advancedProblems } from '../prisma/learningPack.js';
import { judgeLearning } from '../src/problems/learningJudge.js';
import { runSqlQuery } from '../src/problems/sqlJudge.js';
import { getPublicProblemBank } from '../src/problems/service.js';
import { solutions } from '../../../tests/solutions.mjs';

const database=new URL(process.env.DATABASE_URL||'http://missing');
if(!['127.0.0.1','localhost'].includes(database.hostname)||!database.pathname.endsWith('_test'))throw new Error('A dedicated localhost *_test PostgreSQL database is required');
const prisma=new PrismaClient();
const casesFor=problem=>problem.cases.map(([args,expected])=>({argsJson:JSON.stringify(args),expectedJson:JSON.stringify(expected)}));

test('original learning pack: real isolated Python/SQL, shared history and saved lesson progress',{timeout:600000},async t=>{
  let server,user,token;
  try {
    await prisma.$connect();
    const app=createApp({prisma,staticDirectory:'/no-static-files'});
    server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
    const base=`http://127.0.0.1:${server.address().port}/api`;
    async function request(path,{method='GET',body,auth=token}={}){
      const response=await fetch(base+path,{method,headers:{...(auth?{Authorization:'Bearer '+auth}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
      return {status:response.status,body:response.status===204?null:await response.json()};
    }
    const suffix=Array.from(randomBytes(12),n=>String.fromCharCode(97+n%26)).join('');
    const account=await request('/auth/register',{method:'POST',auth:null,body:{email:suffix+'@example.com',nickname:'learn'+suffix,password:'test-password-123'}});
    assert.equal(account.status,201,JSON.stringify(account.body));user=account.body.user;token=account.body.token;

    await t.test('catalog contains 15 new problems, five levels and no leaked references/hidden cases',async()=>{
      assert.equal(await prisma.problem.count(),31);assert.equal(await prisma.lesson.count(),12);assert.equal(await prisma.course.count(),2);
      const catalog=await request('/problems',{auth:null});assert.equal(catalog.status,200);
      const pack=catalog.body.problems.filter(p=>p.id.startsWith('pack-'));assert.equal(pack.length,15);
      for(let level=1;level<=5;level++)assert.equal(pack.filter(p=>p.practiceLevel===level).length,3);
      for(const problem of pack){assert.equal(problem.examples.length,2);assert.equal(problem.referenceCode,undefined);assert.equal(problem.testCases,undefined);}
      const arena=await getPublicProblemBank(prisma);assert.equal(arena.length,28);assert.ok(arena.every(problem=>problem.language==='python'));
      const publicLesson=await request('/learning/lessons/sql-lab-lesson',{auth:null});assert.equal(publicLesson.body.lesson.example.language,'sql');
      assert.equal(publicLesson.body.lesson.problems.length,3);
    });
    await t.test('every authored reference passes its actual isolated worker and all fixtures',async()=>{
      for(const problem of advancedProblems){
        const result=await judgeLearning({language:problem.language,sourceCode:problem.referenceCode,functionName:problem.functionName,cases:casesFor(problem)});
        assert.equal(result.status,'ACCEPTED',`${problem.id}: ${JSON.stringify(result)}`);
        assert.equal(result.passedCases,problem.cases.length);
      }
    });
    await t.test('all six editable examples execute with their documented results',async()=>{
      for(const lesson of advancedLessons){
        const example=lesson.example;
        const result=await judgeLearning({kind:'example',language:example.language,sourceCode:example.code,functionName:example.functionName,args:example.args,fixture:example.fixture});
        assert.equal(result.status,'EXECUTED',lesson.id);assert.deepEqual(result.value,example.expected,lesson.id);
      }
    });
    await t.test('SQL executes as a read-only role, times out and has no canonical account access',async()=>{
      const fixture=advancedProblems.find(p=>p.id==='pack-quiet').cases[0][0][0];
      assert.deepEqual(await runSqlQuery({sourceCode:'SELECT current_user AS role',fixture}),{status:'EXECUTED',value:[{role:'judge'}]});
      assert.equal((await runSqlQuery({sourceCode:'WITH erased AS (DELETE FROM learners RETURNING id) SELECT * FROM erased',fixture})).status,'RUNTIME_ERROR');
      assert.equal((await runSqlQuery({sourceCode:'SELECT * FROM "User"',fixture})).status,'RUNTIME_ERROR');
      assert.equal((await runSqlQuery({sourceCode:'SELECT pg_sleep(5)',fixture})).status,'TIME_LIMIT');
      assert.equal((await runSqlQuery({sourceCode:'SELECT 1; \\! echo not-a-query',fixture})).status,'RUNTIME_ERROR');
      await assert.rejects(runSqlQuery({sourceCode:'SELECT 1',fixture,image:'worldofcodes-missing-image:never-pull'}),error=>error.code==='JUDGE_UNAVAILABLE'&&error.status===503);
      const pythonTimeout=await judgeLearning({kind:'example',language:'python',sourceCode:'def experiment():\n    while True: pass',args:[]});
      assert.equal(pythonTimeout.status,'TIME_LIMIT');
    });
    await t.test('prerequisites are enforced before grading or running examples, then example edits never award XP',async()=>{
      assert.equal((await request('/learning/lessons/py-patterns-lesson/start',{method:'POST'})).status,409);
      assert.equal((await request('/learning/lessons/py-patterns-lesson/run-example',{method:'POST',body:{code:'def experiment(values): return values',args:[[1]]}})).status,409);
      assert.equal((await request('/problems/pack-balance/submit',{method:'POST',body:{code:advancedProblems.find(p=>p.id==='pack-balance').referenceCode}})).status,409);
      for(const id of ['py-edges','py-unique'])assert.equal((await request(`/problems/${id}/submit`,{method:'POST',body:{code:solutions[id]}})).body.status,'ACCEPTED');
      const before=await prisma.user.findUnique({where:{id:user.id}}),attempts=await prisma.submission.count({where:{userId:user.id}});
      assert.equal((await request('/learning/lessons/py-patterns-lesson/start',{method:'POST'})).status,200);
      const lesson=advancedLessons.find(l=>l.id==='patterns');
      const run=await request('/learning/lessons/py-patterns-lesson/run-example',{method:'POST',body:{code:lesson.example.code,args:[[2,2]]}});
      assert.equal(run.status,200);assert.deepEqual(run.body,{status:'EXECUTED',value:[0,2,4]});
      assert.equal(await prisma.submission.count({where:{userId:user.id}}),attempts);
      const after=await prisma.user.findUnique({where:{id:user.id}});assert.equal(after.xp,before.xp);assert.equal(after.coins,before.coins);
    });
    await t.test('SQL grades persist in canonical Submission, reward once and complete/reopen the lesson',async()=>{
      const sql=advancedProblems.filter(p=>p.language==='sql');
      const before=await prisma.user.findUnique({where:{id:user.id}});
      for(const problem of sql){
        const response=await request(`/problems/${problem.id}/submit`,{method:'POST',body:{code:problem.referenceCode}});
        assert.equal(response.status,200,JSON.stringify(response.body));assert.equal(response.body.status,'ACCEPTED');assert.equal(response.body.rewarded,true);
      }
      const repeat=await request('/problems/pack-quiet/submit',{method:'POST',body:{code:sql.find(p=>p.id==='pack-quiet').referenceCode}});
      assert.equal(repeat.body.status,'ACCEPTED');assert.equal(repeat.body.rewarded,false);assert.equal(repeat.body.earnedXp,0);
      const after=await prisma.user.findUnique({where:{id:user.id}});assert.equal(after.xp-before.xp,20+30+55);
      assert.equal(await prisma.submission.count({where:{userId:user.id,problem:{language:'sql'}}}),4);
      const progress=await request('/learning/progress');assert.equal(progress.body.lessons.find(l=>l.lessonId==='sql-lab-lesson').state,'COMPLETED');
      const canonical=await prisma.$queryRawUnsafe('SELECT sum(submissions)::int AS attempts FROM woc_profile_activity WHERE user_id=$1',user.id);
      assert.equal(canonical[0].attempts,6); // two foundation solves + four SQL submissions
      const reopen=await request('/learning/lessons/sql-lab-lesson/start',{method:'POST'});assert.equal(reopen.body.state,'COMPLETED');
    });
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    if(user)await prisma.user.delete({where:{id:user.id}});
    await prisma.$disconnect();
  }
});
