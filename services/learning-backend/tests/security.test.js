import test from 'node:test';
import assert from 'node:assert/strict';
import {
 hashPassword,verifyPassword,normalizeNickname,normalizeEmail,
 publicUser,privateUser,hashSessionToken,createSessionToken,levelFromXp
} from '../src/lib/security.js';
import { codeMatchesExactly } from '../src/lib/rewards.js';
import { ensureKeys } from '../src/lib/errors.js';
import { judgePython } from '../src/problems/dockerJudge.js';
test('passwords are salted and hashes are verified',async()=>{
 const a=await hashPassword('secure-pass-123'),b=await hashPassword('secure-pass-123');
 assert.notEqual(a,b);
 assert.equal(await verifyPassword('secure-pass-123',a),true);
 assert.equal(await verifyPassword('incorrect',a),false);
 assert.equal(await verifyPassword('secure-pass-123','plaintext'),false);
});
test('sessions are random and stored as digest',()=>{
 const a=createSessionToken(),b=createSessionToken();
 assert.notEqual(a,b);assert.notEqual(a,hashSessionToken(a));
 assert.equal(hashSessionToken(a).length,64);
});
test('nickname and email validation',()=>{
 assert.equal(normalizeNickname('User_123'),'user_123');
 assert.equal(normalizeEmail(' Example@Mail.COM '),'example@mail.com');
 assert.throws(()=>normalizeNickname('ab'));
 assert.throws(()=>normalizeEmail('invalid'));
});
test('public user excludes private account data',()=>{
 const u={id:'u1',nickname:'Hero',avatarUrl:null,xp:101,coins:900,email:'private@example.com',passwordHash:'secret',nicknameChanges:1};
 assert.deepEqual(publicUser(u),{id:'u1',nickname:'Hero',avatarUrl:null,xp:101,level:2});
 assert.equal(privateUser(u).nextNicknameChange,'PAYMENT_REQUIRED');
 assert.equal(levelFromXp(199),2);
});
test('code-copy equality includes whitespace and trailing newline',()=>{
 assert.equal(codeMatchesExactly('print(1)\n','print(1)\n'),true);
 assert.equal(codeMatchesExactly('print(1)','print(1)\n'),false);
 assert.equal(codeMatchesExactly('x=1\n','x = 1\n'),false);
});
test('client cannot set coins, XP, userId, or completion state',()=>{
 for(const payload of [{nickname:'Hero',xp:999},{nickname:'Hero',coins:999},{nickname:'Hero',userId:'other'},{code:'x',passed:true}]){
  assert.throws(()=>ensureKeys(payload,payload.code!==undefined?['code']:['nickname','avatarUrl']),e=>e.status===400);
 }
});
test('unconfigured judge never returns Accepted',async()=>{
 await assert.rejects(judgePython({sourceCode:'def solve(x): return x',functionName:'solve',cases:[]}),e=>e.status===503);
 await assert.rejects(judgePython({sourceCode:'pass',functionName:'x);import os',cases:[{argsJson:'[1]',expectedJson:'1'}]}),e=>e.status===503);
});
