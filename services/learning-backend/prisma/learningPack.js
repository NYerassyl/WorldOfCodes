// Original authored learning pack. Hidden cases/references are server-only.
import pack from './learning-pack.json' with {type:'json'};
export const advancedLessons = pack.lessons;
export const advancedProblems = advancedLessons.flatMap(lesson => lesson.problems);
const byId = Object.fromEntries(advancedProblems.map(problem => [problem.id, problem]));
// Deterministic hidden stress cases; keep large generated data out of source JSON.
byId['pack-balance'].cases.push([[Array(20000).fill(0)],0]);
byId['pack-runs'].cases.push([['a'.repeat(5000)],[['a',5000]]]);
byId['pack-window'].cases.push([[Array(20000).fill(1),10000],10000]);
byId['pack-maze'].cases.push([[Array(100).fill('.'.repeat(100))],198]);
byId['pack-capacity'].cases.push([[Array(10000).fill(1),100],100]);
byId['pack-tokens'].cases.push([[[1],10000],10000]);
byId['pack-pipeline'].cases.push([[Array(20000).fill(1),Array.from({length:19999},(_,i)=>[i,i+1])],20000]);
byId['pack-palindrome'].cases.push([['a'.repeat(300)],0]);
byId['pack-discount'].cases.push([[10000,Array.from({length:9999},(_,i)=>[i,i+1,2])],19996]);
byId['pack-jobs'].cases.push([[Array(12).fill(1),Array.from({length:12},(_,i)=>Array.from({length:12},(_,j)=>i===j?0:1))],12]);
byId['pack-fusion'].cases.push([[Array(50).fill(1)],286]);
