import { openDatabase } from './db.mjs';
import { createApp } from './app.mjs';
const port=Number(process.env.PORT||4318),host=process.env.HOST||'127.0.0.1';
const db=openDatabase(process.env.DB_PATH||'data/collector.sqlite',{seed:process.env.DEMO_SEED!=='false'});
const app=createApp(db);
app.listen(port,host,()=>console.log('Collector Desk: http://'+host+':'+app.address().port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{app.close(()=>{db.close();process.exit(0);});});
