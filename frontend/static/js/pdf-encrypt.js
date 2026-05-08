/** pdf-encrypt.js */
(function(){
  'use strict';
  let pdfBytes=null;
  const zone=document.getElementById('encryptUploadZone');
  const fi=document.getElementById('encryptFileInput');
  fi.addEventListener('change',e=>{if(e.target.files[0])load(e.target.files[0]);});
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);});
  zone.querySelector('.pdf-upload-idle').addEventListener('click',()=>fi.click());
  async function load(file){
    pdfBytes=await file.arrayBuffer();
    const{PDFDocument}=PDFLib;const doc=await PDFDocument.load(pdfBytes,{ignoreEncryption:true});
    g('encryptFileName').textContent=file.name;
    g('encryptFileMeta').textContent=doc.getPageCount()+' pages - '+fmt(file.size);
    h('encryptUploadZone');s('encryptFileCard');s('encryptSettings');
  }
  window.runEncrypt=async function(){
    if(!pdfBytes)return;
    const userPwd=g('encryptUserPwd').value;
    const ownerPwd=g('encryptOwnerPwd').value||userPwd+'_owner';
    if(!userPwd){g('encryptPwdError').textContent='Please enter a user password.';s('encryptPwdError');return;}
    h('encryptPwdError');s('encryptLoading');h('encryptDownload');
    try{
      const{PDFDocument}=PDFLib;
      const doc=await PDFDocument.load(pdfBytes,{ignoreEncryption:true});
      const permissions={
        printing:g('perm_print').checked?'highResolution':undefined,
        copying:g('perm_copy').checked,
        modifying:g('perm_modify').checked,
        annotating:g('perm_annot').checked,
        fillingForms:g('perm_fill').checked,
        contentAccessibility:true,
        documentAssembly:g('perm_assemble').checked
      };
      const out=await doc.save({userPassword:userPwd,ownerPassword:ownerPwd,permissions});
      const blob=new Blob([out],{type:'application/pdf'});
      const a=g('encryptDownloadLink');a.href=URL.createObjectURL(blob);a.download='encrypted.pdf';
      g('encryptDownloadInfo').textContent='AES-256 encrypted - '+fmt(out.byteLength);
      h('encryptLoading');s('encryptDownload');
      if(typeof gaTrackProcessDone==='function')gaTrackProcessDone('pdf-encrypt',1,0);
      if(a)a.addEventListener('click',function(){if(typeof gaTrackDownload==='function')gaTrackDownload('pdf-encrypt','application/pdf');});
    }catch(e){
      g('encryptLoading').innerHTML='<p class="pdf-error">Error: '+e.message+'</p>';
      if(typeof gaTrackError==='function')gaTrackError('pdf-encrypt','encrypt_failed',e.message);
    }
  };
  window.encryptReset=function(){pdfBytes=null;fi.value='';['encryptFileCard','encryptSettings','encryptLoading','encryptDownload','encryptPwdError'].forEach(h);s('encryptUploadZone');};
  function g(id){return document.getElementById(id);}
  function s(id){const e=g(id);if(e)e.style.display='';}
  function h(id){const e=g(id);if(e)e.style.display='none';}
  function fmt(n){return n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(2)+' MB';}
})();
