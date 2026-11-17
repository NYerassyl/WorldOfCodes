import { useState } from 'react';
import { Editor } from './UI';
import { useAuth, authErrorMessage } from '../lib/auth';
import { runLessonExample, type LessonExampleData } from '../lib/learning-api';
import './lesson-example.css';

export function LessonExample({lessonId, example}:{lessonId:string;example:LessonExampleData}) {
  const {user}=useAuth();
  const [code,setCode]=useState(example.code);
  const [args,setArgs]=useState(JSON.stringify(example.args));
  const [result,setResult]=useState<{status:string;value?:unknown}>();
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function run(){
    setError('');setResult(undefined);
    let values: unknown;
    try { values=JSON.parse(args); if(!Array.isArray(values))throw new Error(); }
    catch {setError('Arguments must be a valid JSON array.');return;}
    setBusy(true);
    try{setResult(await runLessonExample(lessonId,code,values as unknown[]));}
    catch(e){setError(authErrorMessage(e));}
    finally{setBusy(false);}
  }
  return <section className="panel lesson-example" aria-label="Editable lesson example">
    <h2>Try the example</h2>
    <p>Change the code{example.language==='python'?' or input arguments':''}, run it, and compare the result. Example runs do not award XP.</p>
    {example.language==='sql'&&example.fixture&&<details><summary>Sample tables and rows</summary><pre><code>{example.fixture.setupSQL}</code></pre></details>}
    <Editor title={example.language==='sql'?'experiment.sql':'experiment.py'} value={code} onChange={setCode} smartEditing language={example.language}/>
    {example.language==='python'&&<label className="example-arguments">Arguments (JSON array)<textarea aria-label="Example arguments" rows={3} maxLength={8000} value={args} onChange={e=>setArgs(e.target.value)} spellCheck={false}/></label>}
    <div className="inline-actions">
      <button className="btn" disabled={busy||!user||!code.trim()} onClick={()=>void run()}>{busy?'Running example…':'Run example'}</button>
      <button className="btn secondary" disabled={busy} onClick={()=>{setCode(example.code);setArgs(JSON.stringify(example.args));setResult(undefined);setError('');}}>Reset example</button>
    </div>
    {!user&&<p><a href="#profile">Sign in</a> to run the example.</p>}
    <p>Original example result: <code>{JSON.stringify(example.expected)}</code></p>
    {error&&<p className="result error" role="alert">{error}</p>}
    {result&&<div className={`result ${result.status==='EXECUTED'?'':'error'}`} role="status"><strong>{result.status==='EXECUTED'?'Example result':result.status.replaceAll('_',' ')}</strong>{result.status==='EXECUTED'&&<pre>{JSON.stringify(result.value,null,2)}</pre>}</div>}
  </section>;
}
