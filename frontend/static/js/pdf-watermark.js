/** pdf-watermark.js */
(function(){
  'use strict';
  let pdfBytes=null,wmImgBytes=null,selectedPos='mc';
  const zone=document.getElementById('wmUploadZone');
  const fi=document.getElementById('wmFileInput');
  fi.addEventListener('change',e=>{if(e.target.files[0])load(e.target.files[0]);});
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);});
  zone.querySelector('.pdf-upload-idle').addEventListener('click',()=>fi.click());
  document.getElementById('wmImageInput').addEventListener('change',async function(){
    if(this.files[0]){wmImgBytes=await this.files[0].arrayBuffer();g('wmImageName').textContent=this.files[0].name;}
  });
  document.querySelectorAll('.wm-pos-btn').forEach(btn=>{
    btn.addEventListener('click',function(){
      document.querySelectorAll('.wm-pos-btn').forEach(b=>b.classList.remove('wm-pos-btn--active'));
      this.classList.add('wm-pos-btn--active');selectedPos=this.dataset.pos;
    });
  });
  async function load(file){
    pdfBytes=await file.arrayBuffer();
    const{PDFDocument}=PDFLib;const doc=await PDFDocument.load(pdfBytes);
    g('wmFileName').textContent=file.name;
    g('wmFileMeta').textContent=doc.getPageCount()+' pages - '+fmt(file.size);
    h('wmUploadZone');s('wmFileCard');s('wmSettings');
  }
  window.wmTypeChange=function(){
    const isText=document.querySelector('input[name="wmType"]:checked').value==='text';
    g('wmTextFields').style.display=isText?'contents':'none';
    g('wmImageFields').style.display=isText?'none':'';
  };
  window.runWatermark=async function(){
    if(!pdfBytes)return;
    const{PDFDocument,rgb,degrees,StandardFonts}=PDFLib;
    s('wmLoading');h('wmDownload');
    try{
      const doc=await PDFDocument.load(pdfBytes);
      const pages=parsePagesStr(g('wmPages').value,doc.getPageCount());
      const opacity=parseInt(g('wmOpacity').value)/100;
      const rotation=parseInt(g('wmRotation').value);
      const isText=document.querySelector('input[name="wmType"]:checked').value==='text';
      if(isText){
        const font=await doc.embedFont(StandardFonts.HelveticaBold);
        const text=g('wmText').value||'WATERMARK';
        const fontSize=parseInt(g('wmFontSize').value)||48;
        const hex=g('wmColor').value;
        const r=parseInt(hex.slice(1,3),16)/255,gr=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
        for(const pi of pages){
          const page=doc.getPage(pi);const{width,height}=page.getSize();
          const tw=font.widthOfTextAtSize(text,fontSize);const th=fontSize;
          const[x,y]=calcPos(selectedPos,width,height,tw,th);
          page.drawText(text,{x,y,size:fontSize,font,color:rgb(r,gr,b),opacity,rotate:degrees(rotation)});
        }
      }else{
        if(!wmImgBytes){alert('Please choose a watermark image.');h('wmLoading');return;}
        const imgEmbed=await(async()=>{try{return await doc.embedPng(wmImgBytes);}catch{return await doc.embedJpg(wmImgBytes);}})();
        const imgDims=imgEmbed.scale(0.3);
        for(const pi of pages){
          const page=doc.getPage(pi);const{width,height}=page.getSize();
          const[x,y]=calcPos(selectedPos,width,height,imgDims.width,imgDims.height);
          page.drawImage(imgEmbed,{x,y,width:imgDims.width,height:imgDims.height,opacity,rotate:degrees(rotation)});
        }
      }
      const out=await doc.save();
      const blob=new Blob([out],{type:'application/pdf'});
      const a=g('wmDownloadLink');a.href=URL.createObjectURL(blob);a.download='watermarked.pdf';
      g('wmDownloadInfo').textContent=fmt(out.byteLength);
      h('wmLoading');s('wmDownload');
      if(typeof gaTrackProcessDone==='function')gaTrackProcessDone('pdf-watermark',1,0);
      if(a)a.addEventListener('click',function(){if(typeof gaTrackDownload==='function')gaTrackDownload('pdf-watermark','application/pdf');});
    }catch(e){
      g('wmLoadingMsg').textContent='Error: '+e.message;
      if(typeof gaTrackError==='function')gaTrackError('pdf-watermark','watermark_failed',e.message);
    }
  };
  function calcPos(pos,w,h,tw,th){
    const pad=30;
    const map={tl:[pad,h-th-pad],tc:[(w-tw)/2,h-th-pad],tr:[w-tw-pad,h-th-pad],ml:[pad,(h-th)/2],mc:[(w-tw)/2,(h-th)/2],mr:[w-tw-pad,(h-th)/2],bl:[pad,pad],bc:[(w-tw)/2,pad],br:[w-tw-pad,pad]};
    return map[pos]||map.mc;
  }
  function parsePagesStr(str,max){
    if(!str)return Array.from({length:max},(_,i)=>i);
    const s=new Set();
    str.split(',').forEach(p=>{p=p.trim();if(p.includes('-')){const[a,b]=p.split('-').map(n=>parseInt(n)-1);for(let i=Math.max(0,a);i<=Math.min(max-1,b);i++)s.add(i);}else{const n=parseInt(p)-1;if(n>=0&&n<max)s.add(n);}});
    return[...s];
  }
  window.wmReset=function(){pdfBytes=null;wmImgBytes=null;fi.value='';['wmFileCard','wmSettings','wmLoading','wmDownload'].forEach(h);s('wmUploadZone');};
  function g(id){return document.getElementById(id);}
  function s(id){const e=g(id);if(e)e.style.display='';}
  function h(id){const e=g(id);if(e)e.style.display='none';}
  function fmt(n){return n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(2)+' MB';}
})();
