"""Transport contract tests; real persistence/ownership is checked separately."""
import httpx
import pytest
import canonical_bridge

@pytest.fixture()
def upstream(monkeypatch):
    calls=[]
    original=httpx.Client
    def handle(request):
        calls.append(request)
        if request.url.path.endswith('/logout'):return httpx.Response(204)
        return httpx.Response(200,json={'canonical':True})
    monkeypatch.setattr(canonical_bridge.httpx,'Client',lambda **kw:original(**kw,transport=httpx.MockTransport(handle)))
    return calls

@pytest.mark.parametrize('path,payload,upstream_path',[
    ('/api/auth/register',{'email':'one@example.com','nickname':'player','password':'valid-password'},'/api/auth/register'),
    ('/api/auth/login',{'email':'one@example.com','password':'valid-password'},'/api/auth/login'),
    ('/api/problems/algo-two-sum/submit',{'code':'def solve(): return 1'},'/api/problems/algo-two-sum/submit'),
    ('/api/problems/algo-two-sum/submissions',{'code':'def solve(): return 1'},'/api/problems/algo-two-sum/submit'),
    ('/api/trace/exercises/trace-1-01/submit',{'answer':'hello'},'/api/trace/exercises/trace-1-01/attempts'),
])
def test_no_second_account_or_reward_logic(client,upstream,path,payload,upstream_path):
    result=client.post(path,json=payload,headers={'Authorization':'Bearer '+'a'*64})
    assert result.status_code==200 and result.json()=={'canonical':True}
    assert len(upstream)==1 and upstream[0].url.path==upstream_path
    if '/auth/' not in path:assert upstream[0].headers['Authorization']=='Bearer '+'a'*64

@pytest.mark.parametrize('path,payload',[
    ('/api/problems/algo-two-sum/submit',{'code':'ok'}),
    ('/api/trace/exercises/trace-1-01/submit',{'answer':'hello'}),
    ('/api/copy-exercises/copy/submit',{'code':'ok'}),
])
def test_integer_header_is_not_authentication(client,path,payload):
    assert client.post(path,json=payload,headers={'X-User-Id':'1'}).status_code==401

def test_extra_actor_and_reward_fields_rejected(client,upstream):
    for field in ['user_id','userId','rewarded','earnedXp']:
        result=client.post('/api/problems/a/submit',json={'code':'x',field:100},headers={'Authorization':'Bearer '+'a'*64})
        assert result.status_code==422
    assert upstream==[]

def test_bridge_fails_closed_and_does_not_register_locally(client,monkeypatch):
    monkeypatch.setenv('EXPRESS_INTERNAL_URL','http://127.0.0.1:1')
    result=client.post('/api/auth/register',json={'email':'one@example.com','nickname':'player','password':'valid-password'})
    assert result.status_code==503 and result.json()['error']['code']=='CANONICAL_SERVICE_UNAVAILABLE'
