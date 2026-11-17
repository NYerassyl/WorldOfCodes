import ast
from pathlib import Path
import pytest

@pytest.mark.parametrize('path',['/docs','/redoc','/openapi.json'])
def test_documentation(client,path):assert client.get(path).status_code==200

def test_canonical_contract_and_no_demo_actor(client):
    spec=client.get('/openapi.json').json()
    for path in ['/api/users','/api/auth/login','/api/users/{user_id}/progress','/api/lessons','/api/problems/{problem_id}/submissions','/api/submissions/{submission_id}','/api/problems/{problem_id}/comments']:
        assert path in spec['paths']
    assert spec['components']['securitySchemes']['HTTPBearer']['scheme']=='bearer'
    assert all(p.get('name')!='X-User-Id' for path in spec['paths'].values() for op in path.values() for p in op.get('parameters',[]))
    assert client.get('/').json()['storage']=='postgresql'
    assert not (Path(__file__).parents[1]/'storage.py').exists()
