import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../../../server/app.js';
import { readConfig } from '../../../server/config.js';

async function serve(fn) {
  const s=http.createServer(fn);
  await new Promise(r=>s.listen(0,'127.0.0.1',r));
  return {s,url:'http://127.0.0.1:'+s.address().port};
}
async function close(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}
const fakePrisma={};

test('Express forwards register/login/logout status and {token,user} exactly to FastAPI',async()=>{
  const upstream=await serve(async(req,res)=>{
    const chunks=[];
    for await(const chunk of req)chunks.push(chunk);
    const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');
    if(req.url.endsWith('/register')){
      assert.equal(body.nickname,'validnickname');
      res.writeHead(201,{'content-type':'application/json'});
      res.end(JSON.stringify({token:'a.b.c',user:{id:'user1',nickname:body.nickname}}));
    }else if(req.url.endsWith('/login')){
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({token:'d.e.f',user:{id:'user1'}}));
    }else if(req.url.endsWith('/logout')){
      assert.equal(req.headers.authorization,'Bearer d.e.f');
      res.writeHead(204);res.end();
    }else{res.writeHead(500);res.end();}
  });
  const expressServer=await serve(createApp({
    prisma:fakePrisma, staticDirectory:'/missing',
    config:readConfig({FASTAPI_INTERNAL_URL:upstream.url,AUTH_RATE_LIMIT:'100'})
  }));
  const url=expressServer.url+'/api/auth/';
  try{
    const register=await fetch(url+'register',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({email:'x@example.com',password:'some-password',nickname:'validnickname'})});
    assert.equal(register.status,201);
    assert.deepEqual(await register.json(),{token:'a.b.c',user:{id:'user1',nickname:'validnickname'}});
    const login=await fetch(url+'login',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    assert.equal(login.status,200);assert.equal((await login.json()).token,'d.e.f');
    const logout=await fetch(url+'logout',{method:'POST',headers:{authorization:'Bearer d.e.f'}});
    assert.equal(logout.status,204);
  }finally{await close(expressServer.s);await close(upstream.s);}
});

test('Express preserves upstream 401/409/422 and returns structured 503 if FastAPI is down',async()=>{
  const upstream=await serve((req,res)=>{
    const code=req.url.includes('register')?409:req.url.includes('login')?422:401;
    res.writeHead(code,{'content-type':'application/json'});
    res.end(JSON.stringify({error:{code:'UPSTREAM_'+code,message:'test'}}));
  });
  const s=await serve(createApp({
    prisma:fakePrisma, staticDirectory:'/missing',
    config:readConfig({FASTAPI_INTERNAL_URL:upstream.url,AUTH_RATE_LIMIT:'100'})
  }));
  try{
    for(const [path,expected] of [['register',409],['login',422],['logout',401]]){
      const response=await fetch(s.url+'/api/auth/'+path,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
      assert.equal(response.status,expected);
      assert.equal((await response.json()).error.code,'UPSTREAM_'+expected);
    }
  }finally{await close(s.s);await close(upstream.s);}
  const unavailable=await serve(createApp({prisma:fakePrisma,staticDirectory:'/missing',
    config:readConfig({FASTAPI_INTERNAL_URL:'http://127.0.0.1:1',AUTH_RATE_LIMIT:'100',AUTH_PROXY_TIMEOUT_MS:'100'})}));
  try{
    const response=await fetch(unavailable.url+'/api/auth/register',{method:'POST',
      headers:{'content-type':'application/json'},body:'{}'});
    assert.equal(response.status,503);
    assert.equal((await response.json()).error.code,'CANONICAL_AUTH_UNAVAILABLE');
  }finally{await close(unavailable.s);}
});

test('auth proxy retains Express request size limit and auth rate limiter',async()=>{
  const s=await serve(createApp({prisma:fakePrisma,staticDirectory:'/missing',
    config:readConfig({REQUEST_BODY_LIMIT:'1kb',AUTH_RATE_LIMIT:'2',FASTAPI_INTERNAL_URL:'http://127.0.0.1:1'})}));
  const url=s.url+'/api/auth/register';
  try{
    const big=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({email:'x'.repeat(2000)})});
    assert.equal(big.status,413);
    const one=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    assert.equal(one.status,503);
    const three=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    assert.equal(three.status,429);
  }finally{await close(s.s);}
});
