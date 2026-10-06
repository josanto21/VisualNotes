import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=name=>fs.readFile(path.join(root,name),'utf8');
const [html,styles,adaptive,friendly,engine,app,portable]=await Promise.all(['index.html','styles.css','adaptive.css','friendly.css','engine.js','app.js','portable.js'].map(read));
const assets={html,css:styles+'\n'+adaptive+'\n'+friendly,engine,app,portable};
await fs.writeFile(path.join(root,'portable-assets.js'),'window.VisualNotesPortableAssets='+JSON.stringify(assets).replace(/</g,'\\u003c')+';\n');
console.log('Recursos de exportación completa actualizados.');
