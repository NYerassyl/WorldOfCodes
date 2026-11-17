import test from 'node:test';
import assert from 'node:assert/strict';
import { advancedLessons, advancedProblems } from '../prisma/learningPack.js';
import { syllabus, algorithms } from '../prisma/seedData.js';
import { getPublicProblemBank } from '../src/problems/service.js';
import { solutions } from '../../../tests/solutions.mjs';

test('battle solution fixtures cover every learning-pack program',()=>{
  for(const problem of advancedProblems.filter(problem=>problem.language==='python')){
    const source=solutions[problem.id];
    assert.equal(typeof source,'string',`missing solution fixture for ${problem.id}`);
    assert.ok(source.includes(`def ${problem.functionName}(`),`${problem.id} fixture defines ${problem.functionName}`);
  }
});

test('15 original problems add three per practice level without replacing existing IDs',()=>{
  assert.equal(advancedProblems.length,15);
  const all=[...syllabus.flatMap(s=>s.problems),...algorithms,...advancedProblems];
  assert.equal(all.length,31);assert.equal(new Set(all.map(p=>p.id)).size,31);
  for(let level=1;level<=5;level++)assert.equal(advancedProblems.filter(p=>p.practiceLevel===level).length,3);
  assert.equal(advancedProblems.filter(p=>p.language==='sql').length,3);
  assert.equal(all.reduce((count,p)=>count+p.cases.length,0),145);
  for(const p of advancedProblems){
    assert.ok(p.statement.includes('Constraints:'));
    assert.ok(p.referenceCode.length>60&&p.explanation.length>100);
    assert.ok(p.cases.length>=4&&p.sampleCount===2);
    assert.ok(p.complexity.length>15);
  }
});

test('six lessons contain theory, editable examples, practice and acyclic prerequisites',()=>{
  assert.equal(advancedLessons.length,6);
  const foundations=new Set(syllabus.map(s=>'py-'+s.id+'-lesson'));
  const ids=new Set([...foundations,...advancedLessons.map(l=>l.example.language==='sql'?'sql-lab-lesson':'py-'+l.id+'-lesson')]);
  const edges=new Map(advancedLessons.map(l=>[l.example.language==='sql'?'sql-lab-lesson':'py-'+l.id+'-lesson',l.prerequisiteLessonId]));
  for(const lesson of advancedLessons){
    assert.ok(lesson.theory.length>1500);
    assert.ok(lesson.theory.includes('Change it and investigate'));
    assert.ok(lesson.example.code.length>30&&lesson.problems.length>0);
    if(lesson.prerequisiteLessonId)assert.ok(ids.has(lesson.prerequisiteLessonId));
    let next=lesson.example.language==='sql'?'sql-lab-lesson':'py-'+lesson.id+'-lesson';const seen=new Set();
    while(next){assert.ok(!seen.has(next));seen.add(next);next=edges.get(next);}
  }
});

test('the existing Arena bank remains Python-only while the learning catalog includes SQL',async()=>{
  const requests=[];const prisma={problem:{findMany:async query=>{requests.push(query);return [];}}};
  await getPublicProblemBank(prisma);
  assert.equal(requests[0].where.language,'python');
  await getPublicProblemBank(prisma,{includeSql:true});
  assert.equal(requests[1].where.language,undefined);
});
