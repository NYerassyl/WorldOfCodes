// Real, disposable PostgreSQL + FastAPI + Express + Socket.IO JWT acceptance.
// Run ONLY on a localhost database named *_test, with both servers already up.
// Never print JWTs, database URLs, or credentials.
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '../server/prisma.js';
import { hashPassword } from '../services/learning-backend/src/lib/security.js';
import { SignJWT } from 'jose';

const dbUrl=new URL(process.env.DATABASE_URL??'http://missing');
assert.ok(['localhost','127.0.0.1'].includes(dbUrl.hostname)&&dbUrl.pathname.endsWith('_test'));
const secret=process.env.JWT_SECRET;
assert.ok(secret && Buffer.byteLength(secret,'utf8')>=32);
assert.equal(typeof WebSocket,'function','Node 22+ WebSocket is required');

const prisma=new PrismaClient();
const BASE='http://127.0.0.1:4001', FAST='http://127.0.0.1:8000';
const slug=()=> 'site'+Array.from(randomBytes(11),x=>String.fromCharCode(97+x%26)).join('');
const auth=t=>t?{authorization:'Bearer '+t}:{};
async function call(origin,path,{method='GET',token,body}={}){
  const response=await fetch(origin+'/api'+path,{method,headers:{
    ...auth(token),...(body===undefined?{}:{'content-type':'application/json'})
  },body:body===undefined?undefined:JSON.stringify(body)});
  const result=response.status===204?null:await response.json();
  return {status:response.status,data:result};
}
function pass(label){console.log('PASS JWT SITE '+label);}
function expectStatus(value,status){assert.equal(value.status,status,JSON.stringify(value.data));return value.data;}

class SocketConnection {
  constructor(token){this.token=token;this.queue=[];this.pending=[];this.socket=null;}
  async connect({allowError=false}={}){
    const socket=new WebSocket('ws://127.0.0.1:4001/socket.io/?EIO=4&transport=websocket');
    this.socket=socket;
    socket.addEventListener('message',event=>{
      const value=String(event.data);
      if(value==='2'){socket.send('3');return;}
      const waiter=this.pending.find(w=>w.test(value));
      if(waiter){this.pending.splice(this.pending.indexOf(waiter),1);clearTimeout(waiter.timer);waiter.resolve(value);}
      else this.queue.push(value);
    });
    await new Promise((resolve,reject)=>{
      socket.addEventListener('open',resolve,{once:true});
      socket.addEventListener('error',()=>reject(new Error('Socket.IO connection failed')),{once:true});
    });
    await this.wait(v=>v.startsWith('0{'));
    socket.send('40'+JSON.stringify({token:this.token}));
    const response=await this.wait(v=>v.startsWith('40')||v.startsWith('44'));
    if(allowError){assert.ok(response.startsWith('44'),response);return response;}
    assert.ok(response.startsWith('40'),response);
    return response;
  }
  wait(test,timeoutMs=9000){
    const index=this.queue.findIndex(test);
    if(index>=0)return Promise.resolve(this.queue.splice(index,1)[0]);
    return new Promise((resolve,reject)=>{
      const entry={test,resolve,reject};
      entry.timer=setTimeout(()=>{this.pending=this.pending.filter(w=>w!==entry);reject(new Error('Socket.IO packet timeout'));},timeoutMs);
      this.pending.push(entry);
    });
  }
  async event(name,payload={},id=1){
    this.socket.send('42'+id+JSON.stringify([name,payload]));
    const ack=await this.wait(v=>v.startsWith('43'+id));
    return JSON.parse(ack.slice(('43'+id).length))[0];
  }
  close(){this.socket?.close();}
}
async function jwtWith(payload){
  return new SignJWT(payload).setProtectedHeader({alg:'HS256'}).sign(new TextEncoder().encode(secret));
}

