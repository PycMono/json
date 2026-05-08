/* ============================================================
   privacy-check.js — Privacy Account Checker
   Extracted from inline scripts, merged with password-checker logic
   ============================================================ */

(function () {
  'use strict';

  /* ─── Common passwords list (merged from password-checker.js) ─── */
  var COMMON = ['password','123456','12345678','qwerty','abc123','monkey','1234567','letmein',
    'trustno1','dragon','baseball','iloveyou','master','sunshine','ashley','bailey','shadow',
    'passw0rd','password1','princess','football','charlie','access','hello','thunder','admin',
    'login','welcome','qwerty123','123qwe'];

  /* ─── State ─── */
  window.PC = {eB:0,pB:0,bA:[],bF:[],bSh:24,bFl:'all',bSo:'date',bSe:'',bOk:0,lG:'',lGBatch:[],_st:null,_ft:null,_bMap:{},_health:null,histPage:0,histOpen:true,histPassPlain:false};

  /* ─── Translation object (injected from template) ─── */
  // var T = { ... }; // set in template extraScript

  /* ─── Helpers ─── */
  function rl(k){return{critical:T.rC,high:T.rH,medium:T.rM,low:T.rL}[k]||k;}
  function pcLogoUrl(b){
    var name='';
    if(b.LogoPath){var p=b.LogoPath.split('/');name=p[p.length-1];}
    else name=pcE(b.Name||'')+(b.Name&&b.Name.indexOf('.')<0?'.png':'');
    return name?'/api/privacy/logo/'+name:'';
  }
  function pcFmt(n){return typeof n==='number'?n.toLocaleString():'0';}
  function pcFmtK(n){if(n>=1e9)return(n/1e9).toFixed(1)+'B';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return String(n);}
  function pcE(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  /* ─── Tabs ─── */
  window.pcTab = function(n){
    document.querySelectorAll('.pc-pnl').forEach(function(p){p.classList.remove('active');});
    document.querySelectorAll('.pc-tab').forEach(function(t){t.classList.remove('active');t.setAttribute('aria-selected','false');});
    var p=document.getElementById('panel-'+n),b=document.querySelector('[data-tab="'+n+'"]');
    if(p)p.classList.add('active');
    if(b){b.classList.add('active');b.setAttribute('aria-selected','true');pcSl(b);}
    if(n==='breaches'&&!PC.bOk)pcLdB();
    if(n==='generator'&&!PC.lG)pcGen();
  };
  function pcSl(b){var s=document.getElementById('pcSlider');if(!s||!b)return;s.style.width=b.offsetWidth+'px';s.style.transform='translateX('+b.offsetLeft+'px)';}
  window.addEventListener('load',function(){var a=document.querySelector('.pc-tab.active');if(a)setTimeout(function(){pcSl(a);},60);});
  window.addEventListener('resize',function(){var a=document.querySelector('.pc-tab.active');if(a)pcSl(a);});

  /* ─── Email Check ─── */
  window.pcCheckEmail = async function(){
    var em=(document.getElementById('emailInput').value||'').trim();
    if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)||em.length>254){pcTst(T.eE,'e');return;}
    if(PC.eB)return;PC.eB=1;pcSh('shieldEmail','checking');pcBL('btnEmail',1);
    var ph=document.getElementById('emailPlaceholder');if(ph)ph.style.display='none';
    try{
      var r=await fetch('/api/privacy/check-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em})});
      if(!r.ok)throw new Error(''+r.status);
      var d=await r.json();
      var ar=document.getElementById('emailResult');ar.style.display='block';
      if(d.safe||(d.fallback&&!d.message)||(!d.fallback&&d.breaches&&!d.breaches.length)){
        pcSh('shieldEmail','safe');ar.innerHTML=pcHs(T.eS,T.eSd);
      }else if(d.fallback){
        pcSh('shieldEmail','safe');ar.innerHTML=pcHs(T.eS,T.eSd);
      }else if(d.breaches&&d.breaches.length){
        pcSh('shieldEmail','danger');pcRB(ar,d.breaches);
      }else{
        pcSh('shieldEmail','safe');ar.innerHTML=pcHs(T.eS,T.eSd);
      }
      if(typeof gaTrackProcessDone==='function')gaTrackProcessDone('privacy-check',1,0);
    }catch(e){
      var ar=document.getElementById('emailResult');ar.style.display='block';
      pcSh('shieldEmail','');ar.innerHTML='<div class="pc-rh"><div class="pc-ri"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="var(--am)" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="pc-rt">'+pcE(T.eN)+'</div><div class="pc-rd">'+pcE(T.fb)+'</div></div>';
      if(typeof gaTrackError==='function')gaTrackError('privacy-check','email_check_failed',e.message);
    }
    finally{PC.eB=0;pcBL('btnEmail',0);}
  };
  function pcRB(ar,bs){
    var rk=pcRisk(bs),tot=bs.reduce(function(s,b){return s+(b.PwnCount||0);},0);
    var h='<div class="pc-ov"><div class="pc-ovh"><span class="pc-rk pc-rk--'+rk+'">'+pcE(rl(rk))+'</span><span class="pc-ovt">'+pcE(T.eP)+'</span></div>'
      +'<p class="pc-ovd">'+pcE(T.ePd.replace('{count}',bs.length))+'</p>'
      +'<div class="pc-sts"><div><div class="pc-sn">'+bs.length+'</div><div class="pc-sl">'+pcE(T.bD)+'</div></div>'
      +'<div><div class="pc-sn">'+pcFmt(tot)+'</div><div class="pc-sl">'+pcE(T.bR)+'</div></div></div></div>';

    // Health score
    h += pcRenderHealth(bs);
    // Breach timeline
    h += pcRenderTimeline(bs);
    // Breach cards
    h+='<div class="pc-bl">';
    bs.forEach(function(b,i){h+=pcBCard(b,i);});
    h+='</div>'+pcAdvP(bs);
    // Export button
    h+='<div class="pc-export"><button class="pc-export-btn" onclick="pcExportResults()">📋 '+pcE(T.exportBtn||'Export Results')+'</button></div>';
    ar.innerHTML=h;
  }

  /* ─── Health Score ─── */
  function pcHealthScore(breaches){
    if(!breaches||!breaches.length)return{score:100,color:'var(--gr)',label:T.healthExcellent||'Excellent'};
    var penalty=0;
    breaches.forEach(function(b){
      var c=b.DataClasses||[];
      if(c.indexOf('Passwords')>=0||c.indexOf('Credit cards')>=0)penalty+=15;
      else if(c.indexOf('Email addresses')>=0)penalty+=5;
      else penalty+=3;
      if((b.PwnCount||0)>1e8)penalty+=5;
    });
    var score=Math.max(0,Math.min(100,100-penalty));
    var color,label;
    if(score>=80){color='var(--gr)';label=T.healthExcellent||'Excellent';}
    else if(score>=60){color='var(--cy)';label=T.healthGood||'Good';}
    else if(score>=40){color='var(--am)';label=T.healthFair||'Fair';}
    else if(score>=20){color='#F97316';label=T.healthPoor||'Poor';}
    else{color='var(--rd)';label=T.healthCritical||'Critical';}
    return{score:score,color:color,label:label};
  }
  function pcRenderHealth(breaches){
    var hs=pcHealthScore(breaches);
    var circumference=2*Math.PI*50; // r=50
    var offset=circumference-(hs.score/100)*circumference;
    return'<div class="pc-health">'
      +'<div class="pc-health-ring"><svg viewBox="0 0 120 120">'
      +'<circle class="pc-hr-bg" cx="60" cy="60" r="50"/>'
      +'<circle class="pc-hr-fg" cx="60" cy="60" r="50" stroke="'+hs.color+'" stroke-dasharray="'+circumference+'" stroke-dashoffset="'+offset+'"/>'
      +'</svg><div class="pc-health-val" style="color:'+hs.color+'">'+hs.score+'</div></div>'
      +'<div class="pc-health-label" style="color:'+hs.color+'">'+pcE(hs.label)+'</div>'
      +'<div class="pc-health-desc">'+pcE((T.healthDesc||'Based on {count} breach(es)').replace('{count}',breaches.length))+'</div>'
      +'</div>';
  }

  /* ─── Breach Timeline ─── */
  function pcRenderTimeline(breaches){
    if(!breaches||!breaches.length)return'';
    var sorted=breaches.slice().sort(function(a,b){return new Date(b.BreachDate)-new Date(a.BreachDate);});
    var h='<div class="pc-tl">';
    sorted.forEach(function(b){
      var rk=pcRisk([b]);
      h+='<div class="pc-tl-item"><div class="pc-tl-dot'+(rk==='low'?' pc-tl-dot--low':'')+'"></div>'
        +'<div class="pc-tl-date">'+pcE(b.BreachDate||'')+'</div>'
        +'<div class="pc-tl-name">'+pcE(b.Title||b.Name)+'</div></div>';
    });
    h+='</div>';
    return h;
  }

  /* ─── Password Check ─── */
  window.pcCheckPassword = async function(){
    var pw=document.getElementById('passInput').value||'';
    if(!pw){pcTst(T.ePs,'e');return;}
    if(PC.pB)return;PC.pB=1;pcSh('shieldPass','checking');pcBL('btnPass',1);
    try{
      if(typeof sha1!=='function')throw new Error('sha1 not loaded');
      var full=sha1(pw).toUpperCase(),pre=full.substring(0,5),suf=full.substring(5);
      var r=await fetch('/api/privacy/password-range/'+pre);
      var txt=await r.text(),cnt=0;
      if(txt)txt.split('\n').forEach(function(l){var p=l.split(':');if(p.length===2&&p[0].trim()===suf)cnt=parseInt(p[1].trim(),10)||0;});
      var ar=document.getElementById('passResult');ar.style.display='block';
      if(cnt>0){pcSh('shieldPass','danger');ar.innerHTML=pcHp(cnt);}
      else{pcSh('shieldPass','safe');ar.innerHTML=pcHs(T.pS,T.pSd);}
      if(typeof gaTrackProcessDone==='function')gaTrackProcessDone('privacy-check',1,0);
    }catch(e){pcSh('shieldPass','');pcTst(T.eN,'e');if(typeof gaTrackError==='function')gaTrackError('privacy-check','password_check_failed',e.message);}
    finally{PC.pB=0;pcBL('btnPass',0);}
  };

  /* ─── Strength Analysis (enhanced with password-checker checks) ─── */
  window.pcStr = function(v){
    clearTimeout(PC._st);
    PC._st=setTimeout(function(){
      if(!v){document.getElementById('strArea').style.display='none';return;}
      if(typeof zxcvbn!=='function')return;
      var r=zxcvbn(v);
      document.getElementById('strArea').style.display='block';
      var ws=[8,25,50,75,100],cs=['var(--rd)','#F97316','var(--am)','var(--gr)','var(--cy)'];
      var f=document.getElementById('strFill');f.style.width=ws[r.score]+'%';f.style.background=cs[r.score];
      var l=document.getElementById('strLabel');l.textContent=T.ss[r.score];l.style.color=cs[r.score];
      var ct=r.crack_times_display&&r.crack_times_display.offline_slow_hashing_1e4_per_second
        ?T.sc+': '+r.crack_times_display.offline_slow_hashing_1e4_per_second:'';
      document.getElementById('strTime').textContent=ct;
      var sg='';
      if(r.feedback&&r.feedback.warning)sg+='<div class="pc-sw">\u26a0 '+pcE(r.feedback.warning)+'</div>';
      if(r.feedback&&r.feedback.suggestions&&r.feedback.suggestions.length)
        sg+='<ul>'+r.feedback.suggestions.map(function(s){return'<li>'+pcE(s)+'</li>';}).join('')+'</ul>';
      document.getElementById('strSugg').innerHTML=sg;

      // Enhanced check items (from password-checker.js)
      pcRenderChecks(v);
    },200);
  };

  /* ─── Password Check Items ─── */
  function pcRenderChecks(pwd){
    var el=document.getElementById('passChecks');
    if(!el)return;
    var len=pwd.length;
    var hasLower=/[a-z]/.test(pwd);
    var hasUpper=/[A-Z]/.test(pwd);
    var hasDigit=/[0-9]/.test(pwd);
    var hasSymbol=/[^a-zA-Z0-9]/.test(pwd);
    var sequential=0;
    for(var i=0;i<len-2;i++){
      if(pwd.charCodeAt(i)+1===pwd.charCodeAt(i+1)&&pwd.charCodeAt(i+1)+1===pwd.charCodeAt(i+2))sequential++;
    }
    var repeated=/(.)\1{2,}/.test(pwd);
    var isCommon=COMMON.indexOf(pwd.toLowerCase())!==-1;

    var checks=[
      {pass:len>=8,label:(T.checkLen||'Length ({len} chars)').replace('{len}',len)},
      {pass:hasLower,label:T.checkLower||'Lowercase (a-z)'},
      {pass:hasUpper,label:T.checkUpper||'Uppercase (A-Z)'},
      {pass:hasDigit,label:T.checkNum||'Numbers (0-9)'},
      {pass:hasSymbol,label:T.checkSym||'Symbols (!@#$)'},
      {pass:sequential===0,label:T.checkSeq||'No sequential chars'},
      {pass:!repeated,label:T.checkRep||'No repeated chars'},
      {pass:!isCommon,label:T.checkCommon||'Not a common password'}
    ];
    el.innerHTML=checks.map(function(c){
      return'<div class="pc-check '+(c.pass?'pass':'fail')+'">'
        +'<span class="pc-check-icon">'+(c.pass?'✅':'❌')+'</span>'
        +'<span>'+pcE(c.label)+'</span></div>';
    }).join('');
  }

  /* ─── Toggle Password Visibility ─── */
  window.pcToggleEye = function(){
    var i=document.getElementById('passInput'),s=document.getElementById('eyeSvg');
    if(i.type==='password'){
      i.type='text';
      s.innerHTML='<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    }else{
      i.type='password';
      s.innerHTML='<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  };

  /* ─── Breach Browser ─── */
  async function pcLdB(){
    var g=document.getElementById('bcGrid');
    g.innerHTML='<div class="pc-skl" style="height:90px;margin-bottom:8px"></div>'.repeat(3);
    try{
      var r=await fetch('/api/privacy/breaches'),d=await r.json();
      PC.bA=d.breaches||[];PC.bOk=1;pcAp();
    }catch(e){g.innerHTML='<div class="pc-emp">\u26a0 '+pcE(T.eN)+'</div>';}
  }
  window.pcFiltDb=function(){clearTimeout(PC._ft);PC._ft=setTimeout(function(){PC.bSe=(document.getElementById('breachSearch').value||'').toLowerCase();PC.bSh=24;pcAp();},300);};
  window.pcFilter=function(f){PC.bFl=f;PC.bSh=24;document.querySelectorAll('.pc-fb2').forEach(function(b){b.classList.toggle('active',b.dataset.f===f);});pcAp();};
  window.pcSort=function(v){PC.bSo=v;pcAp();};
  function pcAp(){
    var d=PC.bA,s=PC.bSe,f=PC.bFl,so=PC.bSo;
    var fi=d.filter(function(b){
      if(s&&(b.Name||'').toLowerCase().indexOf(s)<0&&(b.Title||'').toLowerCase().indexOf(s)<0)return false;
      if(f==='verified'&&!b.IsVerified)return false;
      if(f==='sensitive'&&!b.IsSensitive)return false;
      return true;
    });
    fi.sort(function(a,b){
      if(so==='date')return new Date(b.BreachDate)-new Date(a.BreachDate);
      if(so==='size')return(b.PwnCount||0)-(a.PwnCount||0);
      return(a.Name||'').localeCompare(b.Name||'');
    });
    PC.bF=fi;PC._bMap={};
    document.getElementById('bcCount').textContent=T.bCt.replace('{count}',fi.length);
    pcRG(fi.slice(0,PC.bSh));
    document.getElementById('loadMoreWrap').style.display=fi.length>PC.bSh?'block':'none';
  }
  function pcRG(list){
    var g=document.getElementById('bcGrid');
    if(!list.length){g.innerHTML='<div class="pc-emp">'+pcE(T.bNo)+'</div>';return;}
    list.forEach(function(b,i){PC._bMap['g'+i]=b;});
    g.innerHTML=list.map(function(b,i){
      var h=Math.min((b.PwnCount||0)/1e8,.25);
      var bg='linear-gradient(135deg,var(--surf) 0%,rgba(239,68,68,'+h.toFixed(3)+') 100%)';
      var logoUrl=pcLogoUrl(b);
      var logo=logoUrl
        ?'<img class="pc-gcl" src="'+logoUrl+'" loading="lazy" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
         +'<div class="pc-gcn2" style="display:none">'+(b.Name||'?').charAt(0)+'</div>'
        :'<div class="pc-gcn2">'+(b.Name||'?').charAt(0)+'</div>';
      return '<div class="pc-gc" style="animation-delay:'+(i*40)+'ms;background:'+bg+';cursor:pointer" onclick="pcODi(\'g'+i+'\')">'
        +'<div class="pc-gch">'+logo+'<div><div class="pc-gcname">'+pcE(b.Title||b.Name)+'</div><div class="pc-gcdate">'+pcE(b.BreachDate||'')+'</div></div></div>'
        +'<div class="pc-gccnt">'+pcFmtK(b.PwnCount||0)+' '+pcE(T.rec)+'</div>'
        +'<div class="pc-gcpl">'+pcPl((b.DataClasses||[]).slice(0,3))+'</div>'
        +'</div>';
    }).join('');
  }
  window.pcODi=function(key){
    var b=PC._bMap[key];if(!b){console.warn('pcODi: key not found -',key);return;}pcOD(b);
  };
  window.pcLoadMore=function(){
    var start=PC.bSh;PC.bSh+=24;
    PC._bMap={};pcRG(PC.bF.slice(0,PC.bSh));
    document.getElementById('loadMoreWrap').style.display=PC.bF.length>PC.bSh?'block':'none';
  };

  /* ─── Detail Modal ─── */
  function pcOD(b){
    if(!b)return;
    var old=document.getElementById('bcMdl');
    if(old&&old.parentNode)old.parentNode.removeChild(old);
    var rk=pcRisk([b]);
    var dataClasses=Array.isArray(b.DataClasses)?b.DataClasses:[];
    var ov=document.createElement('div');ov.className='pc-oly';ov.id='bcMdl';
    ov.addEventListener('click',function(e){if(e.target===ov)pcCD();});
    var mdl=document.createElement('div');mdl.className='pc-mdl';
    var mhd=document.createElement('div');mhd.className='pc-mhd';
    var mtl=document.createElement('div');mtl.className='pc-mtl';
    var logoUrl=pcLogoUrl(b);
    if(logoUrl){
      var img=document.createElement('img');
      img.style.cssText='width:36px;height:36px;border-radius:6px;object-fit:contain;background:var(--bg);flex-shrink:0';img.alt='';
      var fbd=document.createElement('div');
      fbd.style.cssText='width:36px;height:36px;border-radius:6px;background:var(--cy-bg);color:var(--cy);font-weight:800;display:none;align-items:center;justify-content:center;flex-shrink:0';
      fbd.textContent=(b.Name||'?').charAt(0).toUpperCase();
      img.onerror=function(){img.style.display='none';fbd.style.display='flex';};img.src=logoUrl;
      mtl.appendChild(img);mtl.appendChild(fbd);
    }else{
      var fbd=document.createElement('div');
      fbd.style.cssText='width:36px;height:36px;border-radius:6px;background:var(--cy-bg);color:var(--cy);font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0';
      fbd.textContent=(b.Name||'?').charAt(0).toUpperCase();mtl.appendChild(fbd);
    }
    var tspan=document.createElement('span');tspan.textContent=b.Title||b.Name||'';mtl.appendChild(tspan);
    var xbtn=document.createElement('button');xbtn.className='pc-mcl';
    xbtn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    xbtn.addEventListener('click',pcCD);mhd.appendChild(mtl);mhd.appendChild(xbtn);mdl.appendChild(mhd);
    var ms1=document.createElement('div');ms1.className='pc-ms';
    var ml1=document.createElement('div');ml1.className='pc-ml';ml1.textContent=(T.bD||'Date')+' \xb7 '+(T.bR||'Records');
    var mm=document.createElement('div');mm.className='pc-mm';
    var c1=document.createElement('div');c1.className='pc-mmi';c1.innerHTML='<div>'+pcE(T.bD||'Date')+'</div><div>'+pcE(b.BreachDate||'-')+'</div>';mm.appendChild(c1);
    var c2=document.createElement('div');c2.className='pc-mmi';c2.innerHTML='<div>'+pcE(T.bR||'Records')+'</div><div>'+pcFmt(b.PwnCount||0)+'</div>';mm.appendChild(c2);
    var c3=document.createElement('div');c3.className='pc-mmi';var rktag=document.createElement('span');rktag.className='pc-rk pc-rk--'+rk;rktag.textContent=rl(rk);c3.innerHTML='<div>Risk</div><div></div>';c3.lastChild.appendChild(rktag);mm.appendChild(c3);
    var mtg=document.createElement('div');mtg.className='pc-mtg';
    [{flag:b.IsVerified,cls:'pc-stg--gr',label:'Verified'},{flag:b.IsSensitive,cls:'pc-stg--am',label:'Sensitive'},{flag:b.IsFabricated,cls:'pc-stg--rd',label:'Fabricated'},{flag:b.IsSpamList,cls:'pc-stg--gy',label:'Spam List'}].forEach(function(td){if(td.flag){var s=document.createElement('span');s.className='pc-stg '+td.cls;s.textContent=td.label;mtg.appendChild(s);}});
    ms1.appendChild(ml1);ms1.appendChild(mm);ms1.appendChild(mtg);mdl.appendChild(ms1);
    if(dataClasses.length){var ms2=document.createElement('div');ms2.className='pc-ms';var ml2=document.createElement('div');ml2.className='pc-ml';ml2.textContent=T.bDt||'Compromised Data';var pd=document.createElement('div');pd.innerHTML=pcPl(dataClasses);ms2.appendChild(ml2);ms2.appendChild(pd);mdl.appendChild(ms2);}
    if(b.Description){var ms3=document.createElement('div');ms3.className='pc-ms';var ml3=document.createElement('div');ml3.className='pc-ml';ml3.textContent=T.bDs||'Description';var dd=document.createElement('div');dd.className='pc-mdc';dd.innerHTML=b.Description;ms3.appendChild(ml3);ms3.appendChild(dd);mdl.appendChild(ms3);}
    var adv=pcAI(b);if(adv.length){var ms4=document.createElement('div');ms4.className='pc-ms';var ml4=document.createElement('div');ml4.className='pc-ml';ml4.textContent=T.aT||'Recommended Actions';var ul=document.createElement('ul');ul.className='pc-al';adv.forEach(function(a){var li=document.createElement('li');li.className='pc-ai';var ic=document.createElement('span');ic.className='pc-aic';ic.textContent=a.ic;var tx=document.createElement('span');tx.textContent=a.t||'';li.appendChild(ic);li.appendChild(tx);ul.appendChild(li);});ms4.appendChild(ml4);ms4.appendChild(ul);mdl.appendChild(ms4);}
    var mft=document.createElement('div');mft.className='pc-mft';var cbtn=document.createElement('button');cbtn.className='pc-btn pc-btn--o';cbtn.textContent=T.cls||'Close';cbtn.addEventListener('click',pcCD);mft.appendChild(cbtn);mdl.appendChild(mft);
    ov.appendChild(mdl);document.body.appendChild(ov);
    requestAnimationFrame(function(){ov.classList.add('show');});
    document.addEventListener('keydown',pcEH);
  }
  function pcCD(){var m=document.getElementById('bcMdl');if(!m)return;m.classList.remove('show');m.addEventListener('transitionend',function(){if(m.parentNode)m.parentNode.removeChild(m);});document.removeEventListener('keydown',pcEH);}
  function pcEH(e){if(e.key==='Escape')pcCD();}

  /* ─── Generator (enhanced with batch) ─── */
  window.pcGen = function(trackHistory){
    var len=parseInt(document.getElementById('genLen').value,10)||20,qty=parseInt(document.getElementById('genQty')?document.getElementById('genQty').value:'1',10)||1;
    var cs='';
    if(document.getElementById('genUpper').checked)cs+='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if(document.getElementById('genLower').checked)cs+='abcdefghijklmnopqrstuvwxyz';
    if(document.getElementById('genNums').checked)cs+='0123456789';
    if(document.getElementById('genSyms').checked)cs+='!@#$%^&*()_+-=[]{}|;:,.<>?';
    if(document.getElementById('genNoAmb').checked)cs=cs.replace(/[0OIl1|]/g,'');
    if(!cs)return;
    var arr=new Uint32Array(len);crypto.getRandomValues(arr);
    var pwd='';for(var i=0;i<len;i++)pwd+=cs[arr[i]%cs.length];
    PC.lG=pwd;document.getElementById('genText').textContent=pwd;
    // Strength
    if(typeof zxcvbn==='function'){
      var r=zxcvbn(pwd),ws=[8,25,50,75,100],cs2=['var(--rd)','#F97316','var(--am)','var(--gr)','var(--cy)'];
      document.getElementById('genStrW').style.display='block';
      var f=document.getElementById('genStrF');f.style.width=ws[r.score]+'%';f.style.background=cs2[r.score];
      var sl=document.getElementById('genStrL');sl.textContent=T.ss[r.score];sl.style.color=cs2[r.score];
    }
    pcTst(T.tG,'s');
    // Batch
    if(qty>1){
      PC.lGBatch=[pwd];
      for(var j=1;j<qty;j++){var arr2=new Uint32Array(len);crypto.getRandomValues(arr2);var p2='';for(var k=0;k<len;k++)p2+=cs[arr2[k]%cs.length];PC.lGBatch.push(p2);}
      var bel=document.getElementById('genBatch');
      if(bel){
        bel.style.display='block';
        bel.innerHTML=PC.lGBatch.map(function(p,i){
          return'<div class="pc-gen-batch-item"><span class="pc-gen-batch-num">#'+(i+1)+'</span>'
            +'<span class="pc-gen-batch-pw">'+pcE(p)+'</span>'
            +'<button class="pc-gen-batch-copy" onclick="pcCopyBatchItem('+i+')">'+pcE(T.copyBtn||'Copy')+'</button></div>';
        }).join('');
      }
      var caWrap=document.getElementById('copyAllWrap');if(caWrap)caWrap.style.display='block';
    }else{
      PC.lGBatch=[pwd];
      var bel=document.getElementById('genBatch');if(bel)bel.style.display='none';
      var caWrap=document.getElementById('copyAllWrap');if(caWrap)caWrap.style.display='none';
    }
    if(trackHistory&&PC.lG)pcAddHistory('gen',PC.lG,'generated');
  };
  window.pcCopyGen = async function(){
    var txt=PC.lG;if(!txt)return;
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(txt);
      else{var ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}
      pcTst(T.tC,'s');
    }catch(e){pcTst(T.tCf,'e');}
  };
  window.pcCopyBatchItem = async function(idx){
    var txt=PC.lGBatch[idx];if(!txt)return;
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(txt);
      else{var ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}
      pcTst(T.tC,'s');
    }catch(e){pcTst(T.tCf,'e');}
  };
  window.pcCopyAll = async function(){
    if(!PC.lGBatch.length)return;
    try{
      var txt=PC.lGBatch.join('\n');
      if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(txt);
      else{var ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}
      pcTst(T.batchCopied||'All passwords copied!','s');
    }catch(e){pcTst(T.tCf,'e');}
  };

  /* ─── Export Results ─── */
  window.pcExportResults = function(){
    var text=T.exportTitle||'Privacy Check Report';
    text+='\n'+'='.repeat(40)+'\n\n';
    // Collect visible breach info from DOM
    var names=document.querySelectorAll('.pc-bnm');
    var dates=document.querySelectorAll('.pc-bmt span:first-child');
    names.forEach(function(el,i){
      text+='- '+el.textContent;
      if(dates[i])text+=' ('+dates[i].textContent+')';
      text+='\n';
    });
    text+='\nGenerated by json Privacy Checker\n';
    var blob=new Blob([text],{type:'text/plain'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='privacy-check-report.txt';a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
  };

  /* ─── FAQ ─── */
  window.pcFAQ = function(b){
    var it=b.parentElement,was=it.classList.contains('open');
    document.querySelectorAll('.pc-fi').forEach(function(el){el.classList.remove('open');el.querySelector('.pc-fq').setAttribute('aria-expanded','false');});
    if(!was){it.classList.add('open');b.setAttribute('aria-expanded','true');}
  };

  /* ─── Render Helpers ─── */
  function pcHs(t,d){return'<div class="pc-rh pc-rh--s"><div class="pc-ri"><svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--gr)" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4" stroke-width="2.5"/></svg></div><div class="pc-rt">'+pcE(t)+'</div><div class="pc-rd">'+pcE(d)+'</div></div>';}
  function pcHp(cnt){return'<div class="pc-rh pc-rh--d"><div class="pc-ri"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="var(--rd)" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="pc-rt" style="color:var(--rd)">'+pcE(T.pP)+'</div><div class="pc-rcn" style="color:var(--rd)">'+pcFmt(cnt)+'</div><div class="pc-rcl">'+pcE(T.rec)+'</div><div class="pc-rd">'+pcE(T.pPd.replace('{count}',pcFmt(cnt)))+'</div><div class="pc-ra"><div style="display:flex;flex-direction:column;gap:8px;text-align:left;width:100%;max-width:400px"><div class="pc-ai"><span class="pc-aic">\ud83d\udd11</span><span>'+pcE(T.aP)+'</span></div><div class="pc-ai"><span class="pc-aic">\ud83d\udd10</span><span>'+pcE(T.a2)+'</span></div><div class="pc-ai"><span class="pc-aic">\ud83d\udd04</span><span>'+pcE(T.aR)+'</span></div></div><button class="pc-btn pc-btn--p" onclick="pcTab(\'generator\')" style="margin-top:12px">\ud83d\udd11 '+pcE(T.aM)+' \u2192</button></div></div>';}
  function pcBCard(b,i){
    var rk=pcRisk([b]);var key='e'+i;PC._bMap[key]=b;
    var logoUrl=pcLogoUrl(b);
    var logo=logoUrl
      ?'<img class="pc-blo" src="'+logoUrl+'" loading="lazy" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
       +'<div class="pc-bln" style="display:none">'+(b.Name||'?').charAt(0).toUpperCase()+'</div>'
      :'<div class="pc-bln">'+(b.Name||'?').charAt(0).toUpperCase()+'</div>';
    return'<div class="pc-bc" style="animation-delay:'+(i*70)+'ms" onclick="pcODi(\''+key+'\')">'
      +'<div>'+logo+'</div><div><div class="pc-bnm">'+pcE(b.Title||b.Name)+'</div>'
      +'<div class="pc-bmt"><span>'+pcE(b.BreachDate||'')+'</span><span>'+pcFmt(b.PwnCount||0)+' '+pcE(T.rec)+'</span></div>'
      +'<div class="pc-bpl">'+pcPl(b.DataClasses||[])+'</div></div>'
      +'<div class="pc-bac"><span class="pc-rk pc-rk--'+rk+'">'+pcE(rl(rk))+'</span>'
      +'<button class="pc-btn pc-btn--g" style="font-size:.74rem;padding:5px 10px" onclick="event.stopPropagation();pcODi(\''+key+'\')">'+pcE(T.lm)+'</button></div></div>';
  }
  function pcPl(cls){
    if(!Array.isArray(cls))cls=[];
    var m={'Passwords':'rd','Email addresses':'cy','Phone numbers':'am','Names':'gr','Usernames':'gr','Credit cards':'rd','Social security numbers':'rd','IP addresses':'am','Geographic locations':'am','Dates of birth':'am','Physical addresses':'am','Genders':'gy','Age groups':'gy','Job titles':'gy','Employers':'gy'};
    return cls.slice(0,5).map(function(c){return'<span class="pc-pl pc-pl--'+(m[c]||'gy')+'">'+pcE(c)+'</span>';}).join('')+(cls.length>5?'<span class="pc-pl">+'+(cls.length-5)+'</span>':'');
  }
  function pcAdvP(bs){
    var items=pcAI(null,bs);
    return'<div class="pc-adv"><h4>'+pcE(T.aT)+'</h4><ul class="pc-al">'+items.map(function(a){return'<li class="pc-ai"><span class="pc-aic">'+a.ic+'</span><span>'+pcE(a.t)+'</span></li>';}).join('')+'</ul></div>';
  }
  function pcAI(b,bs){
    var cls=[];
    if(bs)bs.forEach(function(x){(Array.isArray(x.DataClasses)?x.DataClasses:[]).forEach(function(c){if(cls.indexOf(c)<0)cls.push(c);});});
    else if(b)(Array.isArray(b.DataClasses)?b.DataClasses:[]).forEach(function(c){if(cls.indexOf(c)<0)cls.push(c);});
    var a=[];
    if(cls.indexOf('Passwords')>=0){a.push({ic:'\ud83d\udd11',t:T.aP});a.push({ic:'\ud83d\udd10',t:T.a2});a.push({ic:'\ud83d\udd04',t:T.aR});a.push({ic:'\ud83d\uddc4\ufe0f',t:T.aM});}
    if(cls.indexOf('Email addresses')>=0)a.push({ic:'\ud83c\udfa3',t:T.aPh});
    if(cls.indexOf('Credit cards')>=0||cls.indexOf('Bank account numbers')>=0)a.push({ic:'\ud83c\udfe6',t:T.aF});
    a.push({ic:'\ud83d\udc41\ufe0f',t:T.aW});
    return a.slice(0,6);
  }
  function pcRisk(bs){
    var c=bs.some(function(b){var c=b.DataClasses||[];return c.indexOf('Passwords')>=0||c.indexOf('Credit cards')>=0||c.indexOf('Social security numbers')>=0;});
    if(c)return'critical';
    if(bs.length>=5||bs.some(function(b){return(b.PwnCount||0)>1e8;}))return'high';
    if(bs.length>=2)return'medium';
    return'low';
  }
  function pcSh(id,st){var e=document.getElementById(id);if(e)e.className='pc-sh'+(st?' '+st:'');}
  function pcBL(id,on){var b=document.getElementById(id);if(!b)return;b.disabled=!!on;if(on){b._t=b.innerHTML;b.innerHTML='<span class="pc-spin"></span>';}else if(b._t)b.innerHTML=b._t;}
  function pcTst(msg,type){
    var c=document.getElementById('pcToasts');if(!c)return;
    var t=document.createElement('div');t.className='pc-t pc-t--'+({s:'s',e:'e',i:'i'}[type]||'i');
    t.textContent=msg;c.appendChild(t);
    requestAnimationFrame(function(){t.classList.add('show');});
    setTimeout(function(){t.classList.remove('show');t.addEventListener('transitionend',function(){if(t.parentNode)t.parentNode.removeChild(t);});},3000);
  }

  /* ─── Latest Breaches Sidebar Feed ─── */
  function pcLatestBreaches(){
    var el=document.getElementById('latestBreachList');if(!el)return;
    fetch('/api/privacy/breaches').then(function(r){return r.json();}).then(function(d){
      var bs=d.breaches||[];if(!bs.length){el.innerHTML='<div style="font-size:.78rem;color:var(--tx3)">—</div>';return;}
      bs.sort(function(a,b){return new Date(b.BreachDate||0)-new Date(a.BreachDate||0);});
      var top8=bs.slice(0,8);
      el.innerHTML=top8.map(function(b){
        var name=(b.Title||b.Name||'?').charAt(0).toUpperCase();
        var url=pcLogoUrl(b);
        var icon=url
          ?'<img class="pc-lb-icon" src="'+url+'" loading="lazy" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="pc-lb-icon2" style="display:none">'+name+'</div>'
          :'<div class="pc-lb-icon2">'+name+'</div>';
        return'<div class="pc-lb-item">'+icon
          +'<div style="flex:1;min-width:0"><div class="pc-lb-name">'+pcE(b.Title||b.Name)+'</div>'
          +'<div class="pc-lb-date">'+pcE(b.BreachDate||'')+'</div></div>'
          +'<div class="pc-lb-cnt">'+pcFmtK(b.PwnCount||0)+'</div></div>';
      }).join('');
    }).catch(function(){el.innerHTML='<div style="font-size:.78rem;color:var(--tx3)">—</div>';});
  }
  pcLatestBreaches();

  /* ─── Operation History (localStorage) ─── */
  var HIST_KEY = 'pc_scan_history';
  var HIST_PASS_PLAIN_KEY = 'pc_hist_pass_plain';
  var HIST_PAGE_SIZE = 10;

  function pcLoadHistory(){
    try{return JSON.parse(localStorage.getItem(HIST_KEY))||[];}catch(e){return[];}
  }
  function pcSaveHistory(list){
    try{localStorage.setItem(HIST_KEY,JSON.stringify(list.slice(0,200)));}catch(e){}
  }
  function pcTimeAgo(ts){
    var s=Math.floor((Date.now()-ts)/1000);
    if(s<60)return T.histJustNow||'just now';
    if(s<3600)return (T.histMinAgo||'{n}m ago').replace('{n}',Math.floor(s/60));
    if(s<86400)return (T.histHourAgo||'{n}h ago').replace('{n}',Math.floor(s/3600));
    return (T.histDayAgo||'{n}d ago').replace('{n}',Math.floor(s/86400));
  }

  function pcAddHistory(type,value,status,extra){
    var list=pcLoadHistory();
    var dedupeVal=(extra&&extra.raw)?extra.raw:value;
    list=list.filter(function(h){
      var existingVal=(h&&h.r)?h.r:h.v;
      return !(h.t===type&&existingVal===dedupeVal);
    });
    var item={t:type,v:value,s:status,d:Date.now()};
    if(extra&&extra.raw)item.r=extra.raw;
    list.unshift(item);
    pcSaveHistory(list);
    PC.histPage=0;
    pcRenderHistory();
  }

  function pcRenderHistory(){
    var el=document.getElementById('scanHistoryList');
    var pagEl=document.getElementById('histPagination');
    if(!el)return;
    var list=pcLoadHistory();
    var total=list.length;
    var totalPages=Math.max(1,Math.ceil(total/HIST_PAGE_SIZE));
    if(PC.histPage>=totalPages)PC.histPage=totalPages-1;
    if(PC.histPage<0)PC.histPage=0;
    var page=list.slice(PC.histPage*HIST_PAGE_SIZE,(PC.histPage+1)*HIST_PAGE_SIZE);

    if(!list.length){
      el.innerHTML='<div class="pc-shi-empty">'+pcE(T.histEmpty||'No records')+'</div>';
      if(pagEl)pagEl.style.display='none';
      return;
    }

    el.innerHTML=page.map(function(h){
      var icon=h.t==='email'?'📧':(h.t==='gen'?'🔑':'🔒');
      var label=h.t==='email'?(T.histEmail||'Email'):(h.t==='gen'?(T.histGen||'Generated'):(T.histPass||'Password'));
      var badgeCls=h.s==='safe'?'safe':(h.s==='pwned'?'pwned':(h.s==='generated'?'gen':'weak'));
      var badgeTxt=h.s==='safe'?(T.histSafe||'Safe'):(h.s==='pwned'?(T.histPwned||'Pwned'):(h.s==='generated'?(T.histGenerated||'Generated'):(T.histWeak||'Weak')));
      var ago=pcTimeAgo(h.d);
      var displayVal=(h.t==='pass'&&PC.histPassPlain&&h.r)?h.r:h.v;
      var safeVal=pcE(displayVal).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return'<div class="pc-shi" onclick="pcRecheck(\''+h.t+'\',\''+safeVal+'\')">'
        +'<span class="pc-shi-icon">'+icon+'</span>'
        +'<div class="pc-shi-info"><span class="pc-shi-label">'+pcE(label)+'</span>'
        +'<span class="pc-shi-val">'+pcE(displayVal)+'</span></div>'
        +'<div class="pc-shi-meta"><span class="pc-shi-badge pc-shi-badge--'+badgeCls+'">'+pcE(badgeTxt)+'</span>'
        +'<span class="pc-shi-time">'+ago+'</span></div></div>';
    }).join('');

    if(pagEl){
      if(totalPages<=1){
        pagEl.style.display='none';
      }else{
        pagEl.style.display='flex';
        pagEl.innerHTML=
          '<button class="pc-hip" onclick="pcHistPage(-1)"'+(PC.histPage===0?' disabled':'')+'>'
          +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>'
          +'</button>'
          +'<span class="pc-hip-info">'+(PC.histPage+1)+' / '+totalPages+'</span>'
          +'<button class="pc-hip" onclick="pcHistPage(1)"'+(PC.histPage>=totalPages-1?' disabled':'')+'>'
          +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>'
          +'</button>';
      }
    }
  }

  window.pcHistPage=function(dir){
    var list=pcLoadHistory();
    var totalPages=Math.max(1,Math.ceil(list.length/HIST_PAGE_SIZE));
    PC.histPage=Math.max(0,Math.min(totalPages-1,PC.histPage+dir));
    pcRenderHistory();
  };

  window.pcToggleHistory=function(){
    PC.histOpen=!PC.histOpen;
    var body=document.getElementById('histBody');
    var icon=document.getElementById('histToggleIcon');
    if(body)body.style.display=PC.histOpen?'':'none';
    if(icon)icon.style.transform=PC.histOpen?'':'rotate(-90deg)';
    var hdr=document.querySelector('.pc-sb-history-header');
    if(hdr)hdr.setAttribute('aria-expanded',PC.histOpen?'true':'false');
  };

  window.pcClearHistory=function(){
    try{localStorage.removeItem(HIST_KEY);}catch(e){}
    PC.histPage=0;
    pcRenderHistory();
  };

  window.pcSetHistPassPlain=function(enabled){
    PC.histPassPlain=!!enabled;
    try{localStorage.setItem(HIST_PASS_PLAIN_KEY,PC.histPassPlain?'1':'0');}catch(e){}
    pcRenderHistory();
  };

  function pcInitHistPassPlain(){
    try{PC.histPassPlain=localStorage.getItem(HIST_PASS_PLAIN_KEY)==='1';}catch(e){PC.histPassPlain=false;}
    var ck=document.getElementById('histPassPlain');
    if(ck)ck.checked=PC.histPassPlain;
  }

  window.pcRecheck=function(type,val){
    if(type==='email'){
      var inp=document.getElementById('emailInput');
      if(inp)inp.value=val;
      pcTab('email');
      pcCheckEmail();
    }else if(type==='gen'){
      pcTab('generator');
      var genText=document.getElementById('genText');
      if(genText)genText.textContent=val;
      PC.lG=val;
    }else{
      pcTab('password');
      var pi=document.getElementById('passInput');
      if(pi){
        pi.value=val;
        pi.focus();
      }
      pcStr(val);
    }
  };

  pcInitHistPassPlain();
  pcRenderHistory();

  /* ─── Hook: email check → save history ─── */
  var _origPcCheckEmail=window.pcCheckEmail;
  window.pcCheckEmail=async function(){
    var em=(document.getElementById('emailInput').value||'').trim();
    await _origPcCheckEmail();
    if(em){
      var ar=document.getElementById('emailResult');
      var status='safe';
      if(ar&&ar.style.display!=='none'){
        if(ar.querySelector('.pc-rh--d'))status='pwned';
        else if(ar.querySelector('.pc-rh--s'))status='safe';
      }
      pcAddHistory('email',em,status);
    }
  };

  /* ─── Hook: password check → save history (masked) ─── */
  var _origPcCheckPassword=window.pcCheckPassword;
  window.pcCheckPassword=async function(){
    await _origPcCheckPassword();
    var pw=document.getElementById('passInput').value||'';
    if(pw){
      var ar=document.getElementById('passResult');
      var status='safe';
      if(ar&&ar.style.display!=='none'){
        if(ar.querySelector('.pc-rh--d'))status='pwned';
        else if(ar.querySelector('.pc-rh--s'))status='safe';
        else status='weak';
      }
      var masked=pw.length>3?pw.charAt(0)+'***'+pw.charAt(pw.length-1):'***';
      pcAddHistory('pass',masked,status,{raw:pw});
    }
  };


})();
