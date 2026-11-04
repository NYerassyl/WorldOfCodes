import test from 'node:test';
import assert from 'node:assert/strict';
import { syllabus, algorithms, copyExercises } from '../prisma/seedData.js';
test('six Python topics form progressive learning path',()=>{
  assert.deepEqual(syllabus.map(s=>s.id),['variables','conditions','loops','functions','arrays','methods']);
  for(const topic of syllabus){
    assert.ok(topic.theory.length>100);
    assert.deepEqual(topic.problems.map(p=>p.difficulty),['EASY','MEDIUM']);
    for(const p of topic.problems) assert.ok(p.cases.length>=3);
  }
});
test('sixteen unique coding problems have JSON-compatible test cases',()=>{
  const all=[...syllabus.flatMap(s=>s.problems),...algorithms];
  assert.equal(all.length,16);
  assert.equal(new Set(all.map(p=>p.id)).size,16);
  for(const p of all){
    assert.match(p.functionName,/^[a-zA-Z_][a-zA-Z0-9_]*$/);
    assert.ok(['EASY','MEDIUM','HARD'].includes(p.difficulty));
    for(const [args,expected] of p.cases){
      assert.ok(Array.isArray(args));
      assert.notEqual(expected,undefined);
      assert.doesNotThrow(()=>JSON.stringify(args));
      assert.doesNotThrow(()=>JSON.stringify(expected));
    }
  }
});
test('three exact-code-copy exercises contain real templates',()=>{
  assert.equal(copyExercises.length,3);
  assert.equal(new Set(copyExercises.map(e=>e.id)).size,3);
  for(const e of copyExercises) assert.ok(e.templateCode.endsWith('\n'));
});

test('every seeded Python problem exposes an explicit editor starter with argument names',()=>{
  const all=[...syllabus.flatMap(s=>s.problems),...algorithms];
  assert.equal(all.length,16);
  for(const p of all) {
    assert.equal(typeof p.starterCode,'string');
    assert.match(p.starterCode,new RegExp('^def '+p.functionName+'\\([a-z, ]*\\):\\n    pass\\n$'));
    assert.ok(p.starterCode.length<200);
  }
  assert.equal(all.find(p=>p.id==='py-area').starterCode,'def rectangle_area(width, height):\\n    pass\\n'.replaceAll('\\n','\n'));
  assert.equal(all.find(p=>p.id==='algo-two-sum').starterCode,'def two_sum(nums, target):\\n    pass\\n'.replaceAll('\\n','\n'));
});
