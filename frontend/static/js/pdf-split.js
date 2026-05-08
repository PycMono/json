/** pdf-split.js */
(function(){
  'use strict';
  let pdfBytes=null,totalPages=0,splitResult=null;
  const zone=document.getElementById('splitUploadZone');
  const fi=document.getElementById('splitFileInput');
  fi.addEventListener('change',e=>{if(e.target.files[0])load(e.target.files[0]);});
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);});
  zone.querySelector('.pdf-upload-idle').addEventListener('click',()=>fi.click());
  async function load(file){
    pdfBytes=await file.arrayBuffer();
    const{PDFDocument}=PDFLib;
    const doc=await PDFDocument.load(pdfBytes);
    totalPages=doc.getPageCount();
    g('splitFileName').textContent=file.name;
    g('splitFileMeta').textContent=totalPages+' pages - '+fmt(file.size);
    g('splitTotalPages').textContent=totalPages;
    h('splitUploadZone');s('splitFileCard');s('splitSettings');
  }
  window.splitModeChange=function(){
    const mode=document.querySelector('input[name="splitMode"]:checked').value;
    g('splitRangesField').style.display=mode==='ranges'?'':'none';
    g('splitEveryField').style.display=mode==='every'?'':'none';
  };
  window.runSplit=async function(){
    if(!pdfBytes)return;
    const{PDFDocument}=PDFLib;
    const mode=document.querySelector('input[name="splitMode"]:checked').value;
    const prefix=g('splitPrefix').value||'split';
    const useZip=g('splitZip').checked;
    s('splitProgress');h('splitDownload');
    try{
      const srcDoc=await PDFDocument.load(pdfBytes);
      let ranges=[];
      if(mode==='single'){for(let i=0;i<totalPages;i++)ranges.push([i,i]);}
      else if(mode==='every'){const n=parseInt(g('splitEveryN').value)||1;for(let i=0;i<totalPages;i+=n)ranges.push([i,Math.min(i+n-1,totalPages-1)]);}
      else{ranges=parseRanges(g('splitRanges').value,totalPages);}
      const parts=[];
      for(let r=0;r<ranges.length;r++){
        g('splitProgressBar').style.width=Math.round((r+1)/ranges.length*100)+'%';
        g('splitProgressLabel').textContent='Creating part '+(r+1)+'/'+ranges.length;
        const[from,to]=ranges[r];
        const newDoc=await PDFDocument.create();
        const indices=Array.from({length:to-from+1},(_,i)=>from+i);
        const copied=await newDoc.copyPages(srcDoc,indices);
        copied.forEach(p=>newDoc.addPage(p));
        const bytes=await newDoc.save();
        parts.push({name:prefix+'_'+(r+1)+'.pdf',bytes});
        await tick();
      }
      splitResult={parts,useZip,prefix};
      g('splitDownloadInfo').textContent=parts.length+' parts created';
      h('splitProgress');s('splitDownload');
      if(typeof gaTrackProcessDone==='function')gaTrackProcessDone('pdf-split',parts.length,0);
    }catch(e){
      g('splitProgressLabel').textContent='Error: '+e.message;
      if(typeof gaTrackError==='function')gaTrackError('pdf-split','split_failed',e.message);
    }
  };
  window.splitSave=async function(){
    if(!splitResult)return;
    const{parts,useZip,prefix}=splitResult;
    if(useZip&&parts.length>1){
      const zip=new JSZip();
      parts.forEach(p=>zip.file(p.name,p.bytes));
      const blob=await zip.generateAsync({type:'blob'});
      saveAs(blob,prefix+'.zip');
      if(typeof gaTrackDownloadAll==='function')gaTrackDownloadAll('pdf-split',parts.length);
    }else{
      parts.forEach(p=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([p.bytes],{type:'application/pdf'}));a.download=p.name;a.click();});
      if(typeof gaTrackDownload==='function')gaTrackDownload('pdf-split','application/pdf');
    }
  };
  window.splitReset=function(){
    pdfBytes=null;totalPages=0;splitResult=null;fi.value='';
    ['splitFileCard','splitSettings','splitLoading','splitProgress','splitDownload'].forEach(h);
    s('splitUploadZone');
  };
  function parseRanges(str,max){
    if(!str)return[[0,max-1]];
    return str.split(',').map(p=>{p=p.trim();if(p.includes('-')){const[a,b]=p.split('-').map(n=>parseInt(n)-1);return[Math.max(0,a),Math.min(max-1,b)];}return[parseInt(p)-1,parseInt(p)-1];}).filter(([a,b])=>a>=0&&b<max&&a<=b);
  }
  function g(id){return document.getElementById(id);}
  function s(id){const e=g(id);if(e)e.style.display='';}
  function h(id){const e=g(id);if(e)e.style.display='none';}
  function fmt(n){return n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(2)+' MB';}
  function tick(){return new Promise(r=>setTimeout(r,0));}
})();
