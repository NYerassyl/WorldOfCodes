"""Canonical string-ID REST API; no classroom integer users or mutable store."""
from typing import Annotated, Literal
from urllib.parse import quote

from fastapi import APIRouter, Query
from sqlalchemy import select, text
from canonical_bridge import Token, forward
from canonical_models import Lesson, Player, Problem
from canonical_schemas import Register, Login, ProfilePatch, Code, Example, TraceGuess, Complete, LessonCreate, LessonPatch, ProblemCreate, ProblemPatch
import canonical_services as services
from site_auth import PlayerId, SiteSession
from errors import DomainError

router=APIRouter(prefix='/api')
def key(value):return quote(value,safe='')

@router.post('/auth/register',tags=['accounts'],status_code=201)
@router.post('/users',tags=['accounts'],status_code=201,deprecated=True)
def register(payload:Register):
    """Create one canonical Prisma account and return its normal site session."""
    return forward('POST','/api/auth/register',payload=payload.model_dump())

@router.post('/auth/login',tags=['accounts'])
def login(payload:Login):return forward('POST','/api/auth/login',payload=payload.model_dump())

@router.post('/auth/logout',tags=['accounts'],status_code=204)
def logout(token:Token):return forward('POST','/api/auth/logout',token=token)

@router.get('/users/me',tags=['accounts'])
def me(token:Token):return forward('GET','/api/users/me',token=token)

@router.patch('/users/me',tags=['accounts'])
def edit_me(payload:ProfilePatch,token:Token):return forward('PATCH','/api/users/me',token=token,payload=payload.model_dump(exclude_unset=True))

@router.get('/users',tags=['profiles'])
def players(session:SiteSession,q:str='',limit:Annotated[int,Query(ge=1,le=100)]=50):
    rows=session.scalars(select(Player).where(Player.nickname.ilike('%'+q[:40]+'%')).order_by(Player.nickname,Player.id).limit(limit))
    return [services.public_player(row) for row in rows]

@router.get('/users/leaderboard',tags=['profiles'])
def leaderboard(session:SiteSession,limit:Annotated[int,Query(ge=1,le=100)]=10):
    rows=session.scalars(select(Player).order_by(Player.xp.desc(),Player.id).limit(limit))
    return [dict(rank=i+1,**services.public_player(row)) for i,row in enumerate(rows)]

@router.get('/users/{user_id}',tags=['profiles'])
def player(session:SiteSession,user_id:str):return services.public_player(services.one(session,Player,user_id))

@router.get('/users/{user_id}/profile',tags=['profiles'])
def profile(session:SiteSession,user_id:str):
    result=services.public_player(services.one(session,Player,user_id))
    for name,query in {
        'completed_lessons':'SELECT count(*) FROM "LessonProgress" WHERE "userId"=:id AND "completedAt" IS NOT NULL',
        'solved_problems':'SELECT count(*) FROM "ProblemCompletion" WHERE "userId"=:id',
        'accepted_submissions':'SELECT count(*) FROM "Submission" WHERE "userId"=:id AND status=\'ACCEPTED\'',
    }.items():result[name]=session.scalar(text(query),{'id':user_id})
    return result

@router.patch('/users/{user_id}',tags=['accounts'])
def edit_player(session:SiteSession,user_id:str,payload:ProfilePatch,actor:PlayerId,token:Token):
    services.owner(user_id,actor)
    return forward('PATCH','/api/users/me',token=token,payload=payload.model_dump(exclude_unset=True))

@router.delete('/users/{user_id}',tags=['accounts'],status_code=204)
def delete_player(session:SiteSession,user_id:str,actor:PlayerId):
    services.owner(user_id,actor);row=services.one(session,Player,user_id,lock=True)
    # Prisma FK rules preserve matches and cascade only account-owned records.
    session.delete(row);session.flush()

@router.get('/learning/courses',tags=['learning'])
def courses():return forward('GET','/api/learning/courses')

@router.get('/learning/progress',tags=['progress'])
def my_progress(token:Token):return forward('GET','/api/learning/progress',token=token)

@router.get('/learning/lessons/{lesson_id}',tags=['learning'])
def lesson_detail(lesson_id:str):return forward('GET','/api/learning/lessons/'+key(lesson_id))

@router.post('/learning/lessons/{lesson_id}/start',tags=['progress'])
def start_lesson(lesson_id:str,token:Token):return forward('POST','/api/learning/lessons/'+key(lesson_id)+'/start',token=token)

@router.post('/learning/lessons/{lesson_id}/run-example',tags=['learning'])
def run_example(lesson_id:str,payload:Example,token:Token):return forward('POST','/api/learning/lessons/'+key(lesson_id)+'/run-example',token=token,payload=payload.model_dump(exclude_none=True))

@router.get('/lessons',tags=['learning'])
def lessons(session:SiteSession,topic:str|None=None):
    rows=session.execute(text('''SELECT l.id,l."topicId",l.title,l.position,l."prerequisiteId" FROM "Lesson" l
        JOIN "Topic" t ON t.id=l."topicId" JOIN "Course" c ON c.id=t."courseId"
        WHERE c."isPublished" AND (CAST(:topic AS TEXT) IS NULL OR l."topicId"=:topic) ORDER BY t.position,l.position,l.id'''),{'topic':topic}).mappings()
    return [dict(row) for row in rows]

@router.get('/lessons/{lesson_id}',tags=['learning'])
def lesson_alias(lesson_id:str):return lesson_detail(lesson_id)

@router.post('/lessons',tags=['content-authoring'],status_code=201)
def create_lesson(session:SiteSession,payload:LessonCreate,actor:PlayerId):return services.create_lesson(session,payload,actor)

