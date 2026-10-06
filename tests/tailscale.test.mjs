import test from 'node:test';import assert from 'node:assert/strict';
import {createApp,tailscaleOrigin} from '../server.mjs';
import {connectionPlan} from '../configure-tailscale.mjs';
import http from 'node:http';
const origin='https://study.example.ts.net:8443',host='study.example.ts.net:8443';
const state={BackendState:'Running',Self:{DNSName:'study.example.ts.net.'}};
async function withServer(options,action){const server=createApp({provider:'local',localAI:{status:async()=>({provider:'local',aiConfigured:false,imageConfigured:false,audioConfigured:false}),close:()=>{}},...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await action('http://127.0.0.1:'+server.address().port);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}}
const probe=(url,headers,method='GET')=>new Promise((resolve,reject)=>{const req=http.request(url,{headers,method},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end(method==='POST'?'{}':undefined);});
test('Tailscale permite el proxy HTTPS configurado y bloquea otros hosts y orígenes',async()=>{
 await withServer({appOrigin:origin},async base=>{
  const status=await fetch(base+'/api/status',{headers:{Origin:origin}});assert.equal(status.status,200);assert.equal((await status.json()).executionHost,'study');
  assert.equal(await probe(base,{Host:host,Origin:origin}),200);
  for(const headers of [{Host:'other.example.ts.net:8443'},{Origin:'https://other.example.ts.net:8443'},{Host:host,Origin:'http://'+host},{Origin:'https://evil.invalid','X-Forwarded-Host':host,'X-Forwarded-Proto':'https'}])assert.equal(await probe(base+'/api/analyze',headers,'POST'),403);
  assert.equal(await probe(base+'/.env',{Host:host,Origin:origin}),404);
 });
 await withServer({appOrigin:undefined},async base=>{assert.equal(await probe(base,{Origin:origin}),403);assert.equal(await probe(base,{Host:host}),403);});
});
test('el origen remoto rechaza HTTP, credenciales, rutas y dominios ajenos a Tailscale',()=>{
 for(const value of ['http://study.example.ts.net','https://study.example.ts.net/path','https://user:password@study.example.ts.net','https://study.example.ts.net?x=1','https://evil.invalid'])assert.throws(()=>tailscaleOrigin(value));
 assert.equal(tailscaleOrigin(origin).origin,origin);
});
test('el conector detecta el nombre propio y genera solo un proxy privado para localhost',()=>{
 const plan=connectionPlan(state,{});assert.equal(plan.origin,origin);assert.deepEqual(plan.args,['serve','--bg','--https=8443','http://127.0.0.1:4317']);
 assert.throws(()=>connectionPlan({...state,BackendState:'Stopped'},{}));assert.throws(()=>connectionPlan({...state,Self:{}},{}));
 assert.throws(()=>connectionPlan(state,{},-1));
});
test('el conector no reemplaza servicios existentes ni una publicación con Funnel',()=>{
 const serving={TCP:{8443:{HTTPS:true}},Web:{[host]:{Handlers:{'/':{Proxy:'http://127.0.0.1:4317'}}}}};
 assert.equal(connectionPlan(state,serving).origin,origin);
 assert.throws(()=>connectionPlan(state,{...serving,AllowFunnel:{[host]:true}}),/Funnel/);
 assert.throws(()=>connectionPlan(state,{TCP:{8443:{TCPForward:'localhost:8000'}}}),/Otro servicio/);
 assert.throws(()=>connectionPlan(state,{...serving,Web:{[host]:{Handlers:{'/':{Proxy:'http://127.0.0.1:8000'}}}}}),/Otro servicio/);
 assert.equal(connectionPlan(state,{TCP:{443:{HTTPS:true}},Web:{'study.example.ts.net:443':{Handlers:{'/':{Proxy:'http://127.0.0.1:8000'}}}}}).origin,origin);
});
