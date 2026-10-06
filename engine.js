(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VisualNotesEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STOP=new Set('de la que el en y a los del se las por un para con no una su al lo como mas pero sus le ya o este si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mi antes algunos unos yo otro otras otra tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mis tu te ti tus ellas es son ser fue era eran sido estan estaba puede pueden cada tipo forma manera partir mediante segun asi dicho misma mismo mismos cuales ejemplo parte tiene tienen tener hace hacen hacer permite permiten uso usa usan debe deben luego entonces despues aunque ademas esos esas hacia tras vez cualquier todas muchas varios varias primero segundo finalmente paso pasos'.split(' '));
  const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function key(s){let v=norm(s).replace(/\s+/g,' ');if(!v.includes(' ')){if(v.length>5&&v.endsWith('es'))v=v.slice(0,-2);else if(v.length>4&&v.endsWith('s'))v=v.slice(0,-1);}return v;}
  function hash(s){let h=2166136261;for(const c of s){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  function sources(text){const out=[];const re=/[^\n]+/g;let m;while((m=re.exec(text))){const line=m[0];const isList=/^\s*(?:\d+[.)]|paso\s+\d+\s*:)/i.test(line);const pieces=isList||line.includes('|')?[{text:line,offset:0}]:Array.from(line.matchAll(/.+?(?:[.!?](?=\s|$)|$)/g),x=>({text:x[0],offset:x.index}));for(const p of pieces){const trim=p.text.trim();if(!trim)continue;const start=m.index+p.offset+p.text.indexOf(trim);out.push({id:'s'+(out.length+1),text:trim,start,end:start+trim.length});}}return out;}
  function analyze(text,preferences={}){
    if(typeof text!=='string'||text.length>60000)throw new Error('Usa hasta 60.000 caracteres por clase.');
    const src=sources(text);const tally=new Map();
    function add(label,sid,bonus=0){label=label.trim().replace(/^[“"«]|[”"»]$/g,'');if(label.length<2||label.length>70||STOP.has(norm(label))||/^\d+$/.test(label))return;const k=key(label);let t=tally.get(k);if(!t){t={id:'c-'+hash(k),key:k,label,score:0,sourceIds:[]};tally.set(k,t);}t.score+=1+bonus;if(!t.sourceIds.includes(sid))t.sourceIds.push(sid);}
    for(const s of src){
      for(const q of s.text.matchAll(/[“"«]([^”"»\n]{2,70})[”"»]/g))add(q[1],s.id,3);
      const def=s.text.match(/^(?:(?:el|la|los|las|un|una)\s+)?([\p{L}][\p{L}\s-]{1,65}?)\s+(?:es|son|se define como|consiste en)\b/iu);if(def&&!/\bno\b/i.test(def[1]))add(def[1],s.id,4);
      for(const p of s.text.matchAll(/\b[\p{Lu}][\p{L}]+(?:\s+(?:(?:de|del|la|las|los)\s+)?[\p{Lu}][\p{L}]+)+/gu))add(p[0].replace(/^(El|La|Los|Las|Un|Una)\s+/,''),s.id,2);
      for(const w of s.text.match(/[\p{L}][\p{L}\p{N}]*/gu)||[]){if(w.length>=4||/^[A-ZÁÉÍÓÚÑ]{2,6}$/.test(w))add(w,s.id);}
    }
    // Repeated adjacent terms are candidates, never asserted as definitions.
    const grams=new Map();for(const s of src){const ws=s.text.match(/[\p{L}]+/gu)||[];for(let i=0;i<ws.length-1;i++){if(STOP.has(norm(ws[i]))||ws[i].length<4)continue;let phrase=null;if(!STOP.has(norm(ws[i+1]))&&ws[i+1].length>=4)phrase=ws[i]+' '+ws[i+1];else if(i+2<ws.length&&['de','del'].includes(norm(ws[i+1]))&&!STOP.has(norm(ws[i+2]))&&ws[i+2].length>=4)phrase=ws[i]+' '+ws[i+1]+' '+ws[i+2];if(!phrase)continue;const k=norm(phrase);if(!grams.has(k))grams.set(k,{phrase,ids:[]});grams.get(k).ids.push(s.id);}}
    for(const g of grams.values())if(new Set(g.ids).size>=2)for(const sid of new Set(g.ids))add(g.phrase,sid,2);
    const max=Math.max(5,Math.min(24,Number(preferences.max)||12));
    let concepts=Array.from(tally.values()).sort((a,b)=>b.score-a.score);
    const compounds=concepts.filter(c=>c.label.includes(' '));concepts=concepts.filter(c=>c.label.includes(' ')||!compounds.some(p=>p.score>=c.score&&norm(p.label).split(' ').includes(norm(c.label))));concepts=concepts.slice(0,max);
    const relations=[];for(let i=0;i<concepts.length;i++)for(let j=i+1;j<concepts.length;j++){const ids=concepts[i].sourceIds.filter(id=>concepts[j].sourceIds.includes(id));if(ids.length)relations.push({id:'r-'+hash(concepts[i].id+concepts[j].id),from:concepts[i].id,to:concepts[j].id,label:'Coinciden en el texto',sourceIds:ids,directed:false});}
    relations.sort((a,b)=>b.sourceIds.length-a.sourceIds.length);relations.splice(max*2);
    const events=[],procedures=[],tables=[],formulas=[];let group=null;
    for(const s of src){
      const years=Array.from(s.text.matchAll(/\b(?:1[0-9]{3}|20[0-9]{2}|2100)\b/g),m=>m[0]);
      if(years.length&&!s.text.includes('|'))events.push({id:'e-'+s.id,date:Array.from(new Set(years)).join(' / '),text:s.text,sourceIds:[s.id]});
      const step=s.text.match(/^(?:([0-9]{1,2})[.)]\s+|paso\s+([0-9]{1,2})\s*:\s*)(.+)$/i);
      if(step){const order=Number(step[1]||step[2]);if(!group||order<=group.steps[group.steps.length-1].order){group={id:'p-'+s.id,title:'Procedimiento del texto',steps:[]};procedures.push(group);}group.steps.push({id:'step-'+s.id,order,text:step[3],sourceIds:[s.id]});}else group=null;
      if(/\S\s*=\s*\S/.test(s.text)&&!s.text.includes('|'))formulas.push({id:'f-'+s.id,expression:s.text,sourceIds:[s.id]});
    }
    for(let i=0;i<src.length-2;i++){if(!src[i].text.includes('|')||!/^\|?\s*:?-{3,}/.test(src[i+1].text))continue;const cells=s=>s.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());const headers=cells(src[i].text);const rows=[];let j=i+2;while(j<src.length&&src[j].text.includes('|')){const row=cells(src[j].text);if(row.length!==headers.length)break;rows.push({cells:row,sourceIds:[src[j].id]});j++;}if(rows.length)tables.push({id:'t-'+src[i].id,title:'Comparación del texto',headers,rows});i=j-1;}
    const title=String(preferences.title||concepts[0]?.label||'Clase sin título').slice(0,120);
    return {schemaVersion:1,title,sourceText:text,sources:src,concepts,relations,events,procedures,tables,formulas,preferences:{subject:String(preferences.subject||''),goal:String(preferences.goal||'comprender'),detail:String(preferences.detail||'normal'),max},mode:'local',notes:['Análisis por reglas: revisa los conceptos sugeridos. Las conexiones indican coincidencia, no causalidad.']};
  }
  function validate(raw,text,preferences={}){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Respuesta de análisis inválida.');
    const src=sources(text),ids=new Set(src.map(s=>s.id));const allIds=new Set();
    const string=(s,limit=2000)=>{if(typeof s!=='string'||!s.trim()||s.length>limit)throw new Error('Texto de análisis inválido.');return s;};
    const arr=(a,limit=80)=>{if(!Array.isArray(a)||a.length>limit)throw new Error('Lista de análisis inválida.');return a;};
    const itemId=i=>{const id=string(i.id,100);if(allIds.has(id))throw new Error('Identificadores repetidos.');allIds.add(id);return id;};
    const evidence=a=>{arr(a,Math.max(600,src.length));if(!a.length||a.some(id=>typeof id!=='string'||!ids.has(id)))throw new Error('Hay referencias a fuentes inexistentes.');return [...new Set(a)];};
    const concepts=arr(raw.concepts,24).map(c=>({id:itemId(c),key:key(string(c.label,70)),label:c.label,score:1,sourceIds:evidence(c.sourceIds)}));const cids=new Set(concepts.map(c=>c.id));
    const relations=arr(raw.relations,48).map(r=>{if(!cids.has(r.from)||!cids.has(r.to)||r.from===r.to||typeof r.directed!=='boolean')throw new Error('Relación inválida.');return {id:itemId(r),from:r.from,to:r.to,label:string(r.label,100),directed:r.directed,sourceIds:evidence(r.sourceIds)};});
    const events=arr(raw.events).map(e=>({id:itemId(e),date:string(e.date,80),text:string(e.text),sourceIds:evidence(e.sourceIds)}));
    const procedures=arr(raw.procedures,20).map(p=>({id:itemId(p),title:string(p.title,120),steps:arr(p.steps,40).map(s=>{if(!Number.isInteger(s.order)||s.order<1||s.order>100)throw new Error('Orden de pasos inválido.');return {id:itemId(s),order:s.order,text:string(s.text),sourceIds:evidence(s.sourceIds)};})}));
    const tables=arr(raw.tables,12).map(t=>{const headers=arr(t.headers,8).map(h=>string(h,100));if(headers.length<2)throw new Error('Tabla inválida.');return {id:itemId(t),title:string(t.title,120),headers,rows:arr(t.rows,40).map(r=>{if(!Array.isArray(r.cells)||r.cells.length!==headers.length)throw new Error('Fila inválida.');return {cells:r.cells.map(c=>string(c,1000)),sourceIds:evidence(r.sourceIds)};})};});
    const formulas=arr(raw.formulas,40).map(f=>({id:itemId(f),expression:string(f.expression,1000),sourceIds:evidence(f.sourceIds)}));
    return {schemaVersion:1,title:string(raw.title,120),sourceText:text,sources:src,concepts,relations,events,procedures,tables,formulas,preferences,mode:'ai',notes:['Propuesta de IA con fragmentos citados. Comprueba que cada fuente respalda la interpretación.']};
  }
  function available(doc){return [{id:'guide',label:'Ideas',count:doc.concepts.length||doc.sources.length,reason:'Ideas con los fragmentos de tus apuntes que las explican.'},{id:'steps',label:'Paso a paso',count:doc.procedures.reduce((n,p)=>n+p.steps.length,0),reason:'Sigue los pasos en el orden en que aparecen en la clase.'},{id:'timeline',label:'Fechas',count:doc.events.length,reason:'Repasa qué pasó y cuándo.'},{id:'tables',label:'Comparar',count:doc.tables.length,reason:'Mira las diferencias en una tabla.'},{id:'formulas',label:'Fórmulas',count:doc.formulas.length,reason:'Consulta las expresiones junto a tus apuntes.'},{id:'map',label:'Mapa',count:doc.concepts.length,reason:'Las líneas del mapa básico unen ideas que aparecen juntas; no indican causa y efecto.'}];}
  function graph(doc){const nodes=doc.concepts.map((c,i)=>({...c,tier:i===0?0:i<=Math.max(2,Math.round(doc.concepts.length*.3))?1:2,manual:false}));const indexes=new Map(nodes.map((n,i)=>[n.id,i]));return {nodes,edges:doc.relations.map(r=>({...r,a:indexes.get(r.from),b:indexes.get(r.to),w:r.sourceIds.length,weak:false,manual:false})),sentences:doc.sources.map(s=>s.text),sentKeys:doc.sources.map(s=>new Set(nodes.filter(n=>n.sourceIds.includes(s.id)).map(n=>n.key)))};}
  return {analyze,validate,sources,available,graph,norm,key,hash};
});
