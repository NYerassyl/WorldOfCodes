import { AppError,isUniqueError } from '../lib/errors.js';
import { codeMatchesExactly } from '../lib/rewards.js';
export async function submitCopy(prisma,{userId,exercise,code}){
  const isExact=codeMatchesExactly(code,exercise.templateCode);
  const record=async(tx,reward)=>{
    const attempt=await tx.copyAttempt.create({data:{userId,exerciseId:exercise.id,isExact}});
    if(reward){
      await tx.copyCompletion.create({data:{userId,exerciseId:exercise.id}});
      await tx.rewardLedger.create({data:{userId,kind:'COPY',sourceId:exercise.id,xp:exercise.rewardXp,coins:exercise.rewardCoins}});
      await tx.user.update({where:{id:userId},data:{xp:{increment:exercise.rewardXp},coins:{increment:exercise.rewardCoins}}});
    }
    return {attemptId:attempt.id,isExact,rewarded:reward,earnedXp:reward?exercise.rewardXp:0,
      earnedCoins:reward?exercise.rewardCoins:0,note:'Exact transcription only; not an algorithm-solving score.'};
  };
  if(!isExact)return prisma.$transaction(tx=>record(tx,false));
  for(let i=0;i<3;i++){
    try{return await prisma.$transaction(tx=>record(tx,true),{isolationLevel:'Serializable'});}
    catch(e){
      if(e?.code==='P2034'&&i<2)continue;
      if(!isUniqueError(e))throw e;
      const old=await prisma.copyCompletion.findUnique({where:{userId_exerciseId:{userId,exerciseId:exercise.id}}});
      if(!old)throw e;
      return prisma.$transaction(tx=>record(tx,false));
    }
  }
  throw new AppError(503,'RETRY_EXHAUSTED','Retry this request');
}
