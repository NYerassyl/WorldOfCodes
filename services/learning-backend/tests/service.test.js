import test from 'node:test';
import assert from 'node:assert/strict';
import { submitProblem } from '../src/problems/service.js';
import { submitCopy } from '../src/copy/service.js';
import { editOwnProfile } from '../src/auth/service.js';
import { AppError } from '../src/lib/errors.js';
const unique=()=>Object.assign(new Error('unique'),{code:'P2002'});
function fixture(){
 let state={users:{u1:{id:'u1',xp:0,coins:0},u2:{id:'u2',xp:0,coins:0}},
 problems:{p1:{id:'p1',lessonId:'lesson',isPublished:true,language:'python',functionName:'solve',rewardXp:20,rewardCoins:5,testCases:[{argsJson:'[2]',expectedJson:'4'}],lesson:{topic:{course:{isPublished:true}}}},
 p2:{id:'p2',lessonId:'lesson',isPublished:true,language:'python',functionName:'solve',rewardXp:35,rewardCoins:9,testCases:[{argsJson:'[3]',expectedJson:'6'}],lesson:{topic:{course:{isPublished:true}}}}},
 submissions:[],completions:[],progress:[],rewards:[],copyAttempts:[],copyCompletions:[]};
 const txFor=d=>({
 submission:{create:async({data})=>{const row={...data,id:'s'+(d.submissions.length+1)};d.submissions.push(row);return row;}},
 problemCompletion:{
  create:async({data})=>{if(d.completions.some(v=>v.userId===data.userId&&v.problemId===data.problemId))throw unique();d.completions.push(data);},
  count:async({where})=>d.completions.filter(v=>v.userId===where.userId&&d.problems[v.problemId]?.lessonId===where.problem.lessonId).length
 },
 rewardLedger:{create:async({data})=>{if(d.rewards.some(v=>v.userId===data.userId&&v.kind===data.kind&&v.sourceId===data.sourceId))throw unique();d.rewards.push(data);}},
 user:{update:async({where,data})=>{d.users[where.id].xp+=data.xp.increment;d.users[where.id].coins+=data.coins.increment;}},
 problem:{count:async({where})=>Object.values(d.problems).filter(p=>p.lessonId===where.lessonId&&p.isPublished).length},
 lessonProgress:{upsert:async({where,create,update})=>{const id=where.userId_lessonId;const old=d.progress.find(p=>p.userId===id.userId&&p.lessonId===id.lessonId);if(old)Object.assign(old,update);else d.progress.push(create);}},
 copyAttempt:{create:async({data})=>{const row={...data,id:'c'+(d.copyAttempts.length+1)};d.copyAttempts.push(row);return row;}},
 copyCompletion:{create:async({data})=>{if(d.copyCompletions.some(v=>v.userId===data.userId&&v.exerciseId===data.exerciseId))throw unique();d.copyCompletions.push(data);}}
 });
 const prisma={
 problem:{findFirst:async({where})=>state.problems[where.id]||null},
 problemCompletion:{findUnique:async({where})=>state.completions.find(v=>v.userId===where.userId_problemId.userId&&v.problemId===where.userId_problemId.problemId)||null},
 copyCompletion:{findUnique:async({where})=>state.copyCompletions.find(v=>v.userId===where.userId_exerciseId.userId&&v.exerciseId===where.userId_exerciseId.exerciseId)||null},
 $transaction:async(callback)=>{const working=structuredClone(state);const result=await callback(txFor(working));state=working;return result;}
 };
 return {prisma,get state(){return state;}};
}
const accepted=async()=>({status:'ACCEPTED',passedCases:1,totalCases:1});
const wrong=async()=>({status:'WRONG_ANSWER',passedCases:0,totalCases:1});
test('wrong answer records submission but gives no XP and no lesson completion',async()=>{
 const f=fixture();const r=await submitProblem(f.prisma,{userId:'u1',problemId:'p1',sourceCode:'bad',judge:wrong});
 assert.equal(r.status,'WRONG_ANSWER');assert.equal(f.state.users.u1.xp,0);assert.equal(f.state.completions.length,0);assert.equal(f.state.progress.length,0);assert.equal(f.state.submissions.length,1);
});
test('Accepted re-submission awards once; lesson completes only after both problems',async()=>{
 const f=fixture();const a={userId:'u1',problemId:'p1',sourceCode:'def solve(n):return n*2',judge:accepted};
 const first=await submitProblem(f.prisma,a);assert.equal(first.rewarded,true);
 assert.equal(f.state.progress[0].completedAt,null);
 const repeated=await submitProblem(f.prisma,a);assert.equal(repeated.rewarded,false);
 assert.equal(f.state.users.u1.xp,20);
 const second=await submitProblem(f.prisma,{...a,problemId:'p2'});assert.equal(second.rewarded,true);
 assert.equal(f.state.users.u1.xp,55);assert.equal(f.state.users.u1.coins,14);
 assert.ok(f.state.progress[0].completedAt);assert.equal(f.state.rewards.length,2);
});
test('account rewards remain isolated',async()=>{
 const f=fixture();await submitProblem(f.prisma,{userId:'u2',problemId:'p1',sourceCode:'code',judge:accepted});
 assert.equal(f.state.users.u1.xp,0);assert.equal(f.state.users.u2.xp,20);
});
test('Docker infrastructure failure cannot store accepted or rewards',async()=>{
 const f=fixture();await assert.rejects(submitProblem(f.prisma,{userId:'u1',problemId:'p1',sourceCode:'code',judge:async()=>{throw new AppError(503,'JUDGE_UNAVAILABLE','Unavailable');}}),e=>e.status===503);
 assert.equal(f.state.submissions.length,0);assert.equal(f.state.users.u1.xp,0);
});
test('copy exercise rewards only exact source, once per user',async()=>{
 const f=fixture(),exercise={id:'copy-one',templateCode:'print(1)\n',rewardXp:5,rewardCoins:1};
 await submitCopy(f.prisma,{userId:'u1',exercise,code:'print(1)'});
 const one=await submitCopy(f.prisma,{userId:'u1',exercise,code:'print(1)\n'});
 const two=await submitCopy(f.prisma,{userId:'u1',exercise,code:'print(1)\n'});
 assert.equal(one.rewarded,true);assert.equal(two.rewarded,false);
 assert.equal(f.state.users.u1.xp,5);assert.equal(f.state.copyAttempts.length,3);assert.equal(f.state.completions.length,0);
});
test('profile changes are restricted to authenticated user, and only first rename is free',async()=>{
 const users={u1:{id:'u1',nickname:'First',normalizedNickname:'first',nicknameChanges:0,xp:0,coins:0,avatarUrl:null},u2:{id:'u2',nickname:'Other',normalizedNickname:'other',nicknameChanges:0,xp:0,coins:0,avatarUrl:null}};
 const prisma={user:{updateMany:async({where,data})=>{const u=users[where.id];if(!u||(where.nicknameChanges!==undefined&&u.nicknameChanges!==where.nicknameChanges))return {count:0};for(const [key,val] of Object.entries(data))u[key]=val&&typeof val==='object'&&'increment'in val?u[key]+val.increment:val;return {count:1};},findUniqueOrThrow:async({where})=>users[where.id]}};
 const renamed=await editOwnProfile(prisma,{userId:'u1',current:users.u1,changes:{nickname:'NewName'}});
 assert.equal(renamed.nickname,'NewName');assert.equal(renamed.nextNicknameChange,'PAYMENT_REQUIRED');assert.equal(users.u2.nickname,'Other');
 await assert.rejects(editOwnProfile(prisma,{userId:'u1',current:users.u1,changes:{nickname:'Again'}}),e=>e.status===402);
});
