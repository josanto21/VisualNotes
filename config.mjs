import fs from 'node:fs/promises';
// Local configuration is never served. Existing environment takes precedence.
export async function loadConfig(file,env=process.env){
  let content;try{content=await fs.readFile(file,'utf8');}catch(error){if(error.code==='ENOENT')return;throw error;}
  const allowed=new Set(['APP_ORIGIN','AI_PROVIDER','OPENAI_API_KEY','OPENAI_MODEL','OPENAI_VISION_MODEL','OPENAI_TRANSCRIBE_MODEL','PORT']);
  for(const line of content.split(/\r?\n/)){
    const match=line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(!match||!allowed.has(match[1])||env[match[1]]!==undefined)continue;
    let value=match[2];if(value.startsWith('"')&&value.endsWith('"')||value.startsWith("'")&&value.endsWith("'"))value=value.slice(1,-1);else value=value.replace(/\s+#.*$/,'').trim();
    if(value)env[match[1]]=value;
  }
}
