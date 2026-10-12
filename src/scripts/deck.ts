const slides = Array.from(document.querySelectorAll<HTMLElement>('.slide'));
const notes = Array.from(document.querySelectorAll<HTMLElement>('.note'));
const overview = document.querySelector<HTMLDialogElement>('#overview-dialog')!;
const diagram = document.querySelector<HTMLDialogElement>('#diagram-dialog')!;
const help = document.querySelector<HTMLDialogElement>('#help-dialog')!;
const notesPanel = document.querySelector<HTMLElement>('#notes-panel')!;
const notesButton = document.querySelector<HTMLButtonElement>('#notes-button')!;
const previous = document.querySelector<HTMLButtonElement>('#previous')!;
const next = document.querySelector<HTMLButtonElement>('#next')!;
let current = 0;
function fromHash() {
 const value = /^#(\d+)$/.exec(location.hash);
 return value ? Math.max(0,Math.min(slides.length-1,Number(value[1])-1)) : 0;
}
function go(index:number, updateHash=true) {
 current=Math.max(0,Math.min(slides.length-1,index));
 slides.forEach((slide,i)=>{slide.classList.toggle('active',i===current);slide.setAttribute('aria-hidden',String(i!==current));slide.inert=i!==current;});
 notes.forEach((note,i)=>note.hidden=i!==current);
 const chapter=Number(slides[current].dataset.chapter);
 document.querySelectorAll<HTMLElement>('[data-chapter-target]').forEach(el=>{el.classList.toggle('selected',Number(el.dataset.chapterTarget)===chapter);el.setAttribute('aria-current',Number(el.dataset.chapterTarget)===chapter?'step':'false');});
 document.querySelectorAll<HTMLElement>('[data-go]').forEach(el=>el.setAttribute('aria-current',Number(el.dataset.go)===current?'true':'false'));
 document.querySelector('#slide-counter')!.innerHTML=`${String(current+1).padStart(2,'0')} <span>/ ${String(slides.length).padStart(2,'0')}</span>`;
 document.querySelector<HTMLElement>('#progress-fill')!.style.width=`${(current+1)/slides.length*100}%`;
 document.querySelector('[role="progressbar"]')!.setAttribute('aria-valuenow',String(current+1));
 previous.disabled=current===0;next.disabled=current===slides.length-1;
 document.querySelectorAll<HTMLAnchorElement>('[data-language]').forEach(link=>link.href=`/${link.dataset.language}/#${current+1}`);
 document.querySelector('#announcement')!.textContent=`${document.body.dataset.slideLabel} ${current+1} ${document.body.dataset.ofLabel} ${slides.length}: ${slides[current].querySelector('h1,h2')!.textContent}`;
 if(updateHash && location.hash!==`#${current+1}`) history.pushState(null,'',`#${current+1}`);
 slides[current].scrollTop=0;
}
function toggleNotes(force?:boolean) { const show=force ?? notesPanel.hidden;notesPanel.hidden=!show;document.body.classList.toggle('notes-open',show);notesButton.setAttribute('aria-expanded',String(show)); }
async function fullscreen() {
 try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
 catch { document.body.classList.toggle('focus-mode'); }
}
previous.addEventListener('click',()=>go(current-1));
next.addEventListener('click',()=>go(current+1));
document.querySelector('#overview-button')!.addEventListener('click',()=>overview.showModal());
notesButton.addEventListener('click',()=>toggleNotes());
document.querySelector('#close-notes')!.addEventListener('click',()=>{toggleNotes(false);notesButton.focus();});
document.querySelector('#fullscreen-button')!.addEventListener('click',fullscreen);
document.querySelector('#help-button')!.addEventListener('click',()=>help.showModal());
document.querySelectorAll<HTMLElement>('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog')!.close()));
document.querySelectorAll<HTMLElement>('[data-go]').forEach(button=>button.addEventListener('click',()=>{go(Number(button.dataset.go));overview.close();}));
document.querySelectorAll<HTMLElement>('[data-chapter-target]').forEach(button=>button.addEventListener('click',()=>go(slides.findIndex(slide=>slide.dataset.chapter===button.dataset.chapterTarget))));
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
window.addEventListener('hashchange',()=>go(fromHash(),false));
window.addEventListener('keydown',event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement) return;
 if(overview.open||help.open||diagram.open) return;
 if(event.key==='Escape'){toggleNotes(false);document.body.classList.remove('focus-mode');return;}
 if(event.key===' ' && (event.target instanceof HTMLButtonElement||event.target instanceof HTMLAnchorElement))return;
 const key=event.key.toLowerCase();
 if(['arrowright','arrowleft','arrowdown','arrowup','pagedown','pageup',' ','home','end','o','n','f','?'].includes(key))event.preventDefault();
 if(['arrowright','arrowdown','pagedown',' '].includes(key))go(current+1);
 if(['arrowleft','arrowup','pageup'].includes(key))go(current-1);
 if(key==='home')go(0);if(key==='end')go(slides.length-1);
 if(key==='o')overview.showModal();if(key==='n')toggleNotes();if(key==='f')void fullscreen();if(key==='?')help.showModal();
});
let touchStart:{x:number;y:number}|null=null;
const presentation=document.querySelector('#presentation')!;
presentation.addEventListener('touchstart',event=>{const t=(event as TouchEvent).changedTouches[0];touchStart={x:t.screenX,y:t.screenY};},{passive:true});
presentation.addEventListener('touchend',event=>{if(!touchStart)return;const t=(event as TouchEvent).changedTouches[0];const dx=t.screenX-touchStart.x;const dy=t.screenY-touchStart.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)go(current+(dx<0?1:-1));touchStart=null;},{passive:true});
go(fromHash(),false);

// Clone the selected SVG with unique IDs so marker and accessible-name references stay local.
document.querySelectorAll<HTMLButtonElement>('[data-diagram-open]').forEach(button => {
 button.addEventListener('click', () => {
  const svg = button.closest('figure')!.querySelector<SVGElement>('svg')!;
  const prefix = svg.dataset.prefix!;
  document.querySelector('#diagram-title')!.textContent = svg.querySelector('title')!.textContent;
  document.querySelector('#diagram-canvas')!.innerHTML = svg.outerHTML.replaceAll(prefix, `${prefix}-expanded`);
  diagram.showModal();
 });
});
