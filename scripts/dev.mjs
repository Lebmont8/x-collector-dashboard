import { spawn } from 'node:child_process';
const api=spawn(process.execPath,['--watch','server/index.mjs'],{stdio:'inherit'});
const web=spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'});
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;api.kill();web.kill();process.exitCode=code;}
for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>stop());
api.on('exit',c=>stop(c||0));web.on('exit',c=>stop(c||0));
