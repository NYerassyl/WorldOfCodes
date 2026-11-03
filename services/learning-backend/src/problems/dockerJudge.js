import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { AppError } from '../lib/errors.js';

const PYTHON_RUNNER = `import sys, json, runpy, contextlib, io
try:
    payload = json.loads(sys.stdin.readline())
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        ns = runpy.run_path('/workspace/solution.py')
        fn = ns[payload['fn']]
        if not callable(fn):
            raise TypeError('Expected a callable function')
        result = fn(*payload['args'])
    sys.stdout.write(json.dumps({'ok':True, 'value':result}, allow_nan=False))
except BaseException:
    sys.stdout.write(json.dumps({'ok':False}))
`;

function runDockerOnce(directory, image, functionName, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const dockerArgs = [
      'run', '--rm', '--pull=never', '--network=none', '--read-only',
      '--cap-drop=ALL', '--security-opt=no-new-privileges',
      '--pids-limit=32', '--memory=128m', '--cpus=0.5',
      '--user=65534:65534', '--ulimit=nofile=64:64',
      '--tmpfs=/tmp:rw,nosuid,nodev,size=8m',
      '--mount', `type=bind,src=${directory},dst=/workspace,readonly`,
      '-i', image, 'python', '-I', '-B', '-c', PYTHON_RUNNER
    ];
    const child = execFile('docker', dockerArgs, { timeout: timeoutMs, maxBuffer: 65_536, windowsHide: true }, (err, stdout) => {
      if (err) {
        if (err.killed || err.signal === 'SIGTERM') return resolve({ status: 'TIME_LIMIT' });
        return reject(new AppError(503, 'JUDGE_UNAVAILABLE', 'Isolated Docker judge is not available; no verdict was stored'));
      }
      let payload;
      try { payload = JSON.parse(stdout); } catch { return resolve({ status: 'RUNTIME_ERROR' }); }
      if (payload?.ok !== true) return resolve({ status: 'RUNTIME_ERROR' });
      return resolve({ status: 'EXECUTED', value: payload.value });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify({ fn: functionName, args }) + '\n');
  });
}

export async function judgePython({ sourceCode, functionName, cases, image = process.env.JUDGE_IMAGE || 'python:3.12-alpine', timeoutMs = 4000 }) {
  if (!Array.isArray(cases) || !cases.length || cases.length > 40) {
    throw new AppError(503, 'JUDGE_MISCONFIGURED', 'Problem test cases not configured');
  }
  if (typeof sourceCode !== 'string' || sourceCode.length > 20_000) throw new AppError(400, 'INVALID_INPUT', 'code must be up to 20000 characters');
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) throw new AppError(503, 'JUDGE_MISCONFIGURED', 'Invalid problem function name');
  const directory = await mkdtemp(join(tmpdir(), 'woc-judge-'));
  try {
    await writeFile(join(directory, 'solution.py'), sourceCode, { encoding: 'utf8', mode: 0o644 });
    await chmod(directory, 0o755);
    let passedCases = 0;
    for (const c of cases) {
      const args = JSON.parse(c.argsJson);
      const expected = JSON.parse(c.expectedJson);
      const run = await runDockerOnce(directory, image, functionName, args, timeoutMs);
      if (run.status !== 'EXECUTED') return { status: run.status, passedCases, totalCases: cases.length };
      if (!isDeepStrictEqual(run.value, expected)) return { status: 'WRONG_ANSWER', passedCases, totalCases: cases.length };
      passedCases++;
    }
    return { status: 'ACCEPTED', passedCases, totalCases: cases.length };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