const created=[];
const sockets=[];
try{
  const firstName=slug(), secondName=slug();
  async function register(name){
    const email=name+'@example.com';
    const result=expectStatus(await call(BASE,'/auth/register',{method:'POST',body:{
      email,nickname:name,password:'SecurePassword123!'
    }}),201);
    assert.equal(result.token.split('.').length,3);
    created.push(result.user.id);
    return {token:result.token,user:result.user,email};
  }
  const alice=await register(firstName);
  const bob=await register(secondName);
  pass('Express register → FastAPI JWT, two canonical users');
  for(const account of [alice,bob]){
    assert.equal(expectStatus(await call(BASE,'/users/me',{token:account.token}),200).id,account.user.id);
    assert.equal(expectStatus(await call(FAST,'/users/me',{token:account.token}),200).id,account.user.id);
    const dbUser=await prisma.user.findUniqueOrThrow({where:{id:account.user.id}});
    assert.ok(dbUser.passwordHash.startsWith('scrypt$16384$8$1$'));
    assert.ok(!dbUser.passwordHash.includes('SecurePassword123!'));
    assert.ok(await prisma.authSession.findFirst({where:{
      userId:account.user.id,tokenHash:createHash('sha256').update(account.token).digest('hex')
    }}));
  }
  pass('Same JWT authenticates Express and FastAPI via one User/AuthSession');

  const login=expectStatus(await call(BASE,'/auth/login',{method:'POST',body:{
    email:alice.email,password:'SecurePassword123!'
  }}),200);
  assert.equal(login.user.id,alice.user.id);
  assert.equal(login.token.split('.').length,3);
  pass('Express login also proxies FastAPI and yields a new JWT');

  // Existing Node-scrypt account (not created by FastAPI) can log in unchanged.
  const legacyName=slug(), legacyEmail=legacyName+'@example.com';
  const legacyUser=await prisma.user.create({data:{
    email:legacyEmail,nickname:legacyName,normalizedNickname:legacyName,
    passwordHash:await hashPassword('LegacyPass123!')
  }});
  created.push(legacyUser.id);
  const existing=expectStatus(await call(BASE,'/auth/login',{method:'POST',body:{
    email:legacyEmail,password:'LegacyPass123!'
  }}),200);
  assert.equal(existing.user.id,legacyUser.id);
  assert.equal(existing.token.split('.').length,3);
  pass('Existing Node-scrypt account logs in via FastAPI, no re-registration');

  const edited=expectStatus(await call(BASE,'/users/me',{method:'PATCH',token:alice.token,
    body:{bio:'JWT end-to-end authenticated'}}),200);
  assert.equal(edited.bio,'JWT end-to-end authenticated');
  const progress=expectStatus(await call(BASE,'/learning/progress',{token:alice.token}),200);
  assert.ok(Array.isArray(progress.lessons));
  expectStatus(await call(BASE,'/learning/lessons/py-variables-lesson/start',{
    method:'POST',token:alice.token}),200);
  expectStatus(await call(FAST,'/users/'+bob.user.id+'/progress',{token:alice.token}),403);
  expectStatus(await call(BASE,'/users/me',{method:'PATCH',token:alice.token,
    body:{userId:bob.user.id,coins:10000}}),400);
  pass('Profile update, progress and cross-user ownership restrictions');

  // Actual single HTTP server + real Socket.IO network transport, not a fake.
  const socketA=new SocketConnection(alice.token);sockets.push(socketA);await socketA.connect();
  const socketB=new SocketConnection(bob.token);sockets.push(socketB);await socketB.connect();
  const invite=expectStatus(await call(BASE,'/battle/friendly',{method:'POST',token:alice.token,body:{}}),201);
  const joined=expectStatus(await call(BASE,'/battle/friendly/'+invite.inviteCode+'/join',{method:'POST',token:bob.token}),200);
  assert.equal(joined.status,'ACTIVE');assert.equal(joined.type,'FRIENDLY');
  const watched=await socketA.event('match:watch',{matchId:joined.id},1);
  assert.equal(watched.ok,true);assert.equal(watched.match.id,joined.id);
  const recovered=new SocketConnection(alice.token);sockets.push(recovered);await recovered.connect();
  const recoveredMatch=await recovered.event('match:watch',{matchId:joined.id},2);
  assert.equal(recoveredMatch.ok,true);assert.equal(recoveredMatch.match.id,joined.id);
  pass('Two JWT accounts create friendly battle; real Socket.IO reconnect and match recovery');

  const raw=JSON.parse(Buffer.from(alice.token.split('.')[1],'base64url').toString());
  const wrongSignature=alice.token.split('.');
  const bytes=Buffer.from(wrongSignature[2],'base64url');bytes[0]^=1;
  wrongSignature[2]=bytes.toString('base64url');
  const cases=[
    wrongSignature.join('.'),
    await jwtWith({...raw,exp:Math.floor(Date.now()/1000)-10}),
    await jwtWith({...raw,iss:'wrong'}),
    await jwtWith({...raw,aud:'wrong'}),
  ];
  for(const bad of cases){
    expectStatus(await call(BASE,'/users/me',{token:bad}),401);
    expectStatus(await call(FAST,'/users/me',{token:bad}),401);
    const invalid=new SocketConnection(bad);sockets.push(invalid);await invalid.connect({allowError:true});
  }
  pass('Signature, expiration, issuer/audience invalid in both HTTP runtimes and Socket.IO');

  // Previous 30-day opaque sessions remain valid and revocable.
  const opaque=randomBytes(32).toString('base64url');
  await prisma.authSession.create({data:{
    userId:legacyUser.id,tokenHash:createHash('sha256').update(opaque).digest('hex'),
    expiresAt:new Date(Date.now()+15*60*1000)
  }});
  expectStatus(await call(BASE,'/users/me',{token:opaque}),200);
  expectStatus(await call(FAST,'/users/me',{token:opaque}),200);
  const oldSocket=new SocketConnection(opaque);sockets.push(oldSocket);await oldSocket.connect();
  expectStatus(await call(BASE,'/auth/logout',{method:'POST',token:opaque}),204);
  expectStatus(await call(BASE,'/users/me',{token:opaque}),401);
  expectStatus(await call(FAST,'/users/me',{token:opaque}),401);
  pass('Legacy opaque sessions still accepted and revoked correctly');

  expectStatus(await call(BASE,'/auth/logout',{method:'POST',token:alice.token}),204);
  expectStatus(await call(BASE,'/users/me',{token:alice.token}),401);
  expectStatus(await call(FAST,'/users/me',{token:alice.token}),401);
  const socketAck=await socketA.event('ranked:leave',{},3);
  assert.equal(socketAck.ok,false);
  assert.equal(socketAck.code,'SESSION_INVALID');
  const invalidReconnect=new SocketConnection(alice.token);sockets.push(invalidReconnect);
  await invalidReconnect.connect({allowError:true});
  pass('Logout revokes JWT in both runtimes and blocks old/reconnected sockets');
  console.log('PASS: canonical site JWT integration, friendly Socket.IO and logout');
}finally{
  for(const socket of sockets)socket.close();
  // All test accounts are generated in a dedicated local *_test database.
  for(const userId of created){
    try{await prisma.user.delete({where:{id:userId}});}catch{/* cleanup is best-effort */}
  }
  await prisma.$disconnect();
}
