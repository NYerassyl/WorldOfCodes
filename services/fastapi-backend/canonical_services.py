import json
import os
from uuid import uuid4
from sqlalchemy import select, text
from canonical_models import Lesson, Player, Problem
from errors import DomainError


def one(session, model, key, *, lock=False):
    statement=select(model).where(model.id==key)
    row=session.scalar(statement.with_for_update() if lock else statement)
    if row is None:raise DomainError(404,'NOT_FOUND','Record does not exist.')
    return row


def owner(user, actor):
    if user!=actor:raise DomainError(403,'FORBIDDEN','Only your own account data may be changed or read.')


def public_player(user):
    return {k:getattr(user,k) for k in ('id','nickname','bio','avatarUrl','xp')} | {'displayName':user.displayName or user.nickname,'level':user.xp//100+1}


def author(session, model, key, actor):
    admins={x.strip() for x in os.environ.get('FASTAPI_CONTENT_ADMIN_IDS','').split(',') if x.strip()}
    if actor not in admins:raise DomainError(403,'CONTENT_AUTHOR_REQUIRED','Content authoring requires a configured administrator account.')
    if key is None:return
    row=one(session,model,key,lock=True)
    if row.createdById is not None and row.createdById!=actor:
        raise DomainError(403,'FORBIDDEN','Another author owns this content.')
    return row


def graph_lock(session):
    # One transaction lock serializes prerequisite edits, avoiding concurrent cycles.
    session.execute(text("SELECT pg_advisory_xact_lock(hashtext('woc_lesson_prerequisites'))"))


def prerequisite(session, lesson_id, value):
    seen={lesson_id}
    while value:
        if value in seen:raise DomainError(409,'PREREQUISITE_CYCLE','Lesson prerequisites must be acyclic.')
        seen.add(value);value=one(session,Lesson,value).prerequisiteId


def lesson_data(row):
    return {k:getattr(row,k) for k in ('id','topicId','title','theoryMd','position','prerequisiteId','createdById')}


def create_lesson(session, payload, actor):
    author(session,Lesson,None,actor);graph_lock(session)
    if not session.scalar(text('SELECT 1 FROM "Topic" WHERE id=:id'),{'id':payload.topicId}):
        raise DomainError(404,'TOPIC_NOT_FOUND','Choose an existing course topic.')
    data=payload.model_dump(exclude={'id'});key=payload.id or str(uuid4())
    prerequisite(session,key,data.get('prerequisiteId'))
    row=Lesson(id=key,createdById=actor,**data);session.add(row);session.flush()
    return lesson_data(row)


def change_lesson(session,key,payload,actor):
    graph_lock(session);row=author(session,Lesson,key,actor)
    data=payload.model_dump(exclude_unset=True)
    if 'prerequisiteId' in data:
        prerequisite(session,key,data['prerequisiteId'])
        if session.scalar(text('SELECT 1 FROM "LessonProgress" WHERE "lessonId"=:id LIMIT 1'),{'id':key}) or session.scalar(text('SELECT 1 FROM "Problem" WHERE "lessonId"=:id AND "isPublished" LIMIT 1'),{'id':key}):
            raise DomainError(409,'LESSON_IN_USE','Cannot change prerequisites after learners have started.')
    for k,v in data.items():setattr(row,k,v)
    session.flush();return lesson_data(row)


def delete_lesson(session,key,actor):
    graph_lock(session);row=author(session,Lesson,key,actor)
    for table,column in [('LessonProgress','lessonId'),('Problem','lessonId'),('Lesson','prerequisiteId')]:
        if session.scalar(text(f'SELECT 1 FROM "{table}" WHERE "{column}"=:id LIMIT 1'),{'id':key}):
            raise DomainError(409,'LESSON_IN_USE','Lesson has progress, problems or dependent lessons.')
    session.delete(row);session.flush()


def problem_data(session,row):
    safe={k:getattr(row,k) for k in ('id','lessonId','title','statement','language','topicSlug','difficulty','functionName','starterCode','rewardXp','rewardCoins','isPublished','createdById')}
    safe['examples']=[{'args':json.loads(c['argsJson']),'expected':json.loads(c['expectedJson'])} for c in session.execute(text('SELECT "argsJson","expectedJson" FROM "TestCase" WHERE "problemId"=:id AND "isSample" ORDER BY position'),{'id':row.id}).mappings()]
    return safe


def create_problem(session,payload,actor):
    author(session,Problem,None,actor)
    if payload.lessonId:one(session,Lesson,payload.lessonId)
    data=payload.model_dump(exclude={'id','testCases'});key=payload.id or str(uuid4())
    row=Problem(id=key,createdById=actor,language='python',**data);session.add(row);session.flush()
    for i,c in enumerate(payload.testCases):
        args,expected=json.dumps(c.args),json.dumps(c.expected)
        if len(args)+len(expected)>64000:raise DomainError(422,'CASE_TOO_LARGE','Each test fixture must fit 64 KB.')
        session.execute(text('INSERT INTO "TestCase" (id,"problemId",position,"argsJson","expectedJson","isSample") VALUES (:id,:problem,:position,:args,:expected,:sample)'),
                        {'id':str(uuid4()),'problem':key,'position':i,'args':args,'expected':expected,'sample':c.isSample})
    return problem_data(session,row)


def unused_problem(session,key):
    if one(session,Problem,key).isPublished:
        raise DomainError(409,"PUBLISHED_CONTENT_IMMUTABLE","Published content must be versioned as a new problem, not edited in place.")
    for table in ('Submission','Match','ProblemCompletion'):
        if session.scalar(text(f'SELECT 1 FROM "{table}" WHERE "problemId"=:id LIMIT 1'),{'id':key}):
            raise DomainError(409,'PROBLEM_IN_USE','Content with submissions, completions or matches is immutable.')


def change_problem(session,key,payload,actor):
    row=author(session,Problem,key,actor);unused_problem(session,key)
    for k,v in payload.model_dump(exclude_unset=True).items():setattr(row,k,v)
    session.flush();return problem_data(session,row)


def delete_problem(session,key,actor):
    row=author(session,Problem,key,actor);unused_problem(session,key)
    session.execute(text('DELETE FROM "TestCase" WHERE "problemId"=:id'),{'id':key})
    session.delete(row);session.flush()


def progress(session,user,actor):
    owner(user,actor);p=one(session,Player,user)
    rows=[dict(r) for r in session.execute(text('SELECT "lessonId","startedAt","completedAt" FROM "LessonProgress" WHERE "userId"=:id ORDER BY "startedAt","lessonId"'),{'id':user}).mappings()]
    return {'user_id':user,'xp':p.xp,'coins':p.coins,'lessons':rows}


def complete(session,user,lesson_id,actor):
    owner(user,actor);one(session,Player,user,lock=True);lesson=one(session,Lesson,lesson_id)
    if lesson.prerequisiteId and not session.scalar(text('SELECT 1 FROM "LessonProgress" WHERE "userId"=:user AND "lessonId"=:lesson AND "completedAt" IS NOT NULL'),{'user':user,'lesson':lesson.prerequisiteId}):
        raise DomainError(403,'PREREQUISITE_REQUIRED','Complete the prerequisite first.')
    counts=session.execute(text('''SELECT count(*) AS total,count(c.id) AS done FROM "Problem" p
        LEFT JOIN "ProblemCompletion" c ON c."problemId"=p.id AND c."userId"=:user
        WHERE p."lessonId"=:lesson AND p."isPublished"'''),{'user':user,'lesson':lesson_id}).one()
    if counts.total<1 or counts.total!=counts.done:
        raise DomainError(409,'LESSON_NOT_SOLVED','Solve all published lesson problems; manual XP/completion claims are not accepted.')
    session.execute(text('''INSERT INTO "LessonProgress" (id,"userId","lessonId","completedAt") VALUES (:id,:user,:lesson,timezone('UTC',now()))
        ON CONFLICT ("userId","lessonId") DO UPDATE SET "completedAt"=coalesce("LessonProgress"."completedAt",EXCLUDED."completedAt")'''),
        {'id':str(uuid4()),'user':user,'lesson':lesson_id})
    return progress(session,user,actor)


def reset_progress(session,user,lesson_id,actor):
    owner(user,actor);one(session,Player,user,lock=True);one(session,Lesson,lesson_id)
    if session.scalar(text('SELECT 1 FROM "LessonProgress" WHERE "userId"=:user AND "lessonId"=:lesson AND "completedAt" IS NOT NULL'),{'user':user,'lesson':lesson_id}):
        raise DomainError(409,'COMPLETED_PROGRESS_IMMUTABLE','Saved completion and its reward history cannot be reset.')
    result=session.execute(text('DELETE FROM "LessonProgress" WHERE "userId"=:user AND "lessonId"=:lesson'),{'user':user,'lesson':lesson_id})
    if not result.rowcount:raise DomainError(404,'PROGRESS_NOT_FOUND','Lesson has not been started.')


def change_credentials(session,user,actor,payload):
    """Preserve account credential editing with the canonical Node scrypt format."""
    import hashlib
    import hmac
    import secrets
    owner(user,actor)
    stored=session.scalar(text('SELECT "passwordHash" FROM "User" WHERE id=:id FOR UPDATE'),{'id':user})
    if stored is None:raise DomainError(404,'NOT_FOUND','Account does not exist.')
    parts=stored.split('$')
    valid=False
    if len(parts)==6 and parts[:4]==['scrypt','16384','8','1']:
        try:
            digest=hashlib.scrypt(payload.currentPassword.encode(),salt=bytes.fromhex(parts[4]),n=16384,r=8,p=1,dklen=64,maxmem=64*1024*1024)
            valid=hmac.compare_digest(digest,bytes.fromhex(parts[5]))
        except ValueError:pass
    if not valid:raise DomainError(401,'INVALID_CREDENTIALS','Current password is incorrect.')
    updates={}
    if payload.email is not None:updates['email']=payload.email.strip().lower()
    if payload.password is not None:
        salt=secrets.token_bytes(16)
        digest=hashlib.scrypt(payload.password.encode(),salt=salt,n=16384,r=8,p=1,dklen=64,maxmem=64*1024*1024)
        updates['passwordHash']='scrypt$16384$8$1$'+salt.hex()+'$'+digest.hex()
    assignments=','.join('"'+field+'"=:'+field for field in updates)
    session.execute(text('UPDATE "User" SET '+assignments+',"updatedAt"=timezone(\'UTC\',now()) WHERE id=:id'),{**updates,'id':user})
    # A credential change ends every old session, including this one. The same
    # Prisma AuthSession revocation is observed by Express and Socket.IO.
    session.execute(text('UPDATE "AuthSession" SET "revokedAt"=timezone(\'UTC\',now()) WHERE "userId"=:id AND "revokedAt" IS NULL'),{'id':user})
