(() => {
  'use strict';

  const STYLE_ID = 'scortaSimpleNavV21Style';
  const NAV_ID = 'scortaSimpleBottomNavV21';
  let currentMode = 'inventory';
  let decorateTimer = 0;

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #scortaPlusFab{display:none!important}

      /* Una sola navigazione: Inventario · Spesa · Altro. */
      #${NAV_ID}{
        position:fixed!important;
        left:0!important;
        right:0!important;
        bottom:0!important;
        z-index:2147483647!important;
        height:calc(86px + env(safe-area-inset-bottom))!important;
        padding:7px 0 env(safe-area-inset-bottom)!important;
        display:grid!important;
        grid-template-columns:repeat(3,1fr)!important;
        background:#fbf3fa!important;
        border-top:1px solid #eadfea!important;
        box-shadow:0 -2px 12px rgba(67,48,73,.035)!important;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;
      }
      #${NAV_ID} button{
        border:0!important;
        background:transparent!important;
        color:#5f5662!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:4px!important;
        padding:5px!important;
        margin:0!important;
        min-width:0!important;
        -webkit-tap-highlight-color:transparent;
      }
      #${NAV_ID} .ico{
        width:52px;
        height:32px;
        border-radius:18px;
        display:grid;
        place-items:center;
        font-size:21px;
        line-height:1;
        color:#6e5578;
      }
      #${NAV_ID} .lbl{font-size:12px;line-height:1;font-weight:600;letter-spacing:.1px}
      #${NAV_ID} button.active .ico{background:#ecd9ef}
      #${NAV_ID} button.active .lbl{color:#6e5578}
      #${NAV_ID} button:active{background:#f3e7f1!important}

      /* Il pannello secondario non ha più una seconda barra di navigazione. */
      #scortaPlusPanel{
        position:fixed!important;
        top:0!important;
        left:0!important;
        right:0!important;
        bottom:calc(86px + env(safe-area-inset-bottom))!important;
        height:auto!important;
        max-height:none!important;
        z-index:2147483200!important;
      }
      #scortaPlusPanel .scp-tabs{display:none!important}
      #scortaPlusPanel #scpClose{display:none!important}
      #scortaPlusPanel .scp-head{padding-right:18px!important}
      #scortaPlusPanel.scp-closing-smooth{
        transition:opacity 110ms ease-out!important;
        will-change:opacity!important;
        pointer-events:none!important;
      }

      .scp-simple-menu{display:grid;gap:10px;padding:4px 0 22px}
      .scp-simple-menu-title{font-size:13px;color:#756d78;margin:3px 2px 8px;line-height:1.45}
      .scp-simple-menu button{
        width:100%;border:1px solid #e7dce8;background:#fff;border-radius:18px;
        padding:16px 15px;display:flex;align-items:center;gap:13px;text-align:left;
        color:#433c46;font:inherit;box-shadow:0 2px 10px rgba(70,50,75,.035);
        -webkit-tap-highlight-color:transparent;
      }
      .scp-simple-menu button:active{background:#f8f0f7}
      .scp-simple-menu .menu-ico{width:38px;height:38px;border-radius:13px;background:#f1e3f2;display:grid;place-items:center;font-size:19px;flex:0 0 auto}
      .scp-simple-menu .menu-copy{min-width:0;flex:1}
      .scp-simple-menu .menu-copy b{display:block;font-size:14px;margin-bottom:3px}
      .scp-simple-menu .menu-copy span{display:block;font-size:12px;color:#7b727d;line-height:1.35}
      .scp-simple-menu .chev{font-size:20px;color:#9b8fa0}
      .scp-simple-back{
        border:0;background:transparent;color:#6e5578;font-weight:700;font-size:13px;
        padding:3px 2px 12px;margin:0;display:flex;align-items:center;gap:5px;
        -webkit-tap-highlight-color:transparent;
      }
    `;
    document.head.appendChild(style);
  }

  function removeOldNav(){
    [
      'scortaCatalogFloatV12','scortaToolsBottomV12','scortaToolsBottomV13',
      'scortaToolsBottomV15','scortaToolsBottomV16','scortaToolsBottomV17',
      'scortaToolsNav','scpPersistentBottomNav','scortaInventoryBottomProxyV17',
      'scortaShoppingBottomProxyV17','scortaUnifiedBottomNavV18','scortaUnifiedBottomNavV19',
      'scortaUnifiedBottomNavV20'
    ].forEach(id=>document.getElementById(id)?.remove());
    [
      'scpPersistentBottomNavStyle','scortaNavV17Style','scortaNavV16Style','scortaNavV15Style',
      'scortaUnifiedNavV18Style','scortaUnifiedNavV19Style','scortaUnifiedNavV20Style'
    ].forEach(id=>document.getElementById(id)?.remove());
  }

  function ensureNav(){
    injectStyle();
    removeOldNav();
    if (document.getElementById(NAV_ID)) { syncActive(); return; }

    const nav=document.createElement('nav');
    nav.id=NAV_ID;
    nav.setAttribute('aria-label','Navigazione principale');
    nav.innerHTML=`
      <button type="button" data-mainnav="inventory" aria-label="Inventario">
        <span class="ico">▣</span><span class="lbl">Inventario</span>
      </button>
      <button type="button" data-mainnav="shopping" aria-label="Spesa">
        <span class="ico">⌑</span><span class="lbl">Spesa</span>
      </button>
      <button type="button" data-mainnav="more" aria-label="Altro">
        <span class="ico">•••</span><span class="lbl">Altro</span>
      </button>`;
    document.body.appendChild(nav);

    nav.querySelector('[data-mainnav="inventory"]').addEventListener('click',goInventory);
    nav.querySelector('[data-mainnav="shopping"]').addEventListener('click',goShopping);
    nav.querySelector('[data-mainnav="more"]').addEventListener('click',goMore);
    syncActive();
  }

  function setHeader(title, subtitle=''){
    const panel=document.getElementById('scortaPlusPanel');
    if (!panel) return;
    const strong=panel.querySelector('.scp-title strong');
    const sub=panel.querySelector('.scp-title span');
    if (strong) strong.textContent=title;
    if (sub) sub.textContent=subtitle;
  }

  function smoothRemovePanel(){
    const panel=document.getElementById('scortaPlusPanel');
    if (!panel) return;
    try { window.dispatchEvent(new Event('resize')); } catch (_) {}
    panel.classList.add('scp-closing-smooth');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      panel.style.opacity='0';
      setTimeout(()=>{
        panel.remove();
        currentMode='inventory';
        syncActive();
      },115);
    }));
  }

  function goInventory(){
    if (!document.getElementById('scortaPlusPanel')) {
      currentMode='inventory';
      syncActive();
      return;
    }
    smoothRemovePanel();
  }

  function ensurePanel(callback){
    if (document.getElementById('scortaPlusPanel')) { callback(); return; }
    if (typeof window.scortaPlusOpen === 'function') window.scortaPlusOpen();
    let tries=0;
    const wait=()=>{
      if (document.getElementById('scortaPlusPanel')) { callback(); return; }
      if (++tries<12) setTimeout(wait,30);
    };
    wait();
  }

  function clickHiddenTab(tab, after){
    const panel=document.getElementById('scortaPlusPanel');
    const btn=panel?.querySelector(`[data-tab="${tab}"]`);
    if (!btn) { if(after) setTimeout(after,60); return; }
    btn.click();
    if (after) {
      setTimeout(after,0);
      setTimeout(after,55);
    }
  }

  function goShopping(){
    currentMode='shopping';
    ensurePanel(()=>{
      clickHiddenTab('shopping',()=>decorateShopping());
      syncActive();
    });
  }

  function goMore(){
    currentMode='more';
    ensurePanel(()=>{
      renderMoreMenu();
      syncActive();
    });
  }

  function renderMoreMenu(){
    currentMode='more';
    const panel=document.getElementById('scortaPlusPanel');
    const body=panel?.querySelector('#scpBody');
    if (!panel || !body) return;
    setHeader('Altro','Le funzioni meno frequenti, tutte in un posto');
    body.innerHTML=`
      <div class="scp-simple-menu">
        <div class="scp-simple-menu-title">Qui trovi solo ciò che non serve nella gestione quotidiana dell'inventario.</div>
        <button type="button" data-more="history">
          <span class="menu-ico">◷</span><span class="menu-copy"><b>Cronologia</b><span>Ultimi acquisti e movimenti registrati</span></span><span class="chev">›</span>
        </button>
        <button type="button" data-more="data">
          <span class="menu-ico">↕</span><span class="menu-copy"><b>Backup e dati</b><span>Crea o ripristina un backup dell'inventario</span></span><span class="chev">›</span>
        </button>
        <button type="button" data-more="info">
          <span class="menu-ico">ⓘ</span><span class="menu-copy"><b>Informazioni</b><span>Versione app e aggiornamento catalogo</span></span><span class="chev">›</span>
        </button>
      </div>`;
    body.querySelectorAll('[data-more]').forEach(button=>{
      button.addEventListener('click',()=>openMoreDetail(button.dataset.more));
    });
  }

  function openMoreDetail(tab){
    currentMode='more-detail';
    clickHiddenTab(tab,()=>decorateMoreDetail(tab));
    syncActive();
  }

  function decorateMoreDetail(tab){
    if (currentMode!=='more-detail') return;
    const panel=document.getElementById('scortaPlusPanel');
    const body=panel?.querySelector('#scpBody');
    if (!panel || !body) return;
    const titles={history:'Cronologia',data:'Backup e dati',info:'Informazioni'};
    setHeader(titles[tab]||'Altro','');
    if (!body.querySelector('.scp-simple-back')) {
      const back=document.createElement('button');
      back.type='button';
      back.className='scp-simple-back';
      back.innerHTML='‹ <span>Altro</span>';
      back.addEventListener('click',renderMoreMenu);
      body.prepend(back);
    }
  }

  function decorateShopping(){
    if (currentMode!=='shopping') return;
    setHeader('Lista della spesa','Solo ciò che devi ordinare');
  }

  function scheduleDecorate(){
    clearTimeout(decorateTimer);
    decorateTimer=setTimeout(()=>{
      if (currentMode==='shopping') decorateShopping();
      else if (currentMode==='more') {
        const body=document.querySelector('#scortaPlusPanel #scpBody');
        if (body && !body.querySelector('.scp-simple-menu')) renderMoreMenu();
      }
      syncActive();
    },20);
  }

  function syncActive(){
    const nav=document.getElementById(NAV_ID);
    if (!nav) return;
    nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    if (!document.getElementById('scortaPlusPanel') || currentMode==='inventory') {
      nav.querySelector('[data-mainnav="inventory"]')?.classList.add('active');
    } else if (currentMode==='shopping') {
      nav.querySelector('[data-mainnav="shopping"]')?.classList.add('active');
    } else {
      nav.querySelector('[data-mainnav="more"]')?.classList.add('active');
    }
  }

  const observer=new MutationObserver(()=>{
    ensureNav();
    scheduleDecorate();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensureNav,{once:true});
  else ensureNav();
  setTimeout(ensureNav,250);
  setTimeout(ensureNav,800);
  setTimeout(ensureNav,1800);
})();
