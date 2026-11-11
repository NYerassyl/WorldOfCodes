import { useEffect, useState } from "react";
import { request } from "../lib/api";
import { useAuth } from "../lib/auth";

type Exercise = { id: string; title: string; level: number; difficulty: string; topic: string };
type Detail = Exercise & { code: string; instructions: string };
type Verdict = { correct: boolean; expectedOutput: string; explanation: string };

export default function Trace({ id }: { id?: string }) {
  const { user } = useAuth();
  const [level, setLevel] = useState(1);
  const [items, setItems] = useState<Exercise[]>([]);
  const [exercise, setExercise] = useState<Detail>();
  const [output, setOutput] = useState("");
  const [result, setResult] = useState<Verdict>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    const options = { signal: abort.signal };
    setError("");
    setItems([]);
    const load = id
      ? request<{exercise: Detail}>("/trace/exercises/"+encodeURIComponent(id), options).then(data => setExercise(data.exercise))
      : request<{exercises: Exercise[]}>("/trace/exercises?level="+level, options).then(data => setItems(data.exercises));
    load.catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [id, level]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!exercise || busy) return;
    setBusy(true); setError(""); setResult(undefined);
    try {
      setResult(await request<Verdict>("/trace/exercises/"+exercise.id+"/attempts", {method:"POST", body:{output}}));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not check output."); }
    finally { setBusy(false); }
  }
  return <section className="panel trace-practice">
    {id && <a href="#trace">← All trace exercises</a>}
    <h1>{exercise?.title ?? "Trace Practice"}</h1>
    {error && <p role="alert">{error}</p>}
    {!id && <><p>Read the Python code and predict exactly what it prints.</p>
      <label>Difficulty level <select value={level} onChange={e=>setLevel(Number(e.target.value))}>
        {["Easy","Easy–Medium","Medium","Medium–Hard","Hard"].map((name,i)=><option key={name} value={i+1}>{i+1} · {name}</option>)}
      </select></label>
      <ul>{items.map(item=><li key={item.id}><a href={"#trace/"+item.id}>{item.title}<small>{item.topic.replaceAll("-"," ")}</small></a></li>)}</ul></>}
    {exercise && <><p>{exercise.instructions}</p><pre><code>{exercise.code}</code></pre>
      <form onSubmit={submit}><label>Your predicted output<textarea rows={4} maxLength={2000} value={output} onChange={e=>setOutput(e.target.value)} spellCheck={false}/></label>
      {user ? <button className="btn" disabled={busy}>{busy?"Checking…":"Check output"}</button> : <a className="btn" href="#profile">Sign in to check output</a>}</form>
      {result && <div role="status"><h2>{result.correct?"Correct":"Incorrect"}</h2><p>Expected output</p><pre>{result.expectedOutput}</pre><p>{result.explanation}</p></div>}</>}
  </section>;
}
