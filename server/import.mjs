import { readFileSync,statSync } from 'node:fs';
import { openDatabase,importPosts } from './db.mjs';
const file=process.argv[2];
if(!file){console.error('Usage: npm run import -- posts.json');process.exit(1);}
if(statSync(file).size>10*1024*1024)throw new Error('Import file exceeds 10MB');
const db=openDatabase(process.env.DB_PATH||'data/collector.sqlite',{seed:false});
try{console.log('Imported '+importPosts(db,JSON.parse(readFileSync(file,'utf8')))+' posts');}finally{db.close();}
