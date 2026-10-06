import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import net from 'node:net';import {spawn,execFile} from 'node:child_process';import {promisify} from 'node:util';import {createRequire} from 'node:module';import {randomBytes} from 'node:crypto';import {InputError} from './media.mjs';
const execute=promisify(execFile);const require=createRequire(import.meta.url);
export const LOCAL_TEXT_LIMIT=12000;
export function localPaths(root){return {llama:path.join(root,'.tools/llama-bin/llama-server.exe'),qwen:path.join(root,'models/qwen2.5-1.5b-instruct-q4_k_m.gguf'),whisper:path.join(root,'.tools/whisper-bin/whisper-cli.exe'),audio:path.join(root,'models/ggml-base.bin'),ffmpeg:path.join(root,'.tools/ffmpeg/ffmpeg.exe'),ocr:path.join(root,'.tools/ocr/node_modules/tesseract.js/src/index.js'),langs:path.join(root,'models/tesseract'),temp:path.join(root,'.local-work')};}
const exists=async file=>{try{return (await fs.stat(file)).isFile();}catch{return false;}};
export function createLocalAI({root,fetchImpl=globalThis.fetch,spawnImpl=spawn,executeImpl=execute,loadOCR=()=>require(path.join(root,'.tools/ocr/node_modules/tesseract.js'))}={}){
  const files=localPaths(root);let child=null,endpoint=null,starting=null,idleTimer=null,closed=false;
  const token=randomBytes(24).toString('hex');const threads=String(Math.min(4,os.availableParallelism()));
  async function status(){const [llama,qwen,whisper,audio,ffmpeg,ocr,spa,eng]=await Promise.all([files.llama,files.qwen,files.whisper,files.audio,files.ffmpeg,files.ocr,path.join(files.langs,'spa.traineddata'),path.join(files.langs,'eng.traineddata')].map(exists));return {aiConfigured:llama&&qwen,imageConfigured:ocr&&spa&&eng&&ffmpeg,audioConfigured:whisper&&audio&&ffmpeg,provider:'local',textModel:'Qwen2.5 1.5B',imageModel:'Tesseract',audioModel:'Whisper base',textLimit:LOCAL_TEXT_LIMIT};}
  function stop(){clearTimeout(idleTimer);idleTimer=null;if(child)child.kill();child=null;endpoint=null;}
  function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  async function freePort(){const probe=net.createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));return port;}
  async function ensure(){
    if(closed)throw new InputError('El servicio local se está cerrando.',503);clearTimeout(idleTimer);if(endpoint&&child)return endpoint;if(starting)return starting;
    starting=(async()=>{
      if(!(await status()).aiConfigured)throw new InputError('Falta descargar Qwen. Abre Instalar-IA-gratis.cmd y vuelve a intentarlo.',503);
      const port=await freePort();const own=spawnImpl(files.llama,['-m',files.qwen,'--host','127.0.0.1','--port',String(port),'--api-key',token,'--alias','visualnotes-local','-c','8192','-t',threads,'-ngl','0','--parallel','1','--n-predict','3000'],{cwd:path.dirname(files.llama),windowsHide:true,stdio:'ignore'});child=own;
      let exited=false;own.once('exit',()=>{exited=true;if(child===own){child=null;endpoint=null;}});own.once('error',()=>{exited=true;});
      const base='http://127.0.0.1:'+port;const deadline=Date.now()+90000;
      while(Date.now()<deadline&&!exited&&!closed){try{const response=await fetchImpl(base+'/health',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(1500)});if(response.ok){endpoint=base;return base;}}catch{}await sleep(500);}
      stop();throw new InputError('No se pudo iniciar Qwen. Comprueba la instalación y la memoria disponible.',503);
    })();try{return await starting;}finally{starting=null;}
  }
  async function analyze({text,preferences,fragments,schema,instructions,signal}){
    if(text.length>LOCAL_TEXT_LIMIT)throw new InputError('La IA ligera admite hasta 12.000 caracteres por clase. Divide estos apuntes o usa el modo básico.',413);
    const base=await ensure();
    try{
      const timeout=AbortSignal.timeout(240000);const response=await fetchImpl(base+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},signal:signal?AbortSignal.any([signal,timeout]):timeout,body:JSON.stringify({model:'visualnotes-local',stream:false,temperature:0,max_tokens:3000,response_format:{type:'json_object',schema},messages:[{role:'system',content:instructions+' Prioriza una respuesta compacta: hasta 12 conceptos y 20 relaciones. Nunca excedas la cantidad de ideas solicitada. Usa solo los identificadores de fragmentos entregados.'},{role:'user',content:JSON.stringify({preferences,fragments})}]})});
      if(!response.ok)throw new InputError('Qwen no pudo organizar estos apuntes. Prueba una clase más corta.',502);
      const data=await response.json();const choice=data.choices?.[0];if(choice?.finish_reason!=='stop')throw new InputError('La respuesta local quedó incompleta. Prueba con menos contenido.',502);
      try{return JSON.parse(choice.message.content);}catch{throw new InputError('La respuesta local no tiene un formato válido. Tus apuntes se conservaron.',502);}
    }finally{if(signal?.aborted)stop();else{idleTimer=setTimeout(stop,60000);idleTimer.unref();}}
  }
  async function extract({kind,bytes,name,signal}){
    stop();if(closed)throw new InputError('El servicio local se está cerrando.',503);const ready=await status();if(!(kind==='image'?ready.imageConfigured:ready.audioConfigured))throw new InputError('Falta instalar la lectura local. Abre Instalar-IA-gratis.cmd y vuelve a intentarlo.',503);
    let text;
    if(kind==='image'){
      let worker,abortListener,dir;try{
        if(path.extname(name).toLowerCase()==='.webp'){
          await fs.mkdir(files.temp,{recursive:true});dir=await fs.mkdtemp(path.join(files.temp,'image-'));const original=path.join(dir,'input.webp'),converted=path.join(dir,'converted.png');await fs.writeFile(original,bytes);
          await executeImpl(files.ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-protocol_whitelist','file,pipe','-i',original,'-frames:v','1','-vf','scale=2400:2400:force_original_aspect_ratio=decrease',converted],{windowsHide:true,timeout:30000,maxBuffer:1024*1024,signal});bytes=await fs.readFile(converted);
        }
        const {createWorker}=loadOCR();worker=await createWorker('spa+eng',1,{langPath:files.langs,gzip:false,cacheMethod:'none'});
        const deadline=signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000);
        const cancelled=new Promise((_,reject)=>{abortListener=()=>reject(deadline.reason);if(deadline.aborted)abortListener();else deadline.addEventListener('abort',abortListener,{once:true});});
        try{const result=await Promise.race([worker.recognize(bytes),cancelled]);text=result.data.text;}finally{deadline.removeEventListener('abort',abortListener);}
      }finally{if(worker)await worker.terminate();if(dir){for(const file of ['input.webp','converted.png'])await fs.unlink(path.join(dir,file)).catch(()=>{});await fs.rmdir(dir).catch(()=>{});}}
    }else{
      await fs.mkdir(files.temp,{recursive:true});const dir=await fs.mkdtemp(path.join(files.temp,'audio-'));
      const extension=path.extname(name).toLowerCase();const input=path.join(dir,'input'+extension),wave=path.join(dir,'mono.wav'),output=path.join(dir,'transcript');
      try{
        await fs.writeFile(input,bytes);
        // No shell and no remote input. Decode at most 20 minutes; detect overflow without silently truncating.
        await executeImpl(files.ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-protocol_whitelist','file,pipe','-i',input,'-t','1201','-vn','-ar','16000','-ac','1','-c:a','pcm_s16le',wave],{windowsHide:true,timeout:60000,maxBuffer:1024*1024,signal});
        if((await fs.stat(wave)).size>1200*32000+4096)throw new InputError('La IA local admite audios de hasta 20 minutos. Divide la grabación en partes.',413);
        await executeImpl(files.whisper,['-m',files.audio,'-f',wave,'-l','auto','-t',threads,'-ng','-otxt','-of',output],{windowsHide:true,timeout:480000,maxBuffer:4*1024*1024,signal});
        text=await fs.readFile(output+'.txt','utf8');
      }finally{
        // Remove only this request's known files, then the empty request folder. No recursive deletion.
        for(const file of [input,wave,output+'.txt'])await fs.unlink(file).catch(()=>{});await fs.rmdir(dir).catch(()=>{});
      }
    }
    if(typeof text!=='string'||!text.trim())throw new InputError('No se encontró texto o voz legible. Prueba un archivo más claro.',422);
    if(text.length>60000)throw new InputError('El texto supera 60.000 caracteres. Divide el archivo en partes.',413);
    return {text:text.trim(),kind,fileName:name};
  }
  function close(){closed=true;stop();}
  return {status,analyze,extract,close};
}
