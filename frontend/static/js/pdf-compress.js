/** pdf-compress.js */
(function(){
  'use strict';
  let pdfBytes=null,origSize=0;
  const zone=document.getElementById('compressUploadZone');
  const fi=document.getElementById('compressFileInput');
  fi.addEventListener('change',e=>{if(e.target.files[0])load(e.target.files[0]);});
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);});
  zone.querySelector('.pdf-upload-idle').addEventListener('click',()=>fi.click());
  document.querySelectorAll('.compress-level').forEach(el=>{
    el.addEventListener('click',()=>{document.querySelectorAll('.compress-level').forEach(e=>e.classList.remove('compress-level--active'));el.classList.add('compress-level--active');});
  });
  async function load(file){
    pdfBytes=await file.arrayBuffer();origSize=file.size;
    const{PDFDocument}=PDFLib;const doc=await PDFDocument.load(pdfBytes);
    g('compressFileName').textContent=file.name;
    g('compressFileMeta').textContent=doc.getPageCount()+' pages - '+fmt(file.size);
    h('compressUploadZone');s('compressFileCard');s('compressSettings');
  }
  window.runCompress=async function(){
    if(!pdfBytes)return;
    const stripMeta=g('compressStrip').checked;
    s('compressProgress');h('compressDownload');
    g('compressProgressBar').style.width='10%';
    g('compressProgressLabel').textContent='Loading PDF...';
    try{
      const{PDFDocument}=PDFLib;
      const doc=await PDFDocument.load(pdfBytes);
      await tick();
      g('compressProgressBar').style.width='40%';
      g('compressProgressLabel').textContent='Compressing...';
      if(stripMeta){
        doc.setTitle('');doc.setAuthor('');doc.setSubject('');
        doc.setKeywords([]);doc.setProducer('json');doc.setCreator('');
      }
      await tick();
      g('compressProgressBar').style.width='80%';
      const out=await doc.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:50});
      g('compressProgressBar').style.width='100%';
      const newSize=out.byteLength;
      const saved=origSize-newSize;
      const pct=Math.round(saved/origSize*100);
      const blob=new Blob([out],{type:'application/pdf'});
      const a=g('compressDownloadLink');a.href=URL.createObjectURL(blob);a.download='compressed.pdf';
      g('compressSavings').textContent=pct>0?'Saved '+fmt(Math.abs(saved))+' ('+pct+'% smaller)':'Metadata stripped - '+fmt(newSize);
      g('compressDownloadInfo').textContent=fmt(origSize)+' to '+fmt(newSize);
      h('compressProgress');s('compressDownload');
      if(typeof gaTrackProcessDone==='function')gaTrackProcessDone('pdf-compress',1,0);
      const a=g('compressDownloadLink');
      if(a)a.addEventListener('click',function(){if(typeof gaTrackDownload==='function')gaTrackDownload('pdf-compress','application/pdf');});
    }catch(e){
      g('compressProgressLabel').textContent='Error: '+e.message;
      if(typeof gaTrackError==='function')gaTrackError('pdf-compress','compress_failed',e.message);
    }
  };
  window.compressReset=function(){pdfBytes=null;origSize=0;fi.value='';['compressFileCard','compressSettings','compressLoading','compressProgress','compressDownload'].forEach(h);s('compressUploadZone');};
  function g(id){return document.getElementById(id);}
  function s(id){const e=g(id);if(e)e.style.display='';}
  function h(id){const e=g(id);if(e)e.style.display='none';}
  function fmt(n){return n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(2)+' MB';}
  function tick(){return new Promise(r=>setTimeout(r,0));}
})();
