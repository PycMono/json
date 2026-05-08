/** pdf-merge.js */
(function(){
  'use strict';
  let files=[],dragSrc=null;
  const zone=document.getElementById('mergeUploadZone');
  const fi=document.getElementById('mergeFileInput');
  fi.addEventListener('change',e=>addFiles(Array.from(e.target.files)));
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');addFiles(Array.from(e.dataTransfer.files).filter(f=>f.type==='application/pdf'));});
  zone.querySelector('.pdf-upload-idle').addEventListener('click',()=>fi.click());
  function addFiles(newFiles){
    newFiles.forEach(f=>{const reader=new FileReader();reader.onload=e=>{files.push({file:f,buf:e.target.result});renderList();};reader.readAsArrayBuffer(f);});
  }
  function renderList(){
    const list=document.getElementById('mergeFileList');
    list.innerHTML='';
    files.forEach((item,idx)=>{
      const row=document.createElement('div');
      row.className='merge-file-row';row.draggable=true;
      row.innerHTML='<span class="merge-file-row__handle">&#8943;</span><span class="merge-file-row__icon">&#128196;</span><span class="merge-file-row__name">'+item.file.name+'</span><span class="merge-file-row__meta">'+fmt(item.file.size)+'</span><button class="merge-file-row__remove" onclick="mergeRemove('+idx+')">&#x2715;</button>';
      row.addEventListener('dragstart',()=>{dragSrc=idx;row.classList.add('dragging');});
      row.addEventListener('dragend',()=>{row.classList.remove('dragging');dragSrc=null;});
      row.addEventListener('dragover',e=>e.preventDefault());
      row.addEventListener('drop',e=>{e.preventDefault();if(dragSrc!==null&&dragSrc!==idx){const t=files[dragSrc];files[dragSrc]=files[idx];files[idx]=t;renderList();}});
      list.appendChild(row);
    });
    document.getElementById('mergeFileCount').textContent='('+files.length+')';
    document.getElementById('mergeList').style.display=files.length?'':'none';
    zone.style.display=files.length?'none':'';
  }
  window.mergeRemove=function(i){files.splice(i,1);renderList();};
  window.mergeAddMore=function(){fi.click();};
  window.mergeClearAll=function(){
    files=[];renderList();
    ['mergeLoading','mergeProgress','mergeDownload'].forEach(h);
  };
  window.runMerge=async function(){
    if(!files.length)return;
    const{PDFDocument}=PDFLib;
    s('mergeProgress');
    try{
      const merged=await PDFDocument.create();
      for(let i=0;i<files.length;i++){
        document.getElementById('mergeProgressLabel').textContent='Merging file '+(i+1)+'/'+files.length;
        document.getElementById('mergeProgressBar').style.width=Math.round((i+1)/files.length*100)+'%';
        const src=await PDFDocument.load(files[i].buf);
        const pages=await merged.copyPages(src,src.getPageIndices());
        pages.forEach(p=>merged.addPage(p));
        await tick();
      }
      const out=await merged.save();
      const blob=new Blob([out],{type:'application/pdf'});
      const name=(document.getElementById('mergeFilename').value||'merged').replace(/\.pdf$/i,'')+'.pdf';
      const a=document.getElementById('mergeDownloadLink');
      a.href=URL.createObjectURL(blob);a.download=name;
      document.getElementById('mergeDownloadInfo').textContent=files.length+' files merged - '+fmt(out.byteLength);
      h('mergeProgress');s('mergeDownload');
      if(typeof gaTrackProcessDone==='function')gaTrackProcessDone('pdf-merge',files.length,0);
      a.addEventListener('click',function(){
        if(typeof gaTrackDownload==='function')gaTrackDownload('pdf-merge','application/pdf');
      });
    }catch(e){
      document.getElementById('mergeProgressLabel').textContent='Error: '+e.message;
      if(typeof gaTrackError==='function')gaTrackError('pdf-merge','merge_failed',e.message);
    }
  };
  function g(id){return document.getElementById(id);}
  function s(id){const e=g(id);if(e)e.style.display='';}
  function h(id){const e=g(id);if(e)e.style.display='none';}
  function fmt(n){return n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(2)+' MB';}
  function tick(){return new Promise(r=>setTimeout(r,0));}
})();
