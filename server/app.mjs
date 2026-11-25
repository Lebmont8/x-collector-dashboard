import { createServer } from 'node:http';
import { readFileSync,statSync } from 'node:fs';
import { resolve,sep,extname } from 'node:path';
import { parseQuery,readPosts,stats,csv } from './query.mjs';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export function createApp(db,{webRoot='dist'}={}){
 const root=resolve(webRoot);
 return createServer((req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader('Cache-Control','no-store');
  const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  try{
   const url=new URL(req.url,'http://localhost');
   if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return json(405,{error:'Read-only API'});}
   if(url.pathname==='/api/health')return json(200,{ok:true});
   if(url.pathname==='/api/authors')return json(200,db.prepare('SELECT author,name,count(*) posts FROM posts GROUP BY author,name ORDER BY name').all());
   if(['/api/posts','/api/stats','/api/export.csv'].includes(url.pathname)){
    let f;try{f=parseQuery(url.searchParams);}catch(e){return json(400,{error:e.message});}
    if(url.pathname==='/api/posts')return json(200,readPosts(db,f));
    if(url.pathname==='/api/stats')return json(200,stats(db,f));
    const data=readPosts(db,f,{exporting:true});
    res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="collector-posts.csv"','X-Export-Limit':'5000','X-Total-Count':String(data.total)});
    return res.end(csv(data.posts));
   }
   if(url.pathname.startsWith('/api/'))return json(404,{error:'Unknown API endpoint'});
   let path=resolve(root,'.'+decodeURIComponent(url.pathname));
   if(path!==root&&!path.startsWith(root+sep))return json(403,{error:'Forbidden'});
   if(url.pathname==='/'||!extname(path))path=resolve(root,'index.html');
   try{if(!statSync(path).isFile())return json(404,{error:'Not found'});const b=readFileSync(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:b);}catch{return json(404,{error:'Run npm run build before starting the server'});}
  }catch{json(500,{error:'Internal server error'});}
 });
}
