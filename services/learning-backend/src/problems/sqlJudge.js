import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { AppError } from '../lib/errors.js';

// Only trusted fixture data is read by admin. Player SQL runs as a distinct
// read-only, non-owner role in a disposable, networkless PostgreSQL container.
const WORKER = `set -eu
initdb -D /tmp/db -U admin -A trust --no-locale -E UTF8 -c shared_buffers=8MB -c max_connections=10 -c timezone=UTC >/dev/null
pg_ctl -D /tmp/db -l /tmp/postgres.log -o "-c listen_addresses='' -c unix_socket_directories=/tmp -c shared_buffers=8MB -c max_connections=10" -w start >/dev/null
psql -X -h /tmp -U admin -d postgres -v ON_ERROR_STOP=1 -f /workspace/fixture.sql >/dev/null
psql -X -h /tmp -U admin -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE judge LOGIN; REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO judge; GRANT SELECT ON ALL TABLES IN SCHEMA public TO judge; REVOKE TEMP ON DATABASE postgres FROM PUBLIC; ALTER ROLE judge SET default_transaction_read_only=on; ALTER ROLE judge SET statement_timeout='1500ms';" >/dev/null
if result=$(psql -X -q -t -A -h /tmp -U judge -d postgres -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate -c "$(cat /workspace/query.sql)" 2>/tmp/query.err); then
  printf '{"ok":true,"rows":%s}\\n' "$result"
else
  if grep -q '57014' /tmp/query.err; then
    printf '{"ok":false,"status":"TIME_LIMIT"}\\n'
  else
    printf '{"ok":false,"status":"RUNTIME_ERROR"}\\n'
  fi
fi
`;

export async function runSqlQuery({ sourceCode, fixture, image = process.env.SQL_JUDGE_IMAGE || 'postgres:17', timeoutMs = 12000 }) {
  if (typeof sourceCode !== 'string' || sourceCode.length > 20000) throw new AppError(400, 'INVALID_INPUT', 'SQL must be up to 20000 characters');
  if (!sourceCode.trim()) return { status: 'RUNTIME_ERROR' };
  // The derived-table grammar and read-only role enforce query-only execution;
  // leading SQL comments remain valid without a fragile keyword parser.
  if (!fixture || typeof fixture.setupSQL !== 'string' || fixture.setupSQL.length > 200000) throw new AppError(503, 'JUDGE_MISCONFIGURED', 'SQL fixture is not configured');
  const directory = await mkdtemp(join(tmpdir(), 'woc-sql-'));
  const name = 'woc-sql-' + randomUUID();
  try {
    const query = sourceCode.trim().replace(/;\s*$/, '');
    // -c sends the entire text to the SQL server, never psql backslash commands.
    await writeFile(join(directory, 'query.sql'), `SELECT COALESCE(json_agg(row_to_json(result)), '[]'::json) FROM (\n${query}\n) AS result;`, {mode:0o644});
    await writeFile(join(directory, 'fixture.sql'), fixture.setupSQL, {mode:0o644});
    await chmod(directory, 0o755);
    const args = ['run','--name',name,'--rm','--pull=never','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges',
      '--pids-limit=64','--memory=256m','--cpus=1','--user=postgres','--tmpfs=/tmp:rw,nosuid,nodev,size=128m,mode=1777',
      '--mount',`type=bind,src=${directory},dst=/workspace,readonly`,'--entrypoint','sh',image,'-c',WORKER];
    return await new Promise((resolve, reject) => {
      execFile('docker', args, {timeout:timeoutMs,killSignal:'SIGKILL',maxBuffer:65536}, async (error, stdout) => {
        await new Promise(done => execFile('docker',['rm','-f',name],{timeout:5000,killSignal:'SIGKILL'},()=>done()));
        if (error?.killed) return resolve({status:'TIME_LIMIT'});
        if (error) return reject(new AppError(503,'JUDGE_UNAVAILABLE','Isolated SQL worker is unavailable; no verdict was stored'));
        let result;
        try { result=JSON.parse(stdout); } catch { return resolve({status:'RUNTIME_ERROR'}); }
        if (!result.ok || !Array.isArray(result.rows)) return resolve({status:result.status==='TIME_LIMIT'?'TIME_LIMIT':'RUNTIME_ERROR'});
        resolve({status:'EXECUTED',value:result.rows});
      });
    });
  } finally {
    await rm(directory,{recursive:true,force:true});
  }
}

export async function judgeSql({sourceCode,cases,...options}) {
  if (!Array.isArray(cases) || !cases.length || cases.length > 20) throw new AppError(503,'JUDGE_MISCONFIGURED','SQL cases are not configured');
  let passedCases=0;
  for(const test of cases) {
    const fixture=JSON.parse(test.argsJson)[0];
    const result=await runSqlQuery({sourceCode,fixture,...options});
    if(result.status!=='EXECUTED')return {status:result.status,passedCases,totalCases:cases.length};
    if(!isDeepStrictEqual(result.value,JSON.parse(test.expectedJson)))return {status:'WRONG_ANSWER',passedCases,totalCases:cases.length};
    passedCases++;
  }
  return {status:'ACCEPTED',passedCases,totalCases:cases.length};
}
