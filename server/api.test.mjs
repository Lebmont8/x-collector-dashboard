import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase,importPosts } from './db.mjs';
import { createApp } from './app.mjs';
import { demoPosts } from './fixtures.mjs';
import { csvCell,parseQuery } from './query.mjs';
let db,app,base;
before(async()=>{db=openDatabase(':memory:',{seed:false});importPosts(db,demoPosts(new Date('2026-11-25T12:00:00Z')));app=createApp(db);await new Promise(r=>app.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.address().port;});
after(async()=>{await new Promise(r=>app.close(r));db.close();});
const get=async(path)=>{const res=await fetch(base+path);return{res,body:await res.json()};};
test('health and default pagination',async()=>{assert.equal((await get('/api/health')).body.ok,true);const{body}=await get('/api/posts');assert.equal(body.total,72);assert.equal(body.posts.length,12);assert.equal(body.pages,6);});
test('pages have deterministic disjoint identities',async()=>{const a=(await get('/api/posts')).body.posts,b=(await get('/api/posts?page=2')).body.posts;assert.ok(a.every(p=>!b.some(q=>p.id===q.id)));});
test('search and author filters combine',async()=>{const{body}=await get('/api/posts?q=research&author=fieldnotes');assert.ok(body.total>0);assert.ok(body.posts.every(p=>p.author==='fieldnotes'&&/research/i.test(p.text)));});
test('date end is inclusive in UTC',async()=>{const{body}=await get('/api/posts?from=2026-11-25&to=2026-11-25');assert.equal(body.total,12);assert.ok(body.posts.every(p=>p.publishedAt.startsWith('2026-11-25')));});
test('sort by engagement and oldest',async()=>{const a=(await get('/api/posts?sort=engagement')).body.posts;const score=p=>p.likes+p.reposts+p.replies;assert.ok(a.every((p,i)=>!i||score(a[i-1])>=score(p)));const b=(await get('/api/posts?sort=oldest')).body.posts;assert.ok(b.every((p,i)=>!i||b[i-1].publishedAt<=p.publishedAt));});
test('stats reflect the same filtered collection',async()=>{const query='?author=fieldnotes&from=2026-11-23';const a=(await get('/api/posts'+query+'&limit=100')).body,s=(await get('/api/stats'+query)).body;assert.equal(s.posts,a.total);assert.equal(s.authors,1);assert.equal(s.interactions,a.posts.reduce((n,p)=>n+p.likes+p.reposts+p.replies,0));assert.equal(s.daily.reduce((n,d)=>n+d.posts,0),a.total);});
test('search escapes SQL wildcards and injection',async()=>{for(const q of ['%',"_","' OR 1=1 --"]){const{body}=await get('/api/posts?q='+encodeURIComponent(q));assert.equal(body.total,0);}});
test('unknown, duplicate, fractional, invalid date and oversized filters fail with 400',async()=>{for(const q of ['page=0','limit=101','page=1.5','page=1&page=2','sort=drop','to=2026-02-30','from=2026-12-01&to=2026-11-01','x=1','q='+'x'.repeat(201)]){assert.equal((await get('/api/posts?'+q)).res.status,400,q);}});
test('empty results have zero totals and no series',async()=>{const a=(await get('/api/posts?q=nonexistent')).body,s=(await get('/api/stats?q=nonexistent')).body;assert.equal(a.total,0);assert.equal(a.pages,0);assert.equal(s.interactions,0);assert.deepEqual(s.daily,[]);});
test('export retains filters, quotes multiline and protects spreadsheet formulas',async()=>{const res=await fetch(base+'/api/export.csv?author=fieldnotes');assert.match(res.headers.get('content-type'),/text\/csv/);assert.equal(res.headers.get('x-total-count'),'15');const body=await res.text();assert.equal(body.split('\r\n').length,16);assert.ok(body.includes('fieldnotes'));assert.equal(csvCell('=1+2'),'"\'=1+2"');assert.equal(csvCell('a"b\nc'),'"a""b\nc"');});
test('API rejects writes and reports unknown routes',async()=>{assert.equal((await fetch(base+'/api/posts',{method:'POST'})).status,405);assert.equal((await get('/api/missing')).res.status,404);});
test('static delivery has restrictive security headers',async()=>{const res=await fetch(base+'/');assert.equal(res.status,200);assert.match(res.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(res.headers.get('x-content-type-options'),'nosniff');});
test('imports validate entire input before writing and update duplicates',()=>{const x=openDatabase(':memory:',{seed:false});const p=demoPosts()[0];try{assert.throws(()=>importPosts(x,[p,{...p,id:'bad',likes:-1}]));assert.equal(x.prepare('select count(*) n from posts').get().n,0);importPosts(x,[p]);importPosts(x,[{...p,text:'updated'}]);assert.equal(x.prepare('select count(*) n from posts').get().n,1);assert.equal(x.prepare('select text from posts').get().text,'updated');assert.throws(()=>importPosts(x,{}));assert.throws(()=>importPosts(x,[{...p,author:'bad handle'}]));assert.throws(()=>importPosts(x,[{...p,publishedAt:'not-a-date'}]));}finally{x.close();}});
test('database persists across a fresh connection without reseeding',()=>{const dir=mkdtempSync(join(tmpdir(),'collector-db-'));const path=join(dir,'test.sqlite');try{let x=openDatabase(path,{seed:false});importPosts(x,[demoPosts()[0]]);x.close();x=openDatabase(path);assert.equal(x.prepare('select count(*) n from posts').get().n,1);x.close();}finally{rmSync(dir,{recursive:true,force:true});}});
test('parseQuery bounds pagination without numeric coercion',()=>{assert.throws(()=>parseQuery(new URLSearchParams('page=1e2')));assert.throws(()=>parseQuery(new URLSearchParams('limit=-1')));});

test('CSV neutralizes whitespace-prefixed formulas and imported dates cannot normalize silently',()=>{
 assert.ok(csvCell('  =1+2').startsWith('"'+String.fromCharCode(39)));
 const x=openDatabase(':memory:',{seed:false});
 try{assert.throws(()=>importPosts(x,[{...demoPosts()[0],publishedAt:'2026-02-30T10:00:00.000Z'}]));}finally{x.close();}
});
