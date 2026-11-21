import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { proxyFastApiAuth } from '../src/auth/fastapi-proxy.js';

async function serve(fn){
  const s=http.createServer(fn);
  await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
  return {s,url:'http://127.0.0.1:'+s.address().port};
}
async function close(s){s.closeAllConnections?.();await new Promise(resolve=>s.close(resolve));}
function request({authorization='',body={}}={}){
  return {body,get(name){return name==='authorization'?authorization:'';}};
}
function response(){
  return {code:200,body:null,status(code){this.code=code;return this;},
    json(data){this.body=data;return this;},end(){return this;}};
}
test('auth proxy preserves 201/200 {token,user} and 204 logout exactly',async()=>{
  const upstream=await serve(async(req,res)=>{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const data=JSON.parse(Buffer.concat(chunks).toString()||'{}');
    if(req.url.endsWith('/register')) {
      assert.equal(data.nickname,'validnickname');
      res.writeHead(201,{'content-type':'application/json'});
      res.end(JSON.stringify({token:'a.b.c',user:{id:'user-one'}}));
    }else if(req.url.endsWith('/login')){
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({token:'d.e.f',user:{id:'user-one'}}));
    }else{
      assert.equal(req.headers.authorization,'Bearer d.e.f');
      res.writeHead(204);res.end();
    }
  });
  try {
    const register=response();
    await proxyFastApiAuth(request({body:{nickname:'validnickname'}}),register,
      {fastapiOrigin:upstream.url,route:'register'});
    assert.equal(register.code,201);assert.equal(register.body.token,'a.b.c');
    const login=response();await proxyFastApiAuth(request(),login,{fastapiOrigin:upstream.url,route:'login'});
    assert.equal(login.code,200);assert.equal(login.body.user.id,'user-one');
    const logout=response();await proxyFastApiAuth(request({authorization:'Bearer d.e.f'}),logout,
      {fastapiOrigin:upstream.url,route:'logout'});
    assert.equal(logout.code,204);assert.equal(logout.body,null);
  }finally{await close(upstream.s);}
});

test('401, 409, Pydantic 422 detail and structured 503 pass through',async()=>{
  for(const [status,body] of [
    [401,{error:{code:'INVALID_CREDENTIALS',message:'bad'}}],
    [409,{error:{code:'EMAIL_TAKEN',message:'duplicate'}}],
    [422,{detail:[{type:'value_error',loc:['body','email'],msg:'Invalid email'}]}],
    [503,{error:{code:'JWT_NOT_CONFIGURED',message:'missing key'}}]
  ]){
    const upstream=await serve((_req,res)=>{
      res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));
    });
    try {
      const result=response();await proxyFastApiAuth(request(),result,
        {fastapiOrigin:upstream.url,route:'register'});
      assert.equal(result.code,status);assert.deepEqual(result.body,body);
    }finally{await close(upstream.s);}
  }
});

test('unavailable or timeout FastAPI fails closed with structured 503',async()=>{
  await assert.rejects(proxyFastApiAuth(request(),response(),{
    fastapiOrigin:'http://127.0.0.1:1',route:'register',authTimeoutMs:100
  }),e=>e.status===503&&e.code==='CANONICAL_AUTH_UNAVAILABLE');
  const upstream=await serve((_req,_res)=>{});
  try{
    await assert.rejects(proxyFastApiAuth(request(),response(),{
      fastapiOrigin:upstream.url,route:'register',authTimeoutMs:100
    }),e=>e.status===503&&e.code==='CANONICAL_AUTH_UNAVAILABLE');
  }finally{await close(upstream.s);}
});

test('rejects malformed FastAPI successful response and refuses redirect',async()=>{
  for(const [code,headers,body] of [
    [201,{'content-type':'application/json'},'{"not":"a JWT"}'],
    [302,{location:'https://example.com'},''],
  ]){
    const upstream=await serve((_req,res)=>{res.writeHead(code,headers);res.end(body);});
    try{
      await assert.rejects(proxyFastApiAuth(request(),response(),{
        fastapiOrigin:upstream.url,route:'register'
      }),e=>e.status===503);
    }finally{await close(upstream.s);}
  }
});
