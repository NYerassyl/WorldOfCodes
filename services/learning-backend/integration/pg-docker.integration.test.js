import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createAuthRouter, makeRequireAuth, createLearningRouter, createProblemsRouter,
  createCopyRouter, resolveAuthSession, judgePython, getJudgableProblem
} from '../src/index.js';
import { errorMiddleware } from '../src/lib/errors.js';
import { submitBattleSolution } from '../src/battle/service.js';

const database = new URL(process.env.DATABASE_URL || 'http://missing');
if (!['localhost', '127.0.0.1'].includes(database.hostname)
  || database.pathname !== '/worldofcodes_integration_test') {
  throw new Error('Refusing to run on any non-local or non-isolated PostgreSQL test database');
}
const prisma = new PrismaClient();
const suffix = randomBytes(4).toString('hex');
const exec = promisify(execFile);

async function startApp() {
  const app = express();
  app.use(express.json({limit:'32kb'}));
  const auth = makeRequireAuth(prisma);
  app.use('/api',createAuthRouter(prisma));
  app.use('/api',createLearningRouter(prisma,auth));
  app.use('/api',createProblemsRouter(prisma,auth));
  app.use('/api',createCopyRouter(prisma,auth));
  app.use(errorMiddleware);
  const server=await new Promise(resolve=>{
    const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));
  });
  return {server,url:'http://127.0.0.1:'+server.address().port+'/api'};
}

