import { test, expect } from '@playwright/test';
import { content } from '../src/data/deck';

test('both languages contain a complete 45-minute session',()=>{
 for(const lang of ['en','es'] as const){
  const {slides}=content(lang);
  expect(slides).toHaveLength(29);
  expect(slides.reduce((sum,s)=>sum+s.seconds,0)).toBe(2700);
  expect(slides.at(-1)?.seconds).toBe(300);
  for(const slide of slides){expect(slide.body).toBeTruthy();expect(slide.notes.length).toBeGreaterThan(70);}
 }
});

test('navigation, language switching, overview, notes, and boundaries',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/en/#16');
 await expect(page.locator('.slide.active')).toHaveAttribute('id','slide-16');
 await page.locator('[data-language="es"]').click();
 await expect(page).toHaveURL(/\/es\/#16$/);
 await expect(page.locator('html')).toHaveAttribute('lang','es');
 await expect(page.locator('.active h2')).toHaveText('Búsqueda híbrida: significado y términos');
 await page.keyboard.press('n');
 await expect(page.locator('#notes-panel')).toBeVisible();
 await expect(page.locator('.note:visible')).toContainText('Ambas búsquedas');
 await page.keyboard.press('Escape');
 await expect(page.locator('#notes-panel')).toBeHidden();
 await page.keyboard.press('o');
 await expect(page.locator('#overview-dialog')).toBeVisible();
 await page.locator('[data-go="6"]').click();
 await expect(page.locator('.slide.active')).toHaveAttribute('id','slide-7');
 await expect(page.locator('#overview-dialog')).toBeHidden();
 await page.keyboard.press('Home');
 await expect(page.locator('#previous')).toBeDisabled();
 await page.keyboard.press('ArrowLeft');
 await expect(page.locator('.slide.active')).toHaveAttribute('id','slide-1');
 await page.keyboard.press('End');
 await expect(page.locator('#next')).toBeDisabled();
 await page.keyboard.press('ArrowRight');
 await expect(page.locator('.slide.active')).toHaveAttribute('id','slide-29');
 await page.goto('/es/#999');
 await expect(page.locator('.slide.active')).toHaveAttribute('id','slide-29');
 await page.goto('/es/#invalid');
 await expect(page.locator('.slide.active')).toHaveAttribute('id','slide-1');
 expect(errors).toEqual([]);
});

for(const lang of ['en','es']){
 test(`${lang}: all slides fit desktop and avoid horizontal overflow on mobile`,async({page})=>{
  for(const viewport of [{width:1440,height:900},{width:1280,height:720},{width:390,height:844}]){
   await page.setViewportSize(viewport);
   await page.goto(`/${lang}/`);
   await page.evaluate(()=>document.fonts.ready);
   for(let i=1;i<=29;i++){
    const dimensions=await page.locator('.slide.active').evaluate(el=>({height:el.clientHeight,scrollHeight:el.scrollHeight,width:el.clientWidth,scrollWidth:el.scrollWidth}));
    expect(dimensions.scrollWidth,`${lang} slide ${i} at ${viewport.width}`).toBeLessThanOrEqual(dimensions.width+2);
    if(viewport.width>700)expect(dimensions.scrollHeight,`${lang} slide ${i} at ${viewport.width}`).toBeLessThanOrEqual(dimensions.height+2);
    if(i<29)await page.keyboard.press('ArrowRight');
   }
  }
 });
}

test('architecture diagrams expand without changing the active slide',async({page})=>{
 for(const lang of ['en','es'])for(const slide of [7,8,21]){
  await page.goto(`/${lang}/#${slide}`);
  await page.locator('.active [data-diagram-open]').click();
  const dialog=page.locator('#diagram-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('svg')).toBeVisible();
  await expect(dialog.locator('h2')).not.toBeEmpty();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.slide.active')).toHaveAttribute('id',`slide-${slide}`);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.active [data-diagram-open]')).toBeFocused();
 }
});

test('chunking methods preserve the source text and remain usable in both languages',async({page})=>{
 for(const lang of ['en','es']){
  for(const viewport of [{width:1280,height:720},{width:390,height:844}]){
   await page.setViewportSize(viewport);
   await page.goto(`/${lang}/#10`);
   const lab=page.locator('[data-chunk-lab]');
   let source='';
   for(const method of ['token','semantic','agentic']){
    const button=lab.locator(`[data-chunk-method="${method}"]`);
    await button.focus();
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.slide.active')).toHaveAttribute('id','slide-10');
    const panel=lab.locator('[data-chunk-panel]:visible');
    await expect(panel).toHaveCount(1);
    const text=(await panel.locator('.text-chunk p').allTextContents()).join(' ').replace(/\s+/g,' ');
    if(!source)source=text;
    expect(text).toBe(source);
    const dimensions=await page.locator('.slide.active').evaluate(el=>({h:el.clientHeight,sh:el.scrollHeight,w:el.clientWidth,sw:el.scrollWidth}));
    expect(dimensions.sw).toBeLessThanOrEqual(dimensions.w+2);
    if(viewport.width>700)expect(dimensions.sh).toBeLessThanOrEqual(dimensions.h+2);
   }
  }
  for(const slide of [3,4,10,13,16]){
   await page.goto(`/${lang}/#${slide}`);
   const art=page.locator('.active .concept-art');
   await expect(art).toBeVisible();
   expect(await art.evaluate(async(img:HTMLImageElement)=>{await img.decode();return img.naturalWidth>0&&img.alt.length>20;})).toBe(true);
  }
 }
});
