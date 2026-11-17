"""Two real Express accounts → actual Challenges UI → FastAPI → shared PostgreSQL."""
from pathlib import Path
import json
import os
import subprocess
import sys
import time
from urllib.request import urlopen
from uuid import uuid4

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
BASE = 'http://127.0.0.1:4001'


def ready(url, child):
    for _ in range(150):
        if child.poll() is not None:
            raise RuntimeError('Service exited before becoming ready; inspect artifacts logs')
        try:
            with urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError('Service did not become ready')


def run():
    ARTIFACTS.mkdir(exist_ok=True)
    env = {**os.environ, 'PORT': '4001', 'HOST': '127.0.0.1', 'FASTAPI_INTERNAL_URL': 'http://127.0.0.1:8000'}
    with (ARTIFACTS / 'fastapi.log').open('w') as pylog, (ARTIFACTS / 'express.log').open('w') as jslog:
        def fastapi():
            return subprocess.Popen([sys.executable, '-m', 'uvicorn', 'main:app', '--app-dir', 'services/fastapi-backend', '--host', '127.0.0.1', '--port', '8000'], cwd=ROOT, env=env, stdout=pylog, stderr=pylog)
        python = fastapi()
        node = subprocess.Popen(['node', 'server/index.js'], cwd=ROOT, env=env, stdout=jslog, stderr=jslog)
        try:
            ready('http://127.0.0.1:8000/api/health', python)
            ready(BASE + '/api/health', node)
            with sync_playwright() as p:
                browser = p.chromium.launch()
                api = p.request.new_context(base_url=BASE)
                accounts = []
                for _ in range(2):
                    suffix = uuid4().hex.translate(str.maketrans('0123456789', 'abcdefghij'))[:16]
                    response = api.post('/api/auth/register', data={'email':suffix+'@example.com', 'nickname':'player'+suffix, 'password':'test-password-123'})
                    assert response.status == 201, response.text()
                    accounts.append(response.json())
                problems = api.get('/api/problems').json()['problems']
                assert len(problems) >= 2
                first, second = problems[0]['id'], problems[1]['id']
                contexts = []
                for account in accounts:
                    context = browser.new_context(viewport={'width':1440,'height':1100}, storage_state={
                        'cookies': [], 'origins':[{'origin':BASE,'localStorage':[{'name':'worldofcodes-session-v1','value':account['token']}]}]})
                    contexts.append(context)
                a, b = (context.new_page() for context in contexts)
                a.goto(BASE + '/#algorithms/' + first)
                expect(a.get_by_role('heading', name='Discussion', exact=True)).to_be_visible()
                text = 'Persistent explanation ' + uuid4().hex[:10]
                a.get_by_label('Your comment', exact=True).fill(text)
                a.get_by_role('button', name='Post comment', exact=True).click()
                article = a.locator('.problem-comment').filter(has_text=text)
                expect(article).to_be_visible()
                comment_id = article.get_attribute('data-comment-id')
                expect(article).to_contain_text(accounts[0]['user']['nickname'])
                a.reload()
                expect(a.locator('.problem-comment').filter(has_text=text)).to_be_visible()
                a.screenshot(path=str(ARTIFACTS/'comments-a-persisted.png'), full_page=True)
                print('PASS: A posted via Challenges; reload preserved the comment and server author.', flush=True)

                # Restart the actual FastAPI worker; Express and both browser sessions survive.
                python.terminate(); python.wait(timeout=10)
                python = fastapi(); ready('http://127.0.0.1:8000/api/health', python)
                a.reload()
                expect(a.locator('.problem-comment').filter(has_text=text)).to_be_visible()
                print('PASS: comment persisted across FastAPI process restart.', flush=True)
                a.goto(BASE + '/#algorithms/' + second)
                expect(a.get_by_role('heading', name='Discussion', exact=True)).to_be_visible()
                expect(a.get_by_text('No comments yet. Start the discussion.', exact=True)).to_be_visible()
                expect(a.locator('.problem-comment').filter(has_text=text)).to_have_count(0)
                a.screenshot(path=str(ARTIFACTS/'comments-problem-two.png'), full_page=True)
                print('PASS: problem 2 never displays problem 1 comments.', flush=True)

                b.goto(BASE + '/#algorithms/' + first)
                other = b.locator('.problem-comment').filter(has_text=text)
                expect(other).to_be_visible()
                expect(other.get_by_role('button', name='Edit comment', exact=True)).to_have_count(0)
                expect(other.get_by_role('button', name='Delete comment', exact=True)).to_have_count(0)
                path = f'/api/problems/{first}/comments/{comment_id}'
                denied = api.patch(path, headers={'Authorization':'Bearer '+accounts[1]['token']}, data={'body':'B attempted edit'})
                assert denied.status == 403, denied.text()
                denied_delete = api.delete(path, headers={'Authorization':'Bearer '+accounts[1]['token']})
                assert denied_delete.status == 403
                spoof = api.post(f'/api/problems/{first}/comments', headers={'Authorization':'Bearer '+accounts[1]['token']}, data={'body':'Spoofed A', 'authorId':accounts[0]['user']['id']})
                assert spoof.status == 422
                b.screenshot(path=str(ARTIFACTS/'comments-b-no-owner-controls.png'), full_page=True)
                print('PASS: B has no owner controls; edit/delete return 403; forged authorId returns 422.', flush=True)

                a.goto(BASE + '/#algorithms/' + first)
                owned = a.locator('.problem-comment').filter(has_text=text)
                expect(owned).to_be_visible()
                owned.get_by_role('button', name='Edit comment', exact=True).click()
                owned.get_by_label('Edit comment', exact=True).fill(text + ' edited')
                owned.get_by_role('button', name='Save comment', exact=True).click()
                expect(a.locator('.comment-body').filter(has_text=text+' edited')).to_be_visible()
                a.reload()
                owned = a.locator('.problem-comment').filter(has_text=text+' edited')
                expect(owned).to_be_visible()
                owned.get_by_role('button', name='Delete comment', exact=True).click()
                expect(a.locator('.problem-comment').filter(has_text=text)).to_have_count(0)
                print('PASS: A can edit, reload and delete the saved comment.', flush=True)
                (ARTIFACTS/'comments-result.json').write_text(json.dumps({'status':'passed','problemIds':[first,second],'authorId':accounts[0]['user']['id'],'secondPlayerId':accounts[1]['user']['id'],'commentId':comment_id},indent=2))
                browser.close()
        finally:
            for child in (python, node):
                if child.poll() is None:
                    child.terminate(); child.wait(timeout=10)


if __name__ == '__main__':
    run()
