"""Only trusted repository snippets are executed; player code uses Docker."""
from collections import Counter
import subprocess
import sys
import pytest
from trace_data import load_catalog,public_detail

CATALOG=load_catalog()

def test_catalog_levels_and_private_answers():
    assert Counter(x['level'] for x in CATALOG)=={1:10,2:10,3:10,4:10,5:10}
    for item in CATALOG:
        safe=public_detail(item)
        assert 'expected_stdout' not in safe and 'explanation' not in safe

@pytest.mark.parametrize('item',CATALOG,ids=lambda x:x['id'])
def test_trusted_reference_stdout(item):
    result=subprocess.run([sys.executable,'-I','-c',item['code']],capture_output=True,text=True,timeout=3)
    assert result.returncode==0 and result.stdout.removesuffix('\n')==item['expected_stdout'].removesuffix('\n')