@router.patch('/lessons/{lesson_id}',tags=['content-authoring'])
def update_lesson(session:SiteSession,lesson_id:str,payload:LessonPatch,actor:PlayerId):return services.change_lesson(session,lesson_id,payload,actor)

@router.delete('/lessons/{lesson_id}',tags=['content-authoring'],status_code=204)
def delete_lesson(session:SiteSession,lesson_id:str,actor:PlayerId):services.delete_lesson(session,lesson_id,actor)

@router.get('/users/{user_id}/progress',tags=['progress'])
def progress(session:SiteSession,user_id:str,actor:PlayerId):return services.progress(session,user_id,actor)

@router.post('/users/{user_id}/progress',tags=['progress'])
def complete(session:SiteSession,user_id:str,payload:Complete,actor:PlayerId):
    """Confirm completion from canonical solved problems; this never grants XP."""
    return services.complete(session,user_id,payload.lesson_id,actor)

@router.delete('/users/{user_id}/progress/{lesson_id}',tags=['progress'],status_code=204)
def reset(session:SiteSession,user_id:str,lesson_id:str,actor:PlayerId):services.reset_progress(session,user_id,lesson_id,actor)

@router.get('/problems',tags=['problems'])
def problems(topic:str|None=None,difficulty:Literal['EASY','MEDIUM','HARD']|None=None):
    return forward('GET','/api/problems',params={k:v for k,v in {'topic':topic,'difficulty':difficulty}.items() if v is not None})

@router.get('/problems/my-submissions',tags=['submissions'])
def submissions(token:Token):return forward('GET','/api/problems/my-submissions',token=token)

@router.post('/problems',tags=['content-authoring'],status_code=201)
def create_problem(session:SiteSession,payload:ProblemCreate,actor:PlayerId):return services.create_problem(session,payload,actor)

@router.get('/problems/{problem_id}',tags=['problems'])
def problem(problem_id:str):return forward('GET','/api/problems/'+key(problem_id))

@router.patch('/problems/{problem_id}',tags=['content-authoring'])
def update_problem(session:SiteSession,problem_id:str,payload:ProblemPatch,actor:PlayerId):return services.change_problem(session,problem_id,payload,actor)

@router.delete('/problems/{problem_id}',tags=['content-authoring'],status_code=204)
def delete_problem(session:SiteSession,problem_id:str,actor:PlayerId):services.delete_problem(session,problem_id,actor)

@router.post('/problems/{problem_id}/submit',tags=['submissions'])
@router.post('/problems/{problem_id}/submissions',tags=['submissions'],deprecated=True)
def submit(problem_id:str,payload:Code,token:Token):
    """Same canonical judge, Submission and transactional first-completion reward."""
    return forward('POST','/api/problems/'+key(problem_id)+'/submit',token=token,payload=payload.model_dump())

@router.get('/problems/{problem_id}/submissions',tags=['submissions'])
def problem_submissions(session:SiteSession,problem_id:str,actor:PlayerId,user_id:str|None=None):
    if user_id:services.owner(user_id,actor)
    services.one(session,Problem,problem_id)
    rows=session.execute(text('''SELECT id,"userId","problemId",status,"passedCases","totalCases","createdAt"
        FROM "Submission" WHERE "userId"=:user AND "problemId"=:problem ORDER BY "createdAt" DESC,id LIMIT 100'''),{'user':actor,'problem':problem_id}).mappings()
    return {'submissions':[dict(row) for row in rows]}

@router.get('/submissions/{submission_id}',tags=['submissions'])
def submission(session:SiteSession,submission_id:str,actor:PlayerId):
    row=session.execute(text('SELECT id,"userId","problemId","sourceCode",status,"passedCases","totalCases","createdAt" FROM "Submission" WHERE id=:id'),{'id':submission_id}).mappings().first()
    if not row:raise DomainError(404,'SUBMISSION_NOT_FOUND','Submission does not exist.')
    services.owner(row['userId'],actor);return dict(row)

@router.get('/trace/exercises',tags=['trace'])
def trace(level:Annotated[int|None,Query(ge=1,le=5)]=None,difficulty:str|None=None,topic:str|None=None):
    return forward('GET','/api/trace/exercises',params={k:v for k,v in locals().items() if v is not None})

@router.get('/trace/exercises/{exercise_id}',tags=['trace'])
def trace_detail(exercise_id:str):return forward('GET','/api/trace/exercises/'+key(exercise_id))

@router.post('/trace/exercises/{exercise_id}/submit',tags=['trace'],status_code=201)
def trace_submit(exercise_id:str,payload:TraceGuess,token:Token):
    return forward('POST','/api/trace/exercises/'+key(exercise_id)+'/attempts',token=token,payload={'output':payload.answer})

@router.get('/copy-exercises',tags=['copy'])
def copies():return forward('GET','/api/copy-exercises')

@router.get('/copy-exercises/progress',tags=['copy'])
def copy_progress(token:Token):return forward('GET','/api/copy-exercises/progress',token=token)

@router.get('/copy-exercises/{exercise_id}',tags=['copy'])
def copy_detail(exercise_id:str):return forward('GET','/api/copy-exercises/'+key(exercise_id))

@router.post('/copy-exercises/{exercise_id}/submit',tags=['copy'])
def copy_submit(exercise_id:str,payload:Code,token:Token):return forward('POST','/api/copy-exercises/'+key(exercise_id)+'/submit',token=token,payload=payload.model_dump())

from canonical_schemas import CredentialsPatch

@router.patch('/users/{user_id}/credentials',tags=['accounts'],status_code=204)
def change_credentials(session:SiteSession,user_id:str,payload:CredentialsPatch,actor:PlayerId):
    """Own account only; current password required; successful change revokes old sessions."""
    services.change_credentials(session,user_id,actor,payload)
