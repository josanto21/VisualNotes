import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import E from '../engine.js';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const lock=app.match(/  function lockInput\(lock\)\{[^\n]+/)[0];
const generate=app.slice(app.indexOf('  async function generate(){'),app.indexOf('  function markRating(){'));
test('preparar material sin el panel de IA termina y permite generar otra clase',async()=>{
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],{value:'',disabled:false,style:{},textContent:'',focus(){}}]));
 const ctx={E,$:id=>elements.get(id)||null,document:{querySelectorAll:()=>[]},busy:false,inputSources:[],undoStack:[],redoStack:[],window:{innerWidth:1200},refreshMedia(){},preferences:()=>({max:12}),setMsg(m){ctx.message=m},markRating(){},mapResult:doc=>({nodes:doc.concepts}),buildFrom(){},renderAdaptive(){},updateHistory(){}};
 vm.createContext(ctx);vm.runInContext(lock+'\n'+generate,ctx);
 for(const text of ['Un constructor es un método que prepara un objeto.','En 1821 Panamá se independizó de España.','Para crear una clase:\n1. Define los atributos.\n2. Añade el constructor.']){
 elements.get('txt').value=text;elements.get('analysisMode').value='local';
 await ctx.generate();assert.equal(ctx.busy,false);assert.equal(elements.get('go').disabled,false);assert.equal(ctx.currentDoc.sourceText,text);assert.match(ctx.message,/Listo/);assert.ok(ctx.currentDoc.concepts.length);
 }
});
test('todos los controles referenciados directamente existen en el HTML',()=>{
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 const missing=[...app.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]).filter(id=>!ids.has(id));
 assert.deepEqual([...new Set(missing)],[]);
});
