import catalog from './policies/catalog.json' with { type: 'json' };
import chunks from './policies/chunks.json' with { type: 'json' };
import type { Language } from './deck';
export type Topic = 'returns' | 'refunds' | 'privacy';
export type Policy = typeof catalog[number];
export function resolvePolicy(topic:Topic, date:string|undefined, lang:Language, policies:Policy[]=catalog) {
 if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date)return {status:'missing_date' as const};
 const matches=policies.filter(p=>p.topic===topic&&p.market==='DEMO'&&p.status==='READY'&&p.sections[lang]&&p.effective_from<=date&&(!p.effective_to||date<p.effective_to));
 if(matches.length!==1)return {status:matches.length?'conflict' as const:'no_policy' as const};
 return {status:'matched' as const,policy:matches[0]};
}
export function demoData(lang:Language) {
 const p=(en:string,es:string)=>lang==='en'?en:es;
 const definitions:[string,Topic,string|undefined,string,string,string,string][]=[
  ['old','returns','2026-06-20','2026-07-10',p('June purchase','Compra de junio'),p('Can I return my item 20 days after purchase?','¿Puedo devolver mi artículo 20 días después de comprarlo?'),'LM-1042'],
  ['new','returns','2026-07-02','2026-07-22',p('July purchase','Compra de julio'),p('Can I return my item 20 days after purchase?','¿Puedo devolver mi artículo 20 días después de comprarlo?'),'LM-1088'],
  ['refund','refunds','2026-07-08','2026-07-10',p('Refund timing','Plazo de reembolso'),p('My refund was approved. When should it arrive?','Mi reembolso fue aprobado. ¿Cuándo debería llegar?'),'LM-1060'],
  ['privacy','privacy','2026-07-10','2026-07-10',p('Privacy','Privacidad'),p('What personal data does the store keep?','¿Qué datos personales conserva la tienda?'),'—'],
  ['missing','returns',undefined,'2026-07-10',p('Missing date','Sin fecha'),p('Can I return this item? I do not have my order date.','¿Puedo devolver este artículo? No tengo la fecha de mi pedido.'),'—'],
 ];
 const scenarios=definitions.map(([id,topic,eventDate,questionDate,label,question,order])=>{
  const resolved=resolvePolicy(topic,eventDate,lang);
  const basis=topic==='returns'?'purchase_date':topic==='refunds'?'approval_date':'question_date';
  const context=`${topic.toUpperCase()} · DEMO · ${order}\n${basis}: ${eventDate??'?'}\nquestion_date: ${questionDate}`;
  let answer=p('What is your purchase date or order number? I need it to select the applicable returns policy.','¿Cuál es tu fecha de compra o número de pedido? Lo necesito para seleccionar la política de devoluciones aplicable.');
  let source='',citation='',passage='';
  let resolution=p('No purchase date: ask for clarification. Do not default to the latest PDF.','Falta la fecha de compra: pedir aclaración. No asumir el PDF más reciente.');
  if(resolved.status==='matched'){
   const policy=resolved.policy;
   const chunk=chunks.find(c=>c.id===policy.id&&c.language===lang)!;
   source=`${chunk.source}#page=1`;citation=`${policy.id}-${lang}.pdf · §2 · p. 1`;passage=chunk.passage;
   resolution=`${basis} = ${eventDate}\n${policy.id} · [${policy.effective_from}, ${policy.effective_to??'∞'})\n${p('READY + market + language + access scope','READY + mercado + idioma + permisos')}`;
   if(topic==='returns'){
    const elapsed=(Date.parse(questionDate)-Date.parse(eventDate!))/86400000;
    const days=policy.window_days!;
    answer=elapsed<=days?p(`Your June 20 purchase uses returns v1: a ${days}-day window. At ${elapsed} days, you are within that window. The item must also be unused, in its original packaging, with proof of purchase. This is not a return approval.`,`Tu compra del 20 de junio usa returns v1: un plazo de ${days} días. Con ${elapsed} días, estás dentro del plazo. El artículo también debe estar sin usar, en su empaque original y con comprobante. Esto no es una aprobación de devolución.`):p(`Your July 2 purchase uses returns v2: a ${days}-day window. At ${elapsed} days, the standard window has passed. Contact support to review the case; I cannot promise an exception.`,`Tu compra del 2 de julio usa returns v2: un plazo de ${days} días. Con ${elapsed} días, el plazo estándar ya pasó. Contacta a soporte para revisar el caso; no puedo prometer una excepción.`);
   } else if(topic==='refunds') answer=p('For the approval dated July 8, refunds v1 gives an expected window of 5–7 business days after approval, to the original payment method. The PDF cannot confirm whether your payment was sent; that requires the payment API.','Para la aprobación del 8 de julio, refunds v1 indica un plazo esperado de 5–7 días hábiles desde la aprobación, al medio de pago original. El PDF no confirma si el pago fue enviado; eso requiere la API de pagos.');
   else answer=p('The current privacy PDF lists name, email, shipping address, and payment reference for orders and support. In this fictional policy, order records are kept for 12 months after purchase; full card numbers are not stored. This answer does not access or delete account data.','El PDF de privacidad vigente enumera nombre, correo, dirección de envío y referencia de pago para pedidos y soporte. Esta política ficticia conserva los pedidos por 12 meses desde la compra y no almacena números completos de tarjetas. Esta respuesta no accede ni elimina datos de la cuenta.');
  }
  return {id,label,question,context,answer,source,citation,passage,maxStep:resolved.status==='matched'?3:1,trace:[
   p('Chat API verifies identity. The order/approval dates here come from a fictional authenticated Order API fixture. Public privacy questions do not require an order.','Chat API verifica identidad. Las fechas de pedido o aprobación provienen de un fixture ficticio de Order API autenticada. Las preguntas públicas de privacidad no necesitan un pedido.'),
   resolution,
   p('Illustrative hybrid retrieval + reranking, restricted to the resolved policy. The passage below was extracted from the linked PDF; ranking is simulated.','Hybrid retrieval + reranking ilustrativos, limitados a la política resuelta. El fragmento inferior se extrajo del PDF enlazado; el ranking es simulado.'),
   p('Context builder keeps the source and version. A scripted answer represents LLM generation. No refund, return, or data-deletion operation is executed.','Context builder conserva fuente y versión. Una respuesta escrita representa la generación del LLM. No se ejecuta ningún reembolso, devolución ni eliminación de datos.')
  ]};
 });
 return {scenarios,labels:{simulation:p('Interactive simulation · fictional store · no live LLM','Simulación interactiva · tienda ficticia · sin LLM en vivo'),scenario:p('Choose a customer question','Elige una consulta'),customer:p('Customer','Cliente'),assistant:'Luma Support',trace:p('System interaction','Interacción del sistema'),next:p('Next step','Siguiente paso'),reset:p('Restart','Reiniciar'),waiting:p('Step through the system to reveal the answer.','Recorre el sistema para mostrar la respuesta.'),source:p('Open source PDF','Abrir PDF fuente'),steps:['Chat API','Resolver','Retrieval','Answer'],stepLabel:p('Stage','Etapa')}};
}
export function chatDemo(lang:Language){
 const data=demoData(lang);const s=data.scenarios[0];const l=data.labels;
 return `<div class="chat-demo" data-demo-language="${lang}"><div class="demo-disclosure">${l.simulation}</div><div class="demo-scenarios" role="group" aria-label="${l.scenario}">${data.scenarios.map((s,i)=>`<button type="button" data-scenario="${s.id}" aria-pressed="${i===0}">${s.label}</button>`).join('')}</div><div class="demo-grid"><div class="demo-chat"><div class="demo-chat-heading">LUMA STORE <span>SUPPORT</span></div><div class="demo-question"><small>${l.customer}</small><p data-demo-question>${s.question}</p></div><pre data-demo-context>${s.context}</pre><div class="demo-answer" aria-live="polite"><small>${l.assistant}</small><p data-demo-answer>${l.waiting}</p><a data-demo-citation href="#" target="_blank" rel="noopener noreferrer" hidden></a></div></div><div class="demo-trace"><h3>${l.trace}</h3><div class="demo-steps">${l.steps.map((name,i)=>`<button type="button" data-demo-step="${i}" aria-current="${i===0?'step':'false'}">0${i+1} ${lang==='es'&&name==='Answer'?'Respuesta':name}</button>`).join('')}</div><p data-demo-trace>${s.trace[0]}</p><blockquote data-demo-passage hidden></blockquote><div class="demo-actions"><button type="button" data-demo-next>${l.next} →</button><button type="button" data-demo-reset>${l.reset}</button></div></div></div></div>`;
}
