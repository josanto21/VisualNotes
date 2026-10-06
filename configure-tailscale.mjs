import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {loadConfig} from './config.mjs';
import {tailscaleOrigin} from './server.mjs';
const execute=promisify(execFile),root=path.dirname(fileURLToPath(import.meta.url));

export function connectionPlan(state,serve={},port=4317){
  if(state.BackendState!=='Running')throw new Error('Conecta Tailscale en este equipo y vuelve a intentarlo.');
  const host=state.Self?.DNSName?.replace(/\.$/,'');
  if(!host)throw new Error('Activa MagicDNS en Tailscale para obtener el nombre de este equipo.');
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT debe ser un puerto válido.');
  const origin=tailscaleOrigin('https://'+host+':8443'),target='http://127.0.0.1:'+port;
  if(Object.entries(serve.AllowFunnel||{}).some(([key,on])=>on&&key.endsWith(':8443')))throw new Error('El puerto 8443 ya está publicado mediante Funnel. Elige otra configuración; no se modificó.');
  const current=serve.Web?.[origin.host]?.Handlers?.['/'];
  if(serve.TCP?.['8443']||Object.keys(serve.Web||{}).some(key=>key.endsWith(':8443'))){
    if(!serve.TCP?.['8443']?.HTTPS||current?.Proxy!==target)throw new Error('Otro servicio ya utiliza Tailscale en el puerto 8443. No se modificó ese servicio.');
  }
  return {origin:origin.origin,target,args:['serve','--bg','--https=8443',target]};
}

export async function configure(){
  if(process.platform!=='win32')throw new Error('Este acceso directo está preparado para Windows.');
  const tailscale=path.join(process.env.ProgramFiles||'C:\\Program Files','Tailscale','tailscale.exe');
  await fs.access(tailscale).catch(()=>{throw new Error('Instala Tailscale y conecta este equipo primero.');});
  const env={...process.env};await loadConfig(path.join(root,'.env'),env);
  const options={windowsHide:true,timeout:15000,maxBuffer:2*1024*1024};
  const state=JSON.parse((await execute(tailscale,['status','--json'],options)).stdout);
  const serve=JSON.parse((await execute(tailscale,['serve','status','--json'],options)).stdout);
  const plan=connectionPlan(state,serve,Number(env.PORT)||4317);
  if(process.env.APP_ORIGIN&&process.env.APP_ORIGIN!==plan.origin)throw new Error('Una variable de entorno APP_ORIGIN apunta a otro equipo. Corrígela antes de continuar.');
  if(process.env.AI_PROVIDER&&process.env.AI_PROVIDER!=='local')throw new Error('La variable de entorno AI_PROVIDER debe ser local para ejecutar los modelos en este equipo.');
  console.log('Conectando este equipo: '+plan.origin+'\nSi Tailscale muestra un enlace para habilitar HTTPS, ábrelo y completa ese paso.');
  await new Promise((resolve,reject)=>{
    const child=spawn(tailscale,plan.args,{windowsHide:true,stdio:'inherit'});
    const timeout=setTimeout(()=>{child.kill();reject(new Error('Tailscale no terminó. Completa la habilitación de HTTPS y ejecuta este archivo otra vez.'));},180000);
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('exit',code=>{clearTimeout(timeout);code===0?resolve():reject(new Error('Tailscale no pudo publicar el servicio privado. Revisa el mensaje anterior.'));});
  });
  let content='';try{content=await fs.readFile(path.join(root,'.env'),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  for(const [key,value] of Object.entries({APP_ORIGIN:plan.origin,AI_PROVIDER:'local'})){
    const pattern=new RegExp('^\\s*'+key+'\\s*=.*$','m');content=pattern.test(content)?content.replace(pattern,key+'='+value):content+'\n'+key+'='+value+'\n';
  }
  await fs.writeFile(path.join(root,'.env'),content);
  console.log('\nConexión preparada. Abre Iniciar.cmd EN ESTE EQUIPO y mantén su ventana abierta.\nDesde tu otro equipo entra en: '+plan.origin+'\nSi el servidor estaba abierto, ciérralo y vuelve a abrir Iniciar.cmd.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))configure().catch(error=>{console.error('No se completó la conexión: '+error.message);process.exitCode=1;});