test('isolated PostgreSQL migrations, HTTP Auth, learning rewards and real Docker Judge', {timeout:240000}, async t=>{
  let server, url, token, user;
  async function request(path,{method='GET',data,auth=token}={}){
    const res=await fetch(url+path,{
      method,
      headers:{
        ...(auth?{authorization:'Bearer '+auth}:{}),
        ...(data!==undefined?{'content-type':'application/json'}:{})
      },
      body:data===undefined?undefined:JSON.stringify(data)
    });
    const body=res.status===204?null:await res.json();
    return {status:res.status,body};
  }
  try {
    await prisma.$connect();
    ({server,url}=await startApp());
    await t.test('four migration checksums match source and seed remains idempotent',async()=>{
      const names=[
        '20261103000000_init','20261103170000_add_battle_models',
        '20261103220000_match_status_type_index','20261103230000_problem_starter_code'
      ];
      const entries=await prisma.$queryRawUnsafe('SELECT migration_name, checksum, finished_at FROM "_prisma_migrations" ORDER BY migration_name');
      assert.deepEqual(entries.map(x=>x.migration_name),names);
      for(const item of entries){
        assert.ok(item.finished_at);
        const sql=readFileSync(new URL('../prisma/migrations/'+item.migration_name+'/migration.sql',import.meta.url));
        assert.equal(createHash('sha256').update(sql).digest('hex'),item.checksum);
      }
      assert.equal(await prisma.course.count(),1);
      assert.equal(await prisma.lesson.count(),6);
      assert.equal(await prisma.problem.count(),16);
      assert.equal(await prisma.testCase.count(),50);
      assert.equal(await prisma.copyExercise.count(),3);
      for(const delegate of ['user','authSession','problem','testCase','submission','match','matchPlayer','rating','friendBattle'])
        assert.equal(typeof prisma[delegate].findMany,'function',delegate);
    });
    await t.test('register/login, private profile and authorization',async()=>{
      const register=await request('/auth/register',{method:'POST',auth:null,data:{
        email:'first-'+suffix+'@example.test',password:'StrongTestPassword_123',nickname:'first_'+suffix
      }});
      assert.equal(register.status,201);
      token=register.body.token;user=register.body.user;
      assert.ok(token.length>32);
      assert.equal(await prisma.authSession.count({where:{userId:user.id}}),1);
      const session=await prisma.authSession.findFirst({where:{userId:user.id}});
      assert.notEqual(session.tokenHash,token);
      assert.equal(session.tokenHash,createHash('sha256').update(token).digest('hex'));
      const me=await request('/users/me');
      assert.equal(me.status,200);assert.equal(me.body.id,user.id);assert.equal(me.body.coins,0);
      const second=await request('/auth/register',{method:'POST',auth:null,data:{
        email:'second-'+suffix+'@example.test',password:'StrongTestPassword_123',nickname:'second_'+suffix
      }});
      assert.equal(second.status,201);
      assert.equal((await request('/users/me',{method:'PATCH',data:{userId:second.body.user.id,nickname:'attacker'}})).status,400);
      assert.equal((await request('/users/me',{method:'PATCH',data:{coins:9999,xp:9999}})).status,400);
      const pub=await request('/users/'+second.body.user.nickname,{auth:null});
      assert.equal(pub.status,200);
      assert.deepEqual(Object.keys(pub.body).sort(),['id','nickname','avatarUrl','xp','level','completedLessons'].sort());
      assert.equal((await request('/users/me',{auth:null})).status,401);
      assert.equal((await request('/auth/login',{method:'POST',auth:null,data:{email:user.email,password:'wrong'}})).status,401);
      const renamed=await request('/users/me',{method:'PATCH',data:{nickname:'new_'+suffix}});
      assert.equal(renamed.status,200);
      assert.equal(renamed.body.nextNicknameChange,'PAYMENT_REQUIRED');
      assert.equal((await request('/users/me',{method:'PATCH',data:{nickname:'again_'+suffix}})).status,402);
      assert.deepEqual(await resolveAuthSession(prisma,token),{userId:user.id,sessionId:session.id});
    });
    await t.test('concurrent ranked ACCEPTED submissions settle once and update both Elo ratings once', async () => {
      const rival = await prisma.user.create({ data: {
        email: 'battle-rival-' + suffix + '@example.test',
        passwordHash: 'integration-test-hash',
        nickname: 'rival_' + suffix,
        normalizedNickname: ('rival_' + suffix).toLowerCase()
      } });
      const problem = await prisma.problem.findUnique({ where: { id: 'algo-sort' } });
      assert.ok(problem, 'seeded battle problem must exist');
      await prisma.rating.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
      await prisma.rating.upsert({ where: { userId: rival.id }, create: { userId: rival.id }, update: {} });
      const match = await prisma.match.create({ data: {
        type: 'RANKED', status: 'ACTIVE', problemId: problem.id, startedAt: new Date(),
        players: { create: [{ userId: user.id, seat: 0 }, { userId: rival.id, seat: 1 }] }
      } });
      const before = await prisma.rating.findMany({
        where: { userId: { in: [user.id, rival.id] } },
        orderBy: { userId: 'asc' }, select: { userId: true, points: true, wins: true, losses: true }
      });
      const judge = async () => ({ status: 'ACCEPTED', passedCases: 1, totalCases: 1 });
      const results = await Promise.allSettled([
        submitBattleSolution(prisma, { matchId: match.id, userId: user.id, sourceCode: 'def solve(): return 1', judge }),
        submitBattleSolution(prisma, { matchId: match.id, userId: rival.id, sourceCode: 'def solve(): return 1', judge })
      ]);
      const completed = await prisma.match.findUnique({
        where: { id: match.id }, include: { players: true }
      });
      assert.equal(completed.status, 'COMPLETED');
      assert.ok([user.id, rival.id].includes(completed.winnerId));
      assert.equal(completed.players.filter(player => player.verdict === 'ACCEPTED').length, 1);
      assert.equal(results.filter(item => item.status === 'fulfilled').length, 2, JSON.stringify(results));
      assert.equal(results.filter(item => item.status === 'fulfilled' && item.value.settled === true).length, 1);
      const after = await prisma.rating.findMany({
        where: { userId: { in: [user.id, rival.id] } },
        orderBy: { userId: 'asc' }, select: { userId: true, points: true, wins: true, losses: true }
      });
      const winnerBefore = before.find(item => item.userId === completed.winnerId);
      const loserId = completed.players.find(player => player.userId !== completed.winnerId).userId;
      const loserBefore = before.find(item => item.userId === loserId);
      const winnerAfter = after.find(item => item.userId === completed.winnerId);
      const loserAfter = after.find(item => item.userId === loserId);
      assert.equal(winnerAfter.wins, winnerBefore.wins + 1);
      assert.equal(loserAfter.losses, loserBefore.losses + 1);
      assert.notEqual(winnerAfter.points, winnerBefore.points);
      assert.notEqual(loserAfter.points, loserBefore.points);
      assert.equal(completed.players.filter(player => player.ratingDelta !== null).length, 2);
    });

    await t.test('public API exposes starters and only sample cases; server can access hidden cases',async()=>{
      const all=await request('/problems',{auth:null});
      assert.equal(all.status,200);assert.equal(all.body.problems.length,16);
      for(const p of all.body.problems){
        assert.ok(p.starterCode.startsWith('def '+p.functionName+'('));
        assert.equal(p.examples.length,1);
        assert.equal(Object.hasOwn(p,'testCases'),false);
        const item=await request('/problems/'+p.id,{auth:null});
        assert.equal(item.status,200);
        assert.deepEqual(item.body.problem.examples,p.examples);
        assert.equal(Object.hasOwn(item.body.problem,'testCases'),false);
        const hidden=await getJudgableProblem(prisma,p.id);
        assert.ok(hidden.testCases.length>1);
        assert.equal(Object.hasOwn(hidden,'starterCode'),false);
      }
      assert.equal((await request('/problems?topic=sorting&difficulty=EASY',{auth:null})).body.problems.length,1);
      const course=await request('/learning/courses',{auth:null});
      assert.equal(course.body.courses[0].topics.length,6);
    });
    await t.test('wrong answers and runtime errors do not complete lesson or award rewards',async()=>{
      const started=await request('/learning/lessons/py-variables-lesson/start',{method:'POST'});
      assert.equal(started.status,200);
      const wrong=await request('/problems/py-double/submit',{method:'POST',data:{code:'def double(n):\n    return 0\n'}});
      assert.equal(wrong.status,200);assert.equal(wrong.body.status,'WRONG_ANSWER');assert.equal(wrong.body.rewarded,false);
      const runtime=await request('/problems/py-double/submit',{method:'POST',data:{code:'def double(n):\n    raise ValueError()\n'}});
      assert.equal(runtime.body.status,'RUNTIME_ERROR');
      assert.equal((await request('/users/me')).body.xp,0);
      assert.equal((await request('/learning/progress')).body.lessons[0].state,'IN_PROGRESS');
    });
    await t.test('concurrent accepted submissions give only one reward, lesson completes after second problem',async()=>{
      const code='def double(n):\n    return n * 2\n';
      const req=()=>request('/problems/py-double/submit',{method:'POST',data:{code}});
      const responses=await Promise.all([req(),req()]);
      assert.ok(responses.every(x=>x.status===200),JSON.stringify(responses));
      assert.ok(responses.every(x=>x.body.status==='ACCEPTED'));
      assert.equal(responses.filter(x=>x.body.rewarded).length,1);
      assert.equal((await request('/users/me')).body.xp,20);
      assert.equal((await request('/learning/progress')).body.lessons[0].state,'IN_PROGRESS');
      const next=await request('/problems/py-area/submit',{method:'POST',data:{
        code:'def rectangle_area(width, height):\n    return width * height\n'
      }});
      assert.equal(next.body.status,'ACCEPTED');
      assert.equal((await request('/learning/progress')).body.lessons[0].state,'COMPLETED');
      assert.equal((await request('/users/me')).body.xp,55);
      assert.equal(await prisma.rewardLedger.count({where:{userId:user.id,kind:'PROBLEM'}}),2);
    });
    await t.test('copy mode exactness and simultaneous retries give a single reward',async()=>{
      const example=(await request('/copy-exercises/copy-if')).body.exercise;
      const send=code=>request('/copy-exercises/copy-if/submit',{method:'POST',data:{code}});
      assert.equal((await send(example.templateCode+' ')).body.isExact,false);
      const results=await Promise.all([send(example.templateCode),send(example.templateCode)]);
      assert.ok(results.every(x=>x.status===200),JSON.stringify(results));
      assert.equal(results.filter(x=>x.body.rewarded).length,1);
      assert.equal((await request('/users/me')).body.xp,60);
      assert.equal(await prisma.rewardLedger.count({where:{userId:user.id,kind:'COPY'}}),1);
    });
    await t.test('rating and battle models do not alter learning XP or coins',async()=>{
      const before=await prisma.user.findUnique({where:{id:user.id},select:{xp:true,coins:true}});
      const ratingsBefore=await prisma.rating.count();
      const rating=await prisma.rating.upsert({where:{userId:user.id},create:{userId:user.id},update:{}});
      assert.ok(rating.points > 0);
      const after=await prisma.user.findUnique({where:{id:user.id},select:{xp:true,coins:true}});
      assert.deepEqual(after,before);
      assert.equal(await prisma.rating.count(),ratingsBefore+1);
      const battle=await prisma.match.create({data:{type:'FRIENDLY',status:'PENDING',problemId:'algo-sort',players:{create:[{userId:user.id,seat:0}]}}});
      const afterBattle=await prisma.user.findUnique({where:{id:user.id},select:{xp:true,coins:true}});
      assert.deepEqual(afterBattle,before);
      const ratingAfter=await prisma.rating.findUnique({where:{userId:user.id}});
      assert.equal(ratingAfter.points,rating.points);
      assert.equal(battle.status,'PENDING');
    });
    await t.test('real Docker sandbox returns Accepted, Wrong Answer, Runtime Error and timeout',async()=>{
      const cases=[{argsJson:'[3]',expectedJson:'6'}];
      const run=sourceCode=>judgePython({sourceCode,functionName:'double',cases});
      assert.equal((await run('def double(n):\n    return n*2\n')).status,'ACCEPTED');
      assert.equal((await run('def double(n):\n    return 0\n')).status,'WRONG_ANSWER');
      assert.equal((await run('def double(n):\n    raise Exception()\n')).status,'RUNTIME_ERROR');
      const timed=await judgePython({sourceCode:'def hang():\n    while True: pass\n',functionName:'hang',
        cases:[{argsJson:'[]',expectedJson:'null'}],timeoutMs:1500});
      assert.equal(timed.status,'TIME_LIMIT');
      const active=await exec('docker',['ps','--filter','name=woc-judge-','--format','{{.Names}}'],{timeout:5000});
      assert.equal(active.stdout.trim(),'');
      const judgeSrc=readFileSync(new URL('../src/problems/dockerJudge.js',import.meta.url),'utf8');
      for(const opt of ['--network=none','--read-only','--cap-drop=ALL','--memory=128m','--cpus=0.5','--pids-limit=32'])
        assert.ok(judgeSrc.includes(opt),'missing isolation flag '+opt);
    });
    await t.test('missing Docker image causes 503 without accepted submission, reward, or winner',async()=>{
      const before=await prisma.submission.count({where:{userId:user.id}});
      const completedMatchesBefore=await prisma.match.count({where:{status:'COMPLETED'}});
      const beforeXp=(await request('/users/me')).body.xp;
      const failApp=express();
      failApp.use(express.json());
      failApp.use('/api',createProblemsRouter(prisma,makeRequireAuth(prisma),{
        judge:args=>judgePython({...args,image:'woc-nonexistent-image:never'})
      }));
      failApp.use(errorMiddleware);
      const otherServer=await new Promise(resolve=>{
        const srv=failApp.listen(0,'127.0.0.1',()=>resolve(srv));
      });
      try{
        const response=await fetch('http://127.0.0.1:'+otherServer.address().port+'/api/problems/py-double/submit',{
          method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
          body:JSON.stringify({code:'def double(n): return n*2'})
        });
        assert.equal(response.status,503);
        assert.equal((await response.json()).error.code,'JUDGE_UNAVAILABLE');
      }finally{await new Promise(resolve=>otherServer.close(resolve))}
      assert.equal(await prisma.submission.count({where:{userId:user.id}}),before);
      assert.equal((await request('/users/me')).body.xp,beforeXp);
      assert.equal(await prisma.match.count({where:{status:'COMPLETED'}}),completedMatchesBefore);
    });
    await t.test('logout revokes the HTTP and Socket.IO session, progress persists after next login',async()=>{
      const before=(await request('/users/me')).body;
      const expiredToken=token;
      assert.equal((await request('/auth/logout',{method:'POST'})).status,204);
      assert.equal((await request('/users/me')).status,401);
      assert.equal(await resolveAuthSession(prisma,expiredToken),null);
      const login=await request('/auth/login',{method:'POST',auth:null,data:{
        email:user.email,password:'StrongTestPassword_123'
      }});
      assert.equal(login.status,200);token=login.body.token;
      assert.notEqual(token,expiredToken);
      const restored=(await request('/users/me')).body;
      assert.equal(restored.xp,before.xp);
      assert.equal(restored.coins,before.coins);
      assert.equal(restored.completedLessons,1);
      const session=await prisma.authSession.findFirst({where:{tokenHash:createHash('sha256').update(token).digest('hex')}});
      await prisma.authSession.update({where:{id:session.id},data:{expiresAt:new Date(Date.now()-1000)}});
      assert.equal((await request('/users/me')).status,401);
      assert.equal(await resolveAuthSession(prisma,token),null);
    });
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve));
    await prisma.$disconnect();
  }
});
