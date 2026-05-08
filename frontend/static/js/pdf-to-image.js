/** pdf-to-image.js */
(function(){
  'use strict';
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let pdfDoc=null,convertedBlobs=[];
  const zone=document.getElementById('toImgUploadZone');
  const fi=document.getElementById('toImgFileInput');
  fi.addEventListener('change',e=>{if(e.target.files[0])load(e.target.files[0]);});
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);});
  zone.querySelector('.pdf-upload-idle').addEventListener('click',()=>fi.click());
  document.getElementById('toImgFormat').addEventListener('change',function(){
    document.getElementById('toImgQualityField').style.display=this.value==='jpeg'?'':'none';
  });
  async function load(file){
    try{
      pdfDoc=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
      g('toImgFileName').textContent=file.name;
      g('toImgFileMeta').textContent=pdfDoc.numPages+' pages - '+fmt(file.size);
      h('toImgUploadZone');s('toImgFileCard');s('toImgSettings');
    }catch(e){alert(e.message);if(typeof gaTrackError==='function')gaTrackError('pdf-to-image','load_failed',e.message);}
  }
  window.runToImage=async function(){
    if(!pdfDoc)return;
    const format=g('toImgFormat').value;
    const scale=parseFloat(g('toImgDPI').value)||2;
    const quality=parseInt(g('toImgQuality').value)/100;
    const pages=parseRange(g('toImgRange').value.trim(),pdfDoc.numPages);
    convertedBlobs=[];
    h('toImgSettings');s('toImgProgress');h('toImgPreviewWrap');
    const grid=g('toImgPreviewGrid');grid.innerHTML='';
    for(let i=0;i<pages.length;i++){
      const p=pages[i];
      g('toImgProgressBar').style.width=Math.round((i+1)/pages.length*100)+'%';
      g('toImgProgressLabel').textContent='Converting page '+p+'/'+pdfDoc.numPages;
      const page=await pdfDoc.getPage(p);
      const vp=page.getViewport({scale});
      const canvas=document.createElement('canvas');
      canvas.width=vp.width;canvas.height=vp.height;
      await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
      const mimeType='image/'+format;
      const blob=await new Promise(res=>canvas.toBlob(res,mimeType,quality));
      const url=URL.createObjectURL(blob);
      convertedBlobs.push({name:'page_'+p+'.'+format,blob,url});
      const thumb=document.createElement('div');
      thumb.className='pdf-thumb-item';
      const img=document.createElement('img');
      img.src=url;img.style.width='100%';img.style.display='block';
      const num=document.createElement('span');
      num.className='pdf-thumb-item__num';num.textContent='Page '+p;
      thumb.appendChild(img);thumb.appendChild(num);
      grid.appendChild(thumb);
      await tick();
    }
    g('toImgConvertedCount').textContent='('+convertedBlobs.length+')';
    h('toImgProgress');s('toImgPreviewWrap');s('toImgSettings');
    if(typeof gaTrackProcessDone==='function')gaTrackProcessDone('pdf-to-image',convertedBlobs.length,0);
  };
  window.toImgSave=async function(){
    if(!convertedBlobs.length)return;
    if(g('toImgZip').checked&&convertedBlobs.length>1){
      const zip=new JSZip();
      convertedBlobs.forEach(b=>zip.file(b.name,b.blob));
      const zblob=await zip.generateAsync({type:'blob'});
      saveAs(zblob,'pdf-images.zip');
      if(typeof gaTrackDownloadAll==='function')gaTrackDownloadAll('pdf-to-image',convertedBlobs.length);
    }else{
      convertedBlobs.forEach(b=>{const a=document.createElement('a');a.href=b.url;a.download=b.name;a.click();});
      if(typeof gaTrackDownload==='function')gaTrackDownload('pdf-to-image','image/'+g('toImgFormat').value);
    }
  };
  window.toImgReset=function(){
    pdfDoc=null;convertedBlobs=[];fi.value='';
    ['toImgFileCard','toImgSettings','toImgLoading','toImgProgress','toImgPreviewWrap'].forEach(h);
    s('toImgUploadZone');
  };
  function parseRange(str,max){if(!str)return Array.from({length:max},(_,i)=>i+1);const s=new Set();str.split(',').forEach(p=>{p=p.trim();if(p.includes('-')){const[a,b]=p.split('-').map(Number);for(let i=Math.max(1,a);i<=Math.min(max,b);i++)s.add(i);}else{const n=+p;if(n>=1&&n<=max)s.add(n);}});return[...s].sort((a,b)=>a-b);}
  function g(id){return document.getElementById(id);}
  function s(id){const e=g(id);if(e)e.style.display='';}
  function h(id){const e=g(id);if(e)e.style.display='none';}
  function fmt(n){return n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(2)+' MB';}
  function tick(){return new Promise(r=>setTimeout(r,0));}
})();
