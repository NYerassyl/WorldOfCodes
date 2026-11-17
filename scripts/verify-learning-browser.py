"""Actual Lessons/Challenges UI with isolated SQL execution and saved progress."""
from pathlib import Path
import json
import os
import subprocess
import sys
import time
from urllib.request import urlopen
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
ARTIFACTS=ROOT/'artifacts'
BASE='http://127.0.0.1:4001'


def ready(url,child):
    for _ in range(150):
        if child.poll() is not None:
            raise RuntimeError('Service exited; inspect learning logs')
        try:
            with urlopen(url,timeout=1) as response:
                if response.status==200:return
        except OSError:time.sleep(.1)
    raise RuntimeError('Service startup timed out')


def verify():
    ARTIFACTS.mkdir(exist_ok=True)
    env={**os.environ,'PORT':'4001','HOST':'127.0.0.1','FASTAPI_INTERNAL_URL':'http://127.0.0.1:8000'}
    pack=json.loads((ROOT/'services/learning-backend/prisma/learning-pack.json').read_text())
    sql=[problem for lesson in pack['lessons'] for problem in lesson['problems'] if problem['language']=='sql']
    with (ARTIFACTS/'learning-fastapi.log').open('w') as pylog,(ARTIFACTS/'learning-express.log').open('w') as jslog:
        python=subprocess.Popen([sys.executable,'-m','uvicorn','main:app','--app-dir','services/fastapi-backend','--host','127.0.0.1','--port','8000'],cwd=ROOT,env=env,stdout=pylog,stderr=pylog)
        node=subprocess.Popen(['node','server/index.js'],cwd=ROOT,env=env,stdout=jslog,stderr=jslog)
        try:
            ready('http://127.0.0.1:8000/api/health',python);ready(BASE+'/api/health',node)
            with sync_playwright() as p:
                browser=p.chromium.launch()
                api=p.request.new_context(base_url=BASE)
                suffix=uuid4().hex.translate(str.maketrans('0123456789','abcdefghij'))[:16]
                response=api.post('/api/auth/register',data={'email':suffix+'@example.com','nickname':'student'+suffix,'password':'test-password-123'})
                assert response.status==201,response.text()
                account=response.json();headers={'Authorization':'Bearer '+account['token']}
                context=browser.new_context(viewport={'width':1440,'height':1100},storage_state={'cookies':[],'origins':[{'origin':BASE,'localStorage':[{'name':'worldofcodes-session-v1','value':account['token']}]}]})
                page=context.new_page()
                page.goto(BASE+'/#learn')
                expect(page.locator('[data-lang="python"]')).to_contain_text('11 lessons')
                expect(page.locator('[data-lang="sql"]')).to_contain_text('1 lessons')
                page.goto(BASE+'/#algorithms')
                expect(page.locator('.server-card-grid > a')).to_have_count(31)
                page.get_by_label('Difficulty',exact=True).select_option('4')
                expect(page.locator('.server-card-grid > a')).to_have_count(3)
                page.screenshot(path=str(ARTIFACTS/'learning-five-levels.png'),full_page=True)
                print('PASS: 31 challenges, three new Medium-Hard challenges, Python 11 lessons and SQL 1 lesson.',flush=True)

                page.goto(BASE+'/#learn/sql/sql-lab-lesson')
                example=page.get_by_role('region',name='Editable lesson example')
                expect(example).to_be_visible()
                example.get_by_role('button',name='Run example',exact=True).click()
                expect(example.locator('.result')).to_contain_text('graphs',timeout=60000)
                example.locator('.editor textarea').fill('SELECT COUNT(*) AS total FROM study_notes')
                example.get_by_role('button',name='Run example',exact=True).click()
                expect(example.locator('.result')).to_contain_text('"total": 3',timeout=60000)
                assert api.get('/api/users/me',headers=headers).json()['xp']==0
                page.screenshot(path=str(ARTIFACTS/'learning-edited-sql-example.png'),full_page=True)
                print('PASS: editable lesson SQL example ran twice against PostgreSQL and awarded no XP.',flush=True)

                for problem in sql:
                    page.goto(BASE+'/#algorithms/'+problem['id'])
                    expect(page.get_by_role('button',name='Submit SQL query',exact=True)).to_be_visible()
                    page.locator('.server-workspace .editor textarea').fill(problem['referenceCode'])
                    page.get_by_role('button',name='Submit SQL query',exact=True).click()
                    expect(page.locator('.server-workspace .result')).to_contain_text('ACCEPTED',timeout=120000)
                    if problem['id']=='pack-quiet':
                        before=api.get('/api/users/me',headers=headers).json()['xp']
                        page.get_by_role('button',name='Submit SQL query',exact=True).click()
                        expect(page.locator('.server-workspace .result')).to_contain_text('Already completed',timeout=120000)
                        assert api.get('/api/users/me',headers=headers).json()['xp']==before
                activity=api.get('/api/players/'+account['user']['id']+'/activity',headers=headers)
                assert activity.status==200,activity.text()
                assert activity.json()['year']=={'submissions':4,'solved':3},activity.text()
                progress=api.get('/api/learning/progress',headers=headers).json()
                assert next(item for item in progress['lessons'] if item['lessonId']=='sql-lab-lesson')['state']=='COMPLETED'
                print('PASS: real SQL submissions are canonical, repeats have no XP and profile analytics sees four attempts / three solved.',flush=True)
                page.goto(BASE+'/#learn/sql/sql-lab-lesson')
                expect(page.get_by_text('Lesson completed. Keep practicing whenever you like.',exact=True)).to_be_visible()
                page.reload()
                expect(page.get_by_text('Lesson completed. Keep practicing whenever you like.',exact=True)).to_be_visible()
                page.screenshot(path=str(ARTIFACTS/'learning-reopened-progress.png'),full_page=True)
                page.goto(BASE+'/#learn')
                expect(page.locator('[data-lang="sql"]')).to_contain_text('1 of 1 lessons passed')
                expect(page.locator('[data-lang="python"]')).to_contain_text('0 of 11 lessons passed')
                print('PASS: completed lesson reopened after reload; progress is separated by course.',flush=True)
                (ARTIFACTS/'learning-result.json').write_text(json.dumps({'status':'passed','challenges':31,'newProblems':15,'newLessons':6,'sqlSubmissions':4,'solvedSqlProblems':3},indent=2))
                browser.close()
        finally:
            for child in (python,node):
                if child.poll() is None:child.terminate();child.wait(timeout=10)


if __name__=='__main__':verify()
