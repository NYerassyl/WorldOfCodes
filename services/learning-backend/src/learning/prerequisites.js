import { AppError } from '../lib/errors.js';

export async function ensurePrerequisite(prisma,userId,lesson) {
  if(!lesson?.prerequisiteId)return;
  const progress=await prisma.lessonProgress.findUnique({where:{userId_lessonId:{userId,lessonId:lesson.prerequisiteId}},select:{completedAt:true}});
  if(!progress?.completedAt)throw new AppError(409,'PREREQUISITE_INCOMPLETE','Complete the prerequisite lesson before starting this practice.');
}
