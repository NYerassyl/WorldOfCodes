import { judgePython, runPythonExample } from './dockerJudge.js';
import { judgeSql, runSqlQuery } from './sqlJudge.js';
import { AppError } from '../lib/errors.js';

export async function judgeLearning(job) {
  const language = job.language || 'python';
  if(job.kind==='example') {
    if(language==='sql')return runSqlQuery({sourceCode:job.sourceCode,fixture:job.fixture});
    if(language==='python')return runPythonExample(job);
  } else {
    if(language==='python')return judgePython(job.language ? {...job,timeoutMs:12000,executionTimeoutMs:2000} : job);
    if(language==='sql')return judgeSql(job);
  }
  throw new AppError(503,'JUDGE_UNAVAILABLE','No isolated worker for this language');
}
