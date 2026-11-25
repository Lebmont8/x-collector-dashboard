import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { demoPosts } from './fixtures.mjs';
export function openDatabase(path='data/collector.sqlite',{seed=true}={}){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);
 db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY, author TEXT NOT NULL, name TEXT NOT NULL, text TEXT NOT NULL, topic TEXT NOT NULL, publishedAt TEXT NOT NULL, likes INTEGER NOT NULL CHECK(likes>=0), reposts INTEGER NOT NULL CHECK(reposts>=0), replies INTEGER NOT NULL CHECK(replies>=0)); CREATE INDEX IF NOT EXISTS posts_date ON posts(publishedAt DESC,id); CREATE INDEX IF NOT EXISTS posts_author ON posts(author)");
 if(seed && db.prepare('SELECT count(*) n FROM posts').get().n===0)importPosts(db,demoPosts());
 return db;
}
export function validatePost(p){
 if(!p||typeof p!=='object')throw new Error('Each post must be an object');
 for(const [key,max]of Object.entries({id:100,author:50,name:100,text:10000,topic:50,publishedAt:40}))
  if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>max)throw new Error('Invalid '+key);
 if(!/^[A-Za-z0-9_-]+$/.test(p.author))throw new Error('Invalid author handle');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(p.publishedAt)||!Number.isFinite(Date.parse(p.publishedAt)))throw new Error('Invalid publishedAt');
 const canonical=new Date(p.publishedAt).toISOString();if(canonical!==p.publishedAt&&canonical.replace('.000Z','Z')!==p.publishedAt)throw new Error('Invalid publishedAt');
 for(const key of ['likes','reposts','replies'])if(!Number.isSafeInteger(p[key])||p[key]<0||p[key]>1000000000)throw new Error('Invalid '+key);
 return {...p,publishedAt:new Date(p.publishedAt).toISOString()};
}
export function importPosts(db,posts){
 if(!Array.isArray(posts)||posts.length>5000)throw new Error('Expected at most 5000 posts');
 const valid=posts.map(validatePost);
 const insert=db.prepare('INSERT INTO posts(id,author,name,text,topic,publishedAt,likes,reposts,replies) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET author=excluded.author,name=excluded.name,text=excluded.text,topic=excluded.topic,publishedAt=excluded.publishedAt,likes=excluded.likes,reposts=excluded.reposts,replies=excluded.replies');
 db.exec('BEGIN IMMEDIATE');
 try{for(const p of valid)insert.run(...['id','author','name','text','topic','publishedAt','likes','reposts','replies'].map(k=>p[k]));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 return valid.length;
}
