/** pdf-extract.js */
(function(){
  'use strict';
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let pdfDoc=null;
  const zone=document.getElementById('extractUploadZone');
  const fi=document.getElementById('extractFileInput');
  fi.addEventListener('change',e=>{if(e.target.files[0])load(e.target.files[0]);});
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);});
  zone.querySelector('.pdf-upload-idle').addEventListener('click',()=>fi.click());
  async function load(file){
    try{
      pdfDoc=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
      g('extractFileName').textContent=file.name;
      g('extractFileMeta').textContent=pdfDoc.numPages+' pages - '+fmt(file.size);
      s('extractFileCard');s('extractSettings');h('extractUploadZone');
    }catch(e){alert(e.message);}
  }
  window.runExtract=async function(){
    if(!pdfDoc)return;
    const pages=parseRange(g('extractRange').value.trim(),pdfDoc.numPages);
    const mode=g('extractFormat').value;
    h('extractSettings');s('extractLoading');h('extractResult');
    try{
      const parts=[];
      for(const p of pages){
        g('extractLoadingMsg').textContent='Extracting page '+p+'/'+pdfDoc.numPages;
        const tc=await(await pdfDoc.getPage(p)).getTextContent();
        const txt=tc.items.map(i=>i.str).join(' ').replace(/ {2,}/g,' ').trim();
        parts.push(mode==='paged'?'--- Page '+p+' ---\n'+txt:txt);
      }
      const out=parts.join('\n\n');
      g('extractOutput').value=out;
      const wc=out.trim()?out.trim().split(/\s+/).length:0;
      g('extractStats').textContent=pages.length+' pages - '+wc+' words - '+out.length+' chars';
      h('extractLoading');s('extractResult');s('extractSettings');
      if(typeof gaTrackProcessDone==='function')gaTrackProcessDone('pdf-extract',pages.length,0);
    }catch(e){
      g('extractLoadingMsg').textContent='Error: '+e.message;
      if(typeof gaTrackError==='function')gaTrackError('pdf-extract','extract_failed',e.message);
    }
  };
  window.extractCopy=async function(){
    await navigator.clipboard.writeText(g('extractOutput').value).catch(()=>{});
    const b=g('extractCopyBtn');b.textContent='Copied!';setTimeout(()=>{b.textContent='Copy';},2000);
    if(typeof gaTrackResultCopy==='function')gaTrackResultCopy('pdf-extract','text');
  };
  window.extractDownload=function(){
    const blob=new Blob([g('extractOutput').value],{type:'text/plain;charset=utf-8'});
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'extracted.txt'}).click();
    if(typeof gaTrackDownload==='function')gaTrackDownload('pdf-extract','text/plain');
  };
  window.extractReset=function(){
    pdfDoc=null;fi.value='';g('extractOutput').value='';
    ['extractFileCard','extractSettings','extractLoading','extractResult'].forEach(h);
    s('extractUploadZone');
  };
  function parseRange(str,max){
    if(!str)return Array.from({length:max},(_,i)=>i+1);
    const set=new Set();
    str.split(',').forEach(p=>{p=p.trim();if(p.includes('-')){const[a,b]=p.split('-').map(Number);for(let i=Math.max(1,a);i<=Math.min(max,b);i++)set.add(i);}else{const n=+p;if(n>=1&&n<=max)set.add(n);}});
    return[...set].sort((a,b)=>a-b);
  }
  function g(id){return document.getElementById(id);}
  function s(id){const e=g(id);if(e)e.style.display='';}
  function h(id){const e=g(id);if(e)e.style.display='none';}
  function fmt(n){return n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(2)+' MB';}
})();
