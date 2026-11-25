export function parseQuery(params){
 for(const key of params.keys())if(!['q','author','from','to','sort','page','limit'].includes(key))throw new Error('Unknown filter: '+key);
 for(const key of new Set(params.keys()))if(params.getAll(key).length!==1)throw new Error('Repeated filter: '+key);
 const q=(params.get('q')||'').trim(),author=params.get('author')||'';
 if(q.length>200||author.length>50)throw new Error('Filter too long');
 const from=params.get('from')||'',to=params.get('to')||'';
 for(const date of [from,to])if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))throw new Error('Invalid date');
 if(from&&to&&from>to)throw new Error('Start date must be before end date');
 const sort=params.get('sort')||'newest';if(!['newest','oldest','engagement'].includes(sort))throw new Error('Invalid sort');
 const integer=(key,def,max)=>{const s=params.get(key);if(s===null)return def;if(!/^[1-9]\d*$/.test(s)||Number(s)>max)throw new Error('Invalid '+key);return Number(s);};
 return{q,author,from,to,sort,page:integer('page',1,100000),limit:integer('limit',12,100)};
}
export function where(f){
 const clauses=[],args=[];
 if(f.q){clauses.push("(text LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\')");const term='%'+f.q.replace(/[\\%_]/g,'\\$&')+'%';args.push(term,term,term);}
 if(f.author){clauses.push('author=?');args.push(f.author);}
 if(f.from){clauses.push('publishedAt>=?');args.push(f.from+'T00:00:00.000Z');}
 if(f.to){clauses.push('publishedAt<=?');args.push(f.to+'T23:59:59.999Z');}
 return{sql:clauses.length?' WHERE '+clauses.join(' AND '):'',args};
}
export function readPosts(db,f,{exporting=false}={}){
 const w=where(f),order={newest:'publishedAt DESC,id DESC',oldest:'publishedAt ASC,id ASC',engagement:'(likes+reposts+replies) DESC,publishedAt DESC,id DESC'}[f.sort];
 const total=db.prepare('SELECT count(*) n FROM posts'+w.sql).get(...w.args).n;
 const rows=db.prepare('SELECT * FROM posts'+w.sql+' ORDER BY '+order+' LIMIT ? OFFSET ?').all(...w.args,exporting?5000:f.limit,exporting?0:(f.page-1)*f.limit);
 return{posts:rows,total,page:f.page,limit:f.limit,pages:Math.ceil(total/f.limit)};
}
export function stats(db,f){
 const w=where(f);
 const totals=db.prepare('SELECT count(*) posts,count(DISTINCT author) authors,coalesce(sum(likes+reposts+replies),0) interactions,min(publishedAt) first,max(publishedAt) last FROM posts'+w.sql).get(...w.args);
 const daily=db.prepare('SELECT substr(publishedAt,1,10) date,count(*) posts FROM posts'+w.sql+' GROUP BY date ORDER BY date').all(...w.args);
 const topics=db.prepare('SELECT topic,count(*) posts FROM posts'+w.sql+' GROUP BY topic ORDER BY posts DESC,topic').all(...w.args);
 return{...totals,daily,topics};
}
export function csvCell(value){const s=String(value);return '"'+(/^(?:\s*[=+\-@]|[\t\r\n])/.test(s)?"'":'')+s.replaceAll('"','""')+'"';}
export function csv(posts){const keys=['id','author','name','text','topic','publishedAt','likes','reposts','replies'];return[keys.join(','),...posts.map(p=>keys.map(k=>csvCell(p[k])).join(','))].join('\r\n');}
