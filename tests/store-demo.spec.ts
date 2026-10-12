import { test, expect } from '@playwright/test';
import { resolvePolicy, demoData } from '../src/data/store-demo';
import { content } from '../src/data/deck';
import catalog from '../src/data/policies/catalog.json' with { type: 'json' };
import chunks from '../src/data/policies/chunks.json' with { type: 'json' };

test('policy resolver respects effective boundaries and explicit failure outcomes',()=>{
 for(const lang of ['en','es'] as const){
  expect(resolvePolicy('returns','2026-06-30',lang)).toMatchObject({status:'matched',policy:{id:'returns-v1'}});
  expect(resolvePolicy('returns','2026-07-01',lang)).toMatchObject({status:'matched',policy:{id:'returns-v2'}});
  expect(resolvePolicy('returns','2026-06-25',lang)).toMatchObject({status:'matched',policy:{id:'returns-v1'}});
  expect(resolvePolicy('returns',undefined,lang).status).toBe('missing_date');
  expect(resolvePolicy('returns','2026-02-30',lang).status).toBe('missing_date');
  expect(resolvePolicy('returns','2025-12-31',lang).status).toBe('no_policy');
  const overlap=[...catalog,{...catalog[0],id:'duplicate'}];
  expect(resolvePolicy('returns','2026-06-20',lang,overlap).status).toBe('conflict');
  expect(resolvePolicy('returns','2026-07-01',lang,catalog.map(p=>({...p,status:'INDEXING'}))).status).toBe('no_policy');
  expect(JSON.stringify(content(lang))).not.toMatch(/X200|E103|firmware|Wi-Fi/);
  for(const scenario of demoData(lang).scenarios){
   if(!scenario.source)continue;
   const chunk=chunks.find(c=>scenario.source.startsWith(c.source))!;
   expect(chunk.text.replace(/\s+/g,' ')).toContain(scenario.passage.replace(/\s+/g,' '));
  }
 }
});

for(const lang of ['en','es'] as const)test(`${lang}: chatbot scenarios show matching evidence, citations, and clarification`,async({page,request})=>{
 await page.goto(`/${lang}/#27`);
 for(const scenario of demoData(lang).scenarios){
  await page.locator(`[data-scenario="${scenario.id}"]`).click();
  for(let i=0;i<scenario.maxStep;i++)await page.locator('[data-demo-next]').click();
  await expect(page.locator('[data-demo-answer]')).toHaveText(scenario.answer);
  await expect(page.locator('[data-demo-next]')).toBeDisabled();
  const citation=page.locator('[data-demo-citation]');
  if(scenario.source){
   await expect(citation).toHaveAttribute('href',scenario.source);
   await expect(citation).toBeVisible();
   const response=await request.get(scenario.source.split('#')[0]);
   expect(response.ok()).toBeTruthy();expect(response.headers()['content-type']).toContain('application/pdf');
  }else{
   await expect(citation).toBeHidden();
   await expect(page.locator('[data-demo-step="2"]')).toBeDisabled();
   await expect(page.locator('[data-demo-passage]')).toBeHidden();
  }
  for(const viewport of [{width:1440,height:900},{width:1280,height:720},{width:390,height:844}]){
   await page.setViewportSize(viewport);
   const d=await page.locator('.slide.active').evaluate(el=>({h:el.clientHeight,sh:el.scrollHeight,w:el.clientWidth,sw:el.scrollWidth}));
   expect(d.sw,scenario.id).toBeLessThanOrEqual(d.w+2);
   if(viewport.width>700)expect(d.sh,`${scenario.id} at ${viewport.width}`).toBeLessThanOrEqual(d.h+2);
  }
  await page.setViewportSize({width:1440,height:900});
  await page.locator('[data-demo-reset]').click();
  await expect(page.locator('[data-demo-step="0"]')).toHaveAttribute('aria-current','step');
 }
});
