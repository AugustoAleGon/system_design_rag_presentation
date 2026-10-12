import { demoData } from '../data/store-demo';
import type { Language } from '../data/deck';
const root=document.querySelector<HTMLElement>('.chat-demo');
if(root){
 const data=demoData(root.dataset.demoLanguage as Language);
 let active=data.scenarios[0], step=0;
 const get=<T extends HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 function render(){
  root!.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===active.id)));
  root!.querySelectorAll<HTMLButtonElement>('[data-demo-step]').forEach(b=>{const i=Number(b.dataset.demoStep);b.disabled=i>active.maxStep;b.setAttribute('aria-current',i===step?'step':'false');});
  get('[data-demo-question]').textContent=active.question;
  get('[data-demo-context]').textContent=active.context;
  get('[data-demo-trace]').textContent=active.trace[step];
  get('[data-demo-answer]').textContent=step===active.maxStep?active.answer:data.labels.waiting;
  const citation=get<HTMLAnchorElement>('[data-demo-citation]');citation.hidden=step!==3||!active.source;citation.href=active.source||'#';citation.textContent=`[1] ${active.citation} ↗`;
  const passage=get('[data-demo-passage]');passage.hidden=step<2||!active.passage;passage.textContent=active.passage;
  get<HTMLButtonElement>('[data-demo-next]').disabled=step===active.maxStep;
 }
 root.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(b=>b.addEventListener('click',()=>{active=data.scenarios.find(s=>s.id===b.dataset.scenario)!;step=0;render();}));
 root.querySelectorAll<HTMLButtonElement>('[data-demo-step]').forEach(b=>b.addEventListener('click',()=>{step=Number(b.dataset.demoStep);render();}));
 get('[data-demo-next]').addEventListener('click',()=>{step=Math.min(step+1,active.maxStep);render();});
 get('[data-demo-reset]').addEventListener('click',()=>{step=0;render();});
 render();
}
