"""Actual Swagger controls, shared PostgreSQL, Docker judge and full restart.

Requires an isolated *_test database, Prisma → Alembic and seed. No reset or
production migration is performed. Accounts are unique and retained as evidence.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json
import os
import re
import subprocess
import sys
import time
from uuid import uuid4
from urllib.request import urlopen
import httpx
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'
FAST='http://127.0.0.1:8000'
EXPRESS='http://127.0.0.1:4001'


def ready(url,child):
    for _ in range(200):
        if child.poll() is not None:raise RuntimeError('Service exited; inspect artifact logs')
        try:
            with urlopen(url,timeout=1) as r:
                if r.status==200:return
        except OSError:time.sleep(.1)
    raise RuntimeError('Service startup timeout')


def verify():
    from sqlalchemy.engine import make_url
    test_url=make_url(os.environ['SHARED_DATABASE_TEST_URL'])
    assert test_url.host in {'127.0.0.1','localhost'} and test_url.database.endswith('_test')
    ART.mkdir(exist_ok=True)
    env={**os.environ,'PORT':'4001','HOST':'127.0.0.1','FASTAPI_INTERNAL_URL':FAST,'EXPRESS_INTERNAL_URL':EXPRESS}
    logs=[];children=[];events=[]
    def start():
        for filename,command in [('shared-fastapi.log',[sys.executable,'-m','uvicorn','main:app','--app-dir','services/fastapi-backend','--host','127.0.0.1','--port','8000']),('shared-express.log',['node','server/index.js'])]:
            log=(ART/filename).open('a');logs.append(log)
            children.append(subprocess.Popen(command,cwd=ROOT,env=env,stdout=log,stderr=log))
        ready(FAST+'/api/health',children[0]);ready(EXPRESS+'/api/health',children[1])
    def stop():
        for child in children:
            if child.poll() is None:child.terminate();child.wait(timeout=15)
        children.clear()
    def call(method,path,status=200,data=None,token=None,origin=FAST):
        with httpx.Client(timeout=90,trust_env=False) as client:
            r=client.request(method,origin+path,json=data,headers={'Authorization':'Bearer '+token} if token else {})
        assert r.status_code==status,(method,path,status,r.status_code,r.text)
        return r.json() if status!=204 else None
    try:
        start()
        with sync_playwright() as p:
            browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1100})
            try:
                page.goto(FAST+'/docs');page.locator('.swagger-ui .opblock').first.wait_for(timeout=60000)
                def docs(method,path,status=200,data=None,params=None):
                    block=page.locator('.opblock').filter(has=page.locator('[data-path="'+path+'"]')).filter(has=page.locator('.opblock-summary-method').filter(has_text=re.compile('^'+method+'$')))
                    assert block.count()==1,(method,path,block.count())
                    if 'is-open' not in block.get_attribute('class'):block.locator('.opblock-summary').click()
                    attempt=block.get_by_role('button',name='Try it out',exact=True)
                    if not block.get_by_role('button',name='Execute',exact=True).count():attempt.click()
                    if data is not None:block.locator('textarea').fill(json.dumps(data))
                    expected_path=path
                    for name,value in (params or {}).items():
                        block.locator('tr[data-param-name="'+name+'"] input').fill(value)
                        expected_path=expected_path.replace('{'+name+'}',value)
                    with page.expect_response(lambda r:r.url.split('?')[0]==FAST+expected_path and r.request.method==method,timeout=90000) as received:
                        block.get_by_role('button',name='Execute',exact=True).click()
                    r=received.value;assert r.status==status,(method,path,status,r.status,r.text())
                    expect(block.locator('.live-responses-table .response-col_status:not(.col_header)')).to_contain_text(str(status))
                    events.append({'method':method,'path':path,'status':status})
                    print('SWAGGER',method,path,status,flush=True)
                    return r.json() if status!=204 else None
                def authorize(token):
                    page.locator('.auth-wrapper button.authorize').click()
                    modal=page.locator('.dialog-ux')
                    logout=modal.locator('button').filter(has_text=re.compile(r'^\s*Logout\s*$'))
                    if logout.count():logout.click()
                    modal.locator('input').fill(token)
                    modal.locator('button.authorize').click()
                    modal.locator('button.btn-done').click()
                suffix=uuid4().hex.translate(str.maketrans('0123456789','abcdefghij'))[:14]
                registration={'email':suffix+'@example.com','nickname':'owner'+suffix,'password':'shared-password-123'}
                a=docs('POST','/api/auth/register',201,registration)
                docs('POST','/api/auth/register',409,registration)
                docs('POST','/api/auth/register',422,{**registration,'password':'short'})
                docs('POST','/api/auth/login',401,{'email':registration['email'],'password':'wrong'})
                b=docs('POST','/api/auth/register',201,{'email':'b'+registration['email'],'nickname':'guest'+suffix,'password':'shared-password-123'})
                uid=a['user']['id'];bid=b['user']['id'];token=a['token'];bt=b['token']
                assert isinstance(uid,str) and call('GET','/api/users/me',token=token,origin=EXPRESS)['id']==uid
                authorize(token)
                docs('PATCH','/api/users/me',data={'bio':'Saved through canonical Swagger','displayName':'Swagger learner'})
                docs('PATCH','/api/users/me',422,{'bio':'x'*301})
                docs('PATCH','/api/users/{user_id}',403,{'bio':'forged'},params={'user_id':bid})
                docs('GET','/api/users/{user_id}/progress',403,params={'user_id':bid})
                docs('GET','/api/lessons')
                docs('GET','/api/lessons/{lesson_id}',404,params={'lesson_id':'missing'})
                docs('POST','/api/learning/lessons/{lesson_id}/start',params={'lesson_id':'py-variables-lesson'})
                docs('POST','/api/users/{user_id}/progress',409,{'lesson_id':'py-variables-lesson'},params={'user_id':uid})
                wrong=docs('POST','/api/problems/{problem_id}/submit',data={'code':'def double(n):\n    return -999\n'},params={'problem_id':'py-double'})
                assert wrong['status']=='WRONG_ANSWER' and not wrong['rewarded']
                correct='def double(n):\n    return n * 2\n'
                accepted=docs('POST','/api/problems/{problem_id}/submit',data={'code':correct},params={'problem_id':'py-double'})
                assert accepted['status']=='ACCEPTED' and accepted['rewarded']
                repeated=docs('POST','/api/problems/{problem_id}/submissions',data={'code':correct},params={'problem_id':'py-double'})
                assert not repeated['rewarded']
                area=docs('POST','/api/problems/{problem_id}/submit',data={'code':'def rectangle_area(width, height):\n    return width * height\n'},params={'problem_id':'py-area'})
                assert area['status']=='ACCEPTED'
                docs('POST','/api/users/{user_id}/progress',data={'lesson_id':'py-variables-lesson'},params={'user_id':uid})
                docs('DELETE','/api/users/{user_id}/progress/{lesson_id}',409,params={'user_id':uid,'lesson_id':'py-variables-lesson'})
                docs('GET','/api/submissions/{submission_id}',params={'submission_id':accepted['submissionId']})
                comment=docs('POST','/api/problems/{problem_id}/comments',201,{'body':'Saved shared comment'},params={'problem_id':'py-double'})
                docs('POST','/api/problems/{problem_id}/comments',422,{'body':'   '},params={'problem_id':'py-double'})
                authorize(bt)
                docs('GET','/api/submissions/{submission_id}',403,params={'submission_id':accepted['submissionId']})
                docs('PATCH','/api/problems/{problem_id}/comments/{comment_id}',403,{'body':'B edit'},params={'problem_id':'py-double','comment_id':comment['id']})
                docs('POST','/api/lessons',403,{'title':'Unauthorized lesson','topicId':'py-variables','position':81,'theoryMd':'Unauthorized lesson theory'})
                authorize(token)
                docs('PATCH','/api/problems/{problem_id}/comments/{comment_id}',data={'body':'Owner edited'},params={'problem_id':'py-double','comment_id':comment['id']})
                page.screenshot(path=str(ART/'shared-swagger-ownership.png'),full_page=True)
                trace=call('POST','/api/trace/exercises/trace-1-01/submit',201,{'answer':'not the output'},token)
                assert trace['verdict']=='INCORRECT'
                # Simultaneous FastAPI and direct Express requests share exactly one reward.
                code='def is_even(n):\n    return n % 2 == 0\n'
                with ThreadPoolExecutor(2) as pool:
                    futures=[pool.submit(call,'POST','/api/problems/py-even/submit',200,{'code':code},token,origin) for origin in (FAST,EXPRESS)]
                    concurrent=[f.result() for f in futures]
                assert all(x['status']=='ACCEPTED' for x in concurrent),concurrent
                assert sum(x['rewarded'] for x in concurrent)==1,concurrent
                call('GET','/api/problems/py-double/submissions?user_id='+bid,403,token=token)
                assert call('GET','/api/problems/py-double/submissions',token=bt)['submissions']==[]
                print('PASS: Swagger workflows and canonical concurrent reward/owner-only history.',flush=True)
                before=call('GET','/api/users/me',token=token)
                progress=call('GET','/api/learning/progress',token=token)
                history=call('GET','/api/problems/my-submissions',token=token)
                activity=call('GET','/api/players/'+uid+'/activity',token=token)
                assert before['xp']==75 and before['coins']==19,before
                assert activity['year']['submissions']==6 and activity['year']['solved']==3,activity
                assert call('GET','/api/users/me',token=token,origin=EXPRESS)['xp']==75
                # Grant authoring to A and B through server configuration only.
                env['FASTAPI_CONTENT_ADMIN_IDS']=uid+','+bid
                stop();start()
                assert call('GET','/api/users/me',token=token)==before
                assert call('GET','/api/learning/progress',token=token)==progress
                assert call('GET','/api/problems/my-submissions',token=token)==history
                assert call('GET','/api/players/'+uid+'/activity',token=token)==activity
                comments=call('GET','/api/problems/py-double/comments')['comments']
                assert any(c['id']==comment['id'] and c['body']=='Owner edited' for c in comments)
                assert all(c['id']!=comment['id'] for c in call('GET','/api/problems/py-area/comments')['comments'])
                assert call('GET','/api/users/me',token=token,origin=EXPRESS)['bio']=='Saved through canonical Swagger'
                print('PASS: both-server restart preserved account, profile, progress, submissions, analytics and comments.',flush=True)
                # Canonical authored CRUD, graph integrity, protection against another author.
                lesson=call('POST','/api/lessons',201,{'title':'Owned test lesson','topicId':'py-variables','position':90,'theoryMd':'Persistent test lesson theory'},token)
                lid=lesson['id']
                call('PATCH','/api/lessons/'+lid,403,{'title':'Foreign author'},bt)
                call('PATCH','/api/lessons/'+lid,409,{'prerequisiteId':lid},token)
                call('PATCH','/api/lessons/'+lid,200,{'title':'Owned revised lesson'},token)
                problem=call('POST','/api/problems',201,{'lessonId':lid,'title':'Owned draft problem','statement':'Return the input number unchanged.','topicSlug':'variables','functionName':'identity','starterCode':'def identity(n):\n    pass','testCases':[{'args':[1],'expected':1,'isSample':True}]},token)
                pid=problem['id'];call('PATCH','/api/problems/'+pid,403,{'title':'Foreign problem'},bt)
                call('PATCH','/api/problems/'+pid,200,{'title':'Owned revised problem'},token)
                call('DELETE','/api/lessons/'+lid,409,token=token)
                call('DELETE','/api/problems/'+pid,204,token=token);call('DELETE','/api/lessons/'+lid,204,token=token)
                print('PASS: canonical authored CRUD, prerequisite cycles and foreign-author protections.',flush=True)
                # Reauthenticate before credential edits; other accounts cannot change credentials.
                credentials={'currentPassword':'shared-password-123','password':'changed-password-456'}
                call('PATCH','/api/users/'+uid+'/credentials',403,credentials,bt)
                call('PATCH','/api/users/'+uid+'/credentials',401,{**credentials,'currentPassword':'wrong'},token)
                call('PATCH','/api/users/'+uid+'/credentials',204,credentials,token)
                call('GET','/api/users/me',401,token=token);call('GET','/api/users/me',401,token=token,origin=EXPRESS)
                new=call('POST','/api/auth/login',data={'email':registration['email'],'password':'changed-password-456'})
                assert new['user']['id']==uid
                call('DELETE','/api/users/'+bid,403,token=new['token'])
                call('DELETE','/api/users/'+bid,204,token=bt)
                call('GET','/api/users/me',401,token=bt,origin=EXPRESS)
                call('POST','/api/auth/logout',204,token=new['token'])
                call('GET','/api/users/me',401,token=new['token'])
                call('GET','/api/users/'+uid+'/progress',401,token=new['token'])
                (ART/'shared-fastapi-result.json').write_text(json.dumps({'status':'passed','swaggerOperations':events,'concurrentRewardCount':1,'xpAfterRestart':75,'canonicalSubmissions':6,'restartPreserved':['account','profile','progress','submissions','analytics','comments'],'contentOwnership':'passed','credentialCrossRuntime':'passed'},indent=2))
                print('PASS: real Swagger, canonical account/content/learning/Trace, concurrent reward, credential compatibility, logout and full restart.',flush=True)
            except BaseException:
                page.screenshot(path=str(ART/'shared-swagger-failure.png'),full_page=True)
                raise
            finally:browser.close()
    finally:
        stop()
        for log in logs:log.close()

if __name__=='__main__':verify()
