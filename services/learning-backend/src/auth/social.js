import { Router } from 'express';
import { asyncRoute, badRequest, notFound, requireString } from '../lib/errors.js';

export function socialRouter(db, auth) {
  const router = Router();
  router.use('/players', auth);
  const profile = { id:true, nickname:true, displayName:true, bio:true, avatarUrl:true };
  router.get('/players', asyncRoute(async (req,res) => {
    const me = req.auth.userId;
    const query = String(req.query.q || '').trim().toLowerCase().slice(0,24);
    const rows = await db.user.findMany({
      where:{id:{not:me}, ...(query ? {normalizedNickname:{contains:query}} : {OR:[
        {followers:{some:{followerId:me}}}, {sentMessages:{some:{recipientId:me}}}, {receivedMessages:{some:{senderId:me}}}
      ]})}, orderBy:{normalizedNickname:'asc'}, take:60,
      select:{...profile,followers:{where:{followerId:me},select:{followerId:true}}}
    });
    res.json(rows.map(({followers,...player})=>({...player,following:followers.length>0})));
  }));
  router.use('/players/:id', asyncRoute(async(req,_res,next)=>{
    if(req.params.id===req.auth.userId) throw badRequest('Choose another player');
    if(!await db.user.findUnique({where:{id:req.params.id},select:{id:true}})) throw notFound();
    next();
  }));
  router.put('/players/:id/follow',asyncRoute(async(req,res)=>{
    await db.follow.createMany({data:[{followerId:req.auth.userId,followedId:req.params.id}],skipDuplicates:true});
    res.sendStatus(204);
  }));
  router.delete('/players/:id/follow',asyncRoute(async(req,res)=>{
    await db.follow.deleteMany({where:{followerId:req.auth.userId,followedId:req.params.id}});
    res.sendStatus(204);
  }));
  router.get('/players/:id/messages',asyncRoute(async(req,res)=>{
    const me=req.auth.userId, peer=req.params.id;
    const rows=await db.directMessage.findMany({where:{OR:[{senderId:me,recipientId:peer},{senderId:peer,recipientId:me}]},orderBy:[{createdAt:'desc'},{id:'desc'}],take:100});
    res.json(rows.reverse());
  }));
  router.post('/players/:id/messages',asyncRoute(async(req,res)=>{
    const body=requireString(req.body?.body,'Message',1000);
    res.status(201).json(await db.directMessage.create({data:{senderId:req.auth.userId,recipientId:req.params.id,body}}));
  }));
  return router;
}
