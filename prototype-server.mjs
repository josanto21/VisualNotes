import {execFile} from 'node:child_process';
import {createApp} from './server.mjs';
const base='http://127.0.0.1:4318';
const open=()=>{if(process.platform==='win32')execFile('explorer.exe',[base],{windowsHide:true},()=>{});};
const server=createApp({provider:'openai',apiKey:null,model:null,visionModel:null,audioModel:null,appOrigin:''});
server.listen(4318,'127.0.0.1',()=>{console.log('VisualNotes · Prototipo básico\nAbre '+base+'\nMantén esta ventana abierta. Para detenerlo pulsa Ctrl+C.');open();});
server.on('error',async error=>{
 if(error.code==='EADDRINUSE'){
  try{const response=await fetch(base,{signal:AbortSignal.timeout(2000)});const status=await fetch(base+'/api/status',{signal:AbortSignal.timeout(2000)}).then(r=>r.json());if(response.ok&&(await response.text()).includes('VisualNotes · Prototipo')&&!status.aiConfigured&&!status.imageConfigured&&!status.audioConfigured){console.log('El prototipo ya está abierto en '+base);open();return;}}catch{}
  console.error('El puerto 4318 está ocupado por otro servicio. Cierra ese servicio y vuelve a abrir Iniciar.cmd.');
 }else console.error('No se pudo iniciar VisualNotes: '+error.message);
 process.exitCode=1;
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
