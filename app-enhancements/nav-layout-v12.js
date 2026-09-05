(() => {
  'use strict';

  const STYLE_ID = 'scortaUnifiedNavV18Style';
  const NAV_ID = 'scortaUnifiedBottomNavV18';

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #scortaPlusFab{display:none!important}

      /* Un'unica barra gestita da noi copre esattamente la barra Flutter.
         Niente più inoltro di tocchi al canvas Flutter. */
      #${NAV_ID}{
        position:fixed!important;
        left:0!important;
        right:0!important;
        bottom:0!important;
        z-index:2147483647!important;
        height:calc(92px + env(safe-area-inset-bottom))!important;
        padding:8px 0 env(safe-area-inset-bottom)!important;
        display:grid!important;
        grid-template-columns:repeat(3,1fr)!important;
        background:#f8eef7!important;
        border-top:1px solid #eee1ee!important;
        box-shadow:0 -2px 10px rgba(67,48,73,.04)!important;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;
      }
      #${NAV_ID} button{
        border:0!important;
        background:transparent!important;
        color:#4e4651!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:5px!important;
        padding:6px!important;
        margin:0!important;
        min-width:0!important;
        -webkit-tap-highlight-color:transparent;
      }
      #${NAV_ID} .ico{
        width:54px;
        height:34px;
        border-radius:18px;
        display:grid;
        place-items:center;
        font-size:22px;
        line-height:1;
        color:#6e5578;
      }
      #${NAV_ID} .lbl{font-size:13px;line-height:1;font-weight:500;letter-spacing:.1px}
      #${NAV_ID} button.active .ico{background:#efd8f3}
      #${NAV_ID} button:active{background:#f1e5ef!important}

      /* Il pannello termina sopra la barra unica. */
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
    `;
    document.head.appendChild(style);
  }

  function removeOldNav(){
    [
      'scortaCatalogFloatV12','scortaToolsBottomV12','scortaToolsBottomV13',
      'scortaToolsBottomV15','scortaToolsBottomV16','scortaToolsBottomV17',
      'scortaToolsNav','scpPersistentBottomNav','scortaInventoryBottomProxyV17',
      'scortaShoppingBottomProxyV17'
    ].forEach(id=>document.getElementById(id)?.remove());
    ['scpPersistentBottomNavStyle','scortaNavV17Style','scortaNavV16Style','scortaNavV15Style'].forEach(id=>document.getElementById(id)?.remove());
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
      <button type="button" data-mainnav="tools" aria-label="Strumenti">
        <span class="ico">⚙</span><span class="lbl">Strumenti</span>
      </button>
      <button type="button" data-mainnav="shopping" aria-label="Spesa">
        <span class="ico">⌑</span><span class="lbl">Spesa</span>
      </button>`;
    document.body.appendChild(nav);

    nav.querySelector('[data-mainnav="inventory"]').addEventListener('click',goInventory);
    nav.querySelector('[data-mainnav="tools"]').addEventListener('click',goTools);
    nav.querySelector('[data-mainnav="shopping"]').addEventListener('click',goShopping);
    syncActive();
  }

  function hardClosePanel(){
    document.getElementById('scortaPlusPanel')?.remove();
  }

  function goInventory(){
    /* L'inventario è la schermata iniziale Flutter: ricaricare la stessa URL
       è il modo più affidabile per tornarci, senza perdere localStorage. */
    hardClosePanel();
    const url=new URL(location.href);
    url.searchParams.set('screen','inventory');
    url.searchParams.set('navv','18');
    location.replace(url.toString());
  }

  function openPanelThen(tab){
    if (!document.getElementById('scortaPlusPanel')) {
      if (typeof window.scortaPlusOpen === 'function') window.scortaPlusOpen();
    }
    const activate=()=>{
      const panel=document.getElementById('scortaPlusPanel');
      if (!panel) return false;
      const btn=panel.querySelector(`[data-tab="${tab}"]`);
      if (btn) btn.click();
      syncActive();
      return true;
    };
    if (!activate()) {
      setTimeout(activate,40);
      setTimeout(activate,120);
      setTimeout(activate,260);
    }
  }

  function goTools(){
    openPanelThen('home');
  }

  function goShopping(){
    /* La schermata Spesa viene aperta direttamente dal pannello migliorato,
       senza tentare di pilotare il canvas Flutter sottostante. */
    openPanelThen('shopping');
  }

  function syncActive(){
    const nav=document.getElementById(NAV_ID);
    if (!nav) return;
    nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    const panel=document.getElementById('scortaPlusPanel');
    if (!panel) {
      nav.querySelector('[data-mainnav="inventory"]')?.classList.add('active');
      return;
    }
    const activeTab=panel.querySelector('.scp-tab.active')?.dataset?.tab;
    if (activeTab==='shopping') nav.querySelector('[data-mainnav="shopping"]')?.classList.add('active');
    else nav.querySelector('[data-mainnav="tools"]')?.classList.add('active');
  }

  const observer=new MutationObserver(()=>{
    ensureNav();
    syncActive();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensureNav,{once:true});
  else ensureNav();
  setTimeout(ensureNav,250);
  setTimeout(ensureNav,800);
  setTimeout(ensureNav,1800);
})();
