(function(){
  var SAMPLE = "Una red neuronal es un modelo de aprendizaje automático inspirado en el cerebro. Está formada por capas de neuronas artificiales conectadas entre sí. Cada neurona recibe entradas, las multiplica por pesos y aplica una función de activación. Durante el entrenamiento, la red ajusta los pesos para reducir el error entre su predicción y el valor real. Este ajuste se calcula con el algoritmo de retropropagación y un método de optimización como el descenso del gradiente. Si el entrenamiento es excesivo, la red memoriza los datos y sufre sobreajuste. Para evitarlo se usan datos de validación y técnicas de regularización. Las redes profundas tienen muchas capas y aprenden representaciones cada vez más abstractas de los datos.";

  var STOP = new Set(("de la que el en y a los del se las por un para con no una su al lo como mas pero sus le ya o este si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mi antes algunos unos yo otro otras otra tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mis tu te ti tus ellas es son ser fue era eran sido estan estaba puede pueden cada tipo forma manera partir mediante segun asi dicho misma mismo mismos cuales ejemplo parte tiene tienen tener hace hacen hacer permite permiten uso usa usan debe deben cuya cuyo cuyas luego entonces despues aunque ademas esos esas aquel aquella hacia tras vez cualquier todas muchas varios varias"
    ).split(" "));

  var $ = function(id){return document.getElementById(id)};
  var svg=$("map"), gV=$("gV"), gE=$("gE"), gN=$("gN"), NS="http://www.w3.org/2000/svg";
  var W=800,H=520,nodes=[],edges=[],sentences=[],sentKeys=[],selected=-1,linking=false,alpha=0,raf=0,rating="",curText="";
  var view={k:1,x:0,y:0};
  var E=window.VisualNotesEngine,currentDoc=null,activeView="map",dirty=false,busy=false,undoStack=[],redoStack=[],pendingAction=null,storageFailed=false;
  var inputKind='text',mediaFile=null,previewURL=null,mediaController=null,mediaBusy=false;
  var aiReady={aiConfigured:false,imageConfigured:false,audioConfigured:false,provider:'local'},inputSources=[],analyzedInputs=[];
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function norm(w){return w.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
  function stem(w){
    var s=norm(w);
    if(s.length>5 && s.slice(-2)==="es") s=s.slice(0,-2);
    else if(s.length>4 && s.slice(-1)==="s") s=s.slice(0,-1);
    return s;
  }
  function pretty(w){
    if(w.length<=5 && w===w.toUpperCase() && /[A-Z]/.test(w)) return w;
    w=w.toLowerCase(); return w.charAt(0).toUpperCase()+w.slice(1);
  }
  function keyOf(name){
    var w=name.match(/[\p{L}\p{N}]+/gu)||[];
    return w.length===1 ? stem(w[0]) : "m:"+norm(name);
  }
  function mkNode(label,key,tier,score,manual){
    return {id:"c-"+E.hash(key),sourceIds:[],key:key,label:label,score:score||0,tier:tier,manual:!!manual,
      w:label.length*7.2+28,h:tier===0?38:32,vx:0,vy:0,x:0,y:0,fixed:false};
  }

  function preferences(){return {title:$("classTitle").value.trim(),subject:$("subject").value.trim(),goal:$("goal").value,detail:$("detailLevel").value,max:Number($("max").value)}}
  function extract(text,max){return mapResult(E.analyze(text,Object.assign(preferences(),{max:max})))}
  function mapResult(doc){var graph=E.graph(doc);graph.nodes=graph.nodes.map(function(c){var n=mkNode(c.label,c.key,c.tier,c.score,false);n.id=c.id;n.sourceIds=c.sourceIds;return n});return graph;}

  /* ---------- Vista: zoom y desplazamiento ---------- */
  function size(){
    var r=svg.getBoundingClientRect(); W=r.width||800; H=r.height||520;
    svg.setAttribute("viewBox","0 0 "+W+" "+H);
  }
  function applyView(){gV.setAttribute("transform","translate("+view.x.toFixed(1)+","+view.y.toFixed(1)+") scale("+view.k.toFixed(3)+")")}
  function zoomAt(cx,cy,f){
    var k=Math.max(0.3,Math.min(3,view.k*f)); f=k/view.k;
    view.x=cx-(cx-view.x)*f; view.y=cy-(cy-view.y)*f; view.k=k; applyView();
  }
  function fit(){
    if(!nodes.length){view={k:1,x:0,y:0};applyView();return}
    var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    nodes.forEach(function(n){x0=Math.min(x0,n.x-n.w/2);x1=Math.max(x1,n.x+n.w/2);y0=Math.min(y0,n.y-n.h/2);y1=Math.max(y1,n.y+n.h/2)});
    var bw=Math.max(1,x1-x0), bh=Math.max(1,y1-y0);
    var k=Math.max(0.3,Math.min(2,(W-48)/bw,(H-48)/bh));
    view.k=k; view.x=(W-bw*k)/2-x0*k; view.y=(H-bh*k)/2-y0*k; applyView();
  }
  svg.addEventListener("wheel",function(ev){
    ev.preventDefault();
    var r=svg.getBoundingClientRect();
    zoomAt(ev.clientX-r.left,ev.clientY-r.top,Math.exp(-ev.deltaY*0.0016));
  },{passive:false});
  var ptrs=new Map(), pinchD=0, panDist=0;
  function dist(){var a=Array.from(ptrs.values());return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}
  svg.addEventListener("pointerdown",function(ev){
    svg.setPointerCapture(ev.pointerId);
    ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    panDist=ptrs.size===1?0:99;
    if(ptrs.size===2) pinchD=dist();
  });
  svg.addEventListener("pointermove",function(ev){
    var p=ptrs.get(ev.pointerId); if(!p) return;
    var dx=ev.clientX-p.x, dy=ev.clientY-p.y;
    p.x=ev.clientX; p.y=ev.clientY;
    if(ptrs.size===1){panDist+=Math.abs(dx)+Math.abs(dy);view.x+=dx;view.y+=dy;applyView()}
    else if(ptrs.size===2){
      var a=Array.from(ptrs.values()), d=dist(), r=svg.getBoundingClientRect();
      if(pinchD) zoomAt((a[0].x+a[1].x)/2-r.left,(a[0].y+a[1].y)/2-r.top,d/pinchD);
      pinchD=d;
    }
  });
  function endPtr(ev){ptrs.delete(ev.pointerId);pinchD=0}
  svg.addEventListener("pointerup",function(ev){
    var tap=ptrs.size===1 && ptrs.has(ev.pointerId) && panDist<5;
    endPtr(ev);
    if(tap){
      if(linking){stopLink();setMsg("Conexión cancelada.")}
      else if(selected>=0) clearSelection();
    }
  });
  svg.addEventListener("pointercancel",endPtr);
  $("zin").addEventListener("click",function(){zoomAt(W/2,H/2,1.25)});
  $("zout").addEventListener("click",function(){zoomAt(W/2,H/2,0.8)});
  $("zfit").addEventListener("click",fit);

  /* ---------- Render ---------- */
  function el(n,attrs){var e=document.createElementNS(NS,n);for(var k in attrs)e.setAttribute(k,attrs[k]);return e}

  function addEdgeEl(e){
    e.id=e.id||"r-"+E.hash(nodes[e.a].id+nodes[e.b].id);e.sourceIds=e.sourceIds||[];
    e.el=el("g",{"class":"edge-wrapper"});
    e.line=el("line",{"class":"edge"+(e.weak?" weak":"")+(e.manual?" manual":""),"stroke-width":(1+Math.min(e.w,4)*0.9).toFixed(1)});
    if(e.directed)e.line.setAttribute("marker-end","url(#arrow)");e.el.appendChild(e.line);
    if(e.label&&e.label!=="Coinciden en el texto"){e.labelEl=el("text",{"class":"edge-label","text-anchor":"middle"});e.labelEl.textContent=e.label;e.el.appendChild(e.labelEl);}
    gE.appendChild(e.el);
  }
  function addNodeEl(n){
    var g=el("g",{"class":"node t"+n.tier+(n.manual?" manual":""),tabindex:0,role:"button","aria-label":"Concepto "+n.label});
    g.appendChild(el("rect",{x:-n.w/2,y:-n.h/2,width:n.w,height:n.h,rx:n.h/2}));
    var t=el("text",{}); t.textContent=n.label; g.appendChild(t);
    g.addEventListener("keydown",function(ev){if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();activate(n)}});
    drag(g,n);
    n.el=g; gN.appendChild(g);
  }

  function buildFrom(res,keep){
    cancelAnimationFrame(raf);
    gE.textContent=""; gN.textContent="";
    size(); view={k:1,x:0,y:0}; applyView();
    nodes=res.nodes; edges=res.edges; sentences=res.sentences; sentKeys=res.sentKeys;
    linking=false; selected=-1;
    if(!keep) nodes.forEach(function(n,i){
      var ang=i*2.4, rad=i===0?0:60+i*16;
      n.x=W/2+Math.cos(ang)*rad*1.4; n.y=H/2+Math.sin(ang)*rad; n.vx=n.vy=0; n.fixed=false;
    });
    edges.forEach(addEdgeEl);
    nodes.forEach(addNodeEl);
    $("empty").style.display="none";
    $("edit").style.display="block"; $("fb").style.display="flex";
    if(keep){ alpha=0; draw(); }
    else { alpha=1; if(reduce){for(var k=0;k<320;k++)tick();draw()} else loop(); }
    select(0);
  }

  function tick(){
    var cx=W/2, cy=H/2, i, j, a, b;
    for(i=0;i<nodes.length;i++){
      a=nodes[i];
      for(j=i+1;j<nodes.length;j++){
        b=nodes[j];
        var dx=b.x-a.x, dy=(b.y-a.y)*1.25, d2=dx*dx+dy*dy+0.5, d=Math.sqrt(d2), f=5200/d2*alpha;
        var fx=dx/d*f, fy=dy/d*f;
        if(!a.fixed){a.vx-=fx;a.vy-=fy}
        if(!b.fixed){b.vx+=fx;b.vy+=fy}
      }
    }
    edges.forEach(function(e){
      var p=nodes[e.a], q=nodes[e.b], dx=q.x-p.x, dy=q.y-p.y, d=Math.sqrt(dx*dx+dy*dy)+0.01;
      var target=(e.weak?190:150)-Math.min(e.w,4)*14, f=(d-target)*0.025*alpha;
      var fx=dx/d*f, fy=dy/d*f;
      if(!p.fixed){p.vx+=fx;p.vy+=fy}
      if(!q.fixed){q.vx-=fx;q.vy-=fy}
    });
    nodes.forEach(function(n,k){
      if(n.fixed) return;
      var g=k===0?0.06:0.006;
      n.vx+=(cx-n.x)*g*alpha; n.vy+=(cy-n.y)*g*alpha;
      n.vx*=0.78; n.vy*=0.78;
      n.x+=n.vx; n.y+=n.vy;
    });
    for(var pass=0;pass<2;pass++){
      for(i=0;i<nodes.length;i++)for(j=i+1;j<nodes.length;j++){
        a=nodes[i]; b=nodes[j];
        var ddx=b.x-a.x, ddy=b.y-a.y;
        var ox=(a.w+b.w)/2+12-Math.abs(ddx), oy=(a.h+b.h)/2+10-Math.abs(ddy);
        if(ox>0 && oy>0){
          if(ox<oy){var s=ddx>=0?1:-1; if(!a.fixed)a.x-=s*ox/2; if(!b.fixed)b.x+=s*ox/2;}
          else{var s2=ddy>=0?1:-1; if(!a.fixed)a.y-=s2*oy/2; if(!b.fixed)b.y+=s2*oy/2;}
        }
      }
    }
    nodes.forEach(function(n){
      if(n.fixed) return;
      n.x=Math.max(n.w/2+6,Math.min(W-n.w/2-6,n.x));
      n.y=Math.max(n.h/2+6,Math.min(H-n.h/2-6,n.y));
    });
    alpha*=0.988;
  }
  function draw(){
    edges.forEach(function(e){
      var p=nodes[e.a],q=nodes[e.b];
      e.line.setAttribute("x1",p.x);e.line.setAttribute("y1",p.y);e.line.setAttribute("x2",q.x);e.line.setAttribute("y2",q.y);
      if(e.labelEl){e.labelEl.setAttribute("x",(p.x+q.x)/2);e.labelEl.setAttribute("y",(p.y+q.y)/2-7);}
    });
    nodes.forEach(function(n){n.el.setAttribute("transform","translate("+n.x.toFixed(1)+","+n.y.toFixed(1)+")")});
  }
  function loop(){ tick(); draw(); if(alpha>0.015) raf=requestAnimationFrame(loop); }
  function reheat(a){
    alpha=Math.max(alpha,a||0.4);
    if(reduce){for(var k=0;k<150;k++)tick();draw()}
    else{cancelAnimationFrame(raf);loop()}
  }

  function drag(g,n){
    var moved=false;
    function pt(ev){var p=svg.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;return p.matrixTransform(gV.getScreenCTM().inverse())}
    g.addEventListener("pointerdown",function(ev){
      ev.stopPropagation();
      g.setPointerCapture(ev.pointerId); var dragBefore=snapshot(); n.fixed=true; moved=false;
      var move=function(e2){var p=pt(e2);n.x=p.x;n.y=p.y;moved=true;reheat(0.35)};
      var up=function(){g.removeEventListener("pointermove",move);g.removeEventListener("pointerup",up);g.removeEventListener("pointercancel",up);n.fixed=false;if(moved){undoStack.push(dragBefore);if(undoStack.length>40)undoStack.shift();redoStack=[];markDirty();}else activate(n)};
      g.addEventListener("pointermove",move);g.addEventListener("pointerup",up);g.addEventListener("pointercancel",up);
    });
  }

  function neighbors(i){
    var s=new Set();
    edges.forEach(function(e){ if(e.a===i)s.add(e.b); else if(e.b===i)s.add(e.a); });
    return s;
  }
  function edgeBetween(a,b){
    for(var i=0;i<edges.length;i++){var e=edges[i]; if((e.a===a&&e.b===b)||(e.a===b&&e.b===a)) return e}
    return null;
  }
  function setMsg(t){$("emsg").textContent=t||""}
  function setEditEnabled(on){["eren","edel","elink","eunlink","eclick","lk"].forEach(function(id){$(id).disabled=!on})}
  function stopLink(){
    linking=false;
    if(selected>=0&&nodes[selected]) nodes[selected].el.classList.remove("linking");
    $("eclick").textContent="Unir tocando otra idea";
  }
  function startLink(){
    linking=true; nodes[selected].el.classList.add("linking");
    $("eclick").textContent="Cancelar conexión";
    setMsg("Toca el concepto destino. Esc o tocar el fondo cancela.");
  }
  function finishLink(t){
    var s=selected; stopLink();
    if(t===s){setMsg("Conexión cancelada.");return}
    if(edgeBetween(s,t)){setMsg("Ya están conectados.");return}
    remember();var e={a:s,b:t,w:1,manual:true,label:"Conexión manual",directed:false}; edges.push(e); addEdgeEl(e); draw(); reheat(0.3);
    select(s);markDirty(); setMsg("«"+nodes[s].label+"» conectado con «"+nodes[t].label+"».");
  }
  function activate(n){
    var i=nodes.indexOf(n);
    if(linking&&selected>=0) finishLink(i); else select(i);
  }
  function clearSelection(){
    stopLink(); selected=-1;
    nodes.forEach(function(n){n.el.classList.remove("sel","dim")});
    edges.forEach(function(e){e.el.classList.remove("dim")});
    $("editH").textContent="Editar mapa"; $("lk").textContent=""; setEditEnabled(false);
    var d=$("detail"); d.textContent="";
    var q=document.createElement("p"); q.className="hint";
    q.textContent="Toca un concepto para ver en qué oraciones de la clase se menciona.";
    d.appendChild(q);
  }

  function select(i){
    if(i<0||i>=nodes.length) return;
    stopLink(); selected=i; setEditEnabled(true); var nb=neighbors(i);
    nodes.forEach(function(n,k){
      n.el.classList.toggle("sel",k===i);
      n.el.classList.toggle("dim",k!==i && !nb.has(k));
    });
    edges.forEach(function(e){ e.el.classList.toggle("dim",!(e.a===i||e.b===i)); });
    var n=nodes[i];
    $("editH").textContent="Editar «"+n.label+"»";
    var lk=$("lk"); lk.textContent="";
    nodes.forEach(function(m,k){
      if(k===i) return;
      var o=document.createElement("option"); o.value=k; o.textContent=m.label; lk.appendChild(o);
    });
    var d=$("detail"); d.textContent="";
    var h=document.createElement("h3"); h.textContent="«"+n.label+"» en tus apuntes"; d.appendChild(h);
    if(nb.size){
      var chips=document.createElement("div"); chips.className="chips";
      Array.from(nb).forEach(function(k){
        var b=document.createElement("button"); b.className="small chip"; b.textContent=nodes[k].label;
        b.addEventListener("click",function(){select(k)}); chips.appendChild(b);
      });
      d.appendChild(chips);
    }
    var count=0;
    sentences.forEach(function(s,si){
      var sourceId=currentDoc&&currentDoc.sources[si]?currentDoc.sources[si].id:null;
      var compound=n.key.indexOf("m:")===0?n.key.slice(2):n.key;
      if(!(s.match(/[\p{L}\p{N}]+/gu)||[]).some(function(word){return stem(word)===n.key})&&!(n.sourceIds&&n.sourceIds.indexOf(sourceId)>=0)&&!(sentKeys[si]&&sentKeys[si].has(n.key))&&!(n.manual&&E.norm(s).includes(E.norm(compound))))return;
      count++;
      var p=document.createElement("p"); p.className="frag";
      var tag=document.createElement("span");tag.className="source-tag";tag.textContent="Fragmento "+(si+1)+(n.manual?" · concepto editado":"");p.appendChild(tag);
      s.split(/([\p{L}\p{N}]+)/u).forEach(function(part,pi){
        if(pi%2===1 && stem(part)===n.key){var m=document.createElement("mark");m.textContent=part;p.appendChild(m)}
        else p.appendChild(document.createTextNode(part));
      });
      d.appendChild(p);
    });
    if(!count){
      var q=document.createElement("p"); q.className="hint";
      q.textContent=n.manual?"Concepto agregado a mano; no aparece como palabra en el texto.":"Sin fragmentos.";
      d.appendChild(q);
    }
  }

  /* ---------- Edición manual ---------- */
  function nameInput(){return $("nm").value.trim().replace(/\s+/g," ")}
  function duplicate(name,except){
    var k=keyOf(name), l=name.toLowerCase();
    return nodes.some(function(n,i){return i!==except && (n.key===k || n.label.toLowerCase()===l)});
  }
  $("eadd").addEventListener("click",function(){
    if(nodes.length>=100){setMsg("El mapa admite hasta 100 conceptos. Divide una clase extensa en partes.");return;}var name=nameInput();
    if(!name){setMsg("Escribe el nombre del concepto.");$("nm").focus();return}
    if(duplicate(name,-1)){setMsg("Ya existe un concepto con ese nombre.");return}
    remember();
    var p=selected>=0?nodes[selected]:null, n=mkNode(name,keyOf(name),2,0,true);
    if(p){ n.x=p.x+(Math.random()*180-90); n.y=p.y+(Math.random()>0.5?90:-90); }
    else { n.x=(W/2-view.x)/view.k+(Math.random()*60-30); n.y=(H/2-view.y)/view.k+(Math.random()*60-30); }
    nodes.push(n); addNodeEl(n);
    if(p){ var e={a:selected,b:nodes.length-1,w:1,manual:true}; edges.push(e); addEdgeEl(e); }
    $("nm").value=""; draw(); reheat(0.4); select(nodes.length-1);markDirty();
    setMsg(p?"Agregado y conectado a «"+p.label+"».":"Agregado. Conéctalo con otro concepto si lo necesitas.");
  });
  $("eren").addEventListener("click",function(){
    var name=nameInput(), n=nodes[selected];
    if(!name){setMsg("Escribe el nuevo nombre.");$("nm").focus();return}
    if(duplicate(name,selected)){setMsg("Ya existe un concepto con ese nombre.");return}
    remember(); n.label=name; n.w=name.length*7.2+28;
    if(n.manual) n.key=keyOf(name);
    var r=n.el.querySelector("rect"); r.setAttribute("x",-n.w/2); r.setAttribute("width",n.w);
    n.el.querySelector("text").textContent=name; n.el.setAttribute("aria-label","Concepto "+name);
    $("nm").value=""; reheat(0.3); select(selected);markDirty(); setMsg("Renombrado.");
  });
  $("edel").addEventListener("click",function(){
    if(nodes.length<=1){setMsg("Debe quedar al menos un concepto.");return}
    remember();stopLink(); var d=selected, n=nodes[d];
    n.el.remove();
    edges=edges.filter(function(e){ if(e.a===d||e.b===d){e.el.remove();return false} return true });
    edges.forEach(function(e){ if(e.a>d)e.a--; if(e.b>d)e.b--; });
    nodes.splice(d,1);
    draw(); reheat(0.3); clearSelection();markDirty();
    setMsg("«"+n.label+"» borrado.");
  });
  $("elink").addEventListener("click",function(){
    var t=parseInt($("lk").value,10); if(isNaN(t)) return;
    if(edgeBetween(selected,t)){setMsg("Ya están conectados.");return}
    remember();var e={a:selected,b:t,w:1,manual:true,label:"Conexión manual",directed:false}; edges.push(e); addEdgeEl(e);
    draw(); reheat(0.3); select(selected); $("lk").value=t;markDirty(); setMsg("Conectados.");
  });
  $("eunlink").addEventListener("click",function(){
    var t=parseInt($("lk").value,10); if(isNaN(t)) return;
    var e=edgeBetween(selected,t);
    if(!e){setMsg("Esos conceptos no están conectados.");return}
    remember();e.el.remove(); edges.splice(edges.indexOf(e),1);
    reheat(0.3); select(selected); $("lk").value=t;markDirty(); setMsg("Desconectados.");
  });

  $("eclick").addEventListener("click",function(){
    if(selected<0) return;
    if(linking){stopLink();setMsg("Conexión cancelada.")} else startLink();
  });
  document.addEventListener("keydown",function(ev){
    if(ev.key==="Escape"&&linking){stopLink();setMsg("Conexión cancelada.")}
  });

  /* ---------- Exportar PNG (mapa completo, no solo la vista actual) ---------- */
  function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
  function rrect(c,x,y,w,h,r){
    c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
  }
  function renderPNG(){
    return new Promise(function(done){
      var pad=40, sc=2, x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      nodes.forEach(function(n){x0=Math.min(x0,n.x-n.w/2);x1=Math.max(x1,n.x+n.w/2);y0=Math.min(y0,n.y-n.h/2);y1=Math.max(y1,n.y+n.h/2)});
      var cw=(x1-x0)+pad*2, ch=(y1-y0)+pad*2+18;
      sc=Math.min(sc,8192/cw,8192/ch,Math.sqrt(24000000/(cw*ch)));var cv=document.createElement("canvas"); cv.width=Math.ceil(cw*sc); cv.height=Math.ceil(ch*sc);
      var c=cv.getContext("2d"); c.scale(sc,sc);
      c.fillStyle=cssVar("--soft")||"#F3F6FA"; c.fillRect(0,0,cw,ch);
      c.translate(pad-x0,pad-y0);
      var edgeC=cssVar("--edge"), ink=cssVar("--ink"), on=cssVar("--on"), muted=cssVar("--muted");
      var tc=[cssVar("--n1"),cssVar("--n2"),cssVar("--n3")];
      c.lineCap="round";
      edges.forEach(function(e){
        var p=nodes[e.a], q=nodes[e.b];
        c.beginPath(); c.moveTo(p.x,p.y); c.lineTo(q.x,q.y);
        c.lineWidth=1+Math.min(e.w,4)*0.9;
        c.strokeStyle=e.manual?ink:edgeC; c.globalAlpha=e.manual?0.55:1;
        c.setLineDash(e.weak?[4,5]:[]); c.stroke();
        if(e.directed){var ang=Math.atan2(q.y-p.y,q.x-p.x),mx=p.x+(q.x-p.x)*.72,my=p.y+(q.y-p.y)*.72;c.beginPath();c.moveTo(mx,my);c.lineTo(mx-9*Math.cos(ang-.5),my-9*Math.sin(ang-.5));c.moveTo(mx,my);c.lineTo(mx-9*Math.cos(ang+.5),my-9*Math.sin(ang+.5));c.stroke();}
        if(e.label&&e.label!=="Coinciden en el texto"){c.save();c.setLineDash([]);c.font='10px "Segoe UI",sans-serif';c.textAlign="center";c.fillStyle=ink;c.fillText(e.label,(p.x+q.x)/2,(p.y+q.y)/2-7);c.restore();}
      });
      c.globalAlpha=1; c.setLineDash([]);
      c.font='700 14px "Segoe UI",system-ui,sans-serif'; c.textAlign="center"; c.textBaseline="middle";
      nodes.forEach(function(n){
        rrect(c,n.x-n.w/2,n.y-n.h/2,n.w,n.h,n.h/2);
        c.fillStyle=tc[n.tier]; c.fill();
        if(n.manual){c.strokeStyle=on;c.lineWidth=2;c.setLineDash([4,3]);c.stroke();c.setLineDash([])}
        c.fillStyle=on; c.fillText(n.label,n.x,n.y+1);
      });
      c.font='13px "Segoe UI",system-ui,sans-serif'; c.textAlign="left"; c.textBaseline="alphabetic";
      c.fillStyle=muted; c.fillText("VisualNotes AI",x0-pad+14,y1+pad+8);
      cv.toBlob(done,"image/png");
    });
  }
  $("zexp").addEventListener("click",async function(){
    if(!nodes.length) return;
    var blob=await renderPNG();
    if(!blob){setMsg("No se pudo generar la imagen.");return}
    if(window.claude && typeof window.claude.use==="function"){
      var dl=null; try{dl=await window.claude.use("downloads")}catch(e){}
      if(!dl){setMsg("La descarga no está disponible en esta vista.");return}
      try{await dl.save({filename:"VisualNotes_Mapa.png",data:blob});setMsg("Mapa exportado.")}
      catch(e){setMsg(e&&e.code==="declined"?"Descarga cancelada.":"No se pudo guardar el archivo.")}
    }else{
      var a=document.createElement("a"); a.download="VisualNotes_Mapa.png"; a.href=URL.createObjectURL(blob);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){URL.revokeObjectURL(a.href)},2000);
    }
  });

  /* ---------- Acciones ---------- */
  async function generate(){
    if(busy)return;var text=$("txt").value.trim();
    if(!text){resetClass();setMsg("Pega tus apuntes o pulsa Ver ejemplo para empezar.");$("txt").focus();return;}
    busy=true;lockInput(true);$("go").textContent="Organizando…";setMsg("");
    try{
      var prefs=preferences(),doc;
      if($("analysisMode").value==="ai"){
        var response=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:text,preferences:prefs}),signal:AbortSignal.timeout(aiReady.provider==='local'?340000:95000)});
        var result=await response.json();if(!response.ok)throw new Error(result.error||"No se pudo analizar la clase.");doc=E.validate(result,text,prefs);doc.provider=result.provider==='local'?'local':'openai';
      }else doc=E.analyze(text,prefs);
      currentDoc=doc;curText=text;analyzedInputs=inputSources.map(function(s){return Object.assign({},s)});$('reviewHint').hidden=true;rating="";markRating();undoStack=[];redoStack=[];dirty=false;
      var res=mapResult(doc);if(res.nodes.length)buildFrom(res,false);else{cancelAnimationFrame(raf);nodes=[];edges=[];gE.textContent="";gN.textContent="";$("empty").style.display="grid";$("edit").style.display="none";$("detail").textContent="";}
      $("fb").style.display="flex";renderAdaptive();updateHistory();setMsg("Listo. Ya puedes repasar y descargar tu clase.");if(window.innerWidth<801)$("h-map").scrollIntoView({block:"start",behavior:"auto"});
    }catch(error){setMsg(error.name==="TimeoutError"?"El análisis tardó demasiado. Conservamos tu clase actual; inténtalo de nuevo.":error.message);}
    finally{busy=false;lockInput(false);$("go").textContent="Preparar mi material →";}
  }
  function markRating(){
    document.querySelectorAll("#fb [data-r]").forEach(function(b){b.classList.toggle("sel",b.dataset.r===rating)});
  }
  $("go").addEventListener("click",function(){protect(generate)});
  $("ex").addEventListener("click",function(){protect(loadExample)});
  $("clr").addEventListener("click",function(){protect(function(){$("txt").value="";resetClass();$("txt").focus()})});
  $("max").addEventListener("input",function(){$("maxo").textContent=this.value});
  $("max").addEventListener("change",function(){setMsg("Cantidad actualizada. Organiza la clase para aplicar el cambio.")});
  document.querySelectorAll("#fb [data-r]").forEach(function(b){
    b.addEventListener("click",function(){rating=(rating===b.dataset.r)?"":b.dataset.r;markRating()});
  });

  /* ---------- Registro (localStorage, por visitante) ---------- */
  var KEY="visualnotes-registro",memory=null;
  function validSnapshot(snap){
    if(!snap||!Array.isArray(snap.nodes)||!Array.isArray(snap.edges)||snap.nodes.length>100||snap.edges.length>500)return false;
    function validSources(a){return a===undefined||Array.isArray(a)&&a.length<=60000&&a.every(function(id){return typeof id==='string'&&id.length<=100});}
    function validId(id){return id===undefined||typeof id==='string'&&id.length>0&&id.length<=100;}
    var ids=new Set();return snap.nodes.every(function(n){if(!n||typeof n.label!=="string"||!n.label.trim()||n.label.length>100||typeof n.key!=="string"||n.key.length>150||!validId(n.id)||!validSources(n.sourceIds)||n.score!==undefined&&!Number.isFinite(n.score)||![0,1,2].includes(n.tier)||!Number.isFinite(n.x)||!Number.isFinite(n.y)||Math.abs(n.x)>100000||Math.abs(n.y)>100000)return false;var id=n.id||"c-"+E.hash(n.key);if(ids.has(id))return false;ids.add(id);return true})&&snap.edges.every(function(e){return e&&validId(e.id)&&validSources(e.sourceIds)&&(e.directed===undefined||typeof e.directed==='boolean')&&Number.isInteger(e.a)&&Number.isInteger(e.b)&&e.a>=0&&e.b>=0&&e.a<snap.nodes.length&&e.b<snap.nodes.length&&e.a!==e.b&&Number.isFinite(e.w)&&e.w>=0&&(e.label===undefined||typeof e.label==="string"&&e.label.length<=100)});
  }
  function validRecord(it){if(it&&it.inputSources&&(!Array.isArray(it.inputSources)||it.inputSources.length>20||!it.inputSources.every(function(s){return s&&['image','audio'].includes(s.kind)&&typeof s.fileName==='string'&&s.fileName.length<=180&&typeof s.text==='string'&&s.text.length<=60000;})))return false;if(it&&it.history&&(!Array.isArray(it.history.undo)||!Array.isArray(it.history.redo)||it.history.undo.length>40||it.history.redo.length>40||!it.history.undo.every(validSnapshot)||!it.history.redo.every(validSnapshot)))return false;if(!it||typeof it.title!=="string"||it.title.length>150||typeof it.text!=="string"||it.text.length>60000||it.snap&&!validSnapshot(it.snap))return false;if(it.analysis){try{E.validate(it.analysis,it.text,it.analysis.preferences||{})}catch(e){return false}}return true;}
  function loadLog(){if(memory!==null)return memory;try{var raw=localStorage.getItem(KEY);var data=raw?JSON.parse(raw):[];if(!Array.isArray(data)||data.length>100||!data.every(validRecord))throw new Error("invalid");memory=data;}catch(e){memory=[];$("storageNotice").textContent="No se pudo leer el registro. El contenido previo no se sobrescribirá; exporta un respaldo de esta sesión.";storageFailed=true;}return memory;}
  function saveLog(arr){memory=arr;try{if(storageFailed)throw new Error("blocked");localStorage.setItem(KEY,JSON.stringify(arr));$("storageNotice").textContent="Guardado en este navegador. Exporta un respaldo para llevarlo contigo.";return true}catch(e){$("storageNotice").textContent="No se guardó de forma permanente. Tu clase sigue en esta sesión: exporta un respaldo antes de cerrar.";return false;}}
  function snapshot(){return {nodes:nodes.map(function(n){return {id:n.id,key:n.key,label:n.label,score:n.score,tier:n.tier,manual:n.manual,sourceIds:n.sourceIds||[],x:Math.round(n.x),y:Math.round(n.y)}}),edges:edges.map(function(e){return {id:e.id,from:nodes[e.a].id,to:nodes[e.b].id,a:e.a,b:e.b,w:e.w,label:e.label||"Conexión manual",directed:!!e.directed,sourceIds:e.sourceIds||[],weak:!!e.weak,manual:!!e.manual}})}}
  function restoreGraph(snap){if(!validSnapshot(snap))throw new Error("El mapa guardado tiene un formato inválido.");var base=E.graph(currentDoc);buildFrom({nodes:snap.nodes.map(function(s){var n=mkNode(s.label,s.key,s.tier,s.score,s.manual);n.id=s.id||n.id;n.sourceIds=s.sourceIds||[];n.x=s.x;n.y=s.y;return n}),edges:snap.edges.map(function(e){return {id:e.id,a:e.a,b:e.b,w:e.w,label:e.label,directed:e.directed,sourceIds:e.sourceIds||[],weak:e.weak,manual:e.manual}}),sentences:base.sentences,sentKeys:base.sentKeys},true);}
  function restore(it){
    if(!validRecord(it)){setMsg("El apunte no tiene un formato válido.");return;}
    clearMedia();inputSources=(it.inputSources||[]).map(function(s){return {kind:s.kind,fileName:s.fileName,text:s.text};});analyzedInputs=inputSources.slice();renderInputSources();chooseInput('text');
    $("txt").value=it.text;$("max").value=it.max||12;$("maxo").textContent=$("max").value;$("classTitle").value=it.title;
    currentDoc=it.analysis?Object.assign(E.validate(it.analysis,it.text,it.analysis.preferences||{}),{mode:it.analysis.mode||"local",notes:it.analysis.notes||[],provider:it.analysis.provider}):E.analyze(it.text,{title:it.title,max:it.max||12});
    var prefs=currentDoc.preferences||{};$("subject").value=prefs.subject||"";$("goal").value=prefs.goal||"comprender";$("detailLevel").value=prefs.detail||"normal";
    curText=it.text;undoStack=it.history?it.history.undo.slice():[];redoStack=it.history?it.history.redo.slice():[];dirty=false;
    if(it.snap&&it.snap.nodes.length)restoreGraph(it.snap);else{var res=mapResult(currentDoc);if(res.nodes.length)buildFrom(res,false);else{cancelAnimationFrame(raf);nodes=[];edges=[];gE.textContent="";gN.textContent="";$("edit").style.display="none";$("empty").style.display="grid";}}
    rating=it.rating||"";markRating();$("fb").style.display="flex";renderAdaptive();if(it.currentView&&E.available(currentDoc).some(function(v){return v.id===it.currentView;}))selectView(it.currentView);updateHistory();updateCount();setMsg("Clase abierta.");
  }
  function renderLog(){var arr=loadLog(),ul=$("log");ul.textContent="";$("logEmpty").style.display=arr.length?"none":"block";arr.forEach(function(it,idx){var li=document.createElement("li"),t=document.createElement("div"),b=document.createElement("b"),date=document.createElement("small"),act=document.createElement("div"),open=document.createElement("button"),remove=document.createElement("button");t.className="t";b.textContent=it.title;date.textContent=it.date+(it.rating?" · "+it.rating:"");t.append(b,date);act.className="act";open.className=remove.className="small";open.textContent="Abrir";remove.textContent="Borrar";remove.setAttribute("aria-label","Borrar "+it.title);open.addEventListener("click",function(){protect(function(){restore(it)})});remove.addEventListener("click",function(){var a=loadLog().slice();a.splice(idx,1);saveLog(a);renderLog()});act.append(open,remove);li.append(t,act);ul.appendChild(li)});}
  function record(){return {schemaVersion:1,title:currentDoc.title,text:curText,inputSources:analyzedInputs,max:currentDoc.preferences.max||12,rating:rating,analysis:currentDoc,snap:snapshot(),history:{undo:undoStack.slice(),redo:redoStack.slice()},currentView:activeView,date:new Date().toLocaleDateString("es-PA"),savedAt:new Date().toISOString()};}
  function saveCurrent(){if(!currentDoc)return false;var a=loadLog().slice();a.unshift(record());var ok=saveLog(a.slice(0,30));renderLog();if(ok){dirty=false;setMsg("Clase guardada.");}else setMsg("La clase sigue en esta sesión. Exporta un respaldo para conservarla.");return ok;}
  $("save").addEventListener("click",saveCurrent);

  var rt; window.addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(function(){ if(nodes.length&&activeView==="map"){size();reheat(0.4);fit()} },150)});

  var EXAMPLES={
    mixed:{title:'Rectificadores: de AC a DC',subject:'Electrónica de potencia',text:'Un rectificador es un circuito que convierte corriente alterna (AC) en corriente continua (DC).\nEl puente rectificador utiliza cuatro diodos. La corriente atraviesa dos diodos en cada semiciclo.\nEl condensador de filtrado reduce el rizado de la tensión de salida. La tensión de salida depende de la carga y del filtro.\nProcedimiento para estimar el pico de salida:\n1. Identificar el valor eficaz de la tensión de entrada.\n2. Calcular el pico ideal: Vp = Vrms × √2.\n3. Restar la caída de los dos diodos en conducción.\n4. Revisar las condiciones de carga y filtrado antes de estimar el valor medio.\nNo confundir la tensión de pico con la tensión eficaz. La expresión del pico no es una fórmula del valor medio.\n\n| Elemento | Función |\n| --- | --- |\n| Puente rectificador | Rectificar la señal de entrada |\n| Condensador de filtrado | Reducir el rizado |\n| Carga | Consumir la potencia de salida |'},
    history:{title:'Plan Marshall y reconstrucción europea',subject:'Historia contemporánea',text:'El Plan Marshall fue una iniciativa de ayuda económica de Estados Unidos para la recuperación europea.\nEn 1947 se anunció la propuesta del Plan Marshall.\nEn 1948 comenzó la aplicación del programa de recuperación europea.\nEn 1952 terminó el programa original de ayuda.\nLa recuperación económica europea también estuvo relacionada con factores internos de cada país. No debe atribuirse toda la recuperación a una sola causa.'},
    programming:{title:'Clases, objetos y constructor',subject:'Programación',text:'Una clase es una estructura que define atributos y métodos para sus objetos.\nUn constructor es un método que inicializa el estado de un objeto.\nLa encapsulación controla el acceso al estado del objeto.\nProcedimiento para crear y probar una clase:\n1. Identificar los atributos que necesita el objeto.\n2. Definir el constructor y sus parámetros.\n3. Crear los métodos que modifican o consultan el estado.\n4. Instanciar un objeto con datos de prueba.\n5. Comprobar el resultado esperado y los casos inválidos.\nUn constructor no devuelve necesariamente un valor explícito en todos los lenguajes.\n\n| Elemento | Responsabilidad |\n| --- | --- |\n| Clase | Definir la estructura y el comportamiento |\n| Objeto | Mantener un estado concreto |\n| Constructor | Inicializar el objeto |'}
  };
  function dom(tag,text,className){var element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}
  function updateCount(){$('charCount').textContent=$('txt').value.length.toLocaleString('es-PA')+' caracteres';}
  function updateHistory(){$('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;}
  function remember(){undoStack.push(snapshot());if(undoStack.length>40)undoStack.shift();redoStack=[];}
  function markDirty(){dirty=true;updateHistory();renderGraphText();}
  function protect(action){if(busy){setMsg('Espera a que termine el análisis.');return;}if(!dirty){action();return;}pendingAction=action;$('replaceDialog').showModal();}
  $('cancelReplace').addEventListener('click',function(){pendingAction=null;$('replaceDialog').close();});
  $('confirmReplace').addEventListener('click',function(){var action=pendingAction;pendingAction=null;$('replaceDialog').close();if(action)action();});
  $('saveReplace').addEventListener('click',function(){if(!saveCurrent())return;var action=pendingAction;pendingAction=null;$('replaceDialog').close();if(action)action();});
  $('replaceDialog').addEventListener('cancel',function(){pendingAction=null;});
  $('undo').addEventListener('click',function(){if(!undoStack.length)return;redoStack.push(snapshot());restoreGraph(undoStack.pop());markDirty();setMsg('Edición deshecha.');});
  $('redo').addEventListener('click',function(){if(!redoStack.length)return;undoStack.push(snapshot());restoreGraph(redoStack.pop());markDirty();setMsg('Edición recuperada.');});
  function resetClass(){inputSources=[];analyzedInputs=[];renderInputSources();clearMedia();$('reviewHint').hidden=true;$('welcome').hidden=false;$('classSummary').hidden=true;cancelAnimationFrame(raf);nodes=[];edges=[];sentences=[];sentKeys=[];selected=-1;linking=false;currentDoc=null;curText='';dirty=false;undoStack=[];redoStack=[];gE.textContent='';gN.textContent='';$('empty').style.display='grid';$('edit').style.display='none';$('fb').style.display='none';$('detail').textContent='';$('classSummary').textContent='';$('representationTabs').textContent='';$('representationReason').textContent='';$('adaptivePanel').hidden=true;$('mapPanel').hidden=true;$('graphText').textContent='';updateCount();updateHistory();setMsg('');}
  function loadExample(){inputSources=[];renderInputSources();clearMedia();chooseInput('text');var sample=EXAMPLES[$('exampleChoice').value];$('classTitle').value=sample.title;$('subject').value=sample.subject;$('txt').value=sample.text;updateCount();generate();}
  function evidenceButton(ids){var b=dom('button','Ver en mis apuntes','source-button');b.type='button';b.addEventListener('click',function(){showEvidence(ids);});return b;}
  function showEvidence(ids){var detail=$('detail');detail.textContent='';detail.appendChild(dom('h3','Esto aparece en tus apuntes'));ids.forEach(function(id){var source=currentDoc.sources.find(function(s){return s.id===id});if(!source)return;var p=dom('p',undefined,'frag');p.appendChild(dom('span','Fragmento '+id.slice(1),'source-tag'));p.appendChild(document.createTextNode(source.text));var b=dom('button','Localizar en el texto','small');b.addEventListener('click',function(){if($('txt').value.trim()!==curText){setMsg('El texto tiene cambios pendientes. La fuente corresponde a la última clase organizada.');return;}var offset=$('txt').value.indexOf(curText);$('txt').focus();$('txt').setSelectionRange(source.start+offset,source.end+offset);});p.appendChild(b);detail.appendChild(p);});}
  var showAll=false;
  function viewItems(id,all){var doc=currentDoc;var root=dom('div');var limit=all||showAll||doc.preferences.detail!=='breve'?Infinity:3;
    function entry(text,ids,date){var li=dom('li',undefined,'adaptive-item');if(date)li.appendChild(dom('span',date,'event-date'));li.appendChild(dom('p',text));li.appendChild(evidenceButton(ids));if(doc.preferences.detail==='completo'||all)ids.forEach(function(sid){var source=doc.sources.find(function(s){return s.id===sid});if(source)li.appendChild(dom('p',source.text,'analysis-note'));});return li;}
    if(id==='timeline'){var list=dom('ol',undefined,'adaptive-list');var sorted=doc.events.slice().sort(function(a,b){return (/^\d{4}$/.test(a.date)&&/^\d{4}$/.test(b.date))?Number(a.date)-Number(b.date):0;});sorted.slice(0,limit).forEach(function(event){list.appendChild(entry(event.text,event.sourceIds,event.date));});root.appendChild(list);}
    if(id==='steps')doc.procedures.forEach(function(procedure){root.appendChild(dom('h3',procedure.title,'procedure-title'));var list=dom('ol',undefined,'adaptive-list');procedure.steps.slice(0,limit).forEach(function(step){var li=entry(step.text,step.sourceIds);li.querySelector('p').prepend(dom('span',String(step.order),'step-badge'));list.appendChild(li);});root.appendChild(list);});
    if(id==='formulas'){var list=dom('ul',undefined,'adaptive-list');doc.formulas.slice(0,limit).forEach(function(formula){var li=entry(formula.expression,formula.sourceIds);li.querySelector('p').classList.add('formula');list.appendChild(li);});root.appendChild(list);}
    if(id==='tables')doc.tables.forEach(function(table){root.appendChild(dom('h3',table.title,'procedure-title'));var scroll=dom('div',undefined,'table-scroll'),t=dom('table',undefined,'study-table'),head=dom('thead'),tr=dom('tr');table.headers.forEach(function(h){var th=dom('th',h);th.scope='col';tr.appendChild(th);});tr.appendChild(dom('th','Fuente'));head.appendChild(tr);t.appendChild(head);var body=dom('tbody');table.rows.slice(0,limit).forEach(function(row){var r=dom('tr');row.cells.forEach(function(cell){r.appendChild(dom('td',cell));});var td=dom('td');td.appendChild(evidenceButton(row.sourceIds));r.appendChild(td);body.appendChild(r);});t.appendChild(body);scroll.appendChild(t);root.appendChild(scroll);});
    if(id==='guide'){root.appendChild(guideContent(all));}
    var view=E.available(doc).find(function(v){return v.id===id;});if(!view.count)root.appendChild(dom('p','No se encontró contenido de este tipo. El análisis local reconoce fechas, listas numeradas, tablas con separadores y expresiones con signo igual. Puedes revisar el texto o usar IA cuando esté conectada.','no-content'));
    if(id!=='guide'&&limit!==Infinity&&view.count>limit){var expand=dom('button','Mostrar todo','small');expand.addEventListener('click',function(){showAll=true;selectView(activeView);});root.appendChild(expand);}return root;
  }
  function recommended(){var doc=currentDoc;if(doc.preferences.goal==='practicar'&&doc.procedures.length)return 'steps';if(doc.events.length>=2&&!doc.procedures.length)return 'timeline';return 'guide';}
  function selectView(id){activeView=id;$('detail').textContent='';document.querySelectorAll('#representationTabs button').forEach(function(b){var on=b.dataset.view===id;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});$('mapPanel').hidden=id!=='map';$('adaptivePanel').hidden=id==='map';var view=E.available(currentDoc).find(function(v){return v.id===id;});$('representationReason').textContent=view.reason;if(id==='map'){size();draw();fit();}else{$('adaptivePanel').textContent='';$('adaptivePanel').appendChild(viewItems(id,false));}}
  function renderGraphText(){var target=$('graphText');target.textContent='';var list=dom('ul');nodes.forEach(function(n,i){var li=dom('li'),b=dom('button',n.label,'small');b.addEventListener('click',function(){select(i);});li.appendChild(b);list.appendChild(li);});target.appendChild(list);var rel=dom('ul');edges.forEach(function(e){rel.appendChild(dom('li',nodes[e.a].label+' '+(e.directed?'→':'—')+' '+nodes[e.b].label+': '+(e.label||'Conexión manual')));});target.appendChild(rel);}
  function guideContent(all){
    var root=dom('div');
    var grid=dom('div',undefined,'idea-grid'),limit=all||showAll||currentDoc.preferences.detail==='completo'?Infinity:currentDoc.preferences.detail==='breve'?3:6;
    var concepts=nodes.length?nodes:currentDoc.sources.slice(0,8).map(function(s,i){return {label:'Apunte '+(i+1),sourceIds:[s.id]}}),used=new Set();
    concepts.slice(0,limit).forEach(function(n){var card=dom('article',undefined,'idea-card');card.appendChild(dom('h3',n.label));
      var ids=(n.sourceIds||[]).filter(function(id){return currentDoc.sources.some(function(s){return s.id===id;})});
      if(!ids.length){var term=E.norm(n.key||n.label).replace(/^m:/,'');ids=currentDoc.sources.filter(function(s){return E.norm(s.text).includes(term)||(s.text.match(/[\p{L}\p{N}]+/gu)||[]).some(function(word){return E.key(word)===term;})}).map(function(s){return s.id;});}
      var source=currentDoc.sources.find(function(s){return ids.includes(s.id)&&!used.has(s.id)&&!s.text.includes('|');})||currentDoc.sources.find(function(s){return ids.includes(s.id)&&!s.text.includes('|');})||currentDoc.sources.find(function(s){return ids.includes(s.id);});
      if(source){used.add(source.id);card.appendChild(dom('blockquote',source.text));card.appendChild(evidenceButton(ids));}else card.appendChild(dom('p','Idea agregada al mapa. Puedes completar su explicación en tus apuntes.','manual-note'));
      grid.appendChild(card);
    });root.appendChild(grid);
    if(concepts.length>limit){var more=dom('button','Ver más ideas','more-ideas');more.addEventListener('click',function(){showAll=true;selectView('guide');});root.appendChild(more);}return root;
  }
  function renderAdaptive(){
    showAll=false;$('welcome').hidden=true;var summary=$('classSummary');summary.hidden=false;summary.textContent='';summary.appendChild(dom('h3',currentDoc.title));
    var meta=dom('div',undefined,'summary-meta'),goals={comprender:'Para entender las ideas',repasar:'Para repasar',practicar:'Para practicar paso a paso'};
    [currentDoc.preferences.subject,goals[currentDoc.preferences.goal]||goals.comprender].filter(Boolean).forEach(function(text){meta.appendChild(dom('span',text));});summary.appendChild(meta);
    summary.appendChild(dom('p',currentDoc.mode==='ai'?(currentDoc.provider==='local'?'Organizado con IA local. Puedes comprobarlo con tus apuntes.':'Organizado con IA. Puedes comprobarlo con tus apuntes.'):'Organizado sin IA. Las ideas se eligieron con reglas básicas; puedes revisarlas y corregirlas.','analysis-note'));
    if(analyzedInputs.length)summary.appendChild(dom('p','Apuntes procedentes de: '+analyzedInputs.map(function(s){return s.fileName;}).join(', ')+'. Las fuentes corresponden al texto revisado, sin posiciones en la imagen ni marcas de tiempo.','analysis-note'));
    var tabs=$('representationTabs');tabs.textContent='';var chosen=recommended();E.available(currentDoc).filter(function(v){return v.count>0;}).forEach(function(v){
      var b=dom('button',v.label);b.dataset.view=v.id;b.id='tab-'+v.id;b.setAttribute('role','tab');b.setAttribute('aria-controls',v.id==='map'?'mapPanel':'adaptivePanel');
      b.addEventListener('click',function(){selectView(v.id);});b.addEventListener('keydown',function(event){if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();var buttons=Array.from(tabs.children),i=buttons.indexOf(b);i=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;selectView(buttons[i].dataset.view);buttons[i].focus();});tabs.appendChild(b);
    });renderGraphText();if(nodes.length)clearSelection();selectView(chosen);
  }
  function downloadFile(blob,name){var a=dom('a');var url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},2000);}
  function downloadJSON(data,name){var a=dom('a');var url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},2000);}
  $('exportClass').addEventListener('click',function(){
    if(!currentDoc)return;
    try{
      var content=window.VisualNotesPortable.build(record(),window.VisualNotesPortableAssets);
      var title=currentDoc.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,60)||'Clase';
      downloadFile(new Blob([content],{type:'text/html;charset=utf-8'}),'VisualNotes_'+title+'.html');
      setMsg('Clase completa exportada. Abre el archivo HTML para ver todas las representaciones, sus fuentes y seguir editando.');
      if($('txt').value.trim()!==curText)setMsg('Clase completa exportada con el último análisis. El texto pendiente de organizar no forma parte de esa clase.');
    }catch(error){setMsg(error.message);}
  });
  $('backup').addEventListener('click',function(){downloadJSON({format:'visualnotes-backup',schemaVersion:1,records:loadLog()},'VisualNotes_Respaldo.json');});
  $('importBackup').addEventListener('click',function(){$('backupFile').click();});
  $('backupFile').addEventListener('change',async function(){var file=this.files[0];this.value='';if(!file)return;try{if(file.size>32*1024*1024)throw new Error('El respaldo supera 32 MB.');var records=window.VisualNotesPortable.parse(await file.text());if(!Array.isArray(records)||records.length>30||!records.every(validRecord))throw new Error('El respaldo contiene clases inválidas. No se importó.');var combined=loadLog().slice();records.forEach(function(r){var index=combined.findIndex(function(it){return it.text===r.text&&JSON.stringify(it.snap)===JSON.stringify(r.snap)});if(index<0)combined.unshift(r);else combined[index]=r;});saveLog(combined.slice(0,30));renderLog();$("savedClasses").open=true;setMsg('Respaldo importado. Si hay más de 30 clases, se conservan las primeras.');}catch(error){setMsg(error.message);}});
  $('textFile').addEventListener('change',async function(){var file=this.files[0];this.value='';if(!file)return;if(file.size>240000){setMsg('Usa un archivo de texto de hasta 240 KB.');return;}if(busy)return;var text=await file.text();if(busy)return;if(text.length>60000){setMsg('Usa hasta 60.000 caracteres.');return;}protect(function(){inputSources=[];renderInputSources();$('txt').value=text;updateCount();setMsg('Texto cargado. Organiza la clase para analizarlo.');});});
  $('txt').addEventListener('input',updateCount);
  $('printClass').addEventListener('click',function(){var old=document.querySelector('.print-material');if(old)old.remove();var material=dom('div',undefined,'print-material');E.available(currentDoc).filter(function(v){return v.id!=='map'&&v.count;}).forEach(function(v){material.appendChild(dom('h3',v.label));material.appendChild(viewItems(v.id,true));});material.appendChild(dom('h3','Apuntes originales'));material.appendChild(dom('p',curText));$('mapPanel').after(material);window.print();});
  window.addEventListener('beforeunload',function(event){if(dirty||currentDoc&&$('txt').value.trim()!==curText){event.preventDefault();event.returnValue='';}});
  function clearMedia(keepSelection){mediaFile=null;if(!keepSelection)$('mediaFile').value='';if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;$('mediaPreview').textContent='';refreshMedia();}
  function chooseInput(kind){if(busy)return;if(inputKind!==kind)clearMedia();inputKind=kind;document.querySelectorAll('[data-input]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.input===kind));});$('mediaInput').hidden=kind==='text';$('mediaLabel').textContent=kind==='audio'?'Elige un audio de tu clase':'Elige una foto de tus apuntes o pizarra';$('mediaFile').accept=kind==='audio'?'.mp3,.wav,.m4a,.mp4,.webm,.mpeg,.mpga':'.png,.jpg,.jpeg,.webp';$('mediaLimit').textContent=kind==='audio'?'MP3, WAV, M4A, MP4, WEBM, MPEG o MPGA · hasta 24 MB. Divide grabaciones más grandes.':'PNG, JPG o WEBP · hasta 8 MB. Puedes añadir varias imágenes, una por una.';refreshMedia();}
  function refreshMedia(){var ready=inputKind==='audio'?aiReady.audioConfigured:aiReady.imageConfigured;$('extractMedia').disabled=busy||!mediaFile||!ready;$('extractMedia').textContent=mediaBusy?'Leyendo…':inputKind==='audio'?'Transcribir audio':'Extraer texto';$('cancelMedia').hidden=!mediaBusy;if(!mediaBusy)$('mediaStatus').textContent=ready?(mediaFile?'Archivo listo. Pulsa '+(inputKind==='audio'?'Transcribir audio.':'Extraer texto.'):'Elige un archivo para continuar.'):document.getElementById('visualnotes-export-data')?'La clase portátil permite revisar y editar. Para extraer nuevos archivos, abre la aplicación local con IA.':aiReady.provider==='local'?'Falta instalar la lectura local. Abre Instalar-IA-gratis.cmd y pulsa Comprobar instalación.':'La IA aún no está activada. Consulta «Activar la IA».';}
  function lockInput(lock){['txt','go','mediaFile','mediaPlacement','textFile','analysisMode','classTitle','subject','goal','detailLevel','max','ex','clr','refreshAI'].forEach(function(id){$(id).disabled=lock;});document.querySelectorAll('[data-input]').forEach(function(b){b.disabled=lock;});refreshMedia();}
  function renderInputSources(){var root=$('inputProvenanceList');root.textContent='';$('inputProvenance').hidden=!inputSources.length;inputSources.forEach(function(s){var item=dom('details'),heading=dom('summary',(s.kind==='audio'?'Audio: ':'Imagen: ')+s.fileName);item.append(heading,dom('pre',s.text));root.appendChild(item);});}
  document.querySelectorAll('[data-input]').forEach(function(b){b.addEventListener('click',function(){chooseInput(b.dataset.input);});});
  $('mediaFile').addEventListener('change',function(){if(busy)return;var file=this.files[0];clearMedia(true);if(!file)return;var allowed=inputKind==='audio'?/\.(mp3|wav|m4a|mp4|webm|mpeg|mpga)$/i:/\.(png|jpe?g|webp)$/i,limit=(inputKind==='audio'?24:8)*1024*1024;if(!allowed.test(file.name)||!file.size||file.size>limit){$('mediaStatus').textContent='Elige un archivo válido dentro del tamaño indicado.';return;}mediaFile=file;previewURL=URL.createObjectURL(file);var preview=dom(inputKind==='audio'?'audio':'img');preview.src=previewURL;if(inputKind==='audio'){preview.controls=true;preview.preload='metadata';}else preview.alt='Vista previa de '+file.name;$('mediaPreview').append(dom('p',file.name),preview);refreshMedia();});
  $('cancelMedia').addEventListener('click',function(){if(mediaController)mediaController.abort();});
  async function extractInput(){
    if(busy||!mediaFile)return;if($('mediaPlacement').value==='append'&&inputSources.length>=20){$('mediaStatus').textContent='Ya añadiste 20 archivos. Prepara esta clase o empieza una nueva.';return;}
    var file=mediaFile,kind=inputKind,previousText=$('txt').value,placement=$('mediaPlacement').value;busy=true;mediaBusy=true;lockInput(true);$('mediaStatus').textContent=kind==='audio'?'Transcribiendo tu audio…':'Leyendo tu imagen…';mediaController=new AbortController();var timeout=setTimeout(function(){mediaController.abort('timeout');},aiReady.provider==='local'?540000:125000);
    try{
      var response=await fetch('/api/extract/'+kind,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file,signal:mediaController.signal});var result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo leer el archivo.');if(typeof result.text!=='string'||!result.text.trim()||result.text.length>60000)throw new Error('La IA devolvió texto inválido.');
      var combined=placement==='append'&&previousText.trim()?previousText.trim()+'\n\n'+result.text:result.text;if(combined.length>60000)throw new Error('Los apuntes superarían 60.000 caracteres. Elige reemplazar o utiliza un archivo más corto.');
      if(placement==='replace')inputSources=[];inputSources.push({kind:kind,fileName:String(result.fileName||file.name).slice(0,180),text:result.text});$('txt').value=combined;updateCount();renderInputSources();$('reviewHint').hidden=false;setMsg('Texto añadido. Revísalo antes de preparar tu material.');$('txt').focus();
    }catch(error){setMsg(mediaController.signal.aborted?(mediaController.signal.reason==='timeout'?'La extracción tardó demasiado. Conservamos tus apuntes.':'Extracción cancelada. Conservamos tus apuntes.'):error.message);}
    finally{clearTimeout(timeout);mediaController=null;mediaBusy=false;busy=false;lockInput(false);}
  }
  $('extractMedia').addEventListener('click',function(){protect(extractInput);});
  async function checkAI(){
    if(!/^https?:$/.test(location.protocol)){refreshMedia();return;}
    try{var response=await fetch('/api/status');if(!response.ok)return;var status=await response.json(),enable=!aiReady.aiConfigured&&status.aiConfigured;aiReady=status;var local=status.provider==='local';
      $('analysisMode').options[1].disabled=!status.aiConfigured;$('analysisMode').options[1].textContent=status.aiConfigured?(local?'IA local · gratis':'Con IA'):'Con IA · pendiente';if(enable)$('analysisMode').value='ai';if(!status.aiConfigured)$('analysisMode').value='local';
      $('engineStatus').textContent=local?(status.executionHost?'IA en '+status.executionHost+(status.aiConfigured?' · Qwen':' · instalación pendiente'):status.aiConfigured?'IA local · Qwen':'IA local · instalación pendiente'):(status.aiConfigured||status.imageConfigured||status.audioConfigured?'IA disponible':'Organización básica · sin IA');
      $('mediaPrivacy').textContent=local?(status.executionHost?'Se procesa en '+status.executionHost+' mediante tu conexión privada de Tailscale. No se envía a proveedores de IA externos.':'Se procesa en tu equipo. No se envía a proveedores externos.'):'Al extraer, el archivo se envía a OpenAI. Puede generar un costo en tu cuenta.';
      $('aiSetup').hidden=!!(status.aiConfigured&&status.imageConfigured&&status.audioConfigured);
      $('setupHelp').textContent=local?'Abre Instalar-IA-gratis.cmd en la carpeta del proyecto'+(status.executionHost?' dentro de '+status.executionHost:'')+'. Descargará Qwen, Whisper y el lector de imágenes una vez (aproximadamente 1,4 GB). No requiere clave. Después pulsa Comprobar instalación.':'Configura la clave y los modelos en el archivo .env del servidor y reinicia la aplicación. La clave permanece en el servidor.';
      $('setupState').textContent=local?['Texto: '+(status.aiConfigured?'archivos instalados':'pendiente'),'Imagen: '+(status.imageConfigured?'archivos instalados':'pendiente'),'Audio: '+(status.audioConfigured?'archivos instalados':'pendiente')].join(' · '):'';
    }catch(e){}finally{refreshMedia();}
  }
  $('refreshAI').addEventListener('click',function(){if(!busy)checkAI();});
  chooseInput('text');var exported=document.getElementById('visualnotes-export-data');
  if(exported){try{var portableRecords=window.VisualNotesPortable.parse(exported.textContent);if(!Array.isArray(portableRecords)||portableRecords.length!==1||!validRecord(portableRecords[0]))throw new Error('La clase exportada contiene datos inválidos.');memory=portableRecords;renderLog();restore(portableRecords[0]);$('engineStatus').textContent='Clase portátil · sin conexión';setMsg('Clase completa abierta: puedes revisar las fuentes, editar, deshacer, guardar y volver a exportar.');}catch(error){resetClass();setMsg(error.message);}}else{renderLog();checkAI();resetClass();}

})();
