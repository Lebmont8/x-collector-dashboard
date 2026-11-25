import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { openDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';
const db=openDatabase(':memory:');
const app=createApp(db);
await new Promise(r=>app.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.address().port;
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:process.env.CHROME_NO_SANDBOX==='true'?['--no-sandbox']:[]});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let checks=0;
const check=()=>checks++;
const ready=()=>page.waitForFunction(()=>document.querySelector('.posts')?.getAttribute('aria-busy')==='false');
try{
 await page.goto(base);await ready();assert.equal(await page.locator('article').count(),12);check();
 mkdirSync('docs',{recursive:true});
 await page.screenshot({path:'docs/collection-desktop.png',fullPage:true});
 await page.getByRole('searchbox').fill('research');await page.getByRole('button',{name:'Apply filters'}).click();await ready();assert.ok(await page.locator('article').count()>0);assert.match(await page.locator('article').first().innerText(),/research/i);check();
 await page.getByRole('combobox',{name:'Author',exact:true}).selectOption('fieldnotes');await page.getByRole('button',{name:'Apply filters'}).click();await ready();for(const handle of await page.locator('.handle').allTextContents())assert.equal(handle,'@fieldnotes');check();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Export CSV'}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'collector-posts.csv');check();
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await ready();
 await page.getByRole('button',{name:'Next →',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.pagination')?.textContent.includes('Page 2 of'));await ready();check();
 await page.getByRole('combobox',{name:'Sort posts'}).selectOption('engagement');await ready();assert.match(await page.locator('.pagination').innerText(),/Page 1 of/);check();
 await page.getByRole('searchbox').fill('no-such-phrase-zzzz');await page.getByRole('button',{name:'Apply filters'}).click();await ready();await page.getByRole('heading',{name:'No posts found',exact:true}).waitFor();check();
 await page.locator('.empty').getByRole('button',{name:'Clear filters'}).click();await ready();
 await page.getByRole('button',{name:'Insights',exact:true}).click();await page.getByRole('heading',{name:'Posts by day'}).waitFor();assert.equal(await page.locator('.bar').count(),6);check();
 await page.screenshot({path:'docs/insights-desktop.png',fullPage:true});
 await page.getByRole('button',{name:/Collection/}).click();await ready();
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check();
  await page.getByRole('searchbox').fill('SQLite');await page.getByRole('searchbox').press('Enter');await ready();assert.ok(await page.locator('article').count()>0);assert.match(await page.locator('article').first().innerText(),/SQLite/);check();
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();await ready();
  await page.screenshot({path:'docs/collection-mobile-'+width+'.png',fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1100});
 await page.route('**/api/posts?**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporarily unavailable'})}));
 await page.getByRole('searchbox').fill('x');await page.getByRole('button',{name:'Apply filters'}).click();await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/Temporarily unavailable/);check();
 await page.unroute('**/api/posts?**');await page.getByRole('button',{name:'Retry',exact:true}).click();await ready();assert.equal(await page.getByRole('alert').count(),0);check();
 assert.deepEqual(errors,[]);check();
 console.log(JSON.stringify({checks,browser:browser.version(),viewports:[1440,390,320],errors}));
}finally{await browser.close();await new Promise(r=>app.close(r));db.close();}
