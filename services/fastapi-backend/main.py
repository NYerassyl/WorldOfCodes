from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from errors import DomainError
from canonical_api import router as canonical_router
from comment_api import router as comments_router
from profile_activity import router as profile_router
from site_auth import SiteSession

app=FastAPI(title='WorldOfCodes Shared Learning API',version='3.0.0',description='''
Uses the site's canonical Prisma PostgreSQL accounts, string IDs and AuthSession.
Register/login through FastAPI using canonical Prisma users and signed JWT.
Existing opaque sessions remain valid until expiry. **Authorize → Bearer token**.
Site and FastAPI share Submission, progress, comments and first-completion rewards.

Judge and some profile operations call existing Express (EXPRESS_INTERNAL_URL);
SQLAlchemy owns direct shared reads, authorized content CRUD and comment writes.
No fallback accounts, integer X-User-Id authentication or mutable in-memory data.
Content authoring requires FASTAPI_CONTENT_ADMIN_IDS; ordinary players cannot mint rewards.
Apply Prisma migrations, then the profile Alembic view before startup.
''')

@app.exception_handler(DomainError)
async def domain_error(request:Request,exc:DomainError):
    return JSONResponse(status_code=exc.status_code,content={'error':{'code':exc.code,'message':exc.message}})

@app.get('/',tags=['meta'])
def index():return {'service':'fastapi-backend','storage':'postgresql','identity':'Prisma User/AuthSession','docs':'/docs','health':'/api/health'}

@app.get('/api/health',tags=['meta'])
def health(session:SiteSession):
    return {'status':'ok','service':'fastapi-backend','storage':'postgresql',**{name:session.scalar(text(f'SELECT count(*) FROM "{table}"')) for name,table in [('users','User'),('lessons','Lesson'),('problems','Problem'),('submissions','Submission')]}}

app.include_router(canonical_router)
app.include_router(profile_router)
app.include_router(comments_router)
