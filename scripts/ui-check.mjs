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
// A previous render can still report aria-busy=false after an interaction.
async function showResults(action, { q = null, author = null, sort = 'newest', pageNumber = '1' } = {}) {
 const [response] = await Promise.all([
  page.waitForResponse(response => {
   const url = new URL(response.url());
   return url.origin === base && url.pathname === '/api/posts'
    && url.searchParams.get('q') === q && url.searchParams.get('author') === author
    && url.searchParams.get('sort') === sort && url.searchParams.get('page') === pageNumber;
  }),
  action(),
 ]);
 assert.ok(response.ok(), 'Expected a successful posts response');
 const { posts } = await response.json();
 const expected = posts.map(({ author, text }) => ['@' + author, text]);
 await page.waitForFunction(rows => {
  const collection = document.querySelector('.posts[aria-busy="false"]');
  if (!collection) return false;
  const actual = [...collection.querySelectorAll('article')].map(article => [
   article.querySelector('.handle')?.textContent,
   article.querySelector('.post-text')?.textContent,
  ]);
  return actual.length === rows.length
   && actual.every(([handle, text], i) => handle === rows[i][0] && text === rows[i][1]);
 }, expected);
}
const apply = () => page.getByRole('button', { name: 'Apply filters' }).click();
const clear = () => page.getByRole('button', { name: 'Clear filters', exact: true }).click();
try{
 await page.goto(base);await ready();assert.equal(await page.locator('article').count(),12);check();
 mkdirSync('docs',{recursive:true});
 await page.screenshot({path:'docs/collection-desktop.png',fullPage:true});
 await page.getByRole('searchbox').fill('research');
 await showResults(apply, { q: 'research' });assert.ok(await page.locator('article').count()>0);assert.match(await page.locator('article').first().innerText(),/research/i);check();
 await page.getByRole('combobox',{name:'Author',exact:true}).selectOption('fieldnotes');
 await showResults(apply, { q: 'research', author: 'fieldnotes' });
 assert.ok(await page.locator('article').count() > 0);for(const handle of await page.locator('.handle').allTextContents())assert.equal(handle,'@fieldnotes');check();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Export CSV'}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'collector-posts.csv');check();
 await showResults(clear);
 await showResults(() => page.getByRole('button',{name:'Next →',exact:true}).click(), { pageNumber: '2' });
 assert.match(await page.locator('.pagination').innerText(), /Page 2 of/);check();
 await showResults(() => page.getByRole('combobox',{name:'Sort posts'}).selectOption('engagement'), { sort: 'engagement' });assert.match(await page.locator('.pagination').innerText(),/Page 1 of/);check();
 await page.getByRole('searchbox').fill('no-such-phrase-zzzz');
 await showResults(apply, { q: 'no-such-phrase-zzzz', sort: 'engagement' });await page.getByRole('heading',{name:'No posts found',exact:true}).waitFor();check();
 await showResults(() => page.locator('.empty').getByRole('button',{name:'Clear filters'}).click());
 await page.getByRole('button',{name:'Insights',exact:true}).click();await page.getByRole('heading',{name:'Posts by day'}).waitFor();assert.equal(await page.locator('.bar').count(),6);check();
 await page.screenshot({path:'docs/insights-desktop.png',fullPage:true});
 await page.getByRole('button',{name:/Collection/}).click();await ready();
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check();
  await page.getByRole('searchbox').fill('SQLite');
  await showResults(() => page.getByRole('searchbox').press('Enter'), { q: 'SQLite' });assert.ok(await page.locator('article').count()>0);assert.match(await page.locator('article').first().innerText(),/SQLite/);check();
  await showResults(clear);
  await page.screenshot({path:'docs/collection-mobile-'+width+'.png',fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1100});
 await page.route('**/api/posts?**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporarily unavailable'})}));
 await page.getByRole('searchbox').fill('x');await apply();await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/Temporarily unavailable/);check();
 await page.unroute('**/api/posts?**');
 await showResults(() => page.getByRole('button',{name:'Retry',exact:true}).click(), { q: 'x' });assert.equal(await page.getByRole('alert').count(),0);check();
 assert.deepEqual(errors,[]);check();
 console.log(JSON.stringify({checks,browser:browser.version(),viewports:[1440,390,320],errors}));
}finally{await browser.close();await new Promise(r=>app.close(r));db.close();}
