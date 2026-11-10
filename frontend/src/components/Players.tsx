import { useEffect, useState } from 'react';
import { request } from '../lib/api';
import Avatar from './Avatar';

type Player = {id:string; nickname:string; displayName:string; bio:string; following:boolean; avatarUrl:string|null};
type Message = {id:string; senderId:string; body:string};
export default function Players({me}:{me:string}) {
  const [query, search] = useState('');
  const [players,list] = useState<Player[]>([]);
  const [peer,select] = useState<Player|null>(null);
  const [messages,show] = useState<Message[]>([]);
  const [draft,write] = useState('');
  const [error,report] = useState('');
  const [busy,lock] = useState(false);
  const [revision,refresh] = useState(0);
  useEffect(()=>{
    const abort = new AbortController();
    const load = ()=>request<Player[]>('/players?q='+encodeURIComponent(query.replace(/^@/,'')),{signal:abort.signal}).then(list).catch(e=>{if(!abort.signal.aborted) report(e.message)});
    const timer=setTimeout(load,200), interval=setInterval(load,5000);
    return ()=>{abort.abort(); clearTimeout(timer); clearInterval(interval)};
  },[query,revision]);
  useEffect(()=>{
    if(!peer) return;
    const abort=new AbortController();
    const load=()=>request<Message[]>('/players/'+peer.id+'/messages',{signal:abort.signal}).then(show).catch(e=>{if(!abort.signal.aborted) report(e.message)});
    void load(); const interval=setInterval(load,2000);
    return ()=>{abort.abort();clearInterval(interval)};
  },[peer,revision]);
  return <section className="panel"><h2>Players &amp; messages</h2><div className="account-form">
    <label>Find a player by username<input value={query} onChange={e=>search(e.target.value)} placeholder="@username" /></label>
    {players.length===0 && <p>{query?'No matching players.':'Search for a username to follow a player or start a conversation.'}</p>}
    {players.map(p=><div key={p.id} className="account-identity"><span className="account-avatar"><Avatar url={p.avatarUrl} name={p.nickname}/></span><div><strong>{p.displayName || p.nickname}</strong><span>@{p.nickname}</span><p>{p.bio}</p></div>
    <button className="btn secondary" disabled={busy} onClick={async()=>{lock(true);try{await request('/players/'+p.id+'/follow',{method:p.following?'DELETE':'PUT'});refresh(v=>v+1)}catch(e){report(String(e))}finally{lock(false)}}}>{p.following?'Unfollow':'Follow'}</button>
    <button className="btn" disabled={busy} onClick={()=>{select(p);show([]);write('');report('')}}>Chat</button></div>)}
    {peer && <form className="account-form" onSubmit={async e=>{e.preventDefault();if(!draft.trim()||busy)return;lock(true);try{await request('/players/'+peer.id+'/messages',{method:'POST',body:{body:draft}});write('');refresh(v=>v+1)}catch(e){report(String(e))}finally{lock(false)}}}>
    <h3>Chat with @{peer.nickname}</h3><div aria-live="polite">{messages.map(m=><p key={m.id} style={{overflowWrap:'anywhere'}}><strong>{m.senderId===me?'You':peer.nickname}</strong> · {m.body}</p>)}</div>
    <label>Message<input maxLength={1000} value={draft} onChange={e=>write(e.target.value)}/></label><button className="btn" disabled={busy||!draft.trim()}>Send</button></form>}
    {error && <p role="alert">{error}</p>}</div></section>;
}
