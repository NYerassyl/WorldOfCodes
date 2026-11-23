import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { createHash } from 'node:crypto';
import { resolveAuthSession } from '../src/auth/session.js';

const ISS='worldofcodes-auth', AUD='worldofcodes-api';
const SECRET='test-only-jwt-secret-longer-than-32-bytes-no-production';
const KEY=new TextEncoder().encode(SECRET);
const previous=process.env.JWT_SECRET;
process.env.JWT_SECRET=SECRET;
process.on('exit',()=>{ if(previous===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous; });

const now=()=>Math.floor(Date.now()/1000);
async function tokenFor(sub='user-one',extra={},secret=KEY,algorithm='HS256') {
  return new SignJWT({ jti:'unique-token-id', ...extra })
    .setProtectedHeader({alg:algorithm})
    .setSubject(sub).setIssuer(ISS).setAudience(AUD)
    .setIssuedAt(now()).setExpirationTime(now()+3600).sign(secret);
}
function prismaFor(token,options={}) {
  const user={id:'user-one',nickname:'first'};
  const row={
    id:'session-one',userId:'user-one',revokedAt:null,
    expiresAt:new Date(Date.now()+3600000),user,...options,
  };
  let calls=0;
  return {
    prisma:{authSession:{findUnique:async query=>{
      calls++;
      assert.equal(query.where.tokenHash,createHash('sha256').update(token).digest('hex'));
      assert.equal(query.include?.user,true);
      return row;
    }}},
    get calls(){return calls;}, row,
  };
}

test('signed FastAPI-compatible JWT authenticates via existing Prisma User/AuthSession',async()=>{
  const token=await tokenFor();
  const env=prismaFor(token);
  assert.deepEqual(await resolveAuthSession(env.prisma,token),{userId:'user-one',sessionId:'session-one'});
  assert.deepEqual((await resolveAuthSession(env.prisma,token,{includeUser:true})).user.nickname,'first');
  assert.equal(env.calls,2);
});

test('wrong signature, HS384, issuer, audience, exp, future iat, missing jti all reject BEFORE DB lookup',async()=>{
  const valid=await tokenFor();
  const payload=JSON.parse(Buffer.from(valid.split('.')[1],'base64url').toString());
  const variants=[
    await tokenFor('user-one',{},new TextEncoder().encode('different-signing-secret-at-least-thirty-two')),
    await new SignJWT({...payload,iss:'wrong-issuer'}).setProtectedHeader({alg:'HS256'}).sign(KEY),
    await new SignJWT({...payload,aud:'wrong-audience'}).setProtectedHeader({alg:'HS256'}).sign(KEY),
    await new SignJWT({...payload, exp:now()-1}).setProtectedHeader({alg:'HS256'}).sign(KEY),
    await new SignJWT({...payload, iat:now()+10000}).setProtectedHeader({alg:'HS256'}).sign(KEY),
    await new SignJWT(Object.fromEntries(Object.entries(payload).filter(([k])=>k!=='jti')))
      .setProtectedHeader({alg:'HS256'}).sign(KEY),
    await tokenFor('user-one',{},KEY,'HS384'),
  ];
  for(const token of variants) {
    let queried=false;
    const prisma={authSession:{findUnique:async()=>{queried=true;return null;}}};
    assert.equal(await resolveAuthSession(prisma,token),null);
    assert.equal(queried,false);
  }
});

test('JWT cannot fall back to an opaque session even when the exact hash exists',async()=>{
  const malformed='header.payload.signature';
  let queried=false;
  const prisma={authSession:{findUnique:async()=>{queried=true;return {id:'fake'};}}};
  assert.equal(await resolveAuthSession(prisma,malformed),null);
  assert.equal(queried,false);
});

test('rejected revoked, expired, deleted-user and wrong-sub sessions',async()=>{
  const token=await tokenFor();
  for(const options of [
    {revokedAt:new Date()}, {expiresAt:new Date(0)},
    {user:null}, {user:{id:'user-two'}}, {userId:'user-two'},
  ]) {
    const env=prismaFor(token,options);
    assert.equal(await resolveAuthSession(env.prisma,token),null);
  }
});

test('legacy opaque sessions still resolve without JWT secret',async()=>{
  const token='opaque_'.repeat(7);
  const old=process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    const row={id:'session-one',userId:'user-one',revokedAt:null,expiresAt:new Date(Date.now()+60000)};
    const prisma={authSession:{findUnique:async query=>{
      assert.equal(query.where.tokenHash,createHash('sha256').update(token).digest('hex'));
      return row;
    }}};
    assert.deepEqual(await resolveAuthSession(prisma,token),{userId:'user-one',sessionId:'session-one'});
  }finally{process.env.JWT_SECRET=old;}
});

test('missing JWT secret fails closed with service-unavailable response, not opaque downgrade',async()=>{
  const token=await tokenFor();
  const old=process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try{
    await assert.rejects(resolveAuthSession({},token),e=>e.status===503&&e.code==='JWT_NOT_CONFIGURED');
  }finally{process.env.JWT_SECRET=old;}
});
