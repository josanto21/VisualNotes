import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {createLocalAI} from './local-ai.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));const execute=promisify(execFile);
export const downloads=[
  {name:'llama.cpp',file:'.tools/downloads/llama.zip',url:'https://github.com/ggml-org/llama.cpp/releases/download/b11429/llama-b11429-bin-win-cpu-x64.zip',sha256:'1283323272b04cd07905816a597a0da810918102de958f4ff6f7bbaa70ed2efe'},
  {name:'Whisper',file:'.tools/downloads/whisper.zip',url:'https://github.com/ggml-org/whisper.cpp/releases/download/b5127/whisper-bin-x64.zip',sha256:'f795b2292c7f4dc4caf73ff2cdbd5d7e2d1d3240099fb54a34fa2f7c0b126674'},
  {name:'Qwen para apuntes',file:'models/qwen2.5-1.5b-instruct-q4_k_m.gguf',url:'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',sha256:'6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e'},
  {name:'Whisper base multilingüe',file:'models/ggml-base.bin',url:'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',sha256:'60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe'},
  {name:'Conversor de audio',file:'.tools/ffmpeg/ffmpeg.exe',url:'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64',sha256:'04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00'},
  {name:'Lectura de español',file:'models/tesseract/spa.traineddata',url:'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/spa.traineddata'},
  {name:'Lectura de inglés',file:'models/tesseract/eng.traineddata',url:'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/eng.traineddata'},
  {name:'Licencia Qwen',file:'models/QWEN-LICENSE.txt',url:'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/LICENSE'},
  {name:'Licencia Whisper',file:'models/WHISPER-LICENSE.txt',url:'https://raw.githubusercontent.com/ggml-org/whisper.cpp/v1.9.4/LICENSE'},
  {name:'Licencia Tesseract',file:'models/TESSERACT-LICENSE.txt',url:'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/LICENSE'},
  {name:'Licencia FFmpeg',file:'.tools/ffmpeg/LICENSE.txt',url:'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/win32-x64.LICENSE'},
  {name:'Fuentes de FFmpeg',file:'.tools/ffmpeg/SOURCES.txt',url:'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/win32-x64.README'}
];
export function inside(root,relative){const target=path.resolve(root,relative),base=path.resolve(root)+path.sep;if(!target.startsWith(base))throw new Error('Ruta fuera del proyecto.');return target;}
async function digest(file,algorithm='sha256'){const hash=createHash(algorithm);for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export async function download(item,{root=ROOT,fetchImpl=fetch,log=console.log}={}){
  const file=inside(root,item.file);await fs.mkdir(path.dirname(file),{recursive:true});
  try{if((await fs.stat(file)).size>0&&(!item.sha256||await digest(file)===item.sha256)){log(item.name+': ya descargado.');return;}}catch{}
  log('Descargando '+item.name+'…');const partial=file+'.part';const hash=createHash('sha256');let handle;
  try{
    const response=await fetchImpl(item.url,{signal:AbortSignal.timeout(1800000)});if(!response.ok||!response.body)throw new Error('No se pudo descargar '+item.name+'.');
    handle=await fs.open(partial,'w');let bytes=0,last=0;const total=Number(response.headers.get('content-length'));
    for await(const chunk of response.body){await handle.writeFile(chunk);hash.update(chunk);bytes+=chunk.length;if(Date.now()-last>4000){log(item.name+': '+Math.round(bytes/1048576)+' MB'+(total?' / '+Math.round(total/1048576)+' MB':''));last=Date.now();}}
    await handle.close();handle=null;if(!bytes||item.sha256&&hash.digest('hex')!==item.sha256)throw new Error('La descarga de '+item.name+' no pasó la comprobación. Inténtalo de nuevo.');
    await fs.rename(partial,file);
  }catch(error){if(handle)await handle.close().catch(()=>{});await fs.unlink(partial).catch(()=>{});throw error;}
}
const quote=value=>"'"+value.replace(/'/g,"''")+"'";
async function unpack(zip,destination){
  await fs.mkdir(destination,{recursive:true});const script="$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $vnBase=[IO.Path]::GetFullPath("+quote(destination)+")+[IO.Path]::DirectorySeparatorChar; $vnZip=[IO.Compression.ZipFile]::OpenRead("+quote(zip)+"); try { foreach($vnEntry in $vnZip.Entries){ $vnTarget=[IO.Path]::GetFullPath([IO.Path]::Combine($vnBase,$vnEntry.FullName)); if(-not $vnTarget.StartsWith($vnBase,[StringComparison]::OrdinalIgnoreCase)){throw 'Ruta de archivo inválida'} } } finally { $vnZip.Dispose() }; Expand-Archive -LiteralPath "+quote(zip)+' -DestinationPath '+quote(destination)+' -Force';
  await execute('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:120000});
}
async function find(root,name){for(const entry of await fs.readdir(root,{withFileTypes:true})){const file=path.join(root,entry.name);if(entry.isFile()&&entry.name===name)return file;if(entry.isDirectory()){const nested=await find(file,name);if(nested)return nested;}}return null;}
async function installBinary(archive,directory,exe){const extract=inside(ROOT,'.tools/unpacked/'+directory);await unpack(inside(ROOT,archive),extract);const found=await find(extract,exe);if(!found)throw new Error('El paquete no contiene '+exe);const bin=inside(ROOT,'.tools/'+directory+'-bin');await fs.mkdir(bin,{recursive:true});for(const entry of await fs.readdir(path.dirname(found),{withFileTypes:true}))if(entry.isFile())await fs.copyFile(path.join(path.dirname(found),entry.name),path.join(bin,entry.name));}
async function installOCR(){
  console.log('Instalando lector de imágenes…');const npmRoot=inside(ROOT,'.tools/npm');await fs.mkdir(npmRoot,{recursive:true});
  const metadata=await(await fetch('https://registry.npmjs.org/npm/10.9.2')).json();const integrity=metadata.dist?.integrity;if(!integrity?.startsWith('sha512-'))throw new Error('No se pudo verificar el instalador de dependencias.');
  const archive=inside(ROOT,'.tools/downloads/npm.tgz');await download({name:'Instalador de dependencias',file:'.tools/downloads/npm.tgz',url:metadata.dist.tarball});
  if(Buffer.from(await digest(archive,'sha512'),'hex').toString('base64')!==integrity.slice(7))throw new Error('El instalador de dependencias no pasó la verificación.');
  const tar='C:\\Windows\\System32\\tar.exe';await execute(tar,['-xzf',archive,'-C',npmRoot],{windowsHide:true,timeout:60000});
  const ocr=inside(ROOT,'.tools/ocr');await fs.mkdir(ocr,{recursive:true});await fs.writeFile(path.join(ocr,'package.json'),JSON.stringify({private:true,dependencies:{'tesseract.js':'6.0.1'}}));
  await execute(process.execPath,[path.join(npmRoot,'package/bin/npm-cli.js'),'install','--ignore-scripts','--no-audit','--no-fund'],{cwd:ocr,windowsHide:true,timeout:300000,maxBuffer:4*1024*1024,env:{...process.env,PATH:path.dirname(process.execPath)+';'+(process.env.PATH||'')}});
}
export async function install(){
  if(process.platform!=='win32'||process.arch!=='x64')throw new Error('Este instalador está preparado para Windows de 64 bits.');
  console.log('VisualNotes · IA local gratis\nDescarga inicial aproximada: 1,4 GB. No necesita clave ni permisos de administrador.');
  for(const item of downloads)await download(item);
  await installBinary('.tools/downloads/llama.zip','llama','llama-server.exe');await installBinary('.tools/downloads/whisper.zip','whisper','whisper-cli.exe');await installOCR();
  let config='';try{config=await fs.readFile(path.join(ROOT,'.env'),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  config=/^\s*AI_PROVIDER\s*=.*$/m.test(config)?config.replace(/^\s*AI_PROVIDER\s*=.*$/m,'AI_PROVIDER=local'):config+'\nAI_PROVIDER=local\n';await fs.writeFile(path.join(ROOT,'.env'),config);
  const state=await createLocalAI({root:ROOT}).status();if(!state.aiConfigured||!state.imageConfigured||!state.audioConfigured)throw new Error('La instalación quedó incompleta. Ejecuta el instalador de nuevo.');
  // Asset checks are separate from inference checks. Do not label untested engines as working.
  await fs.writeFile(inside(ROOT,'.tools/installation.json'),JSON.stringify({installedAt:new Date().toISOString(),assetsVerified:true,inferenceVerified:false,downloads:downloads.map(({name,url,sha256})=>({name,url,sha256}))},null,2));
  console.log('Archivos instalados. Abre Iniciar.cmd y prueba tu primera clase. La primera carga puede tardar; revisa el resultado generado.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))install().catch(error=>{console.error('No se completó la instalación: '+error.message+'\nComprueba tu conexión y ejecuta Instalar-IA-gratis.cmd otra vez.');process.exitCode=1;});
