import { useEffect, useState } from 'react';
import { request } from '../lib/api';
import Avatar from './Avatar';
import './player-profile.css';

type Person = {id:string; nickname:string; displayName:string|null; avatarUrl:string|null; bio:string};
type Profile = Person & {counts:{following:number; followers:number}; following:boolean};
type Count = {submissions:number; solved:number};
type Activity = {days:Record<string,Count>; year:Count; recent:Count; previous:Count;
  longest_streak:number; current_streak:number; topics:Record<string,number>; difficulties:Record<string,number>};
type Direction = 'followers'|'following';
type List = {players:Person[]; next:string|null};

function Practice({activity}:{activity:Activity}) {
  const [selected, select] = useState('');
  const months = new Map<string, [string, Count][]>();
  for (const entry of Object.entries(activity.days)) {
    const month = entry[0].slice(0,7);
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(entry);
  }
  return <section className="panel practice-history"><h2>Practice activity</h2>
    <dl className="practice-totals">{Object.entries({'Submissions':activity.year.submissions,'Problems solved':activity.year.solved,
      'Current streak':activity.current_streak,'Longest streak':activity.longest_streak}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}{k.includes('streak')?' days':''}</dd></div>)}</dl>
    <div className="practice-months">{Array.from(months,([month,days])=><div key={month}>
      <small>{new Date(month+'-01T12:00:00Z').toLocaleDateString('en',{month:'short',year:'2-digit',timeZone:'UTC'})}</small>
      <div className="practice-days">{days.map(([day,count],i)=>{
        const label=day+' · '+count.submissions+' submissions · '+count.solved+' solved';
        return <button key={day} title={label} aria-label={label} data-busy={Math.min(count.submissions,3)}
          style={i===0?{gridRowStart:(new Date(day+'T12:00:00Z').getUTCDay()+6)%7+1}:undefined}
          onFocus={()=>select(label)} onMouseEnter={()=>select(label)} onClick={()=>select(label)} />;
      })}</div></div>)}</div>
    <p aria-live="polite">{selected || 'Select a day to view activity (UTC).'}</p>
    <table><caption>Monthly comparison</caption><thead><tr><th>Period</th><th>Submissions</th><th>Solved</th></tr></thead>
      <tbody>{([['Last 30 days',activity.recent],['Previous 30 days',activity.previous]] as const).map(([title,c])=><tr key={title}><th>{title}</th><td>{c.submissions}</td><td>{c.solved}</td></tr>)}</tbody></table>
    <div className="practice-breakdown">{([['By topic',activity.topics],['By difficulty',activity.difficulties]] as const).map(([title,items])=><section key={title}><h3>{title}</h3>
      {Object.entries(items).length? <ul>{Object.entries(items).sort((a,b)=>b[1]-a[1]).map(([name,n])=><li key={name}>{name} · {n}</li>)}</ul>:<p>No problems solved yet.</p>}</section>)}</div>
  </section>;
}

export default function PlayerProfile({id,me}:{id:string;me:string}) {
  const [profile,setProfile]=useState<Profile|null>(null), [activity,setActivity]=useState<Activity|null>(null);
  const [direction,open]=useState<Direction|null>(null), [list,setList]=useState<List|null>(null);
  const [error,report]=useState(''), [activityError,setActivityError]=useState(''), [busy,lock]=useState(false);
  const base='/players/'+encodeURIComponent(id);
  useEffect(()=>{
    const controller=new AbortController(), options={signal:controller.signal};
    request<Profile>(base+'/profile',options).then(setProfile).catch(e=>{if(!controller.signal.aborted) report(e.message)});
    request<Activity>(base+'/activity',options).then(setActivity).catch(e=>{if(!controller.signal.aborted) setActivityError(e.message)});
    return ()=>controller.abort();
  },[base]);
  async function load(group:Direction,after?:string) {
    lock(true);report('');
    try {
      const result=await request<List>(base+'/'+group+(after?'?after='+encodeURIComponent(after):''));
      setList(prev=>({players:after?[...(prev?.players??[]),...result.players]:result.players,next:result.next}));open(group);
    } catch(e){report(String(e))} finally{lock(false)}
  }
  async function follow(){
    if(!profile)return;
    lock(true);report('');
    try {
      await request(base+'/follow',{method:profile.following?'DELETE':'PUT'});
      setProfile(await request<Profile>(base+'/profile'));open(null);
    } catch(e){report(String(e))} finally{lock(false)}
  }
  return <>{error && <p role="alert">{error}</p>}{profile && <section className="panel">
    {id!==me && <div className="account-identity"><span className="account-avatar"><Avatar url={profile.avatarUrl} name={profile.nickname}/></span>
      <div><h2>{profile.displayName || profile.nickname}</h2><p>@{profile.nickname}</p><p>{profile.bio}</p></div></div>}
    <div className="account-actions">{(['followers','following'] as const).map(group=><button className="btn secondary" disabled={busy} key={group} aria-expanded={direction===group}
      onClick={()=>direction===group?open(null):load(group)}>{profile.counts[group]} {group}</button>)}
      {id!==me && <><button className="btn" disabled={busy} onClick={follow}>{profile.following?'Unfollow':'Follow'}</button><a className="btn secondary" href={'#chat/'+id}>Message</a></>}</div>
    {direction && list && <div><h3>{direction==='followers'?'Followers':'Following'}</h3>{list.players.map(p=><p key={p.id}><a href={p.id===me?'#profile':'#profile/'+p.id}>{p.displayName || p.nickname} · @{p.nickname}</a></p>)}
      {!list.players.length && <p>No players yet.</p>}{list.next && <button disabled={busy} onClick={()=>load(direction,list.next!)}>Load more</button>}</div>}
    </section>}{activity?<Practice activity={activity}/>:<p role="status">{activityError || 'Loading practice activity…'}</p>}</>;
}
