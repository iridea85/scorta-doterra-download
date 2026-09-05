(() => {
  'use strict';

  const STYLE_ID = 'scortaNavV17Style';
  const TOOLS_ID = 'scortaToolsBottomV17';
  const INV_PROXY_ID = 'scortaInventoryBottomProxyV17';
  const SHOP_PROXY_ID = 'scortaShoppingBottomProxyV17';
  const PENDING_KEY = 'scortaPendingMainNavV17';

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #scortaPlusFab{display:none!important}

      /* Strumenti occupa il terzo centrale della barra principale. */
      #${TOOLS_ID}{
        position:fixed!important;
        z-index:2147483646!important;
        left:33.333vw!important;
        right:auto!important;
        bottom:0!important;
        width:33.334vw!important;
        height:calc(92px + env(safe-area-inset-bottom))!important;
        padding:10px 6px calc(9px + env(safe-area-inset-bottom))!important;
        border:0!important;
        border-radius:0!important;
        background:#f8eef7!important;
        color:#4e4651!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:5px!important;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;
        -webkit-tap-highlight-color:transparent;
        box-shadow:none!important;
      }
      #${TOOLS_ID} .ico{
        width:54px;
        height:34px;
        border-radius:18px;
        display:grid;
        place-items:center;
        font-size:22px;
        line-height:1;
        color:#6e5578;
        background:#efd8f3;
      }
      #${TOOLS_ID} .lbl{
        font-size:13px;
        line-height:1;
        font-weight:500;
        letter-spacing:.1px;
      }
      #${TOOLS_ID}:active{background:#f1e5ef!important}

      /* Strumenti termina sopra la barra originale dell'app. */
      #scortaPlusPanel{
        position:fixed!important;
        top:0!important;
        left:0!important;
        right:0!important;
        bottom:calc(92px + env(safe-area-inset-bottom))!important;
        height:auto!important;
        max-height:none!important;
        z-index:2147483200!important;
      }

      /* Zone di tocco invisibili sopra Inventario e Spesa, attive SOLO
         mentre Strumenti è aperto. Chiudono Strumenti e inoltrano davvero
         il tocco alla barra Flutter sottostante. */
      #${INV_PROXY_ID},#${SHOP_PROXY_ID}{
        position:fixed!important;
        bottom:0!important;
        width:33.333vw!important;
        height:calc(92px + env(safe-area-inset-bottom))!important;
        z-index:2147483647!important;
        border:0!important;
        margin:0!important;
        padding:0!important;
        background:transparent!important;
        color:transparent!important;
        display:none;
        -webkit-tap-highlight-color:transparent;
      }
      #${INV_PROXY_ID}{left:0!important}
      #${SHOP_PROXY_ID}{right:0!important}
    `;
    document.head.appendChild(style);
  }

  function openTools(){
    if (typeof window.scortaPlusOpen === 'function') window.scortaPlusOpen();
  }

  function removeOldAddedButtons(){
    [
      'scortaCatalogFloatV12',
      'scortaToolsBottomV12',
      'scortaToolsBottomV13',
      'scortaToolsBottomV15',
      'scortaToolsBottomV16',
      'scortaToolsNav',
      'scpPersistentBottomNav'
    ].forEach(id=>document.getElementById(id)?.remove());
    document.getElementById('scpPersistentBottomNavStyle')?.remove();
  }

  function ensureTools(){
    injectStyle();
    removeOldAddedButtons();
    if (!document.getElementById(TOOLS_ID)) {
      const b=document.createElement('button');
      b.id=TOOLS_ID;
      b.type='button';
      b.setAttribute('aria-label','Strumenti');
      b.innerHTML='<span class="ico">⚙</span><span class="lbl">Strumenti</span>';
      b.addEventListener('click',openTools);
      document.body.appendChild(b);
    }
    ensureNavProxies();
  }

  function ensureNavProxies(){
    if (!document.getElementById(INV_PROXY_ID)) {
      const b=document.createElement('button');
      b.id=INV_PROXY_ID;
      b.type='button';
      b.setAttribute('aria-label','Inventario');
      b.addEventListener('click',(e)=>{
        e.preventDefault();
        e.stopPropagation();
        navigateFromTools('inventory');
      });
      document.body.appendChild(b);
    }
    if (!document.getElementById(SHOP_PROXY_ID)) {
      const b=document.createElement('button');
      b.id=SHOP_PROXY_ID;
      b.type='button';
      b.setAttribute('aria-label','Spesa');
      b.addEventListener('click',(e)=>{
        e.preventDefault();
        e.stopPropagation();
        navigateFromTools('shopping');
      });
      document.body.appendChild(b);
    }
    syncProxyVisibility();
  }

  function syncProxyVisibility(){
    const open=!!document.getElementById('scortaPlusPanel');
    const inv=document.getElementById(INV_PROXY_ID);
    const shop=document.getElementById(SHOP_PROXY_ID);
    if (inv) inv.style.display=open?'block':'none';
    if (shop) shop.style.display=open?'block':'none';
  }

  function navigateFromTools(destination){
    try { sessionStorage.setItem(PENDING_KEY,destination); } catch (_) {}

    const close=document.getElementById('scpClose');
    if (close) close.click();
    else document.getElementById('scortaPlusPanel')?.remove();

    syncProxyVisibility();
    setTimeout(runPendingNavigation,40);
    setTimeout(runPendingNavigation,140);
    setTimeout(runPendingNavigation,350);
  }

  function dispatchFlutterTap(x,y){
    const inv=document.getElementById(INV_PROXY_ID);
    const shop=document.getElementById(SHOP_PROXY_ID);
    const tools=document.getElementById(TOOLS_ID);
    const previous=[inv,shop,tools].map(el=>el?.style.pointerEvents || '');
    [inv,shop,tools].forEach(el=>{ if(el) el.style.pointerEvents='none'; });

    const target=document.elementFromPoint(x,y)
      || document.querySelector('flt-glass-pane,flutter-view,canvas');

    if (target) {
      const common={bubbles:true,cancelable:true,composed:true,clientX:x,clientY:y,screenX:x,screenY:y,button:0,buttons:1};
      try { target.dispatchEvent(new PointerEvent('pointerdown',{...common,pointerId:1,pointerType:'touch',isPrimary:true})); } catch (_) {}
      try { target.dispatchEvent(new MouseEvent('mousedown',common)); } catch (_) {}
      try { target.dispatchEvent(new PointerEvent('pointerup',{...common,buttons:0,pointerId:1,pointerType:'touch',isPrimary:true})); } catch (_) {}
      try { target.dispatchEvent(new MouseEvent('mouseup',{...common,buttons:0})); } catch (_) {}
      try { target.dispatchEvent(new MouseEvent('click',{...common,buttons:0})); } catch (_) {}
    }

    [inv,shop,tools].forEach((el,i)=>{ if(el) el.style.pointerEvents=previous[i]; });
  }

  function runPendingNavigation(){
    if (document.getElementById('scortaPlusPanel')) return;
    let destination=null;
    try { destination=sessionStorage.getItem(PENDING_KEY); } catch (_) {}
    if (!destination) return;

    const y=Math.max(1,window.innerHeight-46);
    const x=destination==='shopping' ? window.innerWidth*(5/6) : window.innerWidth*(1/6);

    try { sessionStorage.removeItem(PENDING_KEY); } catch (_) {}
    requestAnimationFrame(()=>requestAnimationFrame(()=>dispatchFlutterTap(x,y)));
  }

  const observer=new MutationObserver(()=>{
    if (document.querySelector('flutter-view,flt-glass-pane,flt-scene-host,canvas')) ensureTools();
    syncProxyVisibility();
    runPendingNavigation();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded',()=>{
      ensureTools();
      runPendingNavigation();
    },{once:true});
  } else {
    ensureTools();
    runPendingNavigation();
  }
  setTimeout(()=>{ensureTools();runPendingNavigation();},250);
  setTimeout(()=>{ensureTools();runPendingNavigation();},800);
  setTimeout(()=>{ensureTools();runPendingNavigation();},1800);
})();
