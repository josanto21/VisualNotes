(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VisualNotesPortable=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function json(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
  function script(text){return text.replace(/<\/script/gi,'<\\/script');}
  function build(record,assets){
    if(!record||!record.analysis||!assets||!assets.html||!assets.engine||!assets.app||!assets.portable)throw new Error('No se pudo preparar la exportación completa.');
    const payload={format:'visualnotes-backup',schemaVersion:1,exportKind:'portable-class',records:[record]};
    let html=assets.html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi,'').replace(/<script\b[^>]*src="[^\"]+"[^>]*><\/script>/gi,'');
    html=html.replace(/<title>[\s\S]*?<\/title>/i,()=>'<title>'+String(record.title).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+' · VisualNotes</title>');
    html=html.replace('</head>','<style>'+assets.css.replace(/<\/style/gi,'<\\/style')+'</style></head>');
    const code='<script id="visualnotes-export-data" type="application/json">'+json(payload)+'</script>'+ '<script>window.VisualNotesPortableAssets='+json(assets)+';</script>'+ '<script>'+script(assets.engine)+'</script>'+ '<script>'+script(assets.portable)+'</script>'+ '<script>'+script(assets.app)+'</script>';
    return html.replace('</body>',()=>code+'</body>');
  }
  function parse(text){let data;try{data=JSON.parse(text);}catch{const marker=text.match(/<script\b[^>]*id=["']visualnotes-export-data["'][^>]*>([\s\S]*?)<\/script>/i);if(!marker)throw new Error('Este archivo no contiene una clase exportada de VisualNotes.');try{data=JSON.parse(marker[1]);}catch{throw new Error('Los datos de la clase exportada no son válidos.');}}
    if(!Array.isArray(data)&&(!data||data.format!=='visualnotes-backup'||data.schemaVersion!==1))throw new Error('El archivo no es un respaldo compatible de VisualNotes.');return Array.isArray(data)?data:data.records;
  }
  return {build,parse};
});
