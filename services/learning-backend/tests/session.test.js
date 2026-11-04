import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAuthSession } from '../src/auth/session.js';
import { createSessionToken, hashSessionToken } from '../src/lib/security.js';

function fakeSession(overrides={}) {
  const token=createSessionToken();
  const user={id:'u1',nickname:'UserOne'};
  const record={id:'s1',userId:'u1',revokedAt:null,expiresAt:new Date(Date.now()+60000),user,...overrides};
  let queries=0;
  const prisma={authSession:{findUnique:async query=>{
    queries++;
    assert.equal(query.where.tokenHash,hashSessionToken(token));
    assert.notEqual(query.where.tokenHash,token);
    if(query.include) assert.equal(query.include.user,true);
    return record;
  }}};
  return {token,user,record,prisma,get queries(){return queries;}};
}
test('shared HTTP/Socket lookup uses the same hashed AuthSession and returns authenticated identity',async()=>{
  const f=fakeSession();
  assert.deepEqual(await resolveAuthSession(f.prisma,f.token),{userId:'u1',sessionId:'s1'});
  assert.deepEqual(await resolveAuthSession(f.prisma,f.token,{includeUser:true}),{userId:'u1',sessionId:'s1',user:f.user});
  assert.equal(f.queries,2);
});
test('rejects malformed socket tokens before querying database',async()=>{
  const f=fakeSession();
  for(const value of [null,42,'','x','not a valid bearer token',{}]){
    assert.equal(await resolveAuthSession(f.prisma,value),null);
  }
  assert.equal(f.queries,0);
});
test('rejects expired and revoked tokens, including after initial successful handshake',async()=>{
  const f=fakeSession();
  assert.ok(await resolveAuthSession(f.prisma,f.token));
  f.record.revokedAt=new Date();
  assert.equal(await resolveAuthSession(f.prisma,f.token),null);
  f.record.revokedAt=null;
  f.record.expiresAt=new Date(Date.now()-1000);
  assert.equal(await resolveAuthSession(f.prisma,f.token),null);
});
test('rejects removed sessions and missing users on includeUser',async()=>{
  const token=createSessionToken();
  assert.equal(await resolveAuthSession({authSession:{findUnique:async()=>null}},token),null);
  const f=fakeSession({user:null});
  assert.equal(await resolveAuthSession(f.prisma,f.token,{includeUser:true}),null);
});
test('database lookup errors are not converted into valid sessions',async()=>{
  const token=createSessionToken();
  await assert.rejects(resolveAuthSession({authSession:{findUnique:async()=>{throw new Error('DATABASE_UNAVAILABLE')}}},token),/DATABASE_UNAVAILABLE/);
});
