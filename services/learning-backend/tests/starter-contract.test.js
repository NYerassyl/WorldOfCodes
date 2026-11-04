import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicProblemSelect, getPublicProblemBank, getJudgableProblem } from '../src/problems/service.js';
import { syllabus, algorithms } from '../prisma/seedData.js';

test('editor starters are valid explicit function definitions for each published seed', () => {
  const problems = [...syllabus.flatMap(section => section.problems), ...algorithms];
  assert.equal(problems.length, 16);
  for (const p of problems) {
    assert.equal(typeof p.starterCode, 'string');
    assert.match(p.starterCode, /^def [A-Za-z_][A-Za-z0-9_]*\([a-z, ]*\):\n    pass\n$/);
    assert.ok(p.starterCode.startsWith('def ' + p.functionName + '('));
    assert.notEqual(p.starterCode.includes('print('), true);
  }
});

test('public problem projection includes starterCode and only sample test cases', () => {
  assert.equal(publicProblemSelect.starterCode, true);
  assert.equal(publicProblemSelect.functionName, true);
  assert.deepEqual(publicProblemSelect.testCases.where, {isSample:true});
  assert.deepEqual(publicProblemSelect.testCases.select, {argsJson:true,expectedJson:true});
});

test('public filtering preserves topic/difficulty and requires published problems', async () => {
  let query;
  const prisma={problem:{findMany:async args=>{query=args;return [];}}};
  assert.deepEqual(await getPublicProblemBank(prisma,{topic:'sorting',difficulty:'EASY'}),[]);
  assert.equal(query.select.starterCode,true);
  assert.equal(query.where.topicSlug,'sorting');
  assert.equal(query.where.difficulty,'EASY');
  assert.equal(query.where.isPublished,true);
});

test('private judging contract retains all hidden test cases on server only', async () => {
  let query;
  const p={id:'algo-sort',language:'python',topicSlug:'sorting',difficulty:'EASY',functionName:'sort_numbers',
    testCases:[{argsJson:'[[3,1]]',expectedJson:'[1,3]'}, {argsJson:'[[5,2]]',expectedJson:'[2,5]'}]};
  const prisma={problem:{findFirst:async args=>{query=args;return p;}}};
  assert.deepEqual(await getJudgableProblem(prisma,'algo-sort'),p);
  assert.equal(query.select.testCases.where,undefined);
  assert.equal(query.select.testCases.select.argsJson,true);
  assert.equal(query.select.starterCode,undefined);
});

test('starterCode schema migration is additive and follows earlier migrations', () => {
  const path = new URL('../prisma/migrations/20261103230000_problem_starter_code/migration.sql',import.meta.url);
  const migration=readFileSync(path,'utf8');
  assert.match(migration,/ALTER TABLE "Problem" ADD COLUMN "starterCode" TEXT NOT NULL DEFAULT '';/);
  assert.doesNotMatch(migration,/DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE/);
});

test('every starter function has argument count matching all hidden and sample judge cases',()=>{
  const problems=[...syllabus.flatMap(topic=>topic.problems),...algorithms];
  for(const problem of problems){
    const signature=problem.starterCode.split(String.fromCharCode(10))[0];
    const prefix='def '+problem.functionName+'(';
    assert.ok(signature.startsWith(prefix) && signature.endsWith('):'),'Bad signature for '+problem.id);
    const argList=signature.slice(prefix.length,-2);
    const params=argList ? argList.split(',').map(v=>v.trim()) : [];
    assert.equal(new Set(params).size,params.length,'duplicate parameter '+problem.id);
    for(const [args] of problem.cases){
      assert.ok(Array.isArray(args),'Expected positional JSON arguments '+problem.id);
      assert.equal(args.length,params.length,'Argument mismatch in '+problem.id);
    }
  }
});
