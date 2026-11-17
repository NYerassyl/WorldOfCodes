"""Real-page keyboard acceptance; Arena stays pending GPT3 approval."""
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
        if child.poll() is not None:raise RuntimeError('Editor test service exited')
        try:
            with urlopen(url,timeout=1) as response:
                if response.status==200:return
        except OSError:time.sleep(.1)
    raise RuntimeError('Editor test service startup timeout')


def keyboard_check(editor,language):
    expect(editor).to_be_visible()
    editor.fill('');editor.press('Shift+9')
    expect(editor).to_have_value('()')
    assert editor.evaluate('(el)=>el.selectionStart')==1
    editor.press('Tab')
    assert editor.evaluate('(el)=>el.selectionStart')==2
    editor.press('x');expect(editor).to_have_value('()x')
    editor.fill('');editor.press('Shift+Quote')
    expect(editor).to_have_value('""')
    editor.press('Tab');editor.press('x');expect(editor).to_have_value('""x')
    before='if ready:' if language=='python' else 'SELECT(' if language=='sql' else 'if (ready) {'
    indent='    ' if language in ('python','java','cpp') else '  '
    editor.fill(before);editor.press('Enter')
    expect(editor).to_have_value(before+'\n'+indent)
    family=editor.evaluate('(el)=>getComputedStyle(el).fontFamily')
    assert 'jetbrains' in family.lower(),family
    editor.fill('')
    editor.dispatch_event('keydown',{'key':'(','code':'Digit9','shiftKey':True,'isComposing':True,'bubbles':True})
    expect(editor).to_have_value('')
    editor.focus();editor.press('Escape');editor.press('Tab')
    assert not editor.evaluate('(el)=>el===document.activeElement')


def verify():
    ARTIFACTS.mkdir(exist_ok=True)
    env={**os.environ,'PORT':'4001','HOST':'127.0.0.1','FASTAPI_INTERNAL_URL':'http://127.0.0.1:8000'}
    with (ARTIFACTS/'editor-fastapi.log').open('w') as pylog,(ARTIFACTS/'editor-express.log').open('w') as jslog:
        python=subprocess.Popen([sys.executable,'-m','uvicorn','main:app','--app-dir','services/fastapi-backend','--host','127.0.0.1','--port','8000'],cwd=ROOT,env=env,stdout=pylog,stderr=pylog)
        node=subprocess.Popen(['node','server/index.js'],cwd=ROOT,env=env,stdout=jslog,stderr=jslog)
        try:
            ready('http://127.0.0.1:8000/api/health',python);ready(BASE+'/api/health',node)
            with sync_playwright() as p:
                browser=p.chromium.launch()
                api=p.request.new_context(base_url=BASE)
                suffix=uuid4().hex.translate(str.maketrans('0123456789','abcdefghij'))[:16]
                response=api.post('/api/auth/register',data={'email':suffix+'@example.com','nickname':'editor'+suffix,'password':'test-password-123'})
                assert response.status==201,response.text()
                account=response.json()
                context=browser.new_context(viewport={'width':1440,'height':1100},storage_state={'cookies':[],'origins':[{'origin':BASE,'localStorage':[{'name':'worldofcodes-session-v1','value':account['token']}]}]})
                page=context.new_page()
                try:
                    page.goto(BASE+'/#algorithms/algo-two-sum')
                    keyboard_check(page.locator('.server-workspace .editor textarea'),'python')
                    page.screenshot(path=str(ARTIFACTS/'editor-challenges.png'),full_page=True)
                    print('PASS: Challenges pairs, quotes, Python Enter, Tab, IME, focus escape and monospace.',flush=True)
                    page.goto(BASE+'/#learn/python/py-variables-lesson')
                    keyboard_check(page.locator('.server-workspace .editor textarea'),'python')
                    print('PASS: server Python lesson practice uses the same keyboard behavior.',flush=True)
                    page.goto(BASE+'/#learn/python/py-dynamic-programming-lesson')
                    keyboard_check(page.locator('.lesson-example .editor textarea'),'python')
                    print('PASS: editable Python lesson example uses the shared smart editor.',flush=True)
                    page.goto(BASE+'/#learn/sql/sql-lab-lesson')
                    keyboard_check(page.locator('.lesson-example .editor textarea'),'sql')
                    print('PASS: SQL lesson example uses two-space indentation.',flush=True)
                    page.goto(BASE+'/#learn/javascript/js-basics')
                    page.get_by_role('tab',name='03 Code lab',exact=True).click()
                    keyboard_check(page.locator('#lab-editor'),'javascript')
                    page.screenshot(path=str(ARTIFACTS/'editor-local-lesson.png'),full_page=True)
                    print('PASS: local JavaScript Code lab pairs, Enter, Tab, IME, focus escape and monospace.',flush=True)
                    page.goto(BASE+'/#copy')
                    exercise=api.get('/api/copy-exercises').json()['exercises'][0]
                    page.get_by_role('button',name=exercise['title'],exact=True).click()
                    copy=page.locator('.server-workspace .editor textarea')
                    expect(copy).to_be_visible()
                    copy.fill('');copy.press('Shift+9');expect(copy).to_have_value('(')
                    copy.press('Shift+Quote');expect(copy).to_have_value('("')
                    copy.fill('if ready:');copy.press('Enter');expect(copy).to_have_value('if ready:\n')
                    copy.fill('(')
                    page.get_by_role('button',name='Check exact match',exact=True).click()
                    expect(page.get_by_text('Not an exact match. Check indentation, spaces and the final newline.',exact=True)).to_be_visible()
                    profile=api.get('/api/users/me',headers={'Authorization':'Bearer '+account['token']}).json()
                    assert profile['xp']==0 and profile['coins']==0
                    page.screenshot(path=str(ARTIFACTS/'editor-strict-copy.png'),full_page=True)
                    print('PASS: Copy inserts only typed characters, no automatic closer/indent and no unearned reward.',flush=True)
                    (ARTIFACTS/'editor-result.json').write_text(json.dumps({'status':'passed','pages':['Challenges','server Python lesson','editable Python example','SQL example','local JavaScript lab','Copy'],'arena':'unchanged; pending GPT3 approval'},indent=2))
                except BaseException:
                    page.screenshot(path=str(ARTIFACTS/'editor-failure.png'),full_page=True)
                    raise
                finally:browser.close()
        finally:
            for child in (python,node):
                if child.poll() is None:child.terminate();child.wait(timeout=10)


if __name__=='__main__':verify()
