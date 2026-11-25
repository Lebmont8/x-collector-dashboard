import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
type Post={id:string;author:string;name:string;text:string;topic:string;publishedAt:string;likes:number;reposts:number;replies:number};
type Results={posts:Post[];total:number;pages:number;page:number};
type Stats={posts:number;authors:number;interactions:number;daily:{date:string;posts:number}[];topics:{topic:string;posts:number}[]};
type Filters={q:string;author:string;from:string;to:string;sort:string};
const empty:Filters={q:'',author:'',from:'',to:'',sort:'newest'};
const number=new Intl.NumberFormat('en');
const date=(s:string)=>new Date(s).toLocaleDateString('en',{month:'short',day:'numeric',timeZone:'UTC'});
function App(){
 const [filters,setFilters]=useState<Filters>(empty),[draft,setDraft]=useState<Filters>(empty),[page,setPage]=useState(1);
 const [view,setView]=useState('collection'),[authors,setAuthors]=useState<{author:string;name:string;posts:number}[]>([]);
 const [result,setResult]=useState<Results|null>(null),[stats,setStats]=useState<Stats|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 const query=new URLSearchParams(Object.entries(filters).filter(([,v])=>v));query.set('page',String(page));const qs=query.toString();
 useEffect(()=>{
  const abort=new AbortController();setLoading(true);setError('');
  const read=async(path:string)=>{const r=await fetch(path,{signal:abort.signal});const body=await r.json();if(!r.ok)throw Error(body.error||'Request failed');return body;};
  Promise.all([read('/api/posts?'+qs),read('/api/stats?'+qs),read('/api/authors')]).then(([r,s,a])=>{setResult(r);setStats(s);setAuthors(a);}).catch(e=>{if(e.name!=='AbortError'){setError(e.message);setResult(null);setStats(null);}}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>abort.abort();
 },[qs,retry]);
 const reset=()=>{setDraft(empty);setFilters(empty);setPage(1);};
 const active=Object.entries(filters).filter(([k,v])=>v&&!(k==='sort'&&v==='newest')).length;
 return <div className="shell">
  <a className="skip" href="#main">Skip to collection</a>
  <aside className="sidebar"><a className="brand" href="/"><span className="mark" aria-hidden="true">c<span>·</span></span>Collector Desk</a>
   <div className="workspace"><span className="workspace-icon">F</span><span>Fieldwork<span className="sub">Research workspace</span></span></div>
   <nav aria-label="Workspace"><p className="nav-label">WORKSPACE</p><button className={view==='collection'?'nav selected':'nav'} onClick={()=>setView('collection')}><span aria-hidden="true">▤</span>Collection <span className="nav-count">{authors.reduce((n,a)=>n+a.posts,0)}</span></button><button className={view==='insights'?'nav selected':'nav'} onClick={()=>setView('insights')}><span aria-hidden="true">▥</span>Insights</button></nav>
   <div className="sidebar-bottom"><span className="avatar owner">F</span><span>Fieldwork library<span className="sub">Your research, organized</span></span></div>
  </aside>
  <main id="main">
   <div className="topline"><span>Workspace <span className="slash">/</span> {view==='collection'?'Collection':'Insights'}</span><span className="source">X post archive</span></div>
   <header><div><p className="eyebrow">YOUR RESEARCH LIBRARY</p><h1>{view==='collection'?'A little less noise.':'Patterns in the collection.'}</h1><p className="intro">{view==='collection'?'Find the posts worth coming back to.':'See what you collected, and where the conversations are.'}</p></div>
    <a className={'button primary'+(loading||error?' disabled':'')} aria-disabled={!!(loading||error)} tabIndex={loading||error?-1:0} href={'/api/export.csv?'+qs} onClick={e=>{if(loading||error)e.preventDefault();}}><span aria-hidden="true">↓</span> Export CSV</a></header>
   <form className="filters" onSubmit={e=>{e.preventDefault();setFilters({...draft});setPage(1);}}>
    <label className="search"><span className="field-label">Search the collection</span><input type="search" placeholder="Search posts, people, ideas…" value={draft.q} maxLength={200} onChange={e=>setDraft({...draft,q:e.target.value})}/></label>
    <label><span className="field-label">Author</span><select value={draft.author} onChange={e=>setDraft({...draft,author:e.target.value})}><option value="">All authors</option>{authors.map(a=><option key={a.author} value={a.author}>{a.name}</option>)}</select></label>
    <label><span className="field-label">From</span><input type="date" value={draft.from} max={draft.to||undefined} onChange={e=>setDraft({...draft,from:e.target.value})}/></label>
    <label><span className="field-label">To</span><input type="date" value={draft.to} min={draft.from||undefined} onChange={e=>setDraft({...draft,to:e.target.value})}/></label>
    <button className="button apply" type="submit">Apply filters</button>
   </form>
   <div className="filter-status"><span>{active?active+' active filter'+(active>1?'s':''):'All posts in your collection'}</span>{active>0&&<button className="text-button" onClick={reset}>Clear filters</button>}</div>
   {error&&<div className="error" role="alert">{error} <button className="text-button" onClick={()=>setRetry(n=>n+1)}>Retry</button></div>}
   <section className="metrics" aria-label="Collection summary" aria-busy={loading}><div><span>Collected posts</span><strong>{loading?'—':number.format(stats?.posts||0)}</strong></div><div><span>Authors</span><strong>{loading?'—':stats?.authors||0}</strong></div><div><span>Total interactions</span><strong>{loading?'—':number.format(stats?.interactions||0)}</strong></div><div><span>Collection window</span><strong className="date-value">{!loading&&stats?.daily.length?date(stats.daily[0].date)+' – '+date(stats.daily.at(-1)!.date):'—'}</strong></div></section>
   {view==='insights'?<section className="insights"><div className="chart-panel"><h2>Posts by day</h2><p className="muted">Publication dates · UTC</p><div className="chart" role="img" aria-label="Daily post counts">{stats?.daily.map(d=><div className="bar-column" key={d.date}><span>{d.posts}</span><div className="bar" style={{height:Math.max(4,d.posts/Math.max(...stats.daily.map(x=>x.posts))*130)}}/><span>{date(d.date)}</span></div>)}</div>{stats?.daily.length===0&&<p>No posts match these filters.</p>}</div><div className="chart-panel"><h2>Topics in focus</h2>{stats?.topics.map(t=><div className="topic-row" key={t.topic}><span>{t.topic}</span><strong>{t.posts} posts</strong></div>)}</div></section>:<>
    <div className="section-heading"><div><h2>Collected posts <span className="count">{loading?'…':result?.total||0}</span></h2><p className="muted">Original context. One place.</p></div><label className="sort"><span>Sort by</span><select aria-label="Sort posts" value={filters.sort} onChange={e=>{const sort=e.target.value;setDraft(d=>({...d,sort}));setFilters(f=>({...f,sort}));setPage(1);}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="engagement">Most interactions</option></select></label></div>
    <div aria-live="polite" className="sr-only">{loading?'Loading posts':(result?.total||0)+' matching posts'}</div>
    <section className="posts" aria-label="Collected posts" aria-busy={loading}>{loading?<div className="loading">Loading your collection…</div>:!error&&result?.posts.map(p=><article className="post" key={p.id}><div className="post-head"><span className={'avatar tone-'+(p.author.length%3)} aria-hidden="true">{p.name.split(' ').map(x=>x[0]).join('')}</span><div><h3>{p.name}</h3><span className="handle">@{p.author}</span></div><time dateTime={p.publishedAt}>{date(p.publishedAt)}</time></div><p className="post-text">{p.text}</p><div className="post-bottom"><span className="topic">{p.topic}</span><div className="engagement"><span title="Likes"><span aria-hidden="true">♡ </span><span className="sr-only">Likes: </span>{number.format(p.likes)}</span><span title="Reposts"><span aria-hidden="true">↻ </span><span className="sr-only">Reposts: </span>{p.reposts}</span><span title="Replies"><span aria-hidden="true">◌ </span><span className="sr-only">Replies: </span>{p.replies}</span></div></div></article>)}</section>
    {!loading&&!error&&result?.total===0&&<div className="empty"><h2>No posts found</h2><p>Try a different phrase, author or date range.</p><button className="button" onClick={reset}>Clear filters</button></div>}
    {result&&result.pages>0&&<div className="pagination"><span>Page {page} of {result.pages}</span><div><button className="button" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>← Previous</button><button className="button" disabled={page>=result.pages||loading} onClick={()=>setPage(p=>p+1)}>Next →</button></div></div>}
   </>}
  </main>
 </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
